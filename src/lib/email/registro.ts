import "server-only";

import crypto from "node:crypto";

import { ROTULO_CHAMADO, ROTULO_URGENCIA } from "@/lib/assistencia";
import type { MensagemDeEmail, ProvedorDeEmail, ResultadoEnvio } from "@/lib/email/tipos";
import { formatarDataHora, formatarPreco, formatarTelefone } from "@/lib/format";
import { TIPOS_NOTIFICACAO, type TipoNotificacao } from "@/lib/notificacoes";
import { ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { urlAbsoluta } from "@/lib/seo";
import { getSettings, type SettingsMap } from "@/lib/settings";

/**
 * REGISTRO — os modelos de mensagem e o provedor que apenas registra.
 *
 * As duas coisas moram juntas porque respondem à mesma pergunta: "o que a JB
 * teria mandado?". Uma monta o texto, a outra deixa esse texto visível quando
 * não há provedor de entrega configurado.
 *
 * POR QUE O TEXTO PRECISA SER REMONTADO
 *
 * `OutboundMessage` (prisma/schema.prisma) guarda canal, destinatário,
 * template, chave de deduplicação, status e erro — NÃO guarda assunto nem
 * corpo. O schema está congelado, então o corpo é reconstruído aqui a partir
 * do nome do template e da referência escondida na `dedupeKey`, que segue o
 * formato `canal|template|refTipo|refId` (ver `chaveDeDeduplicacao` em
 * `@/lib/notificacoes`). É por isso que cada modelo vai ao banco buscar o
 * pedido, o chamado ou o orçamento: a verdade está no registro, não na fila.
 *
 * REGRA DURA: template desconhecido não explode a fila. `montarMensagem`
 * devolve `{ ok: false }` com o motivo, o processador marca aquela linha como
 * falha e continua no lote.
 */

/* ------------------------------------------------------------ referência */

/** O que o processador precisa saber da linha da fila para montar o texto. */
export type LinhaDaFila = {
  id: string;
  channel: string;
  to: string;
  template: string;
  dedupeKey: string;
  createdAt: Date;
};

export type Referencia = {
  canal: string;
  template: string;
  /** O que originou a mensagem: "pedido", "chamado", "orcamento"… */
  refTipo: string;
  refId: string;
};

/**
 * Lê a referência escondida na `dedupeKey`.
 *
 * Chave canônica tem quatro partes. Quem enfileira com chave própria (o
 * orçamento usa `…|orcamento|<id>:v<versão>`) continua caindo aqui, porque só
 * as três primeiras barras contam — o resto inteiro é o `refId`. Chave fora do
 * formato devolve `refTipo` e `refId` vazios, e cabe a cada modelo decidir se
 * consegue trabalhar assim.
 */
export function lerReferencia(linha: LinhaDaFila): Referencia {
  const partes = linha.dedupeKey.split("|");
  if (partes.length < 4) {
    return { canal: linha.channel, template: linha.template, refTipo: "", refId: "" };
  }
  return {
    canal: partes[0],
    template: partes[1],
    refTipo: partes[2],
    refId: partes.slice(3).join("|"),
  };
}

/** `<id>:v3` e `<id>:1757030400000` viram `<id>`. */
function idBase(refId: string) {
  const corte = refId.indexOf(":");
  return corte === -1 ? refId : refId.slice(0, corte);
}

/* --------------------------------------------------------------- conteúdo */

export type Conteudo = { assunto: string; texto: string; html: string };

export type ResultadoModelo = { ok: true; conteudo: Conteudo } | { ok: false; erro: string };

/** Modelo que não consegue montar o texto lança isto, com o motivo pronto. */
export class ErroDeModelo extends Error {}

type ContextoModelo = {
  linha: LinhaDaFila;
  referencia: Referencia;
  s: SettingsMap;
};

type Modelo = {
  rotulo: string;
  montar: (contexto: ContextoModelo) => Promise<Omit<Conteudo, "html">>;
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (caractere) => ESCAPES[caractere]);
}

/**
 * HTML a partir do texto puro.
 *
 * Nada de framework de e-mail: uma tabela boba com estilo em linha é o que
 * atravessa Outlook, Gmail e webmail de hospedagem sem surpresa. Links viram
 * `<a>`; todo o resto é escapado, então nome de cliente com `<` não injeta
 * marcação em ninguém.
 */
function paraHtml(assunto: string, texto: string, s: SettingsMap) {
  const paragrafos = texto
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => {
      const corpo = escapar(bloco)
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color:#0f766e;text-decoration:underline">$1</a>',
        )
        .replace(/\n/g, "<br />");
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937">${corpo}</p>`;
    })
    .join("");

  return [
    '<div style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">',
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">',
    `<h1 style="margin:0 0 20px;font-size:18px;line-height:1.4;color:#0f172a">${escapar(assunto)}</h1>`,
    paragrafos,
    `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#64748b">${escapar(
      `${s.empresa_nome} · ${s.telefone} · ${s.email}`,
    )}</p>`,
    "</div>",
    "</div>",
  ].join("");
}

/** Rodapé de texto puro, igual em toda mensagem que sai para o cliente. */
function assinatura(s: SettingsMap) {
  return `${s.empresa_nome}\n${s.telefone} · ${s.email}\n${urlAbsoluta("/")}`;
}

function juntar(linhas: (string | null | undefined | false)[]) {
  return linhas.filter((linha): linha is string => Boolean(linha)).join("\n");
}

/* ---------------------------------------------------------------- modelos */

/**
 * Link de redefinição de senha.
 *
 * O token só existe em claro no instante em que é gerado — o banco guarda o
 * hash (`PasswordResetToken.tokenHash`). Quando a `dedupeKey` traz o token
 * inteiro no `refId`, o link é remontado do jeito certo. Quando não traz (o
 * fluxo atual de `@/app/acoes/conta.ts` grava só um prefixo de 24 caracteres),
 * não há como reconstruir: a mensagem falha com um motivo claro em vez de sair
 * com um link quebrado.
 */
const MODELO_SENHA: Modelo = {
  rotulo: "Recuperação de senha",
  async montar({ linha, referencia, s }) {
    const token = referencia.refId.trim();
    if (!token || token.length < 32) {
      throw new ErroDeModelo(
        "Token de redefinição não recuperável a partir da fila. Peça um link novo em /recuperar-senha.",
      );
    }

    const link = urlAbsoluta(`/redefinir-senha?token=${encodeURIComponent(token)}`);
    const cliente = await prisma.customer.findUnique({
      where: { email: linha.to },
      select: { name: true },
    });

    return {
      assunto: `Redefinição de senha — ${s.empresa_nome}`,
      texto: juntar([
        cliente?.name ? `Olá, ${cliente.name}.` : "Olá.",
        "",
        "Recebemos um pedido para redefinir a senha da sua conta na JB.",
        "",
        `Abra este link para escolher uma senha nova: ${link}`,
        "",
        "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você que pediu, ignore esta mensagem: a senha atual continua valendo.",
        "",
        assinatura(s),
      ]),
    };
  },
};

async function pedidoDaReferencia(refId: string) {
  const pedido = await prisma.order.findUnique({
    where: { id: idBase(refId) },
    select: {
      number: true,
      status: true,
      buyerName: true,
      totalCents: true,
      placedAt: true,
      paidAt: true,
      shippingKind: true,
    },
  });
  if (!pedido) throw new ErroDeModelo(`Pedido ${refId} não existe mais.`);
  return pedido;
}

const MODELO_PEDIDO_RECEBIDO: Modelo = {
  rotulo: "Pedido recebido",
  async montar({ referencia, s }) {
    const pedido = await pedidoDaReferencia(referencia.refId);
    const link = urlAbsoluta(`/pedido/${pedido.number}`);

    return {
      assunto: `Recebemos seu pedido ${pedido.number}`,
      texto: juntar([
        `Olá, ${pedido.buyerName}.`,
        "",
        `Seu pedido ${pedido.number} foi registrado em ${formatarDataHora(pedido.placedAt)}, no valor de ${formatarPreco(pedido.totalCents)}.`,
        `Situação agora: ${ROTULO_STATUS[pedido.status]}.`,
        "",
        `Acompanhe por aqui: ${link}`,
        "",
        assinatura(s),
      ]),
    };
  },
};

const MODELO_PAGAMENTO_APROVADO: Modelo = {
  rotulo: "Pagamento aprovado",
  async montar({ referencia, s }) {
    const pedido = await pedidoDaReferencia(referencia.refId);
    const link = urlAbsoluta(`/pedido/${pedido.number}`);
    const entrega =
      pedido.shippingKind === "retirada"
        ? "Assim que estiver separado, avisamos para você retirar no endereço da JB."
        : "O próximo passo é a separação e o envio. Avisamos quando sair para entrega.";

    return {
      assunto: `Pagamento aprovado — pedido ${pedido.number}`,
      texto: juntar([
        `Olá, ${pedido.buyerName}.`,
        "",
        `O pagamento do pedido ${pedido.number}, de ${formatarPreco(pedido.totalCents)}, foi aprovado${
          pedido.paidAt ? ` em ${formatarDataHora(pedido.paidAt)}` : ""
        }.`,
        entrega,
        "",
        `Detalhes do pedido: ${link}`,
        "",
        assinatura(s),
      ]),
    };
  },
};

const MODELO_ORCAMENTO_ENVIADO: Modelo = {
  rotulo: "Orçamento enviado",
  async montar({ referencia, s }) {
    const orcamento = await prisma.quote.findUnique({
      where: { id: idBase(referencia.refId) },
      select: {
        number: true,
        version: true,
        contactName: true,
        totalCents: true,
        validUntil: true,
        message: true,
        customerId: true,
      },
    });
    if (!orcamento) throw new ErroDeModelo(`Orçamento ${referencia.refId} não existe mais.`);

    // Cliente com conta abre pela área dele; sem conta, pela página pública.
    const link = orcamento.customerId
      ? urlAbsoluta(`/minha-jb/orcamentos/${orcamento.number}`)
      : urlAbsoluta("/orcamento");

    return {
      assunto: `Orçamento ${orcamento.number} — ${s.empresa_nome}`,
      texto: juntar([
        orcamento.contactName ? `Olá, ${orcamento.contactName}.` : "Olá.",
        "",
        `Segue o orçamento ${orcamento.number}${orcamento.version > 1 ? ` (revisão ${orcamento.version})` : ""}, no valor de ${formatarPreco(orcamento.totalCents)}.`,
        orcamento.validUntil ? `A proposta vale até ${formatarDataHora(orcamento.validUntil)}.` : "",
        orcamento.message ? `\n${orcamento.message}` : "",
        "",
        `Para ver os itens e aprovar: ${link}`,
        "",
        assinatura(s),
      ]),
    };
  },
};

async function chamadoDaReferencia(refId: string) {
  const chamado = await prisma.serviceRequest.findUnique({
    where: { id: idBase(refId) },
    select: {
      number: true,
      status: true,
      urgency: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      brandName: true,
      modelName: true,
      description: true,
      addressCity: true,
      addressState: true,
      createdAt: true,
    },
  });
  if (!chamado) throw new ErroDeModelo(`Chamado ${refId} não existe mais.`);
  return chamado;
}

const MODELO_CHAMADO_CLIENTE: Modelo = {
  rotulo: "Chamado aberto — cliente",
  async montar({ referencia, s }) {
    const chamado = await chamadoDaReferencia(referencia.refId);
    const link = urlAbsoluta(`/chamado/${chamado.number}`);

    return {
      assunto: `Recebemos seu chamado ${chamado.number}`,
      texto: juntar([
        `Olá, ${chamado.contactName}.`,
        "",
        `Registramos seu chamado com o número ${chamado.number}. Situação agora: ${ROTULO_CHAMADO[chamado.status]}.`,
        `Acompanhe o andamento em ${link}`,
        "",
        assinatura(s),
      ]),
    };
  },
};

const MODELO_CHAMADO_EQUIPE: Modelo = {
  rotulo: "Chamado aberto — equipe",
  async montar({ referencia }) {
    const chamado = await chamadoDaReferencia(referencia.refId);
    const equipamento = [chamado.brandName, chamado.modelName].filter(Boolean).join(" ");

    return {
      assunto: `Novo chamado ${chamado.number} — ${ROTULO_URGENCIA[chamado.urgency]}`,
      texto: juntar([
        `Chamado ${chamado.number}, aberto em ${formatarDataHora(chamado.createdAt)}.`,
        "",
        `Cliente: ${chamado.contactName} — ${chamado.contactEmail}${
          chamado.contactPhone ? ` — ${formatarTelefone(chamado.contactPhone)}` : ""
        }`,
        equipamento ? `Equipamento: ${equipamento}` : "",
        chamado.addressCity ? `Local: ${chamado.addressCity}/${chamado.addressState}` : "",
        `Urgência: ${ROTULO_URGENCIA[chamado.urgency]}`,
        "",
        chamado.description,
        "",
        `Abrir no painel: ${urlAbsoluta("/admin/assistencia")}`,
      ]),
    };
  },
};

const MODELO_CHAMADO_RESPOSTA: Modelo = {
  rotulo: "Resposta do cliente no chamado",
  async montar({ referencia }) {
    const chamado = await chamadoDaReferencia(referencia.refId);

    // O texto da resposta vive em ServiceRequestEvent, não na fila: em vez de
    // inventar o conteúdo, a mensagem leva a equipe direto ao chamado.
    return {
      assunto: `Resposta do cliente no chamado ${chamado.number}`,
      texto: juntar([
        `${chamado.contactName} (${chamado.contactEmail}) respondeu no chamado ${chamado.number}.`,
        "",
        `Leia e responda no painel: ${urlAbsoluta("/admin/assistencia")}`,
      ]),
    };
  },
};

const MODELO_VISITA_AGENDADA: Modelo = {
  rotulo: "Visita agendada",
  async montar({ referencia, s }) {
    const visita = await prisma.maintenanceVisit.findUnique({
      where: { id: idBase(referencia.refId) },
      select: {
        status: true,
        dueAt: true,
        scheduledAt: true,
        notes: true,
        equipment: {
          select: {
            name: true,
            brandName: true,
            modelName: true,
            room: true,
            customer: { select: { name: true } },
          },
        },
        // Technician não tem nome próprio no schema: o nome é o do User ligado.
        technician: { select: { user: { select: { name: true } } } },
        contract: { select: { number: true } },
      },
    });
    if (!visita) throw new ErroDeModelo(`Visita ${referencia.refId} não existe mais.`);

    const quando = visita.scheduledAt ?? visita.dueAt;
    const equipamento = [visita.equipment.name, visita.equipment.brandName, visita.equipment.modelName]
      .filter(Boolean)
      .join(" ");

    return {
      assunto: `Visita de manutenção agendada para ${formatarDataHora(quando)}`,
      texto: juntar([
        `Olá, ${visita.equipment.customer.name}.`,
        "",
        `A visita de manutenção do equipamento ${equipamento} está agendada para ${formatarDataHora(quando)}.`,
        visita.equipment.room ? `Local no consultório: ${visita.equipment.room}.` : "",
        visita.technician ? `Técnico responsável: ${visita.technician.user.name}.` : "",
        visita.contract ? `Contrato: ${visita.contract.number}.` : "",
        visita.notes ? `\nObservação: ${visita.notes}` : "",
        "",
        `Suas manutenções ficam em ${urlAbsoluta("/minha-jb/manutencoes")}`,
        "",
        assinatura(s),
      ]),
    };
  },
};

const MODELO_CONTATO_SITE: Modelo = {
  rotulo: "Contato pelo site",
  async montar({ referencia }) {
    const lead = await prisma.lead.findUnique({
      where: { id: idBase(referencia.refId) },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cidade: true,
        estado: true,
        obs: true,
        news: true,
        createdAt: true,
      },
    });
    if (!lead) throw new ErroDeModelo(`Contato ${referencia.refId} não existe mais.`);

    return {
      assunto: `Contato pelo site — ${lead.nome}`,
      texto: juntar([
        `Recebido em ${formatarDataHora(lead.createdAt)}.`,
        "",
        `Nome: ${lead.nome}`,
        `E-mail: ${lead.email}`,
        lead.telefone ? `Telefone: ${formatarTelefone(lead.telefone)}` : "",
        lead.cidade ? `Cidade: ${lead.cidade}${lead.estado ? `/${lead.estado}` : ""}` : "",
        lead.news ? "Aceita receber novidades: sim" : "",
        "",
        lead.obs,
        "",
        `Abrir no painel: ${urlAbsoluta(`/admin/leads/${lead.id}`)}`,
      ]),
    };
  },
};

/**
 * Pedido de orçamento e interesse em plano feitos pelo site.
 *
 * Aqui o `refId` é `email:timestamp` — uma marca de unicidade, não um id de
 * registro. Não há o que buscar no banco, então a mensagem diz o que é
 * verdade: quem procurou, quando, e onde a equipe encontra o cadastro.
 */
function modeloDeInteresseInterno(rotulo: string, titulo: string, destino: string): Modelo {
  return {
    rotulo,
    async montar({ referencia, linha }) {
      const contato = idBase(referencia.refId) || "contato não identificado";
      return {
        assunto: titulo,
        texto: juntar([
          `${titulo}, registrado em ${formatarDataHora(linha.createdAt)}.`,
          "",
          `Contato informado: ${contato}`,
          "",
          `Os dados completos estão no painel: ${urlAbsoluta(destino)}`,
        ]),
      };
    },
  };
}

function modeloDeInteresseCliente(rotulo: string, assunto: string, corpo: string): Modelo {
  return {
    rotulo,
    async montar({ s }) {
      return {
        assunto,
        texto: juntar(["Olá.", "", corpo, "", assinatura(s)]),
      };
    },
  };
}

/**
 * Aviso interno para a equipe.
 *
 * `notificar()` manda avisos de pessoa da equipe para a fila porque não existe
 * caixa de avisos para `User` no banco. Título e corpo não são guardados em
 * lugar nenhum, então a mensagem avisa o tipo e leva ao painel — nada é
 * inventado para preencher o espaço.
 */
const MODELO_AVISO: Modelo = {
  rotulo: "Aviso interno",
  async montar({ linha, referencia }) {
    const tipo = linha.template.replace(/^aviso_/, "");
    const nomeDoTipo =
      tipo in TIPOS_NOTIFICACAO ? TIPOS_NOTIFICACAO[tipo as TipoNotificacao] : "Aviso";

    const userId = idBase(referencia.refId);
    const pessoa = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      : null;

    return {
      assunto: `${nomeDoTipo} — painel da JB`,
      texto: juntar([
        pessoa?.name ? `Olá, ${pessoa.name}.` : "Olá.",
        "",
        `Há um aviso de ${nomeDoTipo.toLowerCase()} registrado para você em ${formatarDataHora(linha.createdAt)}.`,
        "",
        `Abra o painel para ver: ${urlAbsoluta("/admin")}`,
      ]),
    };
  },
};

const MODELOS: Record<string, Modelo> = {
  senha_reset: MODELO_SENHA,
  pedido_recebido: MODELO_PEDIDO_RECEBIDO,
  pagamento_aprovado: MODELO_PAGAMENTO_APROVADO,
  orcamento_enviado: MODELO_ORCAMENTO_ENVIADO,
  chamado_aberto_cliente: MODELO_CHAMADO_CLIENTE,
  chamado_aberto_equipe: MODELO_CHAMADO_EQUIPE,
  chamado_resposta_cliente: MODELO_CHAMADO_RESPOSTA,
  visita_agendada: MODELO_VISITA_AGENDADA,
  contato_site: MODELO_CONTATO_SITE,
  orcamento_pedido_equipe: modeloDeInteresseInterno(
    "Pedido de orçamento — equipe",
    "Pedido de orçamento pelo site",
    "/admin/orcamentos",
  ),
  orcamento_pedido_cliente: modeloDeInteresseCliente(
    "Pedido de orçamento — cliente",
    "Recebemos seu pedido de orçamento",
    "Recebemos seu pedido de orçamento e a equipe já está montando a proposta. Retornamos pelo e-mail ou pelo telefone informado.",
  ),
  plano_interesse_equipe: modeloDeInteresseInterno(
    "Interesse em plano — equipe",
    "Interesse em plano de manutenção",
    "/admin/leads",
  ),
  plano_interesse_cliente: modeloDeInteresseCliente(
    "Interesse em plano — cliente",
    "Recebemos seu interesse no plano de manutenção",
    "Recebemos seu interesse no plano de manutenção preventiva. A equipe entra em contato para montar a cobertura do seu parque de equipamentos.",
  ),
};

/** Modelos oferecidos no filtro da tela da fila. */
export const MODELOS_DISPONIVEIS = Object.entries(MODELOS)
  .map(([chave, modelo]) => ({ chave, rotulo: modelo.rotulo }))
  .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

function modeloDe(template: string): Modelo | null {
  if (template in MODELOS) return MODELOS[template];
  // `notificar()` gera um template por tipo de aviso: aviso_pedido, aviso_os…
  if (template.startsWith("aviso_")) return MODELO_AVISO;
  return null;
}

/** Nome legível do template, para a tela. Desconhecido devolve o nome cru. */
export function rotuloDeModelo(template: string) {
  return modeloDe(template)?.rotulo ?? template;
}

export function modeloConhecido(template: string) {
  return modeloDe(template) !== null;
}

/**
 * Remonta assunto, texto e HTML de uma linha da fila.
 *
 * Nunca lança: qualquer falha vira `{ ok: false, erro }` para o processador
 * gravar na linha e seguir para a próxima mensagem.
 */
export async function montarMensagem(linha: LinhaDaFila): Promise<ResultadoModelo> {
  const modelo = modeloDe(linha.template);
  if (!modelo) {
    return { ok: false, erro: `Template desconhecido: "${linha.template}".` };
  }

  try {
    const s = await getSettings();
    const referencia = lerReferencia(linha);
    const parcial = await modelo.montar({ linha, referencia, s });

    const assunto = parcial.assunto.replace(/\s+/g, " ").trim().slice(0, 200);
    const texto = parcial.texto.trim();
    if (!assunto || !texto) {
      return { ok: false, erro: `Modelo "${linha.template}" montou uma mensagem vazia.` };
    }

    return { ok: true, conteudo: { assunto, texto, html: paraHtml(assunto, texto, s) } };
  } catch (erro) {
    if (erro instanceof ErroDeModelo) return { ok: false, erro: erro.message };
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    return { ok: false, erro: `Falha ao montar "${linha.template}": ${detalhe}` };
  }
}

/* ---------------------------------------------------- provedor de registro */

/**
 * Provedor que apenas registra.
 *
 * É o que assume quando não há credencial nenhuma configurada — em
 * desenvolvimento, num preview de branch, ou em produção antes de a JB
 * contratar o serviço de e-mail. A plataforma inteira continua funcionando: a
 * fila anda, a linha é marcada como `simulado` (nunca como `enviado`) e o
 * conteúdo completo vai para o log do servidor, onde dá para conferir o que
 * teria saído. Melhor um registro honesto do que uma tela dizendo "enviado"
 * sobre uma mensagem que ninguém recebeu.
 */
export class ProvedorDeRegistro implements ProvedorDeEmail {
  readonly nome = "registro";
  readonly entrega = false;

  constructor(private readonly motivo: string) {}

  async enviar(mensagem: MensagemDeEmail): Promise<ResultadoEnvio> {
    // console.info é o produto deste provedor, não sobra de depuração.
    console.info(
      [
        "[email:registro] mensagem NÃO enviada, apenas registrada",
        `motivo: ${this.motivo}`,
        `para: ${mensagem.para}`,
        `assunto: ${mensagem.assunto}`,
        "---",
        mensagem.texto,
        "---",
      ].join("\n"),
    );

    return {
      ok: true,
      id: `registro:${crypto.randomUUID()}`,
      entregue: false,
      aviso: this.motivo,
    };
  }
}
