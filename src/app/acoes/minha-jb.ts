"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { ErroDeAssistencia, abrirChamado, mudarStatusChamado } from "@/lib/assistencia";
import { exigirCliente, hashSenhaCliente } from "@/lib/auth-cliente";
import {
  ErroDeEquipamento,
  cadastrarEquipamento as criarEquipamentoNoBanco,
} from "@/lib/equipamento";
import { cnpjValido, cpfValido, somenteDigitos } from "@/lib/format";
import { marcarTodasComoLidas } from "@/lib/notificacoes";
import {
  ErroDeOrcamento,
  aprovarOrcamento as aprovarOrcamentoNoBanco,
  recusarOrcamento as recusarOrcamentoNoBanco,
} from "@/lib/orcamento";
import { ErroDeEstoque } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { ipDoPedido, sanitizarDestino } from "@/lib/seguranca";

/**
 * Ações da área do cliente (Área da Clínica).
 *
 * Três regras valem para o arquivo inteiro:
 *
 * 1. O dono do dado é sempre o cliente da sessão. Nenhum id que chega do
 *    formulário é tratado como prova de posse: ou ele entra no `where` junto
 *    do `customerId`, ou é conferido antes da escrita. Um id adivinhado não
 *    abre — nem escreve — o registro de outra clínica.
 *
 * 2. Valor de dinheiro nunca vem da tela. Aprovar um orçamento não envia
 *    preço: envia a decisão. Quem soma é `@/lib/orcamento`, a partir dos itens
 *    gravados no banco.
 *
 * 3. Toda escrita revalida os caminhos que ela muda. A área do cliente é
 *    renderizada no servidor, então sem `revalidatePath` a pessoa salva e
 *    continua vendo o dado antigo.
 */

export type EstadoMinhaJb = { erro?: string; campo?: string; ok?: string };

/** Erro de regra de negócio desta camada, com mensagem pronta para a tela. */
class ErroDoCliente extends Error {
  constructor(
    mensagem: string,
    readonly campo?: string,
  ) {
    super(mensagem);
    this.name = "ErroDoCliente";
  }
}

const NAO_ENCONTRADO = "Não encontramos este registro na sua conta.";

/* ============================================================================
   Utilidades
   ============================================================================ */

function primeiroProblema(erro: z.ZodError): EstadoMinhaJb {
  const problema = erro.issues[0];
  return {
    erro: problema?.message ?? "Confira os dados informados.",
    campo: problema?.path[0] !== undefined ? String(problema.path[0]) : undefined,
  };
}

function texto(valor: FormDataEntryValue | null): string | undefined {
  if (typeof valor !== "string") return undefined;
  return valor;
}

function lista(formData: FormData, nome: string): string[] {
  return formData
    .getAll(nome)
    .map((valor) => (typeof valor === "string" ? valor.trim() : ""))
    .filter(Boolean);
}

function marcado(formData: FormData, nome: string): boolean {
  const valor = formData.get(nome);
  return typeof valor === "string" && valor !== "" && valor !== "0" && valor !== "false";
}

/**
 * `<input type="date">` devolve AAAA-MM-DD sem hora. Fixar meio-dia no fuso de
 * São Paulo evita o clássico "salvei dia 10 e apareceu dia 9": em UTC puro a
 * meia-noite brasileira cai no dia anterior.
 */
function paraData(valor: string | undefined): Date | null {
  const bruto = (valor ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  const data = new Date(`${bruto}T12:00:00-03:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

async function ipDaRequisicao() {
  const h = await headers();
  return ipDoPedido(h);
}

/**
 * Converte a exceção em estado de tela. Erros de domínio já vêm com texto para
 * o cliente; o resto vira mensagem genérica e vai para o log do servidor —
 * mensagem de erro de banco não é assunto de quem está do outro lado.
 */
function paraEstado(erro: unknown, generico: string): EstadoMinhaJb {
  if (erro instanceof ErroDoCliente) return { erro: erro.message, campo: erro.campo };
  if (
    erro instanceof ErroDeAssistencia ||
    erro instanceof ErroDeEquipamento ||
    erro instanceof ErroDeOrcamento
  ) {
    return { erro: erro.message };
  }
  if (erro instanceof ErroDeEstoque) {
    return {
      erro: `${erro.message}. Fale com a equipe para revermos a proposta.`,
    };
  }
  console.error(generico, erro);
  return { erro: `${generico} Tente de novo em instantes.` };
}

/** Caminhos que quase toda escrita mexe: o menu lateral conta pendências. */
function revalidarArea() {
  revalidatePath("/minha-jb");
}

/* --------------------------------------------------------------- anexos */

/** Uma sessão de formulário; passou disso, o id não é mais de um envio atual. */
const JANELA_DE_ANEXO_MS = 6 * 60 * 60 * 1000;
const MAXIMO_DE_ANEXOS = 12;

/**
 * Filtra os ids de mídia que o formulário mandou.
 *
 * `Media` não guarda quem enviou o arquivo (o schema está congelado), então o
 * id sozinho não prova posse: sem filtro, alguém poderia anexar ao próprio
 * chamado a foto do chamado de outra clínica e vê-la na tela. O que dá para
 * exigir sem coluna nova são três coisas ao mesmo tempo — a mídia está na
 * pasta esperada, foi criada há pouco e ainda não está pendurada em nenhum
 * outro registro. Um arquivo recém-enviado pelo próprio formulário passa; um
 * id adivinhado de outra pessoa, não.
 */
async function anexosDoFormulario(
  ids: string[],
  pasta: "chamados" | "equipamentos",
): Promise<string[]> {
  const pedidos = [...new Set(ids)].slice(0, MAXIMO_DE_ANEXOS);
  if (pedidos.length === 0) return [];

  const candidatas = await prisma.media.findMany({
    where: {
      id: { in: pedidos },
      folder: pasta,
      createdAt: { gte: new Date(Date.now() - JANELA_DE_ANEXO_MS) },
    },
    select: { id: true },
  });
  if (candidatas.length === 0) return [];

  const encontradas = candidatas.map((midia) => midia.id);

  const [emChamados, emEquipamentos] = await Promise.all([
    prisma.serviceRequestMedia.findMany({
      where: { mediaId: { in: encontradas } },
      select: { mediaId: true },
    }),
    prisma.equipmentMedia.findMany({
      where: { mediaId: { in: encontradas } },
      select: { mediaId: true },
    }),
  ]);

  const usadas = new Set([
    ...emChamados.map((linha) => linha.mediaId),
    ...emEquipamentos.map((linha) => linha.mediaId),
  ]);

  // mantém a ordem em que a pessoa enviou os arquivos
  return pedidos.filter((id) => encontradas.includes(id) && !usadas.has(id));
}

/* ============================================================================
   Endereços
   ============================================================================ */

const esquemaEndereco = z.object({
  id: z.string().trim().max(40).default(""),
  rotulo: z
    .string()
    .trim()
    .min(2, "Dê um nome para este endereço (ex.: Clínica, Casa).")
    .max(40),
  destinatario: z.string().trim().max(120).default(""),
  cep: z
    .string()
    .transform(somenteDigitos)
    .refine((valor) => valor.length === 8, "Informe um CEP com 8 dígitos."),
  logradouro: z.string().trim().min(3, "Informe a rua ou avenida.").max(160),
  numero: z.string().trim().min(1, "Informe o número (ou S/N).").max(20),
  complemento: z.string().trim().max(80).default(""),
  bairro: z.string().trim().min(2, "Informe o bairro.").max(80),
  cidade: z.string().trim().min(2, "Informe a cidade.").max(80),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a sigla do estado, com 2 letras (ex.: SP)."),
  referencia: z.string().trim().max(160).default(""),
});

/**
 * Cria ou atualiza um endereço da conta.
 *
 * O primeiro endereço cadastrado vira padrão sozinho: uma conta com endereço
 * mas sem padrão faria o checkout perguntar de novo o que já foi respondido.
 */
export async function salvarEndereco(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/enderecos");

  const dados = esquemaEndereco.safeParse({
    id: texto(formData.get("id")),
    rotulo: texto(formData.get("rotulo")),
    destinatario: texto(formData.get("destinatario")),
    cep: texto(formData.get("cep")) ?? "",
    logradouro: texto(formData.get("logradouro")),
    numero: texto(formData.get("numero")),
    complemento: texto(formData.get("complemento")),
    bairro: texto(formData.get("bairro")),
    cidade: texto(formData.get("cidade")),
    uf: texto(formData.get("uf")),
    referencia: texto(formData.get("referencia")),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const { id, ...campos } = dados.data;
  const querPadrao = marcado(formData, "padrao");

  const valores = {
    label: campos.rotulo,
    recipient: campos.destinatario,
    zip: campos.cep,
    street: campos.logradouro,
    number: campos.numero,
    complement: campos.complemento,
    district: campos.bairro,
    city: campos.cidade,
    state: campos.uf,
    reference: campos.referencia,
  };

  try {
    const [existentes, atual] = await Promise.all([
      prisma.customerAddress.count({ where: { customerId: cliente.id } }),
      id
        ? prisma.customerAddress.findFirst({
            where: { id, customerId: cliente.id },
            select: { isDefault: true },
          })
        : Promise.resolve(null),
    ]);

    if (id && !atual) throw new ErroDoCliente(NAO_ENCONTRADO);

    /*
     * Três caminhos levam a "este é o padrão": a pessoa marcou, é o primeiro
     * endereço da conta, ou ele já era o padrão. O terceiro existe porque
     * desmarcar a caixa sem escolher outro deixaria a conta sem endereço
     * padrão — o jeito de trocar é marcar outro, e a lista tem o botão.
     */
    const seraPadrao = querPadrao || existentes === 0 || (atual?.isDefault ?? false);

    await prisma.$transaction(async (tx) => {
      if (seraPadrao) {
        await tx.customerAddress.updateMany({
          where: { customerId: cliente.id },
          data: { isDefault: false },
        });
      }

      if (id) {
        // o customerId no `where` é o que impede editar endereço alheio
        const { count } = await tx.customerAddress.updateMany({
          where: { id, customerId: cliente.id },
          data: { ...valores, isDefault: seraPadrao },
        });
        if (count === 0) throw new ErroDoCliente(NAO_ENCONTRADO);
        return;
      }

      await tx.customerAddress.create({
        data: { ...valores, customerId: cliente.id, isDefault: seraPadrao },
      });
    });
  } catch (erro) {
    return paraEstado(erro, "Não foi possível salvar o endereço.");
  }

  revalidatePath("/minha-jb/enderecos");
  revalidarArea();
  return { ok: id ? "Endereço atualizado." : "Endereço cadastrado." };
}

/**
 * Remove um endereço. Quando o removido era o padrão, o mais antigo dos que
 * sobraram assume — a conta não fica sem endereço padrão por acidente.
 */
export async function removerEndereco(formData: FormData): Promise<void> {
  const cliente = await exigirCliente("/minha-jb/enderecos");
  const id = (texto(formData.get("id")) ?? "").trim();
  if (!id) return;

  const alvo = await prisma.customerAddress.findFirst({
    where: { id, customerId: cliente.id },
    select: { id: true, isDefault: true },
  });
  if (!alvo) return;

  await prisma.customerAddress.delete({ where: { id: alvo.id } });

  if (alvo.isDefault) {
    const proximo = await prisma.customerAddress.findFirst({
      where: { customerId: cliente.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (proximo) {
      await prisma.customerAddress.update({
        where: { id: proximo.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath("/minha-jb/enderecos");
  revalidarArea();
}

export async function definirEnderecoPadrao(formData: FormData): Promise<void> {
  const cliente = await exigirCliente("/minha-jb/enderecos");
  const id = (texto(formData.get("id")) ?? "").trim();
  if (!id) return;

  const alvo = await prisma.customerAddress.findFirst({
    where: { id, customerId: cliente.id },
    select: { id: true },
  });
  if (!alvo) return;

  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { customerId: cliente.id },
      data: { isDefault: false },
    }),
    prisma.customerAddress.update({
      where: { id: alvo.id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/minha-jb/enderecos");
  revalidarArea();
}

/* ============================================================================
   Perfil e senha
   ============================================================================ */

const esquemaPerfil = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  telefone: z
    .string()
    .transform(somenteDigitos)
    .refine(
      (valor) => valor === "" || valor.length === 10 || valor.length === 11,
      "Informe um telefone com DDD.",
    ),
  tipoPessoa: z.enum(["fisica", "juridica"]),
  documento: z.string().transform(somenteDigitos),
  razaoSocial: z.string().trim().max(160).default(""),
  nomeFantasia: z.string().trim().max(160).default(""),
  inscricaoEstadual: z.string().trim().max(40).default(""),
});

/**
 * Dados cadastrais e preferência de contato.
 *
 * O e-mail não é editado aqui de propósito: ele é a chave de acesso da conta e
 * trocá-lo sem confirmar o endereço novo abriria caminho para perda de acesso.
 * A tela explica como pedir a troca à equipe.
 */
export async function atualizarPerfil(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/perfil");

  const dados = esquemaPerfil.safeParse({
    nome: texto(formData.get("nome")),
    telefone: texto(formData.get("telefone")) ?? "",
    // valor fechado: qualquer coisa diferente de "juridica" é pessoa física,
    // então um <select> adulterado não vira mensagem de erro sem sentido
    tipoPessoa: texto(formData.get("tipoPessoa")) === "juridica" ? "juridica" : "fisica",
    documento: texto(formData.get("documento")) ?? "",
    razaoSocial: texto(formData.get("razaoSocial")),
    nomeFantasia: texto(formData.get("nomeFantasia")),
    inscricaoEstadual: texto(formData.get("inscricaoEstadual")),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const { nome, telefone, tipoPessoa, documento, razaoSocial } = dados.data;

  if (documento) {
    const valido = tipoPessoa === "fisica" ? cpfValido(documento) : cnpjValido(documento);
    if (!valido) {
      return {
        erro:
          tipoPessoa === "fisica"
            ? "Este CPF não confere. Revise os números."
            : "Este CNPJ não confere. Revise os números.",
        campo: "documento",
      };
    }
  }

  if (tipoPessoa === "juridica" && razaoSocial.trim().length < 3) {
    return { erro: "Informe a razão social da empresa.", campo: "razaoSocial" };
  }

  const querNovidades = marcado(formData, "novidades");

  try {
    const atual = await prisma.customer.findUnique({
      where: { id: cliente.id },
      select: { marketingOptInAt: true },
    });

    await prisma.customer.update({
      where: { id: cliente.id },
      data: {
        name: nome,
        phone: telefone,
        personType: tipoPessoa,
        document: documento,
        companyName: tipoPessoa === "juridica" ? razaoSocial : "",
        tradeName: tipoPessoa === "juridica" ? dados.data.nomeFantasia : "",
        stateRegistry: tipoPessoa === "juridica" ? dados.data.inscricaoEstadual : "",
        // já aceito continua com a data original: ela é o registro do aceite
        marketingOptInAt: querNovidades ? (atual?.marketingOptInAt ?? new Date()) : null,
      },
    });
  } catch (erro) {
    return paraEstado(erro, "Não foi possível salvar seus dados.");
  }

  revalidatePath("/minha-jb/perfil");
  revalidarArea();
  return { ok: "Dados atualizados." };
}

const esquemaSenha = z
  .object({
    atual: z.string().min(1, "Informe sua senha atual."),
    nova: z.string().min(8, "A nova senha precisa de pelo menos 8 caracteres.").max(72),
    confirmacao: z.string().min(1, "Repita a nova senha."),
  })
  .refine((dados) => dados.nova === dados.confirmacao, {
    message: "As senhas não são iguais.",
    path: ["confirmacao"],
  });

export async function trocarSenha(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/perfil");

  const dados = esquemaSenha.safeParse({
    atual: texto(formData.get("atual")) ?? "",
    nova: texto(formData.get("nova")) ?? "",
    confirmacao: texto(formData.get("confirmacao")) ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  if (dados.data.nova === dados.data.atual) {
    return { erro: "A nova senha precisa ser diferente da atual.", campo: "nova" };
  }

  try {
    const registro = await prisma.customer.findUnique({
      where: { id: cliente.id },
      select: { passwordHash: true },
    });

    if (!registro?.passwordHash) {
      return {
        erro: "Sua conta ainda não tem senha definida. Use “Esqueci minha senha” para criar uma.",
        campo: "atual",
      };
    }

    const confere = await bcrypt.compare(dados.data.atual, registro.passwordHash);
    if (!confere) return { erro: "A senha atual não confere.", campo: "atual" };

    await prisma.customer.update({
      where: { id: cliente.id },
      data: { passwordHash: await hashSenhaCliente(dados.data.nova) },
    });
  } catch (erro) {
    return paraEstado(erro, "Não foi possível trocar a senha.");
  }

  revalidatePath("/minha-jb/perfil");
  return { ok: "Senha alterada. Ela já vale no próximo acesso." };
}

/* ============================================================================
   Equipamentos
   ============================================================================ */

const esquemaEquipamento = z.object({
  nome: z.string().trim().min(2, "Dê um nome ao equipamento.").max(120),
  categoriaId: z.string().trim().max(40).default(""),
  marca: z.string().trim().max(80).default(""),
  modelo: z.string().trim().max(80).default(""),
  serie: z.string().trim().max(80).default(""),
  voltagem: z.string().trim().max(20).default(""),
  unidadeId: z.string().trim().max(40).default(""),
  sala: z.string().trim().max(80).default(""),
  compradoEm: z.string().trim().max(10).default(""),
  instaladoEm: z.string().trim().max(10).default(""),
  garantiaAte: z.string().trim().max(10).default(""),
  intervaloDias: z
    .string()
    .trim()
    .default("")
    .refine(
      (valor) => valor === "" || /^\d{1,4}$/.test(valor),
      "Informe o intervalo em dias, apenas números.",
    ),
  notas: z.string().trim().max(2000).default(""),
});

function lerEquipamentoDoFormulario(formData: FormData) {
  return esquemaEquipamento.safeParse({
    nome: texto(formData.get("nome")),
    categoriaId: texto(formData.get("categoriaId")),
    marca: texto(formData.get("marca")),
    modelo: texto(formData.get("modelo")),
    serie: texto(formData.get("serie")),
    voltagem: texto(formData.get("voltagem")),
    unidadeId: texto(formData.get("unidadeId")),
    sala: texto(formData.get("sala")),
    compradoEm: texto(formData.get("compradoEm")),
    instaladoEm: texto(formData.get("instaladoEm")),
    garantiaAte: texto(formData.get("garantiaAte")),
    intervaloDias: texto(formData.get("intervaloDias")),
    notas: texto(formData.get("notas")),
  });
}

/** A categoria precisa existir e estar publicada — id solto vira nulo. */
async function categoriaValida(id: string) {
  if (!id) return null;
  const categoria = await prisma.category.findFirst({
    where: { id, published: true },
    select: { id: true },
  });
  return categoria?.id ?? null;
}

/**
 * Cadastra um equipamento no prontuário do cliente.
 *
 * A unidade é conferida dentro de `@/lib/equipamento`, que recusa unidade de
 * outro cliente. Aqui fica a conferência da categoria e das fotos.
 */
export async function cadastrarEquipamento(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/equipamentos/novo");

  const dados = lerEquipamentoDoFormulario(formData);
  if (!dados.success) return primeiroProblema(dados.error);

  const campos = dados.data;
  let destino = "";

  try {
    const intervalo = campos.intervaloDias ? Number(campos.intervaloDias) : null;

    const equipamento = await criarEquipamentoNoBanco({
      customerId: cliente.id,
      nome: campos.nome,
      categoriaId: await categoriaValida(campos.categoriaId),
      marca: campos.marca,
      modelo: campos.modelo,
      serie: campos.serie,
      voltagem: campos.voltagem || null,
      locationId: campos.unidadeId || null,
      sala: campos.sala,
      origem: "cadastro_cliente",
      compradoEm: paraData(campos.compradoEm),
      instaladoEm: paraData(campos.instaladoEm),
      garantiaAte: paraData(campos.garantiaAte),
      intervaloDias: intervalo && intervalo > 0 ? intervalo : null,
      notas: campos.notas,
      mediaIds: await anexosDoFormulario(lista(formData, "midias"), "equipamentos"),
    });

    destino = `/minha-jb/equipamentos/${equipamento.id}`;
  } catch (erro) {
    return paraEstado(erro, "Não foi possível cadastrar o equipamento.");
  }

  revalidatePath("/minha-jb/equipamentos");
  revalidarArea();
  redirect(destino);
}

/**
 * Edita um equipamento já cadastrado.
 *
 * A próxima manutenção é recalculada quando o intervalo muda, tomando por base
 * a última manutenção registrada (ou a instalação, ou a compra). Sem intervalo
 * não existe próxima data — melhor campo vazio do que data inventada.
 */
export async function editarEquipamento(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/equipamentos");
  const id = (texto(formData.get("id")) ?? "").trim();
  if (!id) return { erro: NAO_ENCONTRADO };

  const dados = lerEquipamentoDoFormulario(formData);
  if (!dados.success) return primeiroProblema(dados.error);

  const campos = dados.data;

  try {
    const atual = await prisma.equipment.findFirst({
      where: { id, customerId: cliente.id },
      select: {
        id: true,
        installedAt: true,
        purchasedAt: true,
        lastMaintenanceAt: true,
        // preciso saber o que já estava agendado para não reagendar à toa
        nextMaintenanceAt: true,
        maintenanceIntervalDays: true,
      },
    });
    if (!atual) throw new ErroDoCliente(NAO_ENCONTRADO);

    if (campos.unidadeId) {
      const unidade = await prisma.customerLocation.findFirst({
        where: { id: campos.unidadeId, customerId: cliente.id },
        select: { id: true },
      });
      if (!unidade) {
        throw new ErroDoCliente("A unidade escolhida não é da sua conta.", "unidadeId");
      }
    }

    const intervaloBruto = campos.intervaloDias ? Number(campos.intervaloDias) : null;
    const intervalo = intervaloBruto && intervaloBruto > 0 ? intervaloBruto : null;
    const instaladoEm = paraData(campos.instaladoEm);
    const compradoEm = paraData(campos.compradoEm);
    /**
     * A próxima preventiva só é recalculada quando muda alguma coisa que a
     * determina. Antes, qualquer salvamento reagendava: sem data de referência
     * o cálculo caía em `new Date()`, então trocar o nome da sala empurrava a
     * manutenção para daqui a seis meses, toda vez.
     */
    const mesmaData = (a: Date | null, b: Date | null) =>
      (a?.getTime() ?? null) === (b?.getTime() ?? null);

    const mudouOQueImporta =
      intervalo !== atual.maintenanceIntervalDays ||
      !mesmaData(instaladoEm, atual.installedAt) ||
      !mesmaData(compradoEm, atual.purchasedAt);

    const base = atual.lastMaintenanceAt ?? instaladoEm ?? atual.installedAt ?? compradoEm;

    const proxima = !intervalo
      ? null
      : mudouOQueImporta || !atual.nextMaintenanceAt
        ? new Date((base ?? new Date()).getTime() + intervalo * 86_400_000)
        : atual.nextMaintenanceAt;

    // resolvidos antes da transação: consulta dentro dela só alonga o bloqueio
    const midias = await anexosDoFormulario(lista(formData, "midias"), "equipamentos");
    const categoriaId = await categoriaValida(campos.categoriaId);

    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id: atual.id },
        data: {
          name: campos.nome,
          categoryId: categoriaId,
          brandName: campos.marca,
          modelName: campos.modelo,
          serialNumber: campos.serie,
          voltage: campos.voltagem || null,
          locationId: campos.unidadeId || null,
          room: campos.sala,
          purchasedAt: compradoEm,
          installedAt: instaladoEm,
          warrantyUntil: paraData(campos.garantiaAte),
          maintenanceIntervalDays: intervalo,
          nextMaintenanceAt: proxima,
          notes: campos.notas,
        },
      });

      if (midias.length > 0) {
        const quantas = await tx.equipmentMedia.count({ where: { equipmentId: atual.id } });
        await tx.equipmentMedia.createMany({
          data: midias.map((mediaId, indice) => ({
            equipmentId: atual.id,
            mediaId,
            order: quantas + indice,
          })),
          skipDuplicates: true,
        });
      }

      await tx.equipmentEvent.create({
        data: {
          equipmentId: atual.id,
          kind: "nota",
          title: "Ficha atualizada",
          description: "Dados do equipamento revisados pelo cliente na Área da Clínica.",
        },
      });
    });
  } catch (erro) {
    return paraEstado(erro, "Não foi possível salvar o equipamento.");
  }

  revalidatePath("/minha-jb/equipamentos");
  revalidatePath(`/minha-jb/equipamentos/${id}`);
  revalidarArea();
  return { ok: "Equipamento atualizado." };
}

/* ============================================================================
   Favoritos
   ============================================================================ */

/**
 * Liga e desliga o favorito. O par (cliente, produto) é único no banco, então
 * dois cliques seguidos não criam linha duplicada.
 *
 * `voltar` existe porque o botão agora também vive na página do equipamento:
 * quem não está logado precisa voltar para o equipamento que estava vendo, e
 * não cair na lista de favoritos vazia. O caminho passa por `sanitizarDestino`
 * — é um valor de formulário, e valor de formulário não decide para onde o
 * navegador vai sem ser conferido.
 */
export async function alternarFavorito(formData: FormData): Promise<void> {
  const volta = sanitizarDestino(formData.get("voltar"), "/minha-jb/favoritos");
  const cliente = await exigirCliente(volta);
  const produtoId = (texto(formData.get("produtoId")) ?? "").trim();
  if (!produtoId) return;

  const existente = await prisma.favorite.findUnique({
    where: { customerId_productId: { customerId: cliente.id, productId: produtoId } },
    select: { id: true },
  });

  if (existente) {
    await prisma.favorite.delete({ where: { id: existente.id } });
  } else {
    const produto = await prisma.product.findFirst({
      where: { id: produtoId, status: "active" },
      select: { id: true },
    });
    if (!produto) return;
    await prisma.favorite.create({
      data: { customerId: cliente.id, productId: produto.id },
    });
  }

  revalidatePath("/minha-jb/favoritos");
  revalidarArea();
}

/* ============================================================================
   Assistência
   ============================================================================ */

/** Urgência fora da lista vira a padrão em vez de erro de validação. */
const URGENCIAS_ACEITAS = new Set(["baixa", "normal", "alta", "parado"]);

const esquemaChamado = z.object({
  equipamentoId: z.string().trim().max(40).default(""),
  enderecoId: z.string().trim().max(40).default(""),
  tipo: z.string().trim().max(80).default(""),
  descricao: z
    .string()
    .trim()
    .min(15, "Conte o que está acontecendo com pelo menos uma frase completa.")
    .max(4000),
  urgencia: z.enum(["baixa", "normal", "alta", "parado"]).default("normal"),
  disponibilidade: z.string().trim().max(200).default(""),
});

/**
 * Abre um chamado a partir da área logada.
 *
 * O contato sai do cadastro, não do formulário: quem está autenticado já se
 * identificou. O endereço segue a ordem de `@/lib/assistencia` — o escolhido
 * aqui, senão o padrão da conta.
 */
export async function abrirChamadoDoCliente(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/assistencia/novo");

  const dados = esquemaChamado.safeParse({
    equipamentoId: texto(formData.get("equipamentoId")),
    enderecoId: texto(formData.get("enderecoId")),
    tipo: texto(formData.get("tipo")),
    descricao: texto(formData.get("descricao")),
    urgencia: URGENCIAS_ACEITAS.has(texto(formData.get("urgencia")) ?? "")
      ? texto(formData.get("urgencia"))
      : undefined,
    disponibilidade: texto(formData.get("disponibilidade")),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const campos = dados.data;
  let destino = "";

  try {
    const registro = await prisma.customer.findUnique({
      where: { id: cliente.id },
      select: { name: true, email: true, phone: true },
    });
    if (!registro) throw new ErroDoCliente(NAO_ENCONTRADO);

    const equipamento = campos.equipamentoId
      ? await prisma.equipment.findFirst({
          where: { id: campos.equipamentoId, customerId: cliente.id },
          select: {
            id: true,
            categoryId: true,
            brandName: true,
            modelName: true,
            serialNumber: true,
            locationId: true,
          },
        })
      : null;

    if (campos.equipamentoId && !equipamento) {
      throw new ErroDoCliente("Este equipamento não está na sua conta.", "equipamentoId");
    }

    const endereco = campos.enderecoId
      ? await prisma.customerAddress.findFirst({
          where: { id: campos.enderecoId, customerId: cliente.id },
          select: {
            zip: true,
            street: true,
            number: true,
            complement: true,
            district: true,
            city: true,
            state: true,
          },
        })
      : null;

    if (campos.enderecoId && !endereco) {
      throw new ErroDoCliente("Este endereço não é da sua conta.", "enderecoId");
    }

    const chamado = await abrirChamado({
      customerId: cliente.id,
      equipmentId: equipamento?.id ?? null,
      locationId: equipamento?.locationId ?? null,
      contato: {
        nome: registro.name,
        email: registro.email,
        telefone: registro.phone,
      },
      equipamento: equipamento
        ? {
            categoryId: equipamento.categoryId,
            marca: equipamento.brandName,
            modelo: equipamento.modelName,
            serie: equipamento.serialNumber,
          }
        : undefined,
      problema: {
        tipo: campos.tipo,
        descricao: campos.descricao,
        urgencia: campos.urgencia,
      },
      endereco: endereco
        ? {
            cep: endereco.zip,
            logradouro: endereco.street,
            numero: endereco.number,
            complemento: endereco.complement,
            bairro: endereco.district,
            cidade: endereco.city,
            uf: endereco.state,
          }
        : undefined,
      disponibilidade: campos.disponibilidade,
      mediaIds: await anexosDoFormulario(lista(formData, "midias"), "chamados"),
    });

    destino = `/minha-jb/assistencia/${chamado.number}`;
  } catch (erro) {
    return paraEstado(erro, "Não foi possível abrir o chamado.");
  }

  revalidatePath("/minha-jb/assistencia");
  revalidatePath("/minha-jb/equipamentos");
  revalidarArea();
  redirect(destino);
}

const esquemaResposta = z.object({
  chamadoId: z.string().trim().min(1),
  mensagem: z.string().trim().min(2, "Escreva sua mensagem.").max(4000),
});

/**
 * Resposta do cliente dentro do chamado.
 *
 * Quando o chamado estava parado esperando o cliente, a resposta devolve o
 * atendimento para a triagem: quem estava esperando agora é a JB.
 */
export async function responderChamado(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/assistencia");

  const dados = esquemaResposta.safeParse({
    chamadoId: texto(formData.get("chamadoId")),
    mensagem: texto(formData.get("mensagem")),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  let numero = "";

  try {
    const chamado = await prisma.serviceRequest.findFirst({
      where: { id: dados.data.chamadoId, customerId: cliente.id },
      select: { id: true, number: true, status: true },
    });
    if (!chamado) throw new ErroDoCliente(NAO_ENCONTRADO);

    if (chamado.status === "concluido" || chamado.status === "cancelado") {
      throw new ErroDoCliente(
        "Este chamado já foi encerrado. Abra um novo para falar sobre o mesmo equipamento.",
      );
    }

    numero = chamado.number;
    const midias = await anexosDoFormulario(lista(formData, "midias"), "chamados");

    await prisma.$transaction(async (tx) => {
      await tx.serviceRequestEvent.create({
        data: {
          requestId: chamado.id,
          // este título, sem `userId`, é o que a conversa do chamado usa para
          // creditar a fala ao cliente (TITULO_DA_CLINICA em mj-conversa.tsx).
          // Mudando aqui, mude lá — senão a mensagem passa a aparecer como se
          // fosse da equipe.
          title: "Mensagem do cliente",
          message: dados.data.mensagem,
          visibleToCustomer: true,
        },
      });

      if (midias.length > 0) {
        const quantas = await tx.serviceRequestMedia.count({
          where: { requestId: chamado.id },
        });
        await tx.serviceRequestMedia.createMany({
          data: midias.map((mediaId, indice) => ({
            requestId: chamado.id,
            mediaId,
            order: quantas + indice,
          })),
          skipDuplicates: true,
        });
      }
    });

    if (chamado.status === "aguardando_cliente") {
      await mudarStatusChamado(chamado.id, "triagem", {
        titulo: "Resposta recebida",
        nota: "A equipe voltou a analisar o chamado com a informação enviada.",
      });
    }
  } catch (erro) {
    return paraEstado(erro, "Não foi possível enviar sua mensagem.");
  }

  revalidatePath("/minha-jb/assistencia");
  revalidatePath(`/minha-jb/assistencia/${numero}`);
  revalidatePath(`/minha-jb/assistencia/${dados.data.chamadoId}`);
  revalidarArea();
  return { ok: "Mensagem enviada. A equipe responde por aqui." };
}

/* ============================================================================
   Orçamentos
   ============================================================================ */

/** Confere que a proposta é da conta e devolve o que a tela precisa saber. */
async function orcamentoDoCliente(quoteId: string, customerId: string) {
  const orcamento = await prisma.quote.findFirst({
    where: { id: quoteId, customerId },
    select: { id: true, number: true, status: true, requestId: true },
  });
  if (!orcamento) throw new ErroDoCliente(NAO_ENCONTRADO);
  return orcamento;
}

const esquemaAprovacao = z.object({
  orcamentoId: z.string().trim().min(1),
  assinatura: z
    .string()
    .trim()
    .min(3, "Digite seu nome completo para registrar o aceite.")
    .max(120),
});

/**
 * Aceite do cliente.
 *
 * O nome digitado e o IP ficam gravados na proposta: é o registro de quem
 * aprovou e de onde. Nenhum valor vem da tela — quem soma é `@/lib/orcamento`.
 */
export async function aprovarOrcamento(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/orcamentos");

  const dados = esquemaAprovacao.safeParse({
    orcamentoId: texto(formData.get("orcamentoId")),
    assinatura: texto(formData.get("assinatura")),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  let numero = "";
  let pedidoId: string | null = null;

  try {
    const orcamento = await orcamentoDoCliente(dados.data.orcamentoId, cliente.id);
    numero = orcamento.number;

    if (orcamento.status === "recusado" || orcamento.status === "expirado") {
      throw new ErroDoCliente(
        "Esta proposta não está mais aberta. Fale com a equipe para receber uma nova.",
      );
    }

    const resultado = await aprovarOrcamentoNoBanco(orcamento.id, {
      nome: dados.data.assinatura,
      ip: await ipDaRequisicao(),
    });
    pedidoId = resultado.pedidoId ?? null;
  } catch (erro) {
    return paraEstado(erro, "Não foi possível registrar a aprovação.");
  }

  revalidatePath("/minha-jb/orcamentos");
  revalidatePath(`/minha-jb/orcamentos/${numero}`);
  revalidatePath("/minha-jb/assistencia");
  revalidatePath("/minha-jb/pedidos");
  revalidarArea();

  if (pedidoId) redirect(`/minha-jb/pedidos/${pedidoId}`);
  return { ok: "Proposta aprovada. A equipe já foi avisada." };
}

const esquemaRecusa = z.object({
  orcamentoId: z.string().trim().min(1),
  motivo: z
    .string()
    .trim()
    .min(5, "Conte em uma frase o motivo — é o que orienta a próxima proposta.")
    .max(2000),
});

export async function recusarOrcamento(
  _anterior: EstadoMinhaJb,
  formData: FormData,
): Promise<EstadoMinhaJb> {
  const cliente = await exigirCliente("/minha-jb/orcamentos");

  const dados = esquemaRecusa.safeParse({
    orcamentoId: texto(formData.get("orcamentoId")),
    motivo: texto(formData.get("motivo")),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  let numero = "";

  try {
    const orcamento = await orcamentoDoCliente(dados.data.orcamentoId, cliente.id);
    numero = orcamento.number;

    if (orcamento.status === "recusado") {
      return { ok: "Esta proposta já estava recusada." };
    }

    await recusarOrcamentoNoBanco(orcamento.id, dados.data.motivo, {
      nome: cliente.name,
      ip: await ipDaRequisicao(),
    });
  } catch (erro) {
    return paraEstado(erro, "Não foi possível registrar a recusa.");
  }

  revalidatePath("/minha-jb/orcamentos");
  revalidatePath(`/minha-jb/orcamentos/${numero}`);
  revalidatePath("/minha-jb/assistencia");
  revalidarArea();
  return { ok: "Recusa registrada. A equipe entra em contato." };
}

/* ============================================================================
   Avisos
   ============================================================================ */

export async function marcarAvisosComoLidos(): Promise<void> {
  const cliente = await exigirCliente("/minha-jb");
  await marcarTodasComoLidas(cliente.id);
  revalidarArea();
}
