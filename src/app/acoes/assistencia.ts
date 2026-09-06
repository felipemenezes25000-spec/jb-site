"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  CAMPO_CODIGO,
  CAMPO_INICIO,
  CAMPO_ISCA,
  ROTULO_OPERACAO,
  ROTULO_TIPO_PEDIDO,
} from "@/components/assistencia/rotulos";
import { liberarAcessoAoChamado, podeVerChamado } from "@/components/assistencia/acesso";
import {
  ErroDeAssistencia,
  ROTULO_URGENCIA,
  abrirChamado,
  mudarStatusChamado,
} from "@/lib/assistencia";
import { sessaoCliente } from "@/lib/auth-cliente";
import { formatarTelefone, somenteDigitos } from "@/lib/format";
import {
  LIMITE_CHAMADO,
  LIMITE_ORCAMENTO,
  LIMITE_RESPOSTA_CHAMADO,
  type LimitesDoFormulario,
  chaveDeEmail,
  chaveDeIp,
  registrarUso,
  usosNaJanela,
} from "@/lib/limite";
import { enfileirar } from "@/lib/notificacoes";
import { ErroDeOrcamento, criarOrcamento } from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";
import { urlAbsoluta } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { ipDoPedido } from "@/lib/seguranca";

/**
 * Formulários públicos da assistência técnica.
 *
 * Tudo aqui nasce de gente que pode não ter conta, então a defesa é em
 * camadas e nenhuma delas depende do navegador:
 *
 *  1. Isca invisível (honeypot) e tempo mínimo de preenchimento — pegam o robô
 *     que preenche tudo e envia em 300 ms;
 *  2. Limite por IP com escalada: os primeiros envios passam direto; a partir
 *     do limite brando a pessoa precisa digitar o código da imagem servido por
 *     `/api/captcha`; acima do limite rígido o envio é recusado;
 *  3. Freio persistente no banco (mesmo e-mail abrindo chamado em sequência,
 *     mesmo IP gerando Lead em sequência), que sobrevive ao reinício do
 *     processo — o contador em memória, não.
 *
 * Sobre o captcha: ele existe e é usado, mas SÓ na escalada. Exigir um código
 * visual de todo mundo barraria quem usa leitor de tela, porque aquela rota
 * não oferece alternativa em áudio, e ninguém pode ficar sem abrir um chamado
 * de assistência por causa disso.
 *
 * Nenhum preço vem do formulário: os itens de orçamento entram com valor zero
 * e quem precifica é a equipe, no painel.
 */

export type EstadoAssistencia = {
  erro?: string;
  campo?: string;
  ok?: string;
  /** Liga o desafio da imagem no formulário. */
  exigirCodigo?: boolean;
  /** Número gerado, para a tela de sucesso. */
  numero?: string;
};

/* ============================================================================
   Anti-abuso
   ============================================================================ */

/** Nem robô demora, nem formulário fica aberto por dias. */
const TEMPO_MINIMO_MS = 4_000;
const TEMPO_MAXIMO_MS = 12 * 60 * 60_000;

/**
 * Contagem em memória do processo, agora feita por `@/lib/limite` — antes este
 * arquivo tinha o seu próprio `Map`, a sua própria faxina e a sua própria
 * janela, diferentes das dos outros formulários. Continua valendo o que valia:
 * é contagem POR INSTÂNCIA, e em serverless cada instância conta a sua fatia.
 * O freio que sobrevive a tudo é o do banco, logo adiante em cada ação.
 *
 * A leitura (`usosNaJanela`) e o registro (`registrarUso`) são separados de
 * propósito: o contador só anda quando o envio vira registro, para que um erro
 * de digitação não empurre quem preenche de boa-fé para o desafio da imagem.
 */
function excedeuPorEmail(escopo: string, limites: LimitesDoFormulario, email: string) {
  if (!email || !limites.porEmail) return false;
  const usos = usosNaJanela(chaveDeEmail(email, escopo), limites.porEmail.janelaMs);
  return usos >= limites.porEmail.limite;
}

/** Conta o envio que deu certo nas duas chaves do escopo. */
function registrarEnvioAceito(
  escopo: string,
  limites: LimitesDoFormulario,
  quem: { ip: string; email?: string },
) {
  registrarUso(chaveDeIp(quem.ip, escopo), limites.porIp.janelaMs);
  const email = (quem.email ?? "").trim().toLowerCase();
  if (email && limites.porEmail) {
    registrarUso(chaveDeEmail(email, escopo), limites.porEmail.janelaMs);
  }
}

async function ipDaRequisicao() {
  const h = await headers();
  return ipDoPedido(h);
}

async function agenteDaRequisicao() {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 300);
}

/**
 * Mesma assinatura de `src/app/api/captcha/route.ts`.
 *
 * A função existe e é exportada lá, mas `route.ts` é arquivo de rota: o Next
 * valida os exports desse arquivo, e uma Server Action que importa um handler
 * passa a depender de um módulo cujo formato não é nosso. Três linhas
 * repetidas custam menos do que esse acoplamento. Se o algoritmo mudar lá,
 * muda aqui — está escrito nos dois lugares.
 */
function assinarCodigo(texto: string) {
  // segredo vazio produz um HMAC que qualquer um reproduz: a assinatura
  // deixaria de significar coisa alguma. Melhor falhar alto na subida.
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET ausente: a assinatura não pode ser gerada.");
  return crypto.createHmac("sha256", segredo).update(texto.toUpperCase()).digest("hex");
}

async function codigoConfere(valor: string) {
  const digitado = valor.trim();
  if (!digitado) return false;

  const jar = await cookies();
  const esperado = jar.get("jb_captcha")?.value ?? "";
  if (!esperado) return false;

  const a = Buffer.from(assinarCodigo(digitado), "utf8");
  const b = Buffer.from(esperado, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const RECUSA_GENERICA =
  "Não foi possível enviar o formulário. Recarregue a página e tente de novo.";

type Conferencia = { ok: true; ip: string } | { ok: false; estado: EstadoAssistencia };

/**
 * Confere isca, tempo e limite por IP. Não incrementa nada: o contador só
 * anda quando o registro é de fato criado, para que um erro de digitação não
 * empurre quem está preenchendo de boa-fé para o desafio da imagem.
 *
 * O teto rígido é o do próprio escopo (`limites.porIp.limite`); o brando é
 * quanto antes dele o desafio da imagem entra.
 */
async function conferirEnvio(
  formData: FormData,
  opcoes: { escopo: string; limites: LimitesDoFormulario; limiteBrando: number },
): Promise<Conferencia> {
  const isca = String(formData.get(CAMPO_ISCA) ?? "").trim();
  if (isca) return { ok: false, estado: { erro: RECUSA_GENERICA } };

  const abertoEm = Number(formData.get(CAMPO_INICIO) ?? 0);
  const decorrido = Number.isFinite(abertoEm) && abertoEm > 0 ? Date.now() - abertoEm : -1;
  if (decorrido < TEMPO_MINIMO_MS || decorrido > TEMPO_MAXIMO_MS) {
    return {
      ok: false,
      estado: {
        erro:
          decorrido > TEMPO_MAXIMO_MS
            ? "O formulário ficou aberto tempo demais. Recarregue a página para enviar."
            : RECUSA_GENERICA,
      },
    };
  }

  const ip = await ipDaRequisicao();
  const usos = usosNaJanela(chaveDeIp(ip, opcoes.escopo), opcoes.limites.porIp.janelaMs);

  if (usos >= opcoes.limites.porIp.limite) {
    return {
      ok: false,
      estado: {
        erro:
          "Recebemos vários envios deste acesso nos últimos minutos. " +
          "Se for urgente, fale com a JB pelo WhatsApp ou pelo telefone.",
      },
    };
  }

  if (usos >= opcoes.limiteBrando) {
    const codigo = String(formData.get(CAMPO_CODIGO) ?? "");
    if (!(await codigoConfere(codigo))) {
      return {
        ok: false,
        estado: {
          erro: codigo.trim()
            ? "O código da imagem não confere. Peça outra imagem e tente de novo."
            : "Para confirmar que é você, digite o código da imagem.",
          campo: CAMPO_CODIGO,
          exigirCodigo: true,
        },
      };
    }
  }

  return { ok: true, ip };
}

function primeiroProblema(erro: z.ZodError): EstadoAssistencia {
  const problema = erro.issues[0];
  return {
    erro: problema?.message ?? "Confira os dados informados.",
    campo: problema?.path[0] !== undefined ? String(problema.path[0]) : undefined,
  };
}

/* ============================================================================
   Abrir chamado
   ============================================================================ */

const URGENCIAS = ["baixa", "normal", "alta", "parado"] as const;

const esquemaChamado = z
  .object({
    equipamentoId: z.string().trim().max(40).default(""),
    categoriaId: z.string().trim().max(40).default(""),
    marca: z.string().trim().max(80).default(""),
    modelo: z.string().trim().max(80).default(""),
    serie: z.string().trim().max(60).default(""),

    tipoProblema: z.string().trim().max(60).default(""),
    descricao: z
      .string()
      .trim()
      .min(15, "Conte o que está acontecendo com pelo menos 15 caracteres.")
      .max(4000, "Descrição longa demais. Resuma o essencial."),
    urgencia: z.enum(URGENCIAS).default("normal"),
    comecou: z.string().trim().max(60).default(""),
    aindaOpera: z.enum(["sim", "parcial", "nao"]).default("sim"),

    unidadeId: z.string().trim().max(40).default(""),
    cep: z.string().trim().max(9).default(""),
    logradouro: z.string().trim().max(160).default(""),
    numero: z.string().trim().max(20).default(""),
    complemento: z.string().trim().max(80).default(""),
    bairro: z.string().trim().max(80).default(""),
    cidade: z.string().trim().max(80).default(""),
    uf: z.string().trim().max(2).default(""),
    disponibilidade: z.string().trim().max(200).default(""),

    nome: z.string().trim().min(3, "Informe seu nome completo."),
    email: z.email("Informe um e-mail válido para receber o andamento."),
    telefone: z.string().trim().min(10, "Informe o telefone com DDD."),
  })
  .superRefine((dados, ctx) => {
    if (somenteDigitos(dados.telefone).length < 10) {
      ctx.addIssue({ code: "custom", path: ["telefone"], message: "Informe o telefone com DDD." });
    }

    const identificado = dados.equipamentoId || dados.categoriaId || dados.marca || dados.modelo;
    if (!identificado) {
      ctx.addIssue({
        code: "custom",
        path: ["marca"],
        message: "Diga ao menos o tipo, a marca ou o modelo do equipamento.",
      });
    }
  });

/** Máximo de chamados que o mesmo e-mail pode abrir dentro da janela. */
const MAX_CHAMADOS_POR_EMAIL = LIMITE_CHAMADO.porEmail.limite;

export async function abrirChamadoPublico(
  _anterior: EstadoAssistencia,
  formData: FormData,
): Promise<EstadoAssistencia> {
  const conferencia = await conferirEnvio(formData, {
    escopo: "chamado",
    limites: LIMITE_CHAMADO,
    limiteBrando: 2,
  });
  if (!conferencia.ok) return conferencia.estado;

  const dados = esquemaChamado.safeParse({
    equipamentoId: formData.get("equipamentoId") ?? "",
    categoriaId: formData.get("categoriaId") ?? "",
    marca: formData.get("marca") ?? "",
    modelo: formData.get("modelo") ?? "",
    serie: formData.get("serie") ?? "",
    tipoProblema: formData.get("tipoProblema") ?? "",
    descricao: formData.get("descricao") ?? "",
    urgencia: formData.get("urgencia") ?? "normal",
    comecou: formData.get("comecou") ?? "",
    aindaOpera: formData.get("aindaOpera") ?? "sim",
    unidadeId: formData.get("unidadeId") ?? "",
    cep: formData.get("cep") ?? "",
    logradouro: formData.get("logradouro") ?? "",
    numero: formData.get("numero") ?? "",
    complemento: formData.get("complemento") ?? "",
    bairro: formData.get("bairro") ?? "",
    cidade: formData.get("cidade") ?? "",
    uf: formData.get("uf") ?? "",
    disponibilidade: formData.get("disponibilidade") ?? "",
    nome: formData.get("nome") ?? "",
    email: formData.get("email") ?? "",
    telefone: formData.get("telefone") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const entrada = dados.data;
  const email = entrada.email.toLowerCase();
  const cliente = await sessaoCliente();

  // Duas camadas para a mesma pergunta: o mesmo e-mail não enfileira chamados
  // iguais enquanto ninguém da equipe olhou o primeiro. A de memória responde
  // sem ir ao banco e conta por instância do processo; a do banco sobrevive ao
  // reinício e vale para todas as instâncias — é a que decide de verdade.
  const chamadosDemais =
    excedeuPorEmail("chamado", LIMITE_CHAMADO, email) ||
    (await prisma.serviceRequest.count({
      where: {
        contactEmail: email,
        createdAt: { gte: new Date(Date.now() - LIMITE_CHAMADO.porEmail.janelaMs) },
      },
    })) >= MAX_CHAMADOS_POR_EMAIL;

  if (chamadosDemais) {
    return {
      erro:
        "Já registramos chamados demais para este e-mail nos últimos minutos. " +
        "Acompanhe o que já foi aberto ou fale com a JB pelo telefone.",
    };
  }

  /* --------------------------------------------- vínculos que exigem dono */

  let equipmentId: string | null = null;
  if (entrada.equipamentoId) {
    if (!cliente) {
      return { erro: "Entre na sua conta para escolher um equipamento cadastrado." };
    }
    const equipamento = await prisma.equipment.findFirst({
      where: { id: entrada.equipamentoId, customerId: cliente.id },
      select: { id: true },
    });
    if (!equipamento) {
      return { erro: "Equipamento não encontrado na sua conta.", campo: "equipamentoId" };
    }
    equipmentId = equipamento.id;
  }

  let locationId: string | null = null;
  if (entrada.unidadeId) {
    if (!cliente) {
      return { erro: "Entre na sua conta para escolher uma unidade cadastrada." };
    }
    const unidade = await prisma.customerLocation.findFirst({
      where: { id: entrada.unidadeId, customerId: cliente.id },
      select: { id: true },
    });
    if (!unidade) {
      return { erro: "Unidade não encontrada na sua conta.", campo: "unidadeId" };
    }
    locationId = unidade.id;
  }

  let categoryId: string | null = null;
  if (entrada.categoriaId) {
    const categoria = await prisma.category.findFirst({
      where: { id: entrada.categoriaId, published: true },
      select: { id: true },
    });
    categoryId = categoria?.id ?? null;
  }

  /* ------------------------------------------------------------- anexos */

  // Só quem tem sessão consegue enviar arquivo (a rota de upload exige), e o
  // anexo precisa ser recente e da pasta de chamados. Sem isso, um id de mídia
  // adivinhado grudaria o arquivo de outra pessoa neste chamado.
  let mediaIds: string[] = [];
  const pedidos = formData
    .getAll("midia")
    .map((valor) => String(valor).trim())
    .filter(Boolean)
    .slice(0, 8);

  if (pedidos.length > 0 && cliente) {
    const encontradas = await prisma.media.findMany({
      where: {
        id: { in: pedidos },
        folder: "chamados",
        createdAt: { gte: new Date(Date.now() - 6 * 60 * 60_000) },
      },
      select: { id: true },
    });
    const validas = new Set(encontradas.map((m) => m.id));
    mediaIds = pedidos.filter((id) => validas.has(id));
  }

  /* ------------------------------------------------------------ abertura */

  // O ServiceRequest não tem coluna para "quando começou" nem para "ainda
  // opera". Em vez de perder a informação, ela entra na descrição em duas
  // linhas fixas — é o que a triagem lê primeiro.
  const contexto = [
    entrada.comecou ? `Começou: ${entrada.comecou}.` : "",
    `Ainda opera: ${ROTULO_OPERACAO[entrada.aindaOpera].toLowerCase()}.`,
  ]
    .filter(Boolean)
    .join(" ");

  let numero = "";
  let chamadoId = "";

  try {
    const chamado = await abrirChamado({
      customerId: cliente?.id ?? null,
      equipmentId,
      locationId,
      contato: { nome: entrada.nome, email, telefone: entrada.telefone },
      equipamento: {
        categoryId,
        marca: entrada.marca,
        modelo: entrada.modelo,
        serie: entrada.serie,
      },
      problema: {
        tipo: entrada.tipoProblema,
        descricao: `${entrada.descricao}\n\n${contexto}`,
        urgencia: entrada.urgencia,
      },
      endereco: {
        cep: entrada.cep,
        logradouro: entrada.logradouro,
        numero: entrada.numero,
        complemento: entrada.complemento,
        bairro: entrada.bairro,
        cidade: entrada.cidade,
        uf: entrada.uf,
      },
      disponibilidade: entrada.disponibilidade,
      mediaIds,
    });

    numero = chamado.number;
    chamadoId = chamado.id;
  } catch (erro) {
    if (erro instanceof ErroDeAssistencia) return { erro: erro.message };
    console.error("Falha ao abrir chamado público", erro);
    return { erro: "Não conseguimos registrar o chamado agora. Tente de novo em instantes." };
  }

  registrarEnvioAceito("chamado", LIMITE_CHAMADO, { ip: conferencia.ip, email });

  // Quem acabou de abrir não precisa provar o contato para ver o próprio
  // chamado: o comprovante de acesso é gravado aqui, antes do redirecionamento.
  await liberarAcessoAoChamado(chamadoId, numero);

  const s = await getSettings();
  const resumo = [
    `Chamado ${numero}`,
    `Urgência: ${ROTULO_URGENCIA[entrada.urgencia]}`,
    `Contato: ${entrada.nome} — ${email} — ${formatarTelefone(entrada.telefone)}`,
    [entrada.marca, entrada.modelo].filter(Boolean).length
      ? `Equipamento: ${[entrada.marca, entrada.modelo].filter(Boolean).join(" ")}`
      : "",
    entrada.tipoProblema ? `Sintoma: ${entrada.tipoProblema}` : "",
    "",
    entrada.descricao,
    contexto,
  ]
    .filter(Boolean)
    .join("\n");

  await Promise.all([
    enfileirar({
      canal: "email",
      para: s.email,
      assunto: `Novo chamado ${numero} — ${ROTULO_URGENCIA[entrada.urgencia]}`,
      corpo: resumo,
      refTipo: "chamado_interno",
      refId: chamadoId,
      template: "chamado_aberto_equipe",
    }),
    enfileirar({
      canal: "email",
      para: email,
      assunto: `Recebemos seu chamado ${numero}`,
      corpo:
        `Olá, ${entrada.nome}.\n\n` +
        `Registramos seu chamado com o número ${numero}. ` +
        `Acompanhe o andamento em ${urlAbsoluta(`/chamado/${numero}`)}.\n\n` +
        `${s.empresa_nome} — ${s.telefone}`,
      refTipo: "chamado_cliente",
      refId: chamadoId,
      template: "chamado_aberto_cliente",
    }),
  ]);

  if (cliente) revalidatePath("/minha-jb/assistencia");
  revalidatePath("/admin/assistencia");

  // redirect() sinaliza a navegação lançando: fica fora de qualquer try/catch
  redirect(`/chamado/${numero}`);
}

/* ============================================================================
   Liberar o acompanhamento
   ============================================================================ */

const esquemaLiberar = z.object({
  numero: z.string().trim().min(3).max(24),
  contato: z.string().trim().min(5, "Informe o e-mail ou o telefone do chamado."),
});

/**
 * Compara o contato informado com o que foi registrado na abertura.
 *
 * A resposta é sempre a mesma quando falha — número inexistente e contato
 * errado dizem exatamente a mesma coisa. Sem isso, o formulário viraria uma
 * forma de descobrir quais números de chamado existem.
 */
/* ------------------------------------------------------- freio persistente */

const JANELA_LIBERACAO_MS = 15 * 60_000;
const LIMITE_POR_NUMERO = 5;
const LIMITE_POR_IP = 20;

/**
 * Freio contra adivinhação de número de chamado.
 *
 * O contador em memória não serve para isto: em serverless cada invocação pode
 * cair numa instância nova, então o limite reinicia sozinho. E o número é
 * sequencial (AT-000001, AT-000002...), o que torna a varredura trivial.
 * `LoginAttempt` é a tabela que a plataforma já usa para tentativas e sobrevive
 * entre instâncias — é ela que segura de verdade.
 */
async function tentativasDeLiberacao(numero: string, ip: string) {
  const desde = new Date(Date.now() - JANELA_LIBERACAO_MS);
  const identificador = `chamado:${numero}`;

  const [porNumero, porIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { identifier: identificador, success: false, createdAt: { gte: desde } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: {
            ip,
            // só tentativas de chamado: não divide orçamento com o login
            identifier: { startsWith: "chamado:" },
            success: false,
            createdAt: { gte: desde },
          },
        })
      : Promise.resolve(0),
  ]);

  return { bloqueado: porNumero >= LIMITE_POR_NUMERO || porIp >= LIMITE_POR_IP };
}

async function registrarTentativaDeLiberacao(numero: string, ip: string, acertou: boolean) {
  await prisma.loginAttempt.create({
    data: { identifier: `chamado:${numero}`, ip, success: acertou },
  });
}

export async function liberarChamado(
  _anterior: EstadoAssistencia,
  formData: FormData,
): Promise<EstadoAssistencia> {
  const dados = esquemaLiberar.safeParse({
    numero: formData.get("numero") ?? "",
    contato: formData.get("contato") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const ip = await ipDaRequisicao();
  const numero = dados.data.numero.toUpperCase();

  if ((await tentativasDeLiberacao(numero, ip)).bloqueado) {
    return { erro: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo." };
  }
  const chamado = await prisma.serviceRequest.findUnique({
    where: { number: numero },
    select: { id: true, number: true, contactEmail: true, contactPhone: true },
  });

  const informado = dados.data.contato.trim();
  const digitos = somenteDigitos(informado);
  const confere =
    chamado !== null &&
    (informado.toLowerCase() === chamado.contactEmail.toLowerCase() ||
      (digitos.length >= 10 && digitos === somenteDigitos(chamado.contactPhone)));

  await registrarTentativaDeLiberacao(numero, ip, confere);

  if (!chamado || !confere) {
    return {
      erro:
        "Não encontramos um chamado com esse número e esse contato. Confira o número " +
        "que você recebeu por e-mail e o contato usado na abertura.",
      campo: "contato",
    };
  }

  await liberarAcessoAoChamado(chamado.id, chamado.number);
  redirect(`/chamado/${chamado.number}`);
}

/* ============================================================================
   Responder o chamado
   ============================================================================ */

const esquemaResposta = z.object({
  numero: z.string().trim().min(3).max(24),
  mensagem: z
    .string()
    .trim()
    .min(5, "Escreva a sua mensagem.")
    .max(2000, "Mensagem longa demais. Resuma o essencial."),
});

/**
 * Grava a resposta do cliente na linha do tempo do chamado.
 *
 * Quando o atendimento estava parado esperando o cliente, a resposta o
 * devolve para a triagem — senão a mensagem chegaria e ninguém saberia que a
 * bola voltou para o lado da JB.
 */
export async function responderChamadoPublico(
  _anterior: EstadoAssistencia,
  formData: FormData,
): Promise<EstadoAssistencia> {
  const dados = esquemaResposta.safeParse({
    numero: formData.get("numero") ?? "",
    mensagem: formData.get("mensagem") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const numero = dados.data.numero.toUpperCase();
  const chamado = await prisma.serviceRequest.findUnique({
    where: { number: numero },
    select: {
      id: true,
      number: true,
      customerId: true,
      status: true,
      contactName: true,
      contactEmail: true,
    },
  });

  if (!chamado || !(await podeVerChamado(chamado))) {
    return { erro: "Este chamado não está liberado para você." };
  }

  if (chamado.status === "concluido" || chamado.status === "cancelado") {
    return { erro: "Este chamado já foi encerrado. Para um novo atendimento, abra outro." };
  }

  const ip = await ipDaRequisicao();
  // O escopo carrega o id do chamado: quem responde dois chamados diferentes
  // não gasta o limite de um no outro.
  const escopoDaResposta = `resposta:${chamado.id}`;
  const chave = chaveDeIp(ip, escopoDaResposta);
  if (
    usosNaJanela(chave, LIMITE_RESPOSTA_CHAMADO.porIp.janelaMs) >=
    LIMITE_RESPOSTA_CHAMADO.porIp.limite
  ) {
    return { erro: "Muitas mensagens seguidas. Espere alguns minutos." };
  }

  try {
    await prisma.serviceRequestEvent.create({
      data: {
        requestId: chamado.id,
        title: `Mensagem de ${chamado.contactName}`,
        message: dados.data.mensagem,
        visibleToCustomer: true,
      },
    });

    if (chamado.status === "aguardando_cliente") {
      await mudarStatusChamado(chamado.id, "triagem", {
        titulo: "Resposta recebida",
        nota: "Recebemos sua resposta e o chamado voltou para a fila da equipe técnica.",
      });
    }
  } catch (erro) {
    console.error("Falha ao registrar resposta do chamado", erro);
    return { erro: "Não conseguimos registrar a mensagem agora. Tente de novo." };
  }

  registrarEnvioAceito(escopoDaResposta, LIMITE_RESPOSTA_CHAMADO, { ip });

  const s = await getSettings();
  await enfileirar({
    canal: "email",
    para: s.email,
    assunto: `Resposta do cliente no chamado ${chamado.number}`,
    corpo: `${chamado.contactName} (${chamado.contactEmail}):\n\n${dados.data.mensagem}`,
    refTipo: "chamado_resposta",
    refId: `${chamado.id}:${Date.now()}`,
    template: "chamado_resposta_cliente",
  });

  revalidatePath(`/chamado/${chamado.number}`);
  if (chamado.customerId) revalidatePath("/minha-jb/assistencia");
  revalidatePath("/admin/assistencia");

  return { ok: "Mensagem enviada. A equipe responde por aqui e pelo e-mail do chamado." };
}

/* ============================================================================
   Pedido de orçamento
   ============================================================================ */

const esquemaOrcamento = z.object({
  tipo: z.enum(["compra", "servico", "plano"]).default("compra"),
  prazo: z.string().trim().max(60).default(""),
  mensagem: z.string().trim().max(3000).default(""),
  nome: z.string().trim().min(3, "Informe seu nome completo."),
  empresa: z.string().trim().max(120).default(""),
  email: z.email("Informe um e-mail válido."),
  telefone: z.string().trim().min(10, "Informe o telefone com DDD."),
  cidade: z.string().trim().max(80).default(""),
  uf: z.string().trim().max(2).default(""),
  novidades: z.coerce.boolean().default(false),
});

/** Máximo de pedidos vindos do mesmo IP na última hora, contado no banco. */
const MAX_LEADS_POR_IP = 8;

/** Mesma recusa para orçamento e plano: os dois nascem Lead pela mesma porta. */
const RECUSA_POR_VOLUME =
  "Recebemos pedidos demais deste acesso na última hora. " +
  "Se for urgente, fale com a JB pelo telefone ou pelo WhatsApp.";

async function excedeuLeadsDoIp(ip: string) {
  if (!ip) return false;
  const recentes = await prisma.lead.count({
    where: { ip, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
  });
  return recentes >= MAX_LEADS_POR_IP;
}

/**
 * Pedido de orçamento geral.
 *
 * O Lead é sempre criado — é a porta de entrada comercial. O Quote em
 * rascunho só nasce quando há itens descritos: proposta sem item é papel em
 * branco no painel. Plano de manutenção nunca vira proposta automática, porque
 * o preço depende de quantos equipamentos entram na cobertura.
 */
export async function pedirOrcamento(
  _anterior: EstadoAssistencia,
  formData: FormData,
): Promise<EstadoAssistencia> {
  const conferencia = await conferirEnvio(formData, {
    escopo: "orcamento",
    limites: LIMITE_ORCAMENTO,
    limiteBrando: 2,
  });
  if (!conferencia.ok) return conferencia.estado;

  const dados = esquemaOrcamento.safeParse({
    tipo: formData.get("tipo") ?? "compra",
    prazo: formData.get("prazo") ?? "",
    mensagem: formData.get("mensagem") ?? "",
    nome: formData.get("nome") ?? "",
    empresa: formData.get("empresa") ?? "",
    email: formData.get("email") ?? "",
    telefone: formData.get("telefone") ?? "",
    cidade: formData.get("cidade") ?? "",
    uf: formData.get("uf") ?? "",
    novidades: formData.get("novidades") === "on",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const entrada = dados.data;
  if (somenteDigitos(entrada.telefone).length < 10) {
    return { erro: "Informe o telefone com DDD.", campo: "telefone" };
  }

  const descricoes = formData
    .getAll("item_descricao")
    .map((valor) => String(valor).trim())
    .slice(0, 15);
  const quantidades = formData.getAll("item_quantidade").map((valor) => Number(valor));

  const itens = descricoes
    .map((descricao, i) => ({ descricao, quantidade: quantidades[i] }))
    .filter((item) => item.descricao.length > 1)
    .map((item) => ({
      descricao: item.descricao.slice(0, 300),
      quantidade: Number.isFinite(item.quantidade)
        ? Math.min(Math.max(Math.trunc(item.quantidade) || 1, 1), 999)
        : 1,
      valorUnitarioCents: 0,
    }));

  if (itens.length === 0 && !entrada.mensagem) {
    return {
      erro: "Liste ao menos um item desejado ou escreva o que você precisa.",
      campo: "item_descricao",
    };
  }

  const emailDoPedido = entrada.email.toLowerCase();
  if (
    excedeuPorEmail("orcamento", LIMITE_ORCAMENTO, emailDoPedido) ||
    (await excedeuLeadsDoIp(conferencia.ip))
  ) {
    return { erro: RECUSA_POR_VOLUME };
  }

  const cliente = await sessaoCliente();
  const email = emailDoPedido;
  const agente = await agenteDaRequisicao();

  const observacao = [
    `Tipo: ${ROTULO_TIPO_PEDIDO[entrada.tipo]}`,
    entrada.empresa ? `Clínica: ${entrada.empresa}` : "",
    entrada.prazo ? `Prazo desejado: ${entrada.prazo}` : "",
    itens.length > 0
      ? `Itens: ${itens.map((i) => `${i.quantidade}x ${i.descricao}`).join(" | ")}`
      : "",
    entrada.mensagem,
  ]
    .filter(Boolean)
    .join("\n");

  let numeroDoOrcamento = "";

  try {
    await prisma.lead.create({
      data: {
        nome: entrada.nome,
        email,
        telefone: entrada.telefone,
        cidade: entrada.cidade,
        estado: entrada.uf.toUpperCase(),
        obs: observacao.slice(0, 4000),
        news: entrada.novidades,
        ip: conferencia.ip,
        userAgent: agente,
      },
    });

    if (itens.length > 0 && entrada.tipo !== "plano") {
      const orcamento = await criarOrcamento({
        kind: entrada.tipo === "compra" ? "comercial" : "assistencia",
        customerId: cliente?.id ?? null,
        contato: { nome: entrada.nome, email, telefone: entrada.telefone },
        mensagem: [entrada.prazo ? `Prazo desejado: ${entrada.prazo}` : "", entrada.mensagem]
          .filter(Boolean)
          .join("\n\n"),
        notaInterna: `Pedido pelo site${entrada.empresa ? ` — ${entrada.empresa}` : ""}.`,
        itens,
      });
      numeroDoOrcamento = orcamento.number;
    }
  } catch (erro) {
    if (erro instanceof ErroDeOrcamento) return { erro: erro.message };
    console.error("Falha ao registrar pedido de orçamento", erro);
    return { erro: "Não conseguimos registrar seu pedido agora. Tente de novo." };
  }

  registrarEnvioAceito("orcamento", LIMITE_ORCAMENTO, { ip: conferencia.ip, email });

  const s = await getSettings();
  const marca = `${email}:${Date.now()}`;

  await Promise.all([
    enfileirar({
      canal: "email",
      para: s.email,
      assunto: numeroDoOrcamento
        ? `Pedido de orçamento ${numeroDoOrcamento} — ${ROTULO_TIPO_PEDIDO[entrada.tipo]}`
        : `Pedido de orçamento — ${ROTULO_TIPO_PEDIDO[entrada.tipo]}`,
      corpo: `${entrada.nome} — ${email} — ${formatarTelefone(entrada.telefone)}\n\n${observacao}`,
      refTipo: "orcamento_interno",
      refId: marca,
      template: "orcamento_pedido_equipe",
    }),
    enfileirar({
      canal: "email",
      para: email,
      assunto: "Recebemos seu pedido de orçamento",
      corpo:
        `Olá, ${entrada.nome}.\n\n` +
        (numeroDoOrcamento
          ? `Seu pedido virou a proposta ${numeroDoOrcamento}, que a equipe está montando. `
          : "Recebemos seu pedido e a equipe já está analisando. ") +
        `Retornamos pelo e-mail ou pelo telefone informado.\n\n${s.empresa_nome} — ${s.telefone}`,
      refTipo: "orcamento_cliente",
      refId: marca,
      template: "orcamento_pedido_cliente",
    }),
  ]);

  revalidatePath("/admin/leads");
  revalidatePath("/admin/orcamentos");
  if (cliente) revalidatePath("/minha-jb/orcamentos");

  return {
    ok: numeroDoOrcamento
      ? `Pedido recebido. A proposta ${numeroDoOrcamento} está sendo montada pela equipe.`
      : "Pedido recebido. A equipe da JB entra em contato pelo e-mail ou telefone informado.",
    numero: numeroDoOrcamento || undefined,
  };
}

/* ============================================================================
   Interesse em plano de manutenção
   ============================================================================ */

const esquemaPlano = z.object({
  plano: z.string().trim().min(1, "Escolha um plano."),
  equipamentos: z.coerce
    .number()
    .int()
    .min(1, "Informe quantos equipamentos entram na cobertura.")
    .max(999)
    .default(1),
  nome: z.string().trim().min(3, "Informe seu nome completo."),
  empresa: z.string().trim().max(120).default(""),
  email: z.email("Informe um e-mail válido."),
  telefone: z.string().trim().min(10, "Informe o telefone com DDD."),
  cidade: z.string().trim().max(80).default(""),
  uf: z.string().trim().max(2).default(""),
  mensagem: z.string().trim().max(2000).default(""),
  /* Resumo da calculadora de parada, trazido pelo formulário. É texto gerado
     pelo próprio site, mas chega pelo navegador e por isso é tratado como
     entrada não confiável: limite de tamanho e nada além de anexar à
     observação do lead. Não alimenta cálculo nem decisão. */
  premissas: z.string().trim().max(1000).default(""),
  novidades: z.coerce.boolean().default(false),
});

/**
 * Interesse em um plano de manutenção.
 *
 * Gera Lead e mensagem na fila — não gera contrato. O contrato depende de
 * saber quais equipamentos entram na cobertura, e isso é conversa com a
 * equipe, não campo de formulário.
 */
export async function interesseEmPlano(
  _anterior: EstadoAssistencia,
  formData: FormData,
): Promise<EstadoAssistencia> {
  const conferencia = await conferirEnvio(formData, {
    escopo: "plano",
    limites: LIMITE_ORCAMENTO,
    limiteBrando: 2,
  });
  if (!conferencia.ok) return conferencia.estado;

  const dados = esquemaPlano.safeParse({
    plano: formData.get("plano") ?? "",
    equipamentos: formData.get("equipamentos") ?? 1,
    nome: formData.get("nome") ?? "",
    empresa: formData.get("empresa") ?? "",
    email: formData.get("email") ?? "",
    telefone: formData.get("telefone") ?? "",
    cidade: formData.get("cidade") ?? "",
    uf: formData.get("uf") ?? "",
    mensagem: formData.get("mensagem") ?? "",
    premissas: formData.get("premissas") ?? "",
    novidades: formData.get("novidades") === "on",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const entrada = dados.data;
  if (somenteDigitos(entrada.telefone).length < 10) {
    return { erro: "Informe o telefone com DDD.", campo: "telefone" };
  }

  const plano = await prisma.maintenancePlan.findFirst({
    where: { slug: entrada.plano, published: true },
    select: { id: true, name: true },
  });
  if (!plano) {
    return { erro: "Este plano não está mais disponível. Escolha outro.", campo: "plano" };
  }

  const email = entrada.email.toLowerCase();
  if (
    excedeuPorEmail("plano", LIMITE_ORCAMENTO, email) ||
    (await excedeuLeadsDoIp(conferencia.ip))
  ) {
    return { erro: RECUSA_POR_VOLUME };
  }

  const agente = await agenteDaRequisicao();

  /* As premissas da calculadora entram no lead porque é isso que torna o
     contato útil para a equipe: sem elas, a proposta começa perguntando de
     novo o que a pessoa já respondeu. Vão para o CRM interno, nunca para
     analytics — dado financeiro de clínica não é métrica de produto. */
  const observacao = [
    `Interesse no plano: ${plano.name}`,
    `Equipamentos a cobrir: ${entrada.equipamentos}`,
    entrada.empresa ? `Clínica: ${entrada.empresa}` : "",
    entrada.mensagem,
    entrada.premissas
      ? `\nPremissas da simulação de parada:\n${entrada.premissas}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await prisma.lead.create({
      data: {
        nome: entrada.nome,
        email,
        telefone: entrada.telefone,
        cidade: entrada.cidade,
        estado: entrada.uf.toUpperCase(),
        obs: observacao.slice(0, 4000),
        news: entrada.novidades,
        ip: conferencia.ip,
        userAgent: agente,
      },
    });
  } catch (erro) {
    console.error("Falha ao registrar interesse em plano", erro);
    return { erro: "Não conseguimos registrar seu interesse agora. Tente de novo." };
  }

  registrarEnvioAceito("plano", LIMITE_ORCAMENTO, { ip: conferencia.ip, email });

  const s = await getSettings();
  const marca = `${plano.id}:${email}:${Date.now()}`;

  await Promise.all([
    enfileirar({
      canal: "email",
      para: s.email,
      assunto: `Interesse no plano ${plano.name}`,
      corpo: `${entrada.nome} — ${email} — ${formatarTelefone(entrada.telefone)}\n\n${observacao}`,
      refTipo: "plano_interno",
      refId: marca,
      template: "plano_interesse_equipe",
    }),
    enfileirar({
      canal: "email",
      para: email,
      assunto: `Seu interesse no plano ${plano.name}`,
      corpo:
        `Olá, ${entrada.nome}.\n\n` +
        `Recebemos seu interesse no plano ${plano.name} para ${entrada.equipamentos} ` +
        `equipamento(s). A equipe entra em contato para montar a cobertura.\n\n` +
        `${s.empresa_nome} — ${s.telefone}`,
      refTipo: "plano_cliente",
      refId: marca,
      template: "plano_interesse_cliente",
    }),
  ]);

  revalidatePath("/admin/leads");

  return {
    ok: `Interesse registrado no plano ${plano.name}. A equipe entra em contato para montar a cobertura.`,
  };
}
