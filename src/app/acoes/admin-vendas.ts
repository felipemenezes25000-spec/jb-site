"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CouponKind,
  DocumentKind,
  OrderStatus,
  PaymentMethod,
  PersonType,
  Prisma,
  QuoteKind,
  ShippingKind,
} from "@prisma/client";
import { z } from "zod";

import { ipAtual, registrarAuditoria } from "@/lib/auditoria";
import { PODE } from "@/lib/auth";
import {
  documentoValido,
  formatarDataHora,
  formatarPreco,
  paraCentavos,
  somenteDigitos,
} from "@/lib/format";
import { enfileirar } from "@/lib/notificacoes";
import {
  ErroDeOrcamento,
  aprovarOrcamento,
  criarOrcamento,
  enviarOrcamento,
  recusarOrcamento,
  substituirItens,
} from "@/lib/orcamento";
import { provedorPagamento } from "@/lib/pagamento";
import {
  ErroDeEstoque,
  cancelarPedido,
  confirmarPagamento,
  estornarPedido,
  mudarStatus,
} from "@/lib/pedido";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { ErroDeUpload, enviarArquivo, removerArquivo } from "@/lib/upload";

/**
 * Ações do backoffice comercial — pedidos, pagamentos, clientes, orçamentos,
 * cupons e frete.
 *
 * Três regras valem para tudo que está aqui:
 *
 * 1. Autorização é de servidor. Toda função começa por `exigirEdicao(área)`;
 *    esconder o botão na tela não conta como controle. Onde a regra é mais
 *    apertada que a área (pagamento manual, estorno, exclusão), soma-se uma
 *    capacidade de `PODE`.
 *
 * 2. Valor nunca vem pronto do formulário. Total de pedido, total de orçamento
 *    e valor de cobrança são recalculados no servidor a partir do banco — o que
 *    o navegador manda é intenção, não preço.
 *
 * 3. Toda escrita registra auditoria e revalida as rotas que mudaram. As
 *    funções de domínio (`@/lib/pedido`, `@/lib/orcamento`) não revalidam nada
 *    de propósito: quem chama é que sabe quais telas dependem do dado.
 *
 * MAPA DE ÁREAS — `@/lib/permissoes` está congelado nesta rodada e não tem
 * entrada própria para pagamentos, cupons e frete. A ligação usada aqui é:
 *   · pagamentos → área "pedidos"        (é a mesma operação de venda)
 *   · cupons     → área "produtos"       (é precificação: admin/gestor editam)
 *   · frete      → área "configuracoes"  (a própria descrição da área cita frete)
 */

export type EstadoVendas = { erro?: string; campo?: string; ok?: string };

/* ------------------------------------------------------------- utilitários */

function primeiroProblema(erro: z.ZodError): EstadoVendas {
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

/** "AAAA-MM-DDTHH:mm" de um <input type="datetime-local">. */
function dataComHora(bruto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(bruto)) return null;
  const data = new Date(`${bruto}:00${FUSO_BR}`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function revalidarPedido(pedidoId: string) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin");
  revalidatePath("/minha-jb/pedidos");
  revalidatePath(`/minha-jb/pedidos/${pedidoId}`);
}

function revalidarOrcamento(quoteId: string) {
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${quoteId}`);
  revalidatePath("/admin");
  revalidatePath("/minha-jb/orcamentos");
  revalidatePath(`/minha-jb/orcamentos/${quoteId}`);
}

/** Mensagem de erro sem vazar detalhe interno, mas com o que dá para agir. */
function mensagemDeErro(erro: unknown, padrao: string): EstadoVendas {
  if (erro instanceof ErroDeOrcamento) return { erro: erro.message };
  if (erro instanceof ErroDeEstoque) {
    return { erro: `${erro.message}. Reponha o estoque ou revise os itens antes de continuar.` };
  }
  if (erro instanceof ErroDeUpload) return { erro: erro.message, campo: "arquivo" };
  console.error(padrao, erro);
  return { erro: padrao };
}

/* ========================================================================== */
/* PEDIDOS                                                                    */
/* ========================================================================== */

const esquemaStatus = z.object({
  pedidoId: z.string().min(1, "Pedido não informado."),
  status: z.enum(OrderStatus),
  nota: z.string().trim().max(600, "A nota ficou longa demais.").default(""),
});

/**
 * Avança (ou corrige) o status do pedido.
 *
 * `pago` não é escrito à mão: passa por `confirmarPagamento`, que é quem cria o
 * equipamento no prontuário do cliente e avisa a pessoa. Cancelamento também
 * não entra por aqui — tem ação própria, porque devolve estoque.
 */
export async function mudarStatusPedido(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");

  const dados = esquemaStatus.safeParse({
    pedidoId: formData.get("pedidoId"),
    status: formData.get("status"),
    nota: formData.get("nota") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const pedido = await prisma.order.findUnique({
    where: { id: dados.data.pedidoId },
    select: { id: true, number: true, status: true, paidAt: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };

  if (pedido.status === dados.data.status) {
    return { erro: "O pedido já está neste status.", campo: "status" };
  }
  if (dados.data.status === "cancelado") {
    return {
      erro: "Para cancelar, use o cancelamento com motivo — ele devolve o estoque.",
      campo: "status",
    };
  }
  // voltar para "pago" um pedido que já foi pago não refaria nada: confirmarPagamento
  // é idempotente e sairia calado, deixando a tela dizer que mudou algo
  if (dados.data.status === "pago" && pedido.paidAt) {
    return {
      erro: "Este pedido já teve o pagamento confirmado. Escolha o próximo passo da operação.",
      campo: "status",
    };
  }

  try {
    if (dados.data.status === "pago") {
      await confirmarPagamento(pedido.id);
    } else {
      await mudarStatus(pedido.id, dados.data.status, {
        nota: dados.data.nota,
        userId: usuario.id,
        visivel: marcado(formData, "visivel"),
      });
    }
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível mudar o status do pedido.");
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "status",
    entidade: "pedido",
    entidadeId: pedido.id,
    antes: { status: pedido.status },
    depois: { status: dados.data.status },
    resumo: `Pedido ${pedido.number}`,
  });

  revalidarPedido(pedido.id);
  return { ok: "Status atualizado." };
}

const esquemaPagamentoManual = z.object({
  pedidoId: z.string().min(1, "Pedido não informado."),
  metodo: z.enum(PaymentMethod),
  observacao: z.string().trim().max(400).default(""),
});

/**
 * Registra um pagamento recebido fora do checkout (transferência, dinheiro,
 * maquininha da loja) e dispara o que depende dele.
 *
 * O valor cobrado é o total do pedido lido do banco — o formulário não manda
 * valor. Assim ninguém "confirma" R$ 1,00 de um pedido de R$ 10.000.
 */
export async function confirmarPagamentoManual(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");
  if (!PODE.confirmarPagamentoManual(usuario)) {
    return { erro: "Só gestores e administradores confirmam pagamento manual." };
  }

  const dados = esquemaPagamentoManual.safeParse({
    pedidoId: formData.get("pedidoId"),
    metodo: formData.get("metodo"),
    observacao: formData.get("observacao") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const pedido = await prisma.order.findUnique({
    where: { id: dados.data.pedidoId },
    select: { id: true, number: true, status: true, totalCents: true, paidAt: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.status === "cancelado") return { erro: "Pedido cancelado não recebe pagamento." };
  if (pedido.paidAt) return { erro: "Este pedido já consta como pago." };

  try {
    const pagamento = await prisma.payment.create({
      data: {
        orderId: pedido.id,
        provider: "manual",
        method: dados.data.metodo,
        status: "aprovado",
        amountCents: pedido.totalCents,
        approvedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId: pagamento.id,
        eventKey: `manual:${pagamento.id}`,
        kind: "confirmacao_manual",
        payload: {
          registradoPor: usuario.name,
          userId: usuario.id,
          metodo: dados.data.metodo,
          valorCents: pedido.totalCents,
          observacao: dados.data.observacao,
        },
      },
    });

    await confirmarPagamento(pedido.id);

    if (dados.data.observacao) {
      await prisma.orderStatusEvent.create({
        data: {
          orderId: pedido.id,
          status: "pago",
          note: dados.data.observacao,
          visibleToCustomer: false,
          userId: usuario.id,
        },
      });
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "pagamento",
      entidade: "pedido",
      entidadeId: pedido.id,
      resumo: `Pedido ${pedido.number} — ${formatarPreco(pedido.totalCents)} por ${dados.data.metodo}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar o pagamento.");
  }

  revalidarPedido(pedido.id);
  revalidatePath("/admin/pagamentos");
  return { ok: "Pagamento confirmado." };
}

const esquemaCancelamento = z.object({
  pedidoId: z.string().min(1, "Pedido não informado."),
  motivo: z
    .string()
    .trim()
    .min(5, "Escreva o motivo do cancelamento — ele fica no histórico do cliente.")
    .max(600),
});

/** Cancela devolvendo o estoque. O motivo é obrigatório e vai para o histórico. */
export async function cancelarPedidoAdmin(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");

  const dados = esquemaCancelamento.safeParse({
    pedidoId: formData.get("pedidoId"),
    motivo: formData.get("motivo"),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const pedido = await prisma.order.findUnique({
    where: { id: dados.data.pedidoId },
    select: { id: true, number: true, status: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.status === "cancelado") return { erro: "Este pedido já está cancelado." };

  try {
    await cancelarPedido(pedido.id, dados.data.motivo, usuario.id);
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível cancelar o pedido.");
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "cancelar",
    entidade: "pedido",
    entidadeId: pedido.id,
    resumo: `Pedido ${pedido.number} — ${dados.data.motivo}`,
  });

  revalidarPedido(pedido.id);
  return { ok: "Pedido cancelado e estoque devolvido." };
}

const esquemaInstalacao = z.object({
  pedidoId: z.string().min(1, "Pedido não informado."),
  tarefaId: z.string().trim().default(""),
  quando: z.string().min(1, "Informe a data e a hora da instalação."),
  tecnicoId: z.string().trim().default(""),
  observacao: z.string().trim().max(600).default(""),
});

/**
 * Agenda a instalação do pedido.
 *
 * A `InstallationTask` nasce sozinha quando o cliente compra o serviço de
 * instalação no checkout; quando a combinação foi por telefone, esta ação cria
 * a tarefa. O compromisso na agenda (`ServiceAppointment`) é ligado à tarefa por
 * `installTaskId`, que é único — por isso `upsert`: reagendar troca a data do
 * mesmo compromisso em vez de encher a agenda de fantasmas.
 */
export async function agendarInstalacao(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");

  const dados = esquemaInstalacao.safeParse({
    pedidoId: formData.get("pedidoId"),
    tarefaId: formData.get("tarefaId") ?? "",
    quando: formData.get("quando"),
    tecnicoId: formData.get("tecnicoId") ?? "",
    observacao: formData.get("observacao") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const quando = dataComHora(dados.data.quando);
  if (!quando) return { erro: "Data ou hora inválida.", campo: "quando" };

  const pedido = await prisma.order.findUnique({
    where: { id: dados.data.pedidoId },
    select: {
      id: true,
      number: true,
      status: true,
      shipStreet: true,
      shipNumber: true,
      shipDistrict: true,
      shipCity: true,
      shipState: true,
    },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.status === "cancelado") return { erro: "Pedido cancelado não recebe agendamento." };

  const endereco = [
    [pedido.shipStreet, pedido.shipNumber].filter(Boolean).join(", "),
    pedido.shipDistrict,
    [pedido.shipCity, pedido.shipState].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" — ");

  try {
    const tarefa = dados.data.tarefaId
      ? await prisma.installationTask.findFirst({
          where: { id: dados.data.tarefaId, orderId: pedido.id },
          select: { id: true },
        })
      : null;

    const alvo =
      tarefa ??
      (await prisma.installationTask.create({
        data: { orderId: pedido.id, status: "pendente" },
        select: { id: true },
      }));

    await prisma.installationTask.update({
      where: { id: alvo.id },
      data: { status: "agendada", scheduledAt: quando, notes: dados.data.observacao },
    });

    await prisma.serviceAppointment.upsert({
      where: { installTaskId: alvo.id },
      create: {
        installTaskId: alvo.id,
        technicianId: dados.data.tecnicoId || null,
        title: `Instalação — pedido ${pedido.number}`,
        startsAt: quando,
        status: "agendado",
        addressSummary: endereco,
        notes: dados.data.observacao,
      },
      update: {
        technicianId: dados.data.tecnicoId || null,
        startsAt: quando,
        status: "agendado",
        addressSummary: endereco,
        notes: dados.data.observacao,
      },
    });

    await prisma.orderStatusEvent.create({
      data: {
        orderId: pedido.id,
        status: "instalacao_agendada",
        note: `Instalação agendada para ${formatarDataHora(quando)}.`,
        visibleToCustomer: true,
        userId: usuario.id,
      },
    });

    // o pedido só muda de status quando ainda não saiu para entrega
    const podeMarcar: OrderStatus[] = [
      "pago",
      "separacao",
      "revisao_tecnica",
      "aguardando_frete",
      "pronto_retirada",
    ];
    if (podeMarcar.includes(pedido.status)) {
      await prisma.order.update({
        where: { id: pedido.id },
        data: { status: "instalacao_agendada" },
      });
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "atribuir",
      entidade: "pedido",
      entidadeId: pedido.id,
      resumo: `Instalação do pedido ${pedido.number} agendada para ${formatarDataHora(quando)}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível agendar a instalação.");
  }

  revalidarPedido(pedido.id);
  return { ok: "Instalação agendada." };
}

const esquemaNotaPedido = z.object({
  pedidoId: z.string().min(1, "Pedido não informado."),
  notaInterna: z.string().trim().max(4000, "A nota ficou longa demais.").default(""),
});

/** Nota interna do pedido — nunca aparece para o cliente. */
export async function salvarNotaDoPedido(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");

  const dados = esquemaNotaPedido.safeParse({
    pedidoId: formData.get("pedidoId"),
    notaInterna: formData.get("notaInterna") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const pedido = await prisma.order.findUnique({
    where: { id: dados.data.pedidoId },
    select: { id: true, number: true, internalNote: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.internalNote === dados.data.notaInterna) return { ok: "Nada mudou." };

  await prisma.order.update({
    where: { id: pedido.id },
    data: { internalNote: dados.data.notaInterna },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "pedido",
    entidadeId: pedido.id,
    antes: { internalNote: pedido.internalNote },
    depois: { internalNote: dados.data.notaInterna },
    resumo: `Nota interna do pedido ${pedido.number}`,
  });

  revalidarPedido(pedido.id);
  return { ok: "Nota interna salva." };
}

const esquemaDocumento = z.object({
  pedidoId: z.string().min(1, "Pedido não informado."),
  titulo: z.string().trim().min(2, "Dê um nome ao documento.").max(140),
  tipo: z.enum(DocumentKind),
});

/**
 * Anexa nota fiscal e outros documentos ao pedido.
 *
 * O arquivo é validado de verdade em `@/lib/upload`: lista branca de MIME e
 * conferência do conteúdo, não só da extensão. `storageKey` guarda o endereço
 * devolvido pelo armazenamento em uso.
 */
export async function anexarDocumentoDoPedido(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");

  const dados = esquemaDocumento.safeParse({
    pedidoId: formData.get("pedidoId"),
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo"),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha o arquivo a anexar.", campo: "arquivo" };
  }

  const pedido = await prisma.order.findUnique({
    where: { id: dados.data.pedidoId },
    select: { id: true, number: true, customerId: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };

  try {
    const enviado = await enviarArquivo(arquivo, { pasta: "documentos" });

    await prisma.document.create({
      data: {
        kind: dados.data.tipo,
        title: dados.data.titulo,
        storageKey: enviado.url,
        mime: enviado.contentType,
        size: enviado.size,
        orderId: pedido.id,
        customerId: pedido.customerId,
      },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "documento",
      entidadeId: pedido.id,
      resumo: `${dados.data.titulo} anexado ao pedido ${pedido.number}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível anexar o documento.");
  }

  revalidarPedido(pedido.id);
  return { ok: "Documento anexado." };
}

/** Remove o anexo do pedido e apaga o arquivo do armazenamento. */
export async function removerDocumentoDoPedido(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");
  if (!PODE.excluirRegistros(usuario)) {
    return { erro: "Só administradores excluem documentos." };
  }

  const documentoId = texto(formData, "documentoId");
  if (!documentoId) return { erro: "Documento não informado." };

  const documento = await prisma.document.findUnique({
    where: { id: documentoId },
    select: { id: true, title: true, storageKey: true, orderId: true },
  });
  if (!documento?.orderId) return { erro: "Documento não encontrado." };

  await prisma.document.delete({ where: { id: documento.id } });
  await removerArquivo(documento.storageKey);

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "documento",
    entidadeId: documento.orderId,
    resumo: `${documento.title} removido do pedido`,
  });

  revalidarPedido(documento.orderId);
  return { ok: "Documento removido." };
}

/* ========================================================================== */
/* PAGAMENTOS                                                                 */
/* ========================================================================== */

/**
 * Reconsulta o provedor e traz o estado real para dentro.
 *
 * A fonte da verdade é sempre o provedor, nunca o navegador. O evento gravado
 * usa chave determinística (`consulta:<externalId>:<status>`): reconsultar dez
 * vezes o mesmo estado grava uma linha só.
 */
export async function reconsultarPagamento(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");

  const pagamentoId = texto(formData, "pagamentoId");
  if (!pagamentoId) return { erro: "Pagamento não informado." };

  const pagamento = await prisma.payment.findUnique({
    where: { id: pagamentoId },
    select: {
      id: true,
      status: true,
      provider: true,
      externalId: true,
      orderId: true,
      order: { select: { number: true } },
    },
  });
  if (!pagamento) return { erro: "Pagamento não encontrado." };
  if (pagamento.provider === "manual") {
    return { erro: "Pagamento manual não tem provedor para consultar." };
  }
  if (!pagamento.externalId) {
    return { erro: "Este pagamento não tem identificador no provedor." };
  }

  try {
    const provedor = provedorPagamento();
    const atual = await provedor.consultar(pagamento.externalId);
    if (!atual) return { erro: "O provedor não respondeu sobre este pagamento." };

    if (atual.status === pagamento.status) {
      return { ok: `O provedor confirma o estado atual (${atual.status}).` };
    }

    await prisma.payment.update({
      where: { id: pagamento.id },
      data: {
        status: atual.status,
        ...(atual.status === "aprovado" ? { approvedAt: new Date() } : {}),
      },
    });

    try {
      await prisma.paymentEvent.create({
        data: {
          paymentId: pagamento.id,
          eventKey: `consulta:${pagamento.externalId}:${atual.status}`,
          kind: "consulta_manual",
          payload: { consultadoPor: usuario.name, de: pagamento.status, para: atual.status },
        },
      });
    } catch (erro) {
      // P2002: este mesmo resultado já tinha sido registrado — nada a fazer
      if (!(erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002")) {
        throw erro;
      }
    }

    if (atual.status === "aprovado") await confirmarPagamento(pagamento.orderId);

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "pagamento",
      entidadeId: pagamento.id,
      antes: { status: pagamento.status },
      depois: { status: atual.status },
      resumo: `Reconsulta do pagamento do pedido ${pagamento.order.number}`,
    });

    revalidatePath("/admin/pagamentos");
    revalidatePath(`/admin/pagamentos/${pagamento.id}`);
    revalidarPedido(pagamento.orderId);
    return { ok: `Estado atualizado para ${atual.status}.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível falar com o provedor de pagamento.");
  }
}

/**
 * Estorna a cobrança.
 *
 * Pagamento manual não vai ao provedor — a devolução aconteceu fora do sistema
 * e aqui é só o registro. Para os demais, o estorno só é gravado se o provedor
 * confirmar; provedor que não implementa estorno diz isso na tela em vez de
 * fingir que devolveu.
 */
export async function estornarPagamento(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("pedidos");
  if (!PODE.confirmarPagamentoManual(usuario)) {
    return { erro: "Só gestores e administradores estornam pagamento." };
  }

  const pagamentoId = texto(formData, "pagamentoId");
  const motivo = texto(formData, "motivo");
  if (!pagamentoId) return { erro: "Pagamento não informado." };
  if (motivo.length < 5) return { erro: "Escreva o motivo do estorno.", campo: "motivo" };

  const pagamento = await prisma.payment.findUnique({
    where: { id: pagamentoId },
    select: {
      id: true,
      status: true,
      provider: true,
      externalId: true,
      amountCents: true,
      orderId: true,
      order: { select: { number: true } },
    },
  });
  if (!pagamento) return { erro: "Pagamento não encontrado." };
  if (pagamento.status === "estornado") return { erro: "Este pagamento já foi estornado." };

  try {
    if (pagamento.provider !== "manual") {
      const provedor = provedorPagamento();
      if (!provedor.estornar) {
        return { erro: `O provedor "${provedor.nome}" não aceita estorno pelo painel.` };
      }
      if (!pagamento.externalId) {
        return { erro: "Este pagamento não tem identificador no provedor." };
      }
      const devolvido = await provedor.estornar(pagamento.externalId, pagamento.amountCents);
      if (!devolvido) {
        return { erro: "O provedor recusou o estorno. Confira o painel do provedor." };
      }
    }

    await prisma.payment.update({
      where: { id: pagamento.id },
      data: { status: "estornado", failReason: motivo },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId: pagamento.id,
        eventKey: `estorno:${pagamento.id}`,
        kind: "estorno",
        payload: {
          estornadoPor: usuario.name,
          userId: usuario.id,
          motivo,
          valorCents: pagamento.amountCents,
        },
      },
    });

    /**
     * `estornarPedido`, não `mudarStatus`.
     *
     * Trocar só o status deixava o estoque baixado e a unidade física presa a
     * um pedido morto: o equipamento voltava para a loja e sumia da vitrine.
     * `estornarPedido` devolve o saldo, grava a movimentação de devolução e
     * libera a InventoryUnit — e só devolve o que ainda não tinha saído da JB.
     * O estorno vindo do provedor já passava por lá; o do painel, não.
     */
    await estornarPedido(pagamento.orderId, motivo, usuario.id);

    await registrarAuditoria({
      userId: usuario.id,
      acao: "cancelar",
      entidade: "pagamento",
      entidadeId: pagamento.id,
      resumo: `Estorno de ${formatarPreco(pagamento.amountCents)} no pedido ${pagamento.order.number} — ${motivo}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível estornar o pagamento.");
  }

  revalidatePath("/admin/pagamentos");
  revalidatePath(`/admin/pagamentos/${pagamento.id}`);
  revalidarPedido(pagamento.orderId);
  return { ok: "Estorno registrado." };
}

/* ========================================================================== */
/* CLIENTES                                                                   */
/* ========================================================================== */

const esquemaCliente = z.object({
  clienteId: z.string().min(1, "Cliente não informado."),
  nome: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
  email: z.email("Informe um e-mail válido."),
  telefone: z.string().trim().max(30).default(""),
  tipoPessoa: z.enum(PersonType),
  documento: z.string().trim().max(20).default(""),
  razaoSocial: z.string().trim().max(160).default(""),
  nomeFantasia: z.string().trim().max(160).default(""),
  inscricaoEstadual: z.string().trim().max(40).default(""),
});

/** Edita o cadastro do cliente. Senha não passa por aqui. */
export async function salvarCliente(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("clientes");

  const dados = esquemaCliente.safeParse({
    clienteId: formData.get("clienteId"),
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone") ?? "",
    tipoPessoa: formData.get("tipoPessoa"),
    documento: formData.get("documento") ?? "",
    razaoSocial: formData.get("razaoSocial") ?? "",
    nomeFantasia: formData.get("nomeFantasia") ?? "",
    inscricaoEstadual: formData.get("inscricaoEstadual") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const documento = somenteDigitos(dados.data.documento);
  if (documento && !documentoValido(documento, dados.data.tipoPessoa)) {
    return {
      erro: dados.data.tipoPessoa === "fisica" ? "CPF inválido." : "CNPJ inválido.",
      campo: "documento",
    };
  }
  if (dados.data.tipoPessoa === "juridica" && !dados.data.razaoSocial) {
    return { erro: "Informe a razão social.", campo: "razaoSocial" };
  }

  const cliente = await prisma.customer.findUnique({
    where: { id: dados.data.clienteId },
    select: {
      name: true,
      email: true,
      phone: true,
      personType: true,
      document: true,
      companyName: true,
      tradeName: true,
      stateRegistry: true,
      active: true,
    },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const depois = {
    name: dados.data.nome,
    email: dados.data.email.toLowerCase(),
    phone: somenteDigitos(dados.data.telefone),
    personType: dados.data.tipoPessoa,
    document: documento,
    companyName: dados.data.razaoSocial,
    tradeName: dados.data.nomeFantasia,
    stateRegistry: dados.data.inscricaoEstadual,
    active: marcado(formData, "ativo"),
  };

  try {
    await prisma.customer.update({ where: { id: dados.data.clienteId }, data: depois });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe outro cliente com este e-mail.", campo: "email" };
    }
    return mensagemDeErro(erro, "Não foi possível salvar o cliente.");
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "cliente",
    entidadeId: dados.data.clienteId,
    antes: cliente,
    depois,
    resumo: `Cadastro de ${dados.data.nome}`,
  });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${dados.data.clienteId}`);
  return { ok: "Cadastro atualizado." };
}

/**
 * Acrescenta uma nota interna à ficha do cliente.
 *
 * `Customer.notes` é um campo de texto único no schema — não existe tabela de
 * notas. Por isso cada nota entra como um bloco datado e assinado, com a mais
 * recente no topo, e o histórico anterior é preservado inteiro.
 */
export async function adicionarNotaDoCliente(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("clientes");

  const clienteId = texto(formData, "clienteId");
  const nota = texto(formData, "nota");
  if (!clienteId) return { erro: "Cliente não informado." };
  if (nota.length < 2) return { erro: "Escreva a nota.", campo: "nota" };
  if (nota.length > 2000) return { erro: "A nota ficou longa demais.", campo: "nota" };

  const cliente = await prisma.customer.findUnique({
    where: { id: clienteId },
    select: { id: true, name: true, notes: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const cabecalho = `[${formatarDataHora(new Date())} · ${usuario.name}]`;
  const atualizado = [`${cabecalho}\n${nota}`, cliente.notes.trim()]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 20_000);

  await prisma.customer.update({ where: { id: cliente.id }, data: { notes: atualizado } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "criar",
    entidade: "cliente",
    entidadeId: cliente.id,
    resumo: `Nota interna em ${cliente.name}`,
  });

  revalidatePath(`/admin/clientes/${cliente.id}`);
  return { ok: "Nota registrada." };
}

/* ========================================================================== */
/* ORÇAMENTOS                                                                 */
/* ========================================================================== */

type ItemLido = {
  productId: string | null;
  serviceId: string | null;
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
  const produtos = formData.getAll("item_produto").map(String);

  return descricoes
    .map((descricao, indice) => ({
      productId: produtos[indice]?.trim() || null,
      serviceId: null,
      descricao: descricao.trim(),
      quantidade: Math.max(1, Number(somenteDigitos(quantidades[indice] ?? "1")) || 1),
      valorUnitarioCents: Math.max(0, paraCentavos(valores[indice] ?? "0")),
    }))
    .filter((item) => item.descricao.length > 0);
}

const esquemaOrcamento = z.object({
  kind: z.enum(QuoteKind),
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
    kind: formData.get("kind") ?? "comercial",
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

/** Monta a proposta em rascunho e abre a tela dela. */
export async function criarOrcamentoAdmin(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("orcamentos");

  const cabecalho = lerCabecalho(formData);
  if (!cabecalho.success) return primeiroProblema(cabecalho.error);

  const itens = lerItensDoFormulario(formData);
  if (itens.length === 0) {
    return { erro: "Inclua ao menos um item na proposta.", campo: "item_descricao" };
  }
  if (!cabecalho.data.customerId && !cabecalho.data.contatoNome) {
    return { erro: "Escolha um cliente ou preencha o nome do contato.", campo: "contatoNome" };
  }

  let criado: { id: string; number: string };
  try {
    criado = await criarOrcamento({
      kind: cabecalho.data.kind,
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
      freteCents: centavos(formData, "freteCents"),
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
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const cabecalho = lerCabecalho(formData);
  if (!cabecalho.success) return primeiroProblema(cabecalho.error);

  const itens = lerItensDoFormulario(formData);
  if (itens.length === 0) {
    return { erro: "Inclua ao menos um item na proposta.", campo: "item_descricao" };
  }

  const orcamento = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, number: true, status: true, totalCents: true },
  });
  if (!orcamento) return { erro: "Orçamento não encontrado." };
  if (orcamento.status === "convertido") {
    return { erro: "Este orçamento já virou pedido e não pode ser alterado." };
  }

  try {
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        kind: cabecalho.data.kind,
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
      freteCents: centavos(formData, "freteCents"),
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "orcamento",
      entidadeId: quoteId,
      antes: { totalCents: orcamento.totalCents },
      depois: { totalCents: atualizado.totalCents },
      resumo: `Orçamento ${orcamento.number} — versão ${atualizado.version}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o orçamento.");
  }

  revalidarOrcamento(quoteId);
  return { ok: "Orçamento salvo." };
}

/**
 * Envia a proposta ao cliente.
 *
 * Além do que `enviarOrcamento` já faz (status, validade, evento e aviso na
 * área do cliente), aqui a mensagem entra na fila de saída com chave de
 * deduplicação por versão: reenviar a mesma versão não gera dois e-mails, mas
 * uma revisão nova gera.
 */
export async function enviarOrcamentoAdmin(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const validadeDias = inteiroOuNulo(texto(formData, "validadeDias"));

  try {
    const enviado = await enviarOrcamento(quoteId, {
      userId: usuario.id,
      validadeDias: validadeDias ?? undefined,
      mensagem: texto(formData, "mensagem") || undefined,
    });

    const destino = enviado.contactEmail.trim();
    const link = `${SITE_URL}/minha-jb/orcamentos/${enviado.id}`;

    if (destino) {
      const resultado = await enfileirar({
        canal: "email",
        para: destino,
        assunto: `Orçamento ${enviado.number} — JB Soluções Odontológicas`,
        corpo: [
          `Olá, ${enviado.contactName || "tudo bem"}?`,
          "",
          `Segue o orçamento ${enviado.number}, no valor de ${formatarPreco(enviado.totalCents)}.`,
          enviado.validUntil ? `A proposta vale até ${formatarDataHora(enviado.validUntil)}.` : "",
          "",
          `Para ver os itens e aprovar: ${link}`,
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
          erro: `Orçamento publicado para o cliente, mas o e-mail não entrou na fila: ${resultado.motivo}`,
        };
      }
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "enviar",
      entidade: "orcamento",
      entidadeId: quoteId,
      resumo: destino
        ? `Orçamento ${enviado.number} enviado para ${destino}`
        : `Orçamento ${enviado.number} publicado (sem e-mail de contato)`,
    });

    revalidarOrcamento(quoteId);
    return {
      ok: destino
        ? "Orçamento enviado e mensagem na fila."
        : "Orçamento publicado. Sem e-mail de contato, avise o cliente por outro canal.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível enviar o orçamento.");
  }
}

/**
 * Registra a aprovação.
 *
 * No orçamento comercial a aprovação já gera o pedido dentro da mesma
 * transação, com os valores negociados e a baixa de estoque — por isso não
 * existe um botão separado de "converter": aprovar e converter são o mesmo
 * fato, e separá-los abriria janela para aprovar sem reservar o equipamento.
 */
export async function aprovarOrcamentoAdmin(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("orcamentos");

  const quoteId = texto(formData, "quoteId");
  if (!quoteId) return { erro: "Orçamento não informado." };

  const nome = texto(formData, "nome") || usuario.name;

  try {
    const resultado = await aprovarOrcamento(quoteId, {
      nome,
      ip: await ipAtual(),
      userId: usuario.id,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "orcamento",
      entidadeId: quoteId,
      resumo: resultado.pedidoId
        ? `Orçamento aprovado por ${nome} e convertido em pedido`
        : `Orçamento aprovado por ${nome}`,
    });

    revalidarOrcamento(quoteId);
    if (resultado.pedidoId) revalidarPedido(resultado.pedidoId);

    return {
      ok: resultado.pedidoId
        ? "Aprovado. O pedido foi gerado com os valores da proposta."
        : "Aprovação registrada. O serviço está liberado.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar a aprovação.");
  }
}

/** Registra a recusa com o motivo — é ele que alimenta a próxima proposta. */
export async function recusarOrcamentoAdmin(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
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
      resumo: `Orçamento recusado — ${motivo}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar a recusa.");
  }

  revalidarOrcamento(quoteId);
  return { ok: "Recusa registrada." };
}

/** Anota o andamento da negociação no histórico da proposta. */
export async function anotarOrcamento(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
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

/** Descarta uma proposta que nunca foi enviada. */
export async function excluirOrcamento(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
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

/* ========================================================================== */
/* CUPONS                                                                     */
/* ========================================================================== */

const esquemaCupom = z.object({
  cupomId: z.string().trim().default(""),
  codigo: z
    .string()
    .trim()
    .min(3, "O código precisa de ao menos 3 caracteres.")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "Use apenas letras, números e hífen."),
  tipo: z.enum(CouponKind),
  valor: z.string().trim().min(1, "Informe o valor do desconto."),
  minimo: z.string().trim().default(""),
  maxUsos: z.string().trim().default(""),
  maxPorCliente: z.string().trim().default(""),
  inicio: z.string().trim().default(""),
  fim: z.string().trim().default(""),
  categoriaId: z.string().trim().default(""),
  produtoId: z.string().trim().default(""),
});

/** Cria ou atualiza o cupom. O contador de uso nunca é editado à mão. */
export async function salvarCupom(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaCupom.safeParse({
    cupomId: formData.get("cupomId") ?? "",
    codigo: formData.get("codigo"),
    tipo: formData.get("tipo"),
    valor: formData.get("valor"),
    minimo: formData.get("minimo") ?? "",
    maxUsos: formData.get("maxUsos") ?? "",
    maxPorCliente: formData.get("maxPorCliente") ?? "",
    inicio: formData.get("inicio") ?? "",
    fim: formData.get("fim") ?? "",
    categoriaId: formData.get("categoriaId") ?? "",
    produtoId: formData.get("produtoId") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  // percentual guarda 0-100; valor fixo guarda centavos
  const valor =
    dados.data.tipo === "percentual"
      ? Number(somenteDigitos(dados.data.valor))
      : paraCentavos(dados.data.valor);

  if (dados.data.tipo === "percentual" && (!valor || valor < 1 || valor > 90)) {
    return { erro: "O percentual precisa ficar entre 1 e 90.", campo: "valor" };
  }
  if (dados.data.tipo === "valor_fixo" && valor <= 0) {
    return { erro: "Informe o valor do desconto em reais.", campo: "valor" };
  }

  const inicio = dados.data.inicio ? dataDoDia(dados.data.inicio) : null;
  const fim = dados.data.fim ? dataDoDia(dados.data.fim) : null;
  if (dados.data.inicio && !inicio) return { erro: "Data inicial inválida.", campo: "inicio" };
  if (dados.data.fim && !fim) return { erro: "Data final inválida.", campo: "fim" };
  if (inicio && fim && fim < inicio) {
    return { erro: "A data final não pode ser antes da inicial.", campo: "fim" };
  }

  const conteudo = {
    code: dados.data.codigo.toUpperCase(),
    kind: dados.data.tipo,
    value: valor,
    minSubtotalCents: dados.data.minimo ? Math.max(0, paraCentavos(dados.data.minimo)) : 0,
    maxUses: inteiroOuNulo(dados.data.maxUsos),
    maxUsesPerCustomer: inteiroOuNulo(dados.data.maxPorCliente),
    startsAt: inicio,
    endsAt: fim,
    active: marcado(formData, "ativo"),
    categoryId: dados.data.categoriaId || null,
    productId: dados.data.produtoId || null,
  };

  try {
    if (dados.data.cupomId) {
      const antes = await prisma.coupon.findUnique({
        where: { id: dados.data.cupomId },
        select: {
          code: true,
          kind: true,
          value: true,
          minSubtotalCents: true,
          maxUses: true,
          maxUsesPerCustomer: true,
          startsAt: true,
          endsAt: true,
          active: true,
          categoryId: true,
          productId: true,
        },
      });
      if (!antes) return { erro: "Cupom não encontrado." };

      await prisma.coupon.update({ where: { id: dados.data.cupomId }, data: conteudo });
      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "cupom",
        entidadeId: dados.data.cupomId,
        antes,
        depois: conteudo,
        resumo: `Cupom ${conteudo.code}`,
      });
    } else {
      const criado = await prisma.coupon.create({ data: conteudo, select: { id: true } });
      await registrarAuditoria({
        userId: usuario.id,
        acao: "criar",
        entidade: "cupom",
        entidadeId: criado.id,
        depois: conteudo,
        resumo: `Cupom ${conteudo.code}`,
      });
    }
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { erro: "Já existe um cupom com este código.", campo: "codigo" };
    }
    return mensagemDeErro(erro, "Não foi possível salvar o cupom.");
  }

  revalidatePath("/admin/cupons");
  return { ok: dados.data.cupomId ? "Cupom atualizado." : "Cupom criado." };
}

/** Liga e desliga o cupom sem apagar histórico. */
export async function alternarCupom(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("produtos");

  const cupomId = texto(formData, "cupomId");
  if (!cupomId) return { erro: "Cupom não informado." };

  const cupom = await prisma.coupon.findUnique({
    where: { id: cupomId },
    select: { id: true, code: true, active: true },
  });
  if (!cupom) return { erro: "Cupom não encontrado." };

  await prisma.coupon.update({ where: { id: cupom.id }, data: { active: !cupom.active } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: cupom.active ? "arquivar" : "restaurar",
    entidade: "cupom",
    entidadeId: cupom.id,
    resumo: `Cupom ${cupom.code} ${cupom.active ? "desativado" : "reativado"}`,
  });

  revalidatePath("/admin/cupons");
  return { ok: cupom.active ? "Cupom desativado." : "Cupom reativado." };
}

/** Só apaga cupom que nunca foi usado — o resto é desativado, não apagado. */
export async function excluirCupom(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("produtos");
  if (!PODE.excluirRegistros(usuario)) {
    return { erro: "Só administradores excluem cupons." };
  }

  const cupomId = texto(formData, "cupomId");
  if (!cupomId) return { erro: "Cupom não informado." };

  const cupom = await prisma.coupon.findUnique({
    where: { id: cupomId },
    select: { id: true, code: true, usedCount: true, _count: { select: { orders: true } } },
  });
  if (!cupom) return { erro: "Cupom não encontrado." };
  if (cupom.usedCount > 0 || cupom._count.orders > 0) {
    return { erro: "Este cupom já foi usado em pedidos. Desative em vez de excluir." };
  }

  await prisma.coupon.delete({ where: { id: cupom.id } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "cupom",
    entidadeId: cupom.id,
    resumo: `Cupom ${cupom.code} excluído`,
  });

  revalidatePath("/admin/cupons");
  return { ok: "Cupom excluído." };
}

/* ========================================================================== */
/* FRETE                                                                      */
/* ========================================================================== */

const esquemaPerfil = z.object({
  perfilId: z.string().trim().default(""),
  nome: z.string().trim().min(2, "Dê um nome ao perfil.").max(80),
  tipo: z.enum(ShippingKind),
  descricao: z.string().trim().max(400).default(""),
  gratisAcima: z.string().trim().default(""),
});

/**
 * Perfil de frete: a regra que o produto usa para calcular entrega.
 *
 * Só um perfil pode ser o padrão. Marcar um novo desmarca o anterior dentro da
 * mesma transação — senão a loja ficaria com dois padrões e o resultado
 * dependeria da ordem de leitura.
 */
export async function salvarPerfilFrete(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("configuracoes");

  const dados = esquemaPerfil.safeParse({
    perfilId: formData.get("perfilId") ?? "",
    nome: formData.get("nome"),
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao") ?? "",
    gratisAcima: formData.get("gratisAcima") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const padrao = marcado(formData, "padrao");
  const conteudo = {
    name: dados.data.nome,
    kind: dados.data.tipo,
    description: dados.data.descricao,
    freeAboveCents: dados.data.gratisAcima
      ? Math.max(0, paraCentavos(dados.data.gratisAcima))
      : null,
    isDefault: padrao,
  };

  try {
    const id = await prisma.$transaction(async (tx) => {
      if (padrao) {
        await tx.shippingProfile.updateMany({
          where: dados.data.perfilId ? { NOT: { id: dados.data.perfilId } } : {},
          data: { isDefault: false },
        });
      }

      if (dados.data.perfilId) {
        const atualizado = await tx.shippingProfile.update({
          where: { id: dados.data.perfilId },
          data: conteudo,
          select: { id: true },
        });
        return atualizado.id;
      }

      const criado = await tx.shippingProfile.create({ data: conteudo, select: { id: true } });
      return criado.id;
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: dados.data.perfilId ? "editar" : "criar",
      entidade: "perfil-frete",
      entidadeId: id,
      depois: conteudo,
      resumo: `Perfil de frete ${conteudo.name}`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o perfil de frete.");
  }

  revalidatePath("/admin/frete");
  return { ok: dados.data.perfilId ? "Perfil atualizado." : "Perfil criado." };
}

/** Perfil em uso por produto não some: a loja perderia a regra de entrega. */
export async function excluirPerfilFrete(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("configuracoes");

  const perfilId = texto(formData, "perfilId");
  if (!perfilId) return { erro: "Perfil não informado." };

  const perfil = await prisma.shippingProfile.findUnique({
    where: { id: perfilId },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });
  if (!perfil) return { erro: "Perfil não encontrado." };
  if (perfil._count.products > 0) {
    return {
      erro: `${perfil._count.products} produto(s) usam este perfil. Troque o perfil deles antes de excluir.`,
    };
  }

  await prisma.shippingProfile.delete({ where: { id: perfil.id } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "perfil-frete",
    entidadeId: perfil.id,
    resumo: `Perfil de frete ${perfil.name} excluído`,
  });

  revalidatePath("/admin/frete");
  return { ok: "Perfil excluído." };
}

const esquemaZona = z.object({
  zonaId: z.string().trim().default(""),
  perfilId: z.string().min(1, "Perfil não informado."),
  nome: z.string().trim().min(2, "Dê um nome à faixa.").max(80),
  cepInicio: z.string().trim().min(1, "Informe o CEP inicial."),
  cepFim: z.string().trim().min(1, "Informe o CEP final."),
  valor: z.string().trim().default(""),
  prazo: z.string().trim().default(""),
  ordem: z.string().trim().default(""),
});

/**
 * Faixa de CEP com preço e prazo fixos.
 *
 * O CEP é comparado como texto de 8 dígitos, então o início é completado com
 * zeros e o fim com noves: digitar "01" e "09" cobre 01000000 a 09999999.
 */
export async function salvarZonaFrete(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("configuracoes");

  const dados = esquemaZona.safeParse({
    zonaId: formData.get("zonaId") ?? "",
    perfilId: formData.get("perfilId"),
    nome: formData.get("nome"),
    cepInicio: formData.get("cepInicio"),
    cepFim: formData.get("cepFim"),
    valor: formData.get("valor") ?? "",
    prazo: formData.get("prazo") ?? "",
    ordem: formData.get("ordem") ?? "",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const digitosInicio = somenteDigitos(dados.data.cepInicio);
  const digitosFim = somenteDigitos(dados.data.cepFim);
  if (digitosInicio.length < 5) {
    return { erro: "O CEP inicial precisa de ao menos 5 dígitos.", campo: "cepInicio" };
  }
  if (digitosFim.length < 5) {
    return { erro: "O CEP final precisa de ao menos 5 dígitos.", campo: "cepFim" };
  }

  const inicio = digitosInicio.padEnd(8, "0").slice(0, 8);
  const fim = digitosFim.padEnd(8, "9").slice(0, 8);
  if (fim < inicio) {
    return { erro: "O CEP final precisa ser maior que o inicial.", campo: "cepFim" };
  }

  const conteudo = {
    profileId: dados.data.perfilId,
    name: dados.data.nome,
    zipStart: inicio,
    zipEnd: fim,
    priceCents: dados.data.valor ? Math.max(0, paraCentavos(dados.data.valor)) : 0,
    etaDays: inteiroOuNulo(dados.data.prazo),
    order: inteiroOuNulo(dados.data.ordem) ?? 0,
  };

  try {
    if (dados.data.zonaId) {
      await prisma.shippingZone.update({ where: { id: dados.data.zonaId }, data: conteudo });
    } else {
      await prisma.shippingZone.create({ data: conteudo });
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: dados.data.zonaId ? "editar" : "criar",
      entidade: "zona-frete",
      entidadeId: dados.data.zonaId || dados.data.perfilId,
      depois: conteudo,
      resumo: `Faixa ${conteudo.name} (${inicio}–${fim})`,
    });
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar a faixa de CEP.");
  }

  revalidatePath("/admin/frete");
  return { ok: dados.data.zonaId ? "Faixa atualizada." : "Faixa criada." };
}

export async function excluirZonaFrete(
  _anterior: EstadoVendas,
  formData: FormData,
): Promise<EstadoVendas> {
  const usuario = await exigirEdicao("configuracoes");

  const zonaId = texto(formData, "zonaId");
  if (!zonaId) return { erro: "Faixa não informada." };

  const zona = await prisma.shippingZone.findUnique({
    where: { id: zonaId },
    select: { id: true, name: true },
  });
  if (!zona) return { erro: "Faixa não encontrada." };

  await prisma.shippingZone.delete({ where: { id: zona.id } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "zona-frete",
    entidadeId: zona.id,
    resumo: `Faixa ${zona.name} excluída`,
  });

  revalidatePath("/admin/frete");
  return { ok: "Faixa excluída." };
}
