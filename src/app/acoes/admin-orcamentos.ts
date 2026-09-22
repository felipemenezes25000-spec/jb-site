"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ipAtual, registrarAuditoria } from "@/lib/auditoria";
import { PODE } from "@/lib/auth";
import { formatarDataHora, formatarPreco, formatarTelefone, paraCentavos, somenteDigitos } from "@/lib/format";
import { enfileirar } from "@/lib/notificacoes";
import {
  ErroDeOrcamento,
  aprovarOrcamento,
  criarOrcamento,
  enviarOrcamento,
  recusarOrcamento,
  reenviarOrcamento,
  substituirItens,
} from "@/lib/orcamento";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { configuracoesPublicas } from "@/lib/site-publico";

/**
 * Orçamentos de reparo feitos pela equipe.
 *
 * Saíram de `admin-vendas.ts` quando a loja foi retirada. O que mudou no
 * caminho: não existe mais proposta de venda, nem produto de catálogo, nem
 * frete; peça, mão de obra e deslocamento entram como linhas. A aprovação
 * libera o serviço do chamado, e é registrada pela equipe depois da conversa
 * com o cliente, porque a área do cliente também saiu.
 *
 * Regras que continuam valendo: autorização no servidor (`exigirEdicao`),
 * total sempre refeito a partir dos itens gravados, auditoria em toda escrita.
 */

export type EstadoOrcamento = { erro?: string; campo?: string; ok?: string };

/* ------------------------------------------------------------- utilitários */

function primeiroProblema(erro: z.ZodError): EstadoOrcamento {
  const problema = erro.issues[0];
  return {
    erro: problema?.message ?? "Confira os dados informados.",
    campo: String(problema?.path[0] ?? ""),
  };
}

function texto(formData: FormData, nome: string) {
  const valor = formData.get(nome);
  return typeof valor === "string" ? valor.trim() : "";
}

function marcado(formData: FormData, nome: string) {
  const valor = formData.get(nome);
  return valor === "on" || valor === "true" || valor === "1";
}

function centavos(formData: FormData, nome: string) {
  const bruto = texto(formData, nome);
  return bruto ? Math.max(0, paraCentavos(bruto)) : 0;
}

function inteiroOuNulo(bruto: string): number | null {
  const limpo = somenteDigitos(bruto);
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * O Brasil não usa horário de verão desde 2019, então o deslocamento de São
 * Paulo é fixo em -03:00. Sem fixar isso, uma data digitada como "10/03"
 * viraria o dia anterior num servidor rodando em UTC.
 */
const FUSO_BR = "-03:00";

/** "AAAA-MM-DD" no fuso de São Paulo, ancorado ao meio-dia. */
function dataDoDia(bruto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return null;
  const data = new Date(`${bruto}T12:00:00${FUSO_BR}`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function revalidarOrcamento(quoteId: string) {
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${quoteId}`);
  revalidatePath("/admin");
}

/** Mensagem de erro sem vazar detalhe interno, mas com o que dá para agir. */
function mensagemDeErro(erro: unknown, padrao: string): EstadoOrcamento {
  if (erro instanceof ErroDeOrcamento) return { erro: erro.message };
  console.error(padrao, erro);
  return { erro: padrao };
}

/* ------------------------------------------------------------- formulário */

type ItemLido = {
  productId: null;
  serviceId: null;
  descricao: string;
  quantidade: number;
  valorUnitarioCents: number;
};

/**
 * Lê as linhas do editor. Os campos chegam como listas paralelas, na mesma
 * ordem em que estão na tela; linha sem descrição é descartada em silêncio,
 * porque é a linha em branco que o editor deixa no fim.
 */
function lerItensDoFormulario(formData: FormData): ItemLido[] {
  const descricoes = formData.getAll("item_descricao").map(String);
  const quantidades = formData.getAll("item_quantidade").map(String);
  const valores = formData.getAll("item_valor").map(String);

  return descricoes
    .map((descricao, indice) => ({
      productId: null,
      serviceId: null,
      descricao: descricao.trim(),
      quantidade: Math.max(1, Number(somenteDigitos(quantidades[indice] ?? "1")) || 1),
      valorUnitarioCents: Math.max(0, paraCentavos(valores[indice] ?? "0")),
    }))
    .filter((item) => item.descricao.length > 0);
}

const esquemaOrcamento = z.object({
  customerId: z.string().trim().default(""),
  contatoNome: z.string().trim().max(160).default(""),
  contatoEmail: z.string().trim().max(160).default(""),
  contatoTelefone: z.string().trim().max(30).default(""),
  mensagem: z.string().trim().max(4000).default(""),
  condicoes: z.string().trim().max(4000).default(""),
  notaInterna: z.string().trim().max(4000).default(""),
  validoAte: z.string().trim().default(""),
});

function lerCabecalho(formData: FormData) {
  return esquemaOrcamento.safeParse({
    customerId: formData.get("customerId") ?? "",
    contatoNome: formData.get("contatoNome") ?? "",
    contatoEmail: formData.get("contatoEmail") ?? "",
    contatoTelefone: formData.get("contatoTelefone") ?? "",
    mensagem: formData.get("mensagem") ?? "",
    condicoes: formData.get("condicoes") ?? "",
    notaInterna: formData.get("notaInterna") ?? "",
    validoAte: formData.get("validoAte") ?? "",
  });
}

/* ================================================================== ações */

/** Monta o orçamento em rascunho e abre a tela dele. */
export async function criarOrcamentoAdmin(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");

  const cabecalho = lerCabecalho(formData);
  if (!cabecalho.success) return primeiroProblema(cabecalho.error);

  const itens = lerItensDoFormulario(formData);
  if (itens.length === 0) {
    return { erro: "Inclua ao menos um item no orçamento.", campo: "item_descricao" };
  }
  if (!cabecalho.data.customerId && !cabecalho.data.contatoNome) {
    return { erro: "Escolha um cliente ou preencha o nome do contato.", campo: "contatoNome" };
  }

  let criado: { id: string; number: string };
  try {
    criado = await criarOrcamento({
      kind: "assistencia",
      customerId: cabecalho.data.customerId || null,
      contato: {
        nome: cabecalho.data.contatoNome || undefined,
        email: cabecalho.data.contatoEmail || undefined,
        telefone: cabecalho.data.contatoTelefone || undefined,
      },
      mensagem: cabecalho.data.mensagem,
      condicoes: cabecalho.data.condicoes,
      notaInterna: cabecalho.data.notaInterna,
      validoAte: dataDoDia(cabecalho.data.validoAte),
      descontoCents: centavos(formData, "descontoCents"),
      itens,
      userId: usuario.id,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível criar o orçamento.");
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "criar",
    entidade: "orcamento",
    entidadeId: criado.id,
    resumo: `Orçamento ${criado.number} criado com ${itens.length} item(ns)`,
  });

  revalidatePath("/admin/orcamentos");
  // redirect() sinaliza a navegação lançando: fica fora de qualquer try/catch
  redirect(`/admin/orcamentos/${criado.id}`);
}

/** Salva o cabeçalho e substitui a lista de itens inteira. */
export async function salvarOrcamentoAdmin(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const cabecalho = lerCabecalho(formData);
  if (!cabecalho.success) return primeiroProblema(cabecalho.error);

  const itens = lerItensDoFormulario(formData);
  if (itens.length === 0) {
    return { erro: "Inclua ao menos um item no orçamento.", campo: "item_descricao" };
  }

  const orcamento = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, number: true, status: true, totalCents: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };
  if (orcamento.status === "convertido") {
    return { erro: "Este orçamento antigo virou pedido de venda e não pode ser alterado." };
  }

  try {
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        customerId: cabecalho.data.customerId || null,
        contactName: cabecalho.data.contatoNome,
        contactEmail: cabecalho.data.contatoEmail,
        contactPhone: cabecalho.data.contatoTelefone,
        message: cabecalho.data.mensagem,
        conditions: cabecalho.data.condicoes,
        internalNote: cabecalho.data.notaInterna,
        validUntil: dataDoDia(cabecalho.data.validoAte),
      },
    });

    const atualizado = await substituirItens(quoteId, itens, {
      descontoCents: centavos(formData, "descontoCents"),
      freteCents: 0,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "orcamento",
      entidadeId: quoteId,
      antes: { totalCents: orcamento.totalCents },
      depois: { totalCents: atualizado.totalCents },
      resumo: `Orçamento ${orcamento.number}, versão ${atualizado.version}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o orçamento.");
  }

  revalidarOrcamento(quoteId);
  return { ok: "Orçamento salvo." };
}

/**
 * Envia, ou reenvia, o orçamento ao cliente por e-mail.
 *
 * O mesmo botão cobre os dois casos, porque para quem atende é o mesmo gesto.
 * Quem separa os dois é o `sentAt`: o primeiro envio publica (status, validade
 * e evento) e entra na fila com chave por versão; o reenvio numera a tentativa
 * em `reenviarOrcamento`, sem republicar.
 *
 * O e-mail não tem mais link de aprovação: a área do cliente saiu. Ele traz o
 * valor e pede a resposta pelo WhatsApp ou pelo próprio e-mail, e a equipe
 * registra a decisão aqui no painel.
 */
export async function enviarOrcamentoAdmin(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const validadeDias = inteiroOuNulo(texto(formData, "validadeDias"));
  const mensagemLivre = texto(formData, "mensagem") || undefined;

  const anterior = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { sentAt: true },
  });
  if (!anterior) return { erro: "Orçamento não encontrado." };

  /* ------------------------------------------------------------- reenvio */

  if (anterior.sentAt) {
    try {
      const reenvio = await reenviarOrcamento(quoteId, {
        userId: usuario.id,
        mensagem: mensagemLivre,
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "enviar",
        entidade: "orcamento",
        entidadeId: quoteId,
        resumo: reenvio.mensagem.ok
          ? `Orçamento ${reenvio.numero} reenviado para ${reenvio.destino} (tentativa ${reenvio.tentativa})`
          : `Orçamento ${reenvio.numero}: reenvio não entrou na fila: ${reenvio.mensagem.motivo}`,
      });

      revalidarOrcamento(quoteId);

      if (!reenvio.mensagem.ok) {
        return { erro: `O reenvio não entrou na fila: ${reenvio.mensagem.motivo}` };
      }
      // `jaExistia` aqui significa que a tentativa anterior ainda não saiu da
      // fila. Dizer "reenviado" nesse caso seria mentira: nada novo foi criado.
      return {
        ok: reenvio.mensagem.jaExistia
          ? "Este reenvio já estava na fila e ainda não saiu. Nada foi duplicado."
          : `Orçamento reenviado para ${reenvio.destino}.`,
      };
    } catch (erro) {
      return mensagemDeErro(erro, "Não foi possível reenviar o orçamento.");
    }
  }

  /* ------------------------------------------------------- primeiro envio */

  try {
    const enviado = await enviarOrcamento(quoteId, {
      userId: usuario.id,
      validadeDias: validadeDias ?? undefined,
      mensagem: mensagemLivre,
    });

    const destino = enviado.contactEmail.trim();
    let jaEstavaNaFila = false;

    if (destino) {
      const s = await configuracoesPublicas();
      const whatsapp = s.whatsapp.trim() ? formatarTelefone(s.whatsapp) : "";

      const resultado = await enfileirar({
        canal: "email",
        para: destino,
        assunto: `Orçamento ${enviado.number}: JB Soluções Odontológicas`,
        corpo: [
          `Olá, ${enviado.contactName || "tudo bem"}?`,
          "",
          `Segue o orçamento ${enviado.number}, no valor de ${formatarPreco(enviado.totalCents)}.`,
          enviado.validUntil ? `Ele vale até ${formatarDataHora(enviado.validUntil)}.` : "",
          "",
          whatsapp
            ? `Para aprovar ou tirar dúvidas, responda este e-mail ou chame a equipe no WhatsApp ${whatsapp}.`
            : "Para aprovar ou tirar dúvidas, é só responder este e-mail.",
        ]
          .filter(Boolean)
          .join("\n"),
        refTipo: "orcamento",
        refId: enviado.id,
        template: "orcamento_enviado",
        // a versão entra na chave: revisão nova é mensagem nova
        dedupeKey: `email|orcamento_enviado|orcamento|${enviado.id}:v${enviado.version}`,
      });

      if (!resultado.ok) {
        await registrarAuditoria({
          userId: usuario.id,
          acao: "enviar",
          entidade: "orcamento",
          entidadeId: quoteId,
          resumo: `Orçamento ${enviado.number} publicado; e-mail não entrou na fila: ${resultado.motivo}`,
        });
        revalidarOrcamento(quoteId);
        return {
          erro: `Orçamento marcado como enviado, mas o e-mail não entrou na fila: ${resultado.motivo}`,
        };
      }

      jaEstavaNaFila = resultado.jaExistia;
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "enviar",
      entidade: "orcamento",
      entidadeId: quoteId,
      resumo: destino
        ? `Orçamento ${enviado.number} enviado para ${destino}`
        : `Orçamento ${enviado.number} marcado como enviado (sem e-mail de contato)`,
    });

    revalidarOrcamento(quoteId);
    if (!destino) {
      return {
        ok: "Orçamento marcado como enviado. Sem e-mail de contato, mande pelo WhatsApp.",
      };
    }
    return {
      ok: jaEstavaNaFila
        ? "Orçamento enviado. O e-mail desta versão já estava na fila e não foi duplicado."
        : "Orçamento enviado e e-mail na fila.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível enviar o orçamento.");
  }
}

/** Registra a aprovação que o cliente deu por WhatsApp, telefone ou e-mail. */
export async function aprovarOrcamentoAdmin(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const nome = texto(formData, "nome") || usuario.name;

  try {
    await aprovarOrcamento(quoteId, { nome, ip: await ipAtual(), userId: usuario.id });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "orcamento",
      entidadeId: quoteId,
      resumo: `Orçamento aprovado por ${nome}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar a aprovação.");
  }

  revalidarOrcamento(quoteId);
  return { ok: "Aprovação registrada. O serviço está liberado." };
}

/** Registra a recusa com o motivo, que alimenta o próximo orçamento. */
export async function recusarOrcamentoAdmin(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  const motivo = texto(formData, "motivo");
  if (!quoteId) return { erro: "Orçamento não informado." };
  if (motivo.length < 5) return { erro: "Escreva o motivo da recusa.", campo: "motivo" };

  try {
    await recusarOrcamento(quoteId, motivo, {
      nome: texto(formData, "nome") || usuario.name,
      ip: await ipAtual(),
      userId: usuario.id,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "orcamento",
      entidadeId: quoteId,
      resumo: `Orçamento recusado: ${motivo}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar a recusa.");
  }

  revalidarOrcamento(quoteId);
  return { ok: "Recusa registrada." };
}

/** Anota o andamento da negociação no histórico do orçamento. */
export async function anotarOrcamento(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  const mensagem = texto(formData, "mensagem");
  if (!quoteId) return { erro: "Orçamento não informado." };
  if (mensagem.length < 2) return { erro: "Escreva a anotação.", campo: "mensagem" };

  const orcamento = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, number: true, status: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };

  const visivel = marcado(formData, "visivel");
  const emNegociacao = marcado(formData, "emNegociacao");

  await prisma.quoteEvent.create({
    data: {
      quoteId,
      title: visivel ? "Recado da equipe" : "Anotação interna",
      message: mensagem.slice(0, 2000),
      visibleToCustomer: visivel,
      userId: usuario.id,
    },
  });

  if (emNegociacao && orcamento.status === "enviado") {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "em_duvida" } });
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "orcamento",
    entidadeId: quoteId,
    resumo: `Anotação no orçamento ${orcamento.number}`,
  });

  revalidarOrcamento(quoteId);
  return { ok: "Anotação registrada." };
}

/** Descarta um orçamento que nunca foi enviado. */
export async function excluirOrcamento(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const usuario = await exigirEdicao("orcamentos");
  if (!PODE.excluirRegistros(usuario)) {
    return { erro: "Só administradores excluem orçamentos." };
  }

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const orcamento = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, number: true, status: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };
  if (orcamento.status !== "rascunho") {
    return { erro: "Só rascunho pode ser excluído. Recuse ou deixe expirar os demais." };
  }

  await prisma.quote.delete({ where: { id: quoteId } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "orcamento",
    entidadeId: quoteId,
    resumo: `Rascunho ${orcamento.number} excluído`,
  });

  revalidatePath("/admin/orcamentos");
  redirect("/admin/orcamentos");
}
