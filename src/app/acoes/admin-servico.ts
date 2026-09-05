"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ContractStatus,
  EquipmentStatus,
  ServiceRequestStatus,
  Urgency,
  VisitStatus,
  WorkOrderStatus,
} from "@prisma/client";
import { z } from "zod";

import {
  ROTULO_CHAMADO,
  abrirChamado,
  agendarVisita,
  atribuirTecnico,
  mudarStatusChamado,
} from "@/lib/assistencia";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  ROTULO_EQUIPAMENTO,
  cadastrarEquipamento,
  mudarStatusEquipamento,
  registrarEvento,
} from "@/lib/equipamento";
import {
  formatarData,
  formatarDataHora,
  formatarPreco,
  gerarSlug,
  somenteDigitos,
} from "@/lib/format";
import {
  agendarVisitaDeManutencao,
  concluirVisita,
  contratarPlano,
  gerarVisitasDoContrato,
  mudarStatusContrato,
} from "@/lib/manutencao";
import { notificar } from "@/lib/notificacoes";
import { criarOrcamento } from "@/lib/orcamento";
import {
  ROTULO_OS,
  abrirOS,
  adicionarItem,
  concluirOS,
  definirChecklist,
  definirDesconto,
  marcarChecklist,
  mudarStatusOS,
  registrarMidia,
  removerItem,
} from "@/lib/os";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Escritas do backoffice técnico: chamados, ordens de serviço, manutenção,
 * equipamentos e técnicos.
 *
 * Três regras valem para todas as funções deste arquivo:
 *
 * 1. A autorização é sempre do servidor (`exigirEdicao`), nunca do botão que
 *    a página escondeu. Uma ação que não confere permissão é uma ação pública.
 *
 * 2. Dinheiro nunca é aceito como total. Só valor unitário e quantidade entram;
 *    quem soma é a camada de domínio (`recalcularTotaisDaOS`).
 *
 * 3. Data digitada é lida no fuso de São Paulo. `<input type="datetime-local">`
 *    manda "2026-09-05T14:30" sem fuso nenhum; interpretar isso como UTC jogaria
 *    toda a agenda três horas para frente.
 */

export type EstadoAcao = {
  erro?: string;
  /** Nome do campo que causou o erro, para o formulário destacar. */
  campo?: string;
  ok?: boolean;
  mensagem?: string;
};

/* ------------------------------------------------------------------ apoio */

/** O Brasil não usa horário de verão desde 2019: o deslocamento é fixo. */
const FUSO_BR = "-03:00";

/** Lê "AAAA-MM-DD" ou "AAAA-MM-DDTHH:MM" como horário de São Paulo. */
function dataSP(valor: unknown): Date | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (!texto) return null;

  let iso: string | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) iso = `${texto}T00:00:00${FUSO_BR}`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) iso = `${texto}:00${FUSO_BR}`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(texto)) iso = `${texto}${FUSO_BR}`;

  if (!iso) return null;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data;
}

const NOMES_DE_ERRO = new Set([
  "ErroDeAssistencia",
  "ErroDeOS",
  "ErroDeOrcamento",
  "ErroDeManutencao",
  "ErroDeEquipamento",
  "ErroDeEstoque",
]);

/**
 * Converte a exceção em mensagem para a tela.
 *
 * Erro de domínio já vem escrito para gente ler — passa direto. Qualquer outra
 * coisa é falha nossa: vai para o log do servidor e o usuário recebe um texto
 * genérico, sem detalhe de banco vazando para o navegador.
 */
function mensagemDeErro(erro: unknown, padrao: string): EstadoAcao {
  if (erro instanceof Error && NOMES_DE_ERRO.has(erro.name)) {
    return { erro: erro.message };
  }
  console.error(padrao, erro);
  return { erro: padrao };
}

/** Primeiro problema do zod, já no formato que o formulário entende. */
function problemaZod(erro: z.ZodError): EstadoAcao {
  const primeiro = erro.issues[0];
  return {
    erro: primeiro?.message ?? "Confira os dados informados.",
    campo: primeiro ? String(primeiro.path[0] ?? "") : undefined,
  };
}

/** Objeto simples a partir do FormData, com os campos repetidos virando lista. */
function comoObjeto(formData: FormData, listas: string[] = []) {
  const dados: Record<string, unknown> = {};
  for (const chave of listas) dados[chave] = formData.getAll(chave);
  for (const [chave, valor] of formData.entries()) {
    if (listas.includes(chave)) continue;
    dados[chave] = valor;
  }
  return dados;
}

const idObrigatorio = z.string().trim().min(1, "Registro não informado.");
const idOpcional = z
  .string()
  .trim()
  .transform((valor) => (valor === "" ? null : valor))
  .nullable()
  .optional();
const textoOpcional = z.string().trim().max(4000).optional().default("");
/**
 * Dinheiro vindo do formulário.
 *
 * O `CampoMoeda` do kit manda centavos inteiros num campo escondido — nunca
 * "1.234,56". Aqui só se confere que é inteiro e não negativo; converter texto
 * para centavos é problema de quem digita, não de quem grava.
 */
const centavosDoFormulario = z
  .string()
  .trim()
  .optional()
  .default("0")
  .transform((valor) => {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.max(0, Math.trunc(numero)) : 0;
  });

/**
 * Caixa de seleção.
 *
 * Caixa desmarcada não aparece no FormData — a chave some por completo. Por
 * isso o campo precisa ser `.optional()` de verdade: um `z.union` que aceita
 * `undefined` não basta, o Zod 4 recusa a chave ausente como "nonoptional".
 * Marcada, o navegador manda "on".
 */
const marcado = z
  .string()
  .optional()
  .transform((valor) => valor === "on" || valor === "true" || valor === "1");

/** Revalida a área do painel e, quando informada, a tela do cliente. */
function revalidar(caminhos: string[]) {
  for (const caminho of caminhos) revalidatePath(caminho);
}

/* ==========================================================================
   ASSISTÊNCIA — chamados
   ========================================================================== */

function revalidarChamado(chamadoId: string) {
  revalidar([
    "/admin/assistencia",
    `/admin/assistencia/${chamadoId}`,
    "/admin/agenda",
    "/admin",
    "/minha-jb/assistencia",
    `/minha-jb/assistencia/${chamadoId}`,
  ]);
}

const esquemaNovoChamado = z.object({
  customerId: idOpcional,
  equipamentoId: idOpcional,
  unidadeId: idOpcional,
  contatoNome: z.string().trim().max(160).optional().default(""),
  contatoEmail: z.string().trim().max(160).optional().default(""),
  contatoTelefone: z.string().trim().max(30).optional().default(""),
  categoriaId: idOpcional,
  marca: z.string().trim().max(80).optional().default(""),
  modelo: z.string().trim().max(80).optional().default(""),
  serie: z.string().trim().max(80).optional().default(""),
  tipoProblema: z.string().trim().max(120).optional().default(""),
  descricao: z.string().trim().min(10, "Descreva o problema relatado.").max(4000),
  urgencia: z.enum(Urgency),
  cep: z.string().trim().max(12).optional().default(""),
  logradouro: z.string().trim().max(160).optional().default(""),
  numero: z.string().trim().max(20).optional().default(""),
  complemento: z.string().trim().max(80).optional().default(""),
  bairro: z.string().trim().max(120).optional().default(""),
  cidade: z.string().trim().max(120).optional().default(""),
  uf: z.string().trim().max(2).optional().default(""),
  disponibilidade: z.string().trim().max(300).optional().default(""),
  notaInterna: textoOpcional,
});

/**
 * Abre o chamado a partir do painel — o atendimento por telefone.
 *
 * Até aqui, o único `serviceRequest.create` do sistema era alimentado pelos
 * formulários do site: o dentista ligava e a JB não tinha onde registrar. O
 * chamado nasce igual ao do site (mesmo `abrirChamado`, mesmo número, mesma
 * linha do tempo) — a diferença é quem digita.
 *
 * O contato é recalculado no servidor a partir do cliente escolhido. O que veio
 * no formulário só vale quando não há cliente: nome e e-mail de contato são
 * colunas obrigatórias do `ServiceRequest`, e deixá-las a cargo do que o
 * navegador mandou é convite para chamado órfão.
 *
 * Marca, modelo e série são copiados do equipamento quando ele vem do
 * prontuário. É redundância de propósito: o chamado precisa continuar legível
 * daqui a dois anos, mesmo que o equipamento seja transferido ou desativado.
 */
export async function abrirChamadoNoPainel(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaNovoChamado.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const d = dados.data;

  let contatoNome = d.contatoNome;
  let contatoEmail = d.contatoEmail.toLowerCase();
  let contatoTelefone = somenteDigitos(d.contatoTelefone);
  let equipmentId: string | null = null;
  let locationId: string | null = d.unidadeId ?? null;
  let marca = d.marca;
  let modelo = d.modelo;
  let serie = d.serie;
  let categoriaId: string | null = d.categoriaId ?? null;

  if (d.customerId) {
    const cliente = await prisma.customer.findUnique({
      where: { id: d.customerId },
      select: { id: true, name: true, companyName: true, email: true, phone: true },
    });
    if (!cliente) return { erro: "Cliente não encontrado.", campo: "customerId" };

    contatoNome = contatoNome || cliente.companyName || cliente.name;
    contatoEmail = contatoEmail || cliente.email;
    contatoTelefone = contatoTelefone || somenteDigitos(cliente.phone);

    if (d.equipamentoId) {
      // o equipamento precisa ser deste cliente: id em campo escondido não é prova
      const equipamento = await prisma.equipment.findFirst({
        where: { id: d.equipamentoId, customerId: cliente.id },
        select: {
          id: true,
          brandName: true,
          modelName: true,
          serialNumber: true,
          categoryId: true,
          locationId: true,
        },
      });
      if (!equipamento) {
        return {
          erro: "Este equipamento não está no prontuário do cliente escolhido.",
          campo: "equipamentoId",
        };
      }
      equipmentId = equipamento.id;
      marca = marca || equipamento.brandName;
      modelo = modelo || equipamento.modelName;
      serie = serie || equipamento.serialNumber;
      categoriaId = categoriaId ?? equipamento.categoryId;
      locationId = locationId ?? equipamento.locationId;
    }

    if (locationId) {
      const unidade = await prisma.customerLocation.findFirst({
        where: { id: locationId, customerId: cliente.id },
        select: { id: true },
      });
      if (!unidade) {
        return { erro: "Esta unidade não é do cliente escolhido.", campo: "unidadeId" };
      }
    }
  } else {
    // chamado avulso: quem liga pode ainda não ter cadastro
    if (contatoNome.length < 2) {
      return { erro: "Informe o nome de quem está pedindo.", campo: "contatoNome" };
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contatoEmail)) {
      return { erro: "Informe um e-mail válido para retorno.", campo: "contatoEmail" };
    }
    locationId = null;
  }

  if (!equipmentId && !marca && !modelo && !d.tipoProblema && !categoriaId) {
    return {
      erro: "Diga qual é o equipamento: escolha um do prontuário ou descreva marca e modelo.",
      campo: "marca",
    };
  }

  const uf = d.uf.toUpperCase();
  const cep = somenteDigitos(d.cep);
  if (cep && cep.length !== 8) {
    return { erro: "CEP incompleto — são 8 dígitos.", campo: "cep" };
  }

  let destino = "";
  try {
    const chamado = await abrirChamado({
      customerId: d.customerId ?? null,
      equipmentId,
      locationId,
      contato: { nome: contatoNome, email: contatoEmail, telefone: contatoTelefone },
      equipamento: { categoryId: categoriaId, marca, modelo, serie },
      problema: {
        tipo: d.tipoProblema,
        descricao: d.descricao,
        urgencia: d.urgencia,
      },
      endereco: {
        cep,
        logradouro: d.logradouro,
        numero: d.numero,
        complemento: d.complemento,
        bairro: d.bairro,
        cidade: d.cidade,
        uf,
      },
      disponibilidade: d.disponibilidade,
      notaInterna: [
        `Aberto no painel por ${usuario.name}.`,
        d.notaInterna,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "ServiceRequest",
      entidadeId: chamado.id,
      resumo: `Chamado ${chamado.number} aberto pelo painel para ${contatoNome}`,
    });

    revalidarChamado(chamado.id);
    revalidar(["/admin/clientes", "/admin/equipamentos"]);
    destino = `/admin/assistencia/${chamado.id}`;
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível abrir o chamado.");
  }

  redirect(destino);
}

const esquemaAtribuir = z.object({
  chamadoId: idObrigatorio,
  tecnicoId: idOpcional,
  nota: textoOpcional,
});

/** Carimba o técnico nas visitas e OS abertas do chamado. */
export async function atribuirTecnicoAoChamado(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaAtribuir.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const resultado = await atribuirTecnico(dados.data.chamadoId, dados.data.tecnicoId ?? null, {
      userId: usuario.id,
      nota: dados.data.nota,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "atribuir",
      entidade: "ServiceRequest",
      entidadeId: dados.data.chamadoId,
      resumo: dados.data.tecnicoId
        ? `Técnico atribuído em ${resultado.visitas} visita(s) e ${resultado.ordens} OS`
        : "Técnico removido do chamado",
    });

    revalidarChamado(dados.data.chamadoId);
    return { ok: true, mensagem: "Técnico atualizado." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível atribuir o técnico.");
  }
}

const esquemaAgendar = z.object({
  chamadoId: idObrigatorio,
  tecnicoId: idOpcional,
  titulo: z.string().trim().max(180).optional().default(""),
  inicio: z.string().trim().min(1, "Informe a data e a hora da visita."),
  fim: z.string().trim().optional().default(""),
  observacoes: textoOpcional,
});

/** Cria a ServiceAppointment e move o chamado para "visita agendada". */
export async function agendarVisitaDoChamado(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaAgendar.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const inicio = dataSP(dados.data.inicio);
  if (!inicio) return { erro: "Data ou hora inválida.", campo: "inicio" };

  const fim = dataSP(dados.data.fim);
  if (dados.data.fim && !fim) return { erro: "Hora de término inválida.", campo: "fim" };
  if (fim && fim <= inicio) {
    return { erro: "O término precisa ser depois do início.", campo: "fim" };
  }

  try {
    const visita = await agendarVisita({
      chamadoId: dados.data.chamadoId,
      tecnicoId: dados.data.tecnicoId ?? null,
      titulo: dados.data.titulo,
      inicio,
      fim,
      observacoes: dados.data.observacoes,
      userId: usuario.id,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "ServiceAppointment",
      entidadeId: visita.id,
      resumo: `Visita marcada para ${formatarDataHora(inicio)}`,
    });

    revalidarChamado(dados.data.chamadoId);
    return { ok: true, mensagem: `Visita marcada para ${formatarDataHora(inicio)}.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível agendar a visita.");
  }
}

const esquemaRemarcar = z.object({
  agendamentoId: idObrigatorio,
  /** `startsAt` que a tela viu. É a guarda contra dois atendentes remarcando junto. */
  quandoAtual: z.string().trim().min(1, "Agendamento sem data de referência."),
  tecnicoId: idOpcional,
  inicio: z.string().trim().min(1, "Informe a nova data e hora."),
  fim: z.string().trim().optional().default(""),
  motivo: textoOpcional,
});

/**
 * Remarca a visita MOVENDO o agendamento que já existe.
 *
 * Antes desta ação, remarcar era abrir a tela de agendamento de novo: nascia um
 * segundo `ServiceAppointment` e o primeiro ficava "agendado" para sempre. A
 * agenda do técnico mostrava duas visitas no mesmo chamado, uma delas num dia
 * que ninguém mais esperava.
 *
 * A guarda de concorrência está na condição do UPDATE, não em JavaScript: o
 * `updateMany` só acerta a linha se ela ainda estiver aberta E ainda estiver na
 * data que a tela mostrou. Se outra pessoa moveu a visita nesse meio-tempo,
 * `count` volta zero e ninguém sobrescreve o combinado do outro.
 */
export async function remarcarVisitaDoChamado(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaRemarcar.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const inicio = dataSP(dados.data.inicio);
  if (!inicio) return { erro: "Data ou hora inválida.", campo: "inicio" };

  const fim = dataSP(dados.data.fim);
  if (dados.data.fim && !fim) return { erro: "Hora de término inválida.", campo: "fim" };
  if (fim && fim <= inicio) {
    return { erro: "O término precisa ser depois do início.", campo: "fim" };
  }

  const quandoAtual = new Date(dados.data.quandoAtual);
  if (Number.isNaN(quandoAtual.getTime())) {
    return { erro: "Não foi possível identificar a visita. Recarregue a página." };
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const agendamento = await tx.serviceAppointment.findUnique({
        where: { id: dados.data.agendamentoId },
        select: {
          id: true,
          startsAt: true,
          status: true,
          request: { select: { id: true, number: true, status: true, customerId: true } },
        },
      });
      if (!agendamento) return { falha: "Visita não encontrada." as const };
      if (agendamento.status === "concluido") {
        return { falha: "Esta visita já foi concluída e não pode ser remarcada." as const };
      }
      if (agendamento.status === "cancelado") {
        return {
          falha:
            "Esta visita está cancelada. Agende uma nova visita em vez de remarcar." as const,
        };
      }
      if (agendamento.request?.status === "cancelado") {
        return { falha: "O chamado foi cancelado e não recebe visita." as const };
      }

      const movidas = await tx.serviceAppointment.updateMany({
        where: {
          id: agendamento.id,
          startsAt: quandoAtual,
          status: { in: ["agendado", "em_andamento"] },
        },
        data: {
          startsAt: inicio,
          endsAt: fim,
          status: "agendado",
          ...(dados.data.tecnicoId === undefined
            ? {}
            : { technicianId: dados.data.tecnicoId }),
        },
      });

      if (movidas.count === 0) {
        return {
          falha:
            "Alguém remarcou esta visita enquanto a tela estava aberta. Recarregue e confira a nova data." as const,
        };
      }

      const anterior = formatarDataHora(agendamento.startsAt);
      const nova = formatarDataHora(inicio);
      const motivo = dados.data.motivo.trim();

      if (agendamento.request) {
        await tx.serviceRequestEvent.create({
          data: {
            requestId: agendamento.request.id,
            status: "visita_agendada",
            title: "Visita remarcada",
            message: `A visita passou de ${anterior} para ${nova}.${motivo ? ` ${motivo}` : ""}`,
            visibleToCustomer: true,
            userId: usuario.id,
          },
        });

        if (agendamento.request.customerId) {
          await tx.notification.create({
            data: {
              customerId: agendamento.request.customerId,
              kind: "visita_remarcada",
              title: `Visita do chamado ${agendamento.request.number} remarcada`,
              body: `Nova data: ${nova}.`,
              href: `/minha-jb/assistencia/${agendamento.request.id}`,
            },
          });
        }
      }

      return { chamadoId: agendamento.request?.id ?? null, anterior, nova };
    });

    if ("falha" in resultado) return { erro: resultado.falha };

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "ServiceAppointment",
      entidadeId: dados.data.agendamentoId,
      resumo: `Visita remarcada de ${resultado.anterior} para ${resultado.nova}`,
    });

    revalidar(["/admin/agenda", "/admin/assistencia"]);
    if (resultado.chamadoId) revalidarChamado(resultado.chamadoId);
    return { ok: true, mensagem: `Visita remarcada para ${resultado.nova}.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível remarcar a visita.");
  }
}

const esquemaStatusChamado = z.object({
  chamadoId: idObrigatorio,
  status: z.enum(ServiceRequestStatus),
  nota: textoOpcional,
  visivel: marcado,
});

export async function mudarStatusDoChamado(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaStatusChamado.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const antes = await prisma.serviceRequest.findUnique({
      where: { id: dados.data.chamadoId },
      select: { status: true },
    });
    if (!antes) return { erro: "Chamado não encontrado." };

    await mudarStatusChamado(dados.data.chamadoId, dados.data.status, {
      userId: usuario.id,
      nota: dados.data.nota,
      visivelParaCliente: dados.data.visivel,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "ServiceRequest",
      entidadeId: dados.data.chamadoId,
      resumo: `${ROTULO_CHAMADO[antes.status]} → ${ROTULO_CHAMADO[dados.data.status]}`,
    });

    revalidarChamado(dados.data.chamadoId);
    return { ok: true, mensagem: `Chamado em "${ROTULO_CHAMADO[dados.data.status]}".` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível mudar o status do chamado.");
  }
}

const esquemaMensagem = z.object({
  chamadoId: idObrigatorio,
  titulo: z.string().trim().max(180).optional().default(""),
  mensagem: z.string().trim().min(1, "Escreva a mensagem.").max(4000),
  visivel: marcado,
});

/**
 * Anota no histórico do chamado.
 *
 * Marcado como visível, vira mensagem para o cliente e dispara o aviso na área
 * dele. Desmarcado, é nota interna: fica na linha do tempo da equipe e nunca
 * atravessa para o lado de fora.
 */
export async function registrarMensagemNoChamado(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaMensagem.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const chamado = await prisma.serviceRequest.findUnique({
      where: { id: dados.data.chamadoId },
      select: { id: true, number: true, customerId: true },
    });
    if (!chamado) return { erro: "Chamado não encontrado." };

    await prisma.serviceRequestEvent.create({
      data: {
        requestId: chamado.id,
        title:
          dados.data.titulo ||
          (dados.data.visivel ? "Mensagem da equipe técnica" : "Nota interna"),
        message: dados.data.mensagem,
        visibleToCustomer: dados.data.visivel,
        userId: usuario.id,
      },
    });

    if (dados.data.visivel && chamado.customerId) {
      await notificar({
        customerId: chamado.customerId,
        tipo: "chamado",
        titulo: `Chamado ${chamado.number}: nova mensagem`,
        corpo: dados.data.mensagem,
        href: `/minha-jb/assistencia/${chamado.id}`,
      });
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "ServiceRequestEvent",
      entidadeId: chamado.id,
      resumo: dados.data.visivel ? "Mensagem ao cliente" : "Nota interna",
    });

    revalidarChamado(chamado.id);
    return {
      ok: true,
      mensagem: dados.data.visivel ? "Mensagem enviada ao cliente." : "Nota interna salva.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar a mensagem.");
  }
}

/* ==========================================================================
   ORDENS DE SERVIÇO
   ========================================================================== */

function revalidarOS(ordemId: string, chamadoId?: string | null) {
  revalidar([
    "/admin/os",
    `/admin/os/${ordemId}`,
    `/admin/os/${ordemId}/imprimir`,
    "/admin/agenda",
    "/admin",
    ...(chamadoId ? [`/admin/assistencia/${chamadoId}`, "/admin/assistencia"] : []),
  ]);
}

const esquemaNovaOS = z.object({
  chamadoId: idOpcional,
  equipmentId: idOpcional,
  tecnicoId: idOpcional,
  nomeCliente: z.string().trim().max(180).optional().default(""),
  defeitoRelatado: z.string().trim().max(4000).optional().default(""),
  observacoes: textoOpcional,
  garantiaDias: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((valor) => (valor === "" ? null : Number(valor)))
    .refine((valor) => valor === null || (Number.isFinite(valor) && valor >= 0), {
      message: "Garantia em dias precisa ser um número.",
    }),
});

/**
 * Abre a OS e leva direto para ela.
 *
 * Vinda de um chamado, `abrirOS` herda equipamento e relato e move o chamado
 * para diagnóstico — por isso o formulário não repete esses campos.
 */
export async function criarOrdemDeServico(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaNovaOS.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  let destino = "";
  try {
    const ordem = await abrirOS({
      chamadoId: dados.data.chamadoId ?? null,
      equipmentId: dados.data.equipmentId ?? null,
      tecnicoId: dados.data.tecnicoId ?? null,
      nomeCliente: dados.data.nomeCliente,
      defeitoRelatado: dados.data.defeitoRelatado,
      observacoes: dados.data.observacoes,
      garantiaDias: dados.data.garantiaDias,
      userId: usuario.id,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "WorkOrder",
      entidadeId: ordem.id,
      resumo: `OS ${ordem.number} aberta`,
    });

    revalidarOS(ordem.id, dados.data.chamadoId ?? null);
    if (dados.data.equipmentId) revalidar([`/admin/equipamentos/${dados.data.equipmentId}`]);
    destino = `/admin/os/${ordem.id}`;
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível abrir a ordem de serviço.");
  }

  // fora do try: redirect() sinaliza a navegação lançando uma exceção própria
  redirect(destino);
}

const esquemaItemOS = z.object({
  ordemId: idObrigatorio,
  tipo: z.enum(["peca", "servico", "deslocamento"]),
  descricao: z.string().trim().min(1, "Descreva o item.").max(300),
  quantidade: z
    .string()
    .trim()
    .default("1")
    .transform((valor) => Number(valor.replace(",", ".")))
    .refine((valor) => Number.isFinite(valor) && valor >= 1, {
      message: "Quantidade precisa ser 1 ou mais.",
    }),
  valorCents: centavosDoFormulario,
});

/** Acrescenta peça, serviço ou deslocamento. Os totais são refeitos no domínio. */
export async function adicionarItemNaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaItemOS.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    await adicionarItem({
      workOrderId: dados.data.ordemId,
      tipo: dados.data.tipo,
      descricao: dados.data.descricao,
      quantidade: Math.trunc(dados.data.quantidade),
      // o valor digitado é sempre o unitário; nenhum total vem do formulário
      valorUnitarioCents: dados.data.valorCents,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "WorkOrder",
      entidadeId: dados.data.ordemId,
      resumo: `Item incluído: ${dados.data.descricao}`,
    });

    revalidarOS(dados.data.ordemId);
    return { ok: true, mensagem: "Item incluído." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível incluir o item.");
  }
}

const esquemaRemoverItem = z.object({ ordemId: idObrigatorio, itemId: idObrigatorio });

export async function removerItemDaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaRemoverItem.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    await removerItem(dados.data.itemId);
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "WorkOrderItem",
      entidadeId: dados.data.itemId,
      resumo: "Item removido da OS",
    });
    revalidarOS(dados.data.ordemId);
    return { ok: true, mensagem: "Item removido." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível remover o item.");
  }
}

const esquemaDesconto = z.object({ ordemId: idObrigatorio, descontoCents: centavosDoFormulario });

export async function definirDescontoDaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaDesconto.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const centavos = dados.data.descontoCents;
    await definirDesconto(dados.data.ordemId, centavos);
    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "WorkOrder",
      entidadeId: dados.data.ordemId,
      resumo: `Desconto definido em ${centavos} centavos`,
    });
    revalidarOS(dados.data.ordemId);
    return { ok: true, mensagem: "Desconto atualizado." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível gravar o desconto.");
  }
}

const esquemaChecklist = z.object({
  ordemId: idObrigatorio,
  roteiro: z.string().max(4000).optional().default(""),
});

/** Substitui o roteiro inteiro — uma linha do textarea por item. */
export async function salvarChecklistDaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaChecklist.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const existentes = await prisma.workOrderCheckItem.findMany({
      where: { workOrderId: dados.data.ordemId },
      orderBy: { order: "asc" },
      select: { label: true, done: true, note: true },
    });
    const feitos = new Map(existentes.map((item) => [item.label, item]));

    const linhas = dados.data.roteiro
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean)
      .slice(0, 60);

    const quantos = await definirChecklist(
      dados.data.ordemId,
      // reescrever o roteiro não pode desmarcar o que o técnico já conferiu
      linhas.map((label) => ({
        label,
        done: feitos.get(label)?.done ?? false,
        nota: feitos.get(label)?.note ?? "",
      })),
    );

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "WorkOrder",
      entidadeId: dados.data.ordemId,
      resumo: `Checklist com ${quantos} item(ns)`,
    });

    revalidarOS(dados.data.ordemId);
    return { ok: true, mensagem: "Checklist salvo." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o checklist.");
  }
}

const esquemaMarcar = z.object({
  ordemId: idObrigatorio,
  itemId: idObrigatorio,
  feito: marcado,
  nota: z.string().trim().max(300).optional().default(""),
});

export async function alternarItemDoChecklist(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  await exigirEdicao("os");
  const dados = esquemaMarcar.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    await marcarChecklist(dados.data.itemId, dados.data.feito, dados.data.nota);
    revalidarOS(dados.data.ordemId);
    return { ok: true };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível marcar o item.");
  }
}

const esquemaLaudo = z.object({
  ordemId: idObrigatorio,
  tecnicoId: idOpcional,
  defeitoRelatado: z.string().trim().max(4000).optional().default(""),
  diagnostico: z.string().trim().max(4000).optional().default(""),
  servicoExecutado: z.string().trim().max(4000).optional().default(""),
  testeFinal: z.string().trim().max(4000).optional().default(""),
  observacoes: textoOpcional,
  garantiaDias: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((valor) => (valor === "" ? null : Number(valor)))
    .refine((valor) => valor === null || (Number.isFinite(valor) && valor >= 0), {
      message: "Garantia em dias precisa ser um número.",
    }),
});

/** Grava o laudo técnico e o responsável, sem mexer em status nem em valores. */
export async function salvarLaudoDaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaLaudo.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const ordem = await prisma.workOrder.update({
      where: { id: dados.data.ordemId },
      data: {
        technicianId: dados.data.tecnicoId ?? null,
        reportedIssue: dados.data.defeitoRelatado,
        diagnosis: dados.data.diagnostico,
        workDone: dados.data.servicoExecutado,
        finalTest: dados.data.testeFinal,
        notes: dados.data.observacoes,
        serviceWarrantyDays: dados.data.garantiaDias,
      },
      select: { id: true, number: true, requestId: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "WorkOrder",
      entidadeId: ordem.id,
      resumo: `Laudo da OS ${ordem.number} atualizado`,
    });

    revalidarOS(ordem.id, ordem.requestId);
    return { ok: true, mensagem: "Laudo salvo." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o laudo.");
  }
}

const esquemaMidiaOS = z.object({
  ordemId: idObrigatorio,
  fase: z.enum(["antes", "depois"]),
  mediaIds: z.array(z.string().trim().min(1)).min(1, "Envie ao menos uma foto."),
});

export async function anexarMidiaNaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaMidiaOS.safeParse(comoObjeto(formData, ["mediaIds"]));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const quantas = await registrarMidia(dados.data.ordemId, dados.data.mediaIds, dados.data.fase);
    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "WorkOrder",
      entidadeId: dados.data.ordemId,
      resumo: `${quantas} arquivo(s) anexado(s) — ${dados.data.fase}`,
    });
    revalidarOS(dados.data.ordemId);
    return { ok: true, mensagem: `${quantas} arquivo(s) anexado(s).` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível anexar os arquivos.");
  }
}

const esquemaRemoverMidia = z.object({ ordemId: idObrigatorio, midiaId: idObrigatorio });

export async function removerMidiaDaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaRemoverMidia.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    // apaga só o vínculo: o arquivo continua na biblioteca de mídia
    await prisma.workOrderMedia.delete({ where: { id: dados.data.midiaId } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "WorkOrderMedia",
      entidadeId: dados.data.midiaId,
      resumo: "Anexo removido da OS",
    });
    revalidarOS(dados.data.ordemId);
    return { ok: true, mensagem: "Anexo removido." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível remover o anexo.");
  }
}

const esquemaStatusOS = z.object({
  ordemId: idObrigatorio,
  status: z.enum(WorkOrderStatus),
  nota: textoOpcional,
  visivel: marcado,
});

export async function mudarStatusDaOS(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaStatusOS.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  if (dados.data.status === "concluida") {
    return {
      erro: "Use o bloco de conclusão para fechar a OS: ele precisa do aceite do responsável.",
    };
  }

  try {
    const ordem = await mudarStatusOS(dados.data.ordemId, dados.data.status, {
      userId: usuario.id,
      nota: dados.data.nota,
      visivelParaCliente: dados.data.visivel,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "WorkOrder",
      entidadeId: ordem.id,
      resumo: `OS ${ordem.number}: ${ROTULO_OS[dados.data.status]}`,
    });

    revalidarOS(ordem.id, ordem.requestId);
    return { ok: true, mensagem: `OS em "${ROTULO_OS[dados.data.status]}".` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível mudar o status da OS.");
  }
}

const esquemaConcluirOS = z.object({
  ordemId: idObrigatorio,
  diagnostico: z.string().trim().max(4000).optional().default(""),
  servicoExecutado: z.string().trim().max(4000).optional().default(""),
  testeFinal: z.string().trim().max(4000).optional().default(""),
  nota: textoOpcional,
  garantiaDias: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((valor) => (valor === "" ? null : Number(valor)))
    .refine((valor) => valor === null || (Number.isFinite(valor) && valor >= 0), {
      message: "Garantia em dias precisa ser um número.",
    }),
  aceiteNome: z.string().trim().min(3, "Informe quem recebeu o equipamento.").max(180),
  aceiteData: z.string().trim().optional().default(""),
  encerrarChamado: marcado,
  laudoUrl: z.string().trim().optional().default(""),
  laudoMime: z.string().trim().optional().default(""),
  laudoTamanho: z.string().trim().optional().default(""),
});

/**
 * Fecha a OS.
 *
 * O aceite é nome e data digitados por quem recebeu o equipamento — não é
 * desenho de assinatura, e o registro diz exatamente isso. O laudo em PDF só
 * vira `Document` quando existe arquivo enviado: uma linha apontando para o
 * vazio apareceria como documento na área do cliente e abriria em nada.
 */
export async function concluirOrdemDeServico(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("os");
  const dados = esquemaConcluirOS.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const aceiteEm = dataSP(dados.data.aceiteData);
  if (dados.data.aceiteData && !aceiteEm) {
    return { erro: "Data do aceite inválida.", campo: "aceiteData" };
  }

  try {
    const ordem = await concluirOS({
      workOrderId: dados.data.ordemId,
      diagnostico: dados.data.diagnostico,
      servicoExecutado: dados.data.servicoExecutado,
      testeFinal: dados.data.testeFinal,
      garantiaDias: dados.data.garantiaDias,
      nota: dados.data.nota,
      userId: usuario.id,
      aceite: { nome: dados.data.aceiteNome },
      encerrarChamado: dados.data.encerrarChamado,
      ...(dados.data.laudoUrl
        ? {
            laudo: {
              storageKey: dados.data.laudoUrl,
              mime: dados.data.laudoMime || "application/pdf",
              size: Number(dados.data.laudoTamanho) || 0,
            },
          }
        : {}),
    });

    // concluirOS carimba o aceite no instante do fechamento; quando a entrega
    // foi em outro dia, a data informada é quem vale
    if (aceiteEm) {
      await prisma.workOrder.update({
        where: { id: ordem.id },
        data: { acceptedAt: aceiteEm },
      });
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "WorkOrder",
      entidadeId: ordem.id,
      resumo: `OS ${ordem.number} concluída — aceite de ${dados.data.aceiteNome}`,
    });

    revalidarOS(ordem.id, ordem.requestId);
    if (ordem.equipmentId) revalidar([`/admin/equipamentos/${ordem.equipmentId}`]);
    return { ok: true, mensagem: `OS ${ordem.number} concluída.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível concluir a ordem de serviço.");
  }
}

/* ==========================================================================
   ORÇAMENTO A PARTIR DO CHAMADO
   ========================================================================== */

const esquemaOrcamento = z.object({
  chamadoId: idObrigatorio,
  mensagem: textoOpcional,
  condicoes: textoOpcional,
  validadeDias: z
    .string()
    .trim()
    .default("15")
    .transform((valor) => Number(valor))
    .refine((valor) => Number.isFinite(valor) && valor >= 0 && valor <= 365, {
      message: "Validade entre 0 e 365 dias.",
    }),
  descricao: z.array(z.string()),
  quantidade: z.array(z.string()),
  valorCents: z.array(z.string()),
});

/**
 * Monta a proposta técnica a partir do chamado e leva para a tela de
 * orçamentos, onde ela é revisada e enviada. Nasce em rascunho: quem envia
 * para o cliente é a área comercial.
 */
export async function abrirOrcamentoDoChamado(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaOrcamento.safeParse(
    comoObjeto(formData, ["descricao", "quantidade", "valorCents"]),
  );
  if (!dados.success) return problemaZod(dados.error);

  const itens = dados.data.descricao
    .map((descricao, i) => ({
      descricao: descricao.trim(),
      quantidade: Math.max(1, Math.trunc(Number(dados.data.quantidade[i] ?? "1") || 1)),
      valorUnitarioCents: Math.max(0, Math.trunc(Number(dados.data.valorCents[i] ?? "0") || 0)),
    }))
    .filter((item) => item.descricao.length > 0);

  if (itens.length === 0) {
    return { erro: "Inclua ao menos um item na proposta.", campo: "descricao" };
  }

  let destino = "";
  try {
    const chamado = await prisma.serviceRequest.findUnique({
      where: { id: dados.data.chamadoId },
      select: {
        id: true,
        number: true,
        customerId: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
      },
    });
    if (!chamado) return { erro: "Chamado não encontrado." };

    const orcamento = await criarOrcamento({
      kind: "assistencia",
      customerId: chamado.customerId,
      chamadoId: chamado.id,
      contato: {
        nome: chamado.contactName,
        email: chamado.contactEmail,
        telefone: chamado.contactPhone,
      },
      mensagem: dados.data.mensagem,
      condicoes: dados.data.condicoes,
      validadeDias: dados.data.validadeDias,
      itens,
      userId: usuario.id,
    });

    await prisma.serviceRequestEvent.create({
      data: {
        requestId: chamado.id,
        title: `Orçamento ${orcamento.number} criado`,
        message: "Proposta em rascunho, aguardando revisão antes do envio.",
        visibleToCustomer: false,
        userId: usuario.id,
      },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "Quote",
      entidadeId: orcamento.id,
      resumo: `Orçamento ${orcamento.number} a partir do chamado ${chamado.number}`,
    });

    revalidarChamado(chamado.id);
    revalidar(["/admin/orcamentos"]);
    destino = `/admin/orcamentos/${orcamento.id}`;
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível criar o orçamento.");
  }

  redirect(destino);
}

/* ==========================================================================
   MANUTENÇÃO — planos
   ========================================================================== */

const esquemaPlano = z.object({
  planoId: idOpcional,
  nome: z.string().trim().min(2, "Informe o nome do plano.").max(120),
  descricao: z.string().trim().max(2000).optional().default(""),
  beneficios: z.string().max(2000).optional().default(""),
  precoCents: centavosDoFormulario,
  periodoMeses: z
    .string()
    .trim()
    .default("12")
    .transform((valor) => Number(valor))
    .refine((valor) => Number.isInteger(valor) && valor >= 1 && valor <= 120, {
      message: "Vigência entre 1 e 120 meses.",
    }),
  visitasIncluidas: z
    .string()
    .trim()
    .default("0")
    .transform((valor) => Number(valor))
    .refine((valor) => Number.isInteger(valor) && valor >= 0 && valor <= 60, {
      message: "Visitas incluídas entre 0 e 60.",
    }),
  descontoPecas: z
    .string()
    .trim()
    .default("0")
    .transform((valor) => Number(valor))
    .refine((valor) => Number.isInteger(valor) && valor >= 0 && valor <= 100, {
      message: "Desconto em peças entre 0 e 100%.",
    }),
  publicado: marcado,
  ordem: z
    .string()
    .trim()
    .default("0")
    .transform((valor) => Number(valor) || 0),
});

export async function salvarPlanoDeManutencao(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaPlano.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const beneficios = dados.data.beneficios
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, 20);

  const conteudo = {
    name: dados.data.nome,
    description: dados.data.descricao,
    benefits: beneficios,
    // zero significa "sob orçamento": um plano de manutenção a R$ 0,00 não existe
    priceCents: dados.data.precoCents > 0 ? dados.data.precoCents : null,
    periodMonths: dados.data.periodoMeses,
    visitsIncluded: dados.data.visitasIncluidas,
    partsDiscountPercent: dados.data.descontoPecas,
    published: dados.data.publicado,
    order: dados.data.ordem,
  };

  try {
    if (dados.data.planoId) {
      const antes = await prisma.maintenancePlan.findUnique({
        where: { id: dados.data.planoId },
      });
      if (!antes) return { erro: "Plano não encontrado." };

      const depois = await prisma.maintenancePlan.update({
        where: { id: dados.data.planoId },
        data: conteudo,
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "MaintenancePlan",
        entidadeId: depois.id,
        antes,
        depois,
      });
    } else {
      const criado = await prisma.maintenancePlan.create({
        data: { ...conteudo, slug: await slugLivreDePlano(dados.data.nome) },
      });
      await registrarAuditoria({
        userId: usuario.id,
        acao: "criar",
        entidade: "MaintenancePlan",
        entidadeId: criado.id,
        resumo: `Plano "${criado.name}" criado`,
      });
    }

    revalidar(["/admin/manutencao/planos", "/admin/manutencao", "/planos-de-manutencao"]);
    return { ok: true, mensagem: "Plano salvo." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o plano.");
  }
}

/** Slug único: "preventiva-anual", "preventiva-anual-2"… */
async function slugLivreDePlano(nome: string) {
  const base = gerarSlug(nome) || "plano";
  const parecidos = await prisma.maintenancePlan.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const usados = new Set(parecidos.map((p) => p.slug));
  if (!usados.has(base)) return base;
  for (let n = 2; n < 200; n++) {
    const tentativa = `${base}-${n}`;
    if (!usados.has(tentativa)) return tentativa;
  }
  return `${base}-${Date.now()}`;
}

const esquemaExcluirPlano = z.object({ planoId: idObrigatorio });

export async function excluirPlanoDeManutencao(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaExcluirPlano.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const contratos = await prisma.maintenanceContract.count({
      where: { planId: dados.data.planoId },
    });
    if (contratos > 0) {
      return {
        erro: `Este plano tem ${contratos} contrato(s) vinculado(s). Despublique em vez de excluir.`,
      };
    }

    const plano = await prisma.maintenancePlan.delete({ where: { id: dados.data.planoId } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "MaintenancePlan",
      entidadeId: plano.id,
      resumo: `Plano "${plano.name}" excluído`,
    });

    revalidar(["/admin/manutencao/planos", "/planos-de-manutencao"]);
    return { ok: true, mensagem: "Plano excluído." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível excluir o plano.");
  }
}

/* ==========================================================================
   MANUTENÇÃO — contratos
   ========================================================================== */

const esquemaContrato = z.object({
  customerId: idObrigatorio,
  planoId: idOpcional,
  equipamentoIds: z.array(z.string().trim().min(1)).min(1, "Escolha ao menos um equipamento."),
  inicio: z.string().trim().optional().default(""),
  fim: z.string().trim().optional().default(""),
  precoCents: centavosDoFormulario,
  intervaloMeses: z.string().trim().optional().default(""),
  notas: textoOpcional,
});

export async function criarContratoDeManutencao(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaContrato.safeParse(comoObjeto(formData, ["equipamentoIds"]));
  if (!dados.success) return problemaZod(dados.error);

  const inicio = dataSP(dados.data.inicio) ?? new Date();
  const fim = dataSP(dados.data.fim);
  if (dados.data.fim && !fim) return { erro: "Data de término inválida.", campo: "fim" };
  if (fim && fim <= inicio) {
    return { erro: "O término precisa ser depois do início.", campo: "fim" };
  }

  const intervalo = dados.data.intervaloMeses.trim()
    ? Number(dados.data.intervaloMeses)
    : undefined;
  if (intervalo !== undefined && (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 60)) {
    return { erro: "Intervalo entre visitas de 1 a 60 meses.", campo: "intervaloMeses" };
  }

  /*
   * `MaintenanceContract` não tem coluna de periodicidade — o intervalo é um
   * parâmetro da geração, não um dado do contrato. Quando ele foge do plano,
   * fica escrito nas observações: sem isso, quem gerar visitas de novo depois
   * de renovar a vigência não teria como saber qual frequência repetir.
   */
  const notas = [
    dados.data.notas,
    intervalo ? `Intervalo combinado entre visitas: ${intervalo} mês(es).` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let destino = "";
  try {
    const contrato = await contratarPlano({
      customerId: dados.data.customerId,
      planId: dados.data.planoId ?? null,
      equipamentoIds: dados.data.equipamentoIds,
      inicio,
      fim,
      precoCents: dados.data.precoCents,
      intervaloMeses: intervalo,
      notas,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "MaintenanceContract",
      entidadeId: contrato.id,
      resumo: `Contrato ${contrato.number} com ${dados.data.equipamentoIds.length} equipamento(s)`,
    });

    revalidar([
      "/admin/manutencao",
      "/admin/manutencao/contratos",
      "/admin/agenda",
      "/minha-jb/manutencoes",
    ]);
    destino = `/admin/manutencao/contratos/${contrato.id}`;
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível criar o contrato.");
  }

  redirect(destino);
}

const esquemaEditarContrato = z.object({
  contratoId: idObrigatorio,
  /** `updatedAt` que a tela leu. Guarda de concorrência na condição do UPDATE. */
  versao: z.string().trim().min(1, "Recarregue a página antes de salvar."),
  planoId: idOpcional,
  equipamentoIds: z.array(z.string().trim().min(1)).min(1, "Escolha ao menos um equipamento."),
  inicio: z.string().trim().optional().default(""),
  fim: z.string().trim().optional().default(""),
  precoCents: centavosDoFormulario,
  intervaloMeses: z.string().trim().optional().default(""),
  notas: textoOpcional,
});

/** Linha que `criarContratoDeManutencao` grava nas observações. */
const MARCA_INTERVALO = "Intervalo combinado entre visitas:";

/**
 * Lê a periodicidade combinada de volta das observações.
 *
 * `MaintenanceContract` não tem coluna de periodicidade — o schema está
 * congelado e a informação mora no texto desde a criação. Reler daqui é o que
 * permite dizer se a periodicidade REALMENTE mudou: sem isso, toda edição
 * pareceria mudança e a agenda seria refeita à toa.
 */
function intervaloDasObservacoes(notas: string): number | null {
  const linha = notas
    .split("\n")
    .find((texto) => texto.trim().startsWith(MARCA_INTERVALO));
  if (!linha) return null;
  const numero = Number(linha.replace(MARCA_INTERVALO, "").replace(/\D/g, ""));
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Edita o contrato: vigência, valor, plano e equipamentos cobertos.
 *
 * O contrato era gravado uma vez e ficava assim para sempre — renovar significava
 * criar outro e deixar o antigo pendurado. Aqui ele muda de verdade, e a agenda
 * muda junto.
 *
 * A regra da agenda tem uma linha que não se atravessa: visita CONCLUÍDA é
 * histórico do equipamento e não é tocada por nada. As visitas ainda só
 * "previstas" são projeção nossa e são refeitas do zero quando a vigência, o
 * plano ou a periodicidade mudam. Já as "agendadas" ficam: elas têm dia
 * combinado com o cliente, e apagar um compromisso marcado sem avisar ninguém é
 * o tipo de eficiência que faz o técnico e o dentista se desencontrarem. Quando
 * uma delas cai fora da nova vigência, a mensagem diz quantas são.
 *
 * Equipamento retirado da cobertura tem as visitas em aberto CANCELADAS, não
 * apagadas: o contrato precisa continuar contando a própria história.
 */
export async function editarContratoDeManutencao(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaEditarContrato.safeParse(
    comoObjeto(formData, ["equipamentoIds"]),
  );
  if (!dados.success) return problemaZod(dados.error);

  const versao = new Date(dados.data.versao);
  if (Number.isNaN(versao.getTime())) {
    return { erro: "Recarregue a página antes de salvar." };
  }

  const inicio = dataSP(dados.data.inicio);
  if (dados.data.inicio && !inicio) {
    return { erro: "Data de início inválida.", campo: "inicio" };
  }
  const fim = dataSP(dados.data.fim);
  if (dados.data.fim && !fim) return { erro: "Data de término inválida.", campo: "fim" };
  if (inicio && fim && fim <= inicio) {
    return { erro: "O término precisa ser depois do início.", campo: "fim" };
  }

  const intervalo = dados.data.intervaloMeses.trim()
    ? Number(dados.data.intervaloMeses)
    : undefined;
  if (intervalo !== undefined && (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 60)) {
    return { erro: "Intervalo entre visitas de 1 a 60 meses.", campo: "intervaloMeses" };
  }

  const contrato = await prisma.maintenanceContract.findUnique({
    where: { id: dados.data.contratoId },
    select: {
      id: true,
      number: true,
      customerId: true,
      planId: true,
      startsAt: true,
      endsAt: true,
      priceCents: true,
      notes: true,
      items: { select: { equipmentId: true } },
    },
  });
  if (!contrato) return { erro: "Contrato não encontrado." };

  const equipamentos = await prisma.equipment.findMany({
    where: { id: { in: dados.data.equipamentoIds }, customerId: contrato.customerId },
    select: { id: true },
  });
  if (equipamentos.length !== dados.data.equipamentoIds.length) {
    return {
      erro: "Algum equipamento marcado não é deste cliente. Recarregue a página.",
      campo: "equipamentoIds",
    };
  }

  if (dados.data.planoId) {
    const plano = await prisma.maintenancePlan.findUnique({
      where: { id: dados.data.planoId },
      select: { id: true },
    });
    if (!plano) return { erro: "Plano não encontrado.", campo: "planoId" };
  }

  /*
   * A periodicidade não é coluna do contrato — é parâmetro da geração. Continua
   * anotada nas observações para quem gerar visitas depois saber qual repetir;
   * a linha antiga sai antes para não empilhar uma por edição.
   */
  const notasLimpas = dados.data.notas
    .split("\n")
    .filter((linha) => !linha.trim().startsWith(MARCA_INTERVALO))
    .join("\n")
    .trim();
  const notas = [
    notasLimpas,
    intervalo ? `${MARCA_INTERVALO} ${intervalo} mês(es).` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const novos = new Set(equipamentos.map((e) => e.id));
  const atuais = new Set(contrato.items.map((item) => item.equipmentId));
  const removidos = [...atuais].filter((id) => !novos.has(id));
  const acrescentados = [...novos].filter((id) => !atuais.has(id));

  const mesmaData = (a: Date | null, b: Date | null) =>
    (a?.getTime() ?? null) === (b?.getTime() ?? null);

  const intervaloAnterior = intervaloDasObservacoes(contrato.notes);

  const mudouVigencia =
    !mesmaData(contrato.startsAt, inicio) ||
    !mesmaData(contrato.endsAt, fim) ||
    (contrato.planId ?? null) !== (dados.data.planoId ?? null) ||
    (intervalo ?? null) !== intervaloAnterior;

  /*
   * `gerarVisitasDoContrato` precisa de um início e de um fim (do contrato ou
   * do plano) para saber até onde ir. Sem isso, apagar as previstas esvaziaria
   * a agenda e a reconstrução falharia logo em seguida — o contrato ficaria
   * sem visita nenhuma por causa de um campo em branco. Então: só se refaz o
   * que se sabe refazer, e a mensagem diz que a agenda ficou como estava.
   */
  const podeRegerar = Boolean(inicio) && (Boolean(fim) || Boolean(dados.data.planoId));
  const refazerPrevistas = mudouVigencia && podeRegerar;
  const regenerar = podeRegerar && (mudouVigencia || acrescentados.length > 0);

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const salvos = await tx.maintenanceContract.updateMany({
        where: { id: contrato.id, updatedAt: versao },
        data: {
          planId: dados.data.planoId ?? null,
          startsAt: inicio,
          endsAt: fim,
          priceCents: dados.data.precoCents,
          notes: notas,
        },
      });
      if (salvos.count === 0) {
        return {
          falha:
            "Este contrato foi alterado por outra pessoa enquanto a tela estava aberta. Recarregue e refaça a mudança." as const,
        };
      }

      if (removidos.length > 0) {
        await tx.maintenanceContractItem.deleteMany({
          where: { contractId: contrato.id, equipmentId: { in: removidos } },
        });
        // visita de equipamento descoberto é cancelada, nunca apagada
        await tx.maintenanceVisit.updateMany({
          where: {
            contractId: contrato.id,
            equipmentId: { in: removidos },
            status: { in: ["prevista", "agendada"] },
          },
          data: { status: "cancelada" },
        });
      }

      if (acrescentados.length > 0) {
        await tx.maintenanceContractItem.createMany({
          data: acrescentados.map((equipmentId) => ({
            contractId: contrato.id,
            equipmentId,
          })),
          skipDuplicates: true,
        });
      }

      let apagadas = 0;
      if (refazerPrevistas) {
        // só as "previstas": projeção nossa, sem dia combinado com ninguém
        const limpas = await tx.maintenanceVisit.deleteMany({
          where: { contractId: contrato.id, status: "prevista" },
        });
        apagadas = limpas.count;
      }

      const foraDaVigencia = fim
        ? await tx.maintenanceVisit.count({
            where: {
              contractId: contrato.id,
              status: "agendada",
              OR: [{ dueAt: { gt: fim } }, { scheduledAt: { gt: fim } }],
            },
          })
        : 0;

      return { apagadas, foraDaVigencia };
    });

    if ("falha" in resultado) return { erro: resultado.falha };

    let geradas = 0;
    let semPeriodicidade: string[] = [];
    let avisoGeracao = "";

    if (regenerar) {
      try {
        const gerado = await gerarVisitasDoContrato(contrato.id, {
          intervaloMeses: intervalo,
        });
        geradas = gerado.criadas;
        semPeriodicidade = gerado.semPeriodicidade;
      } catch (erro) {
        /*
         * O contrato já está salvo; só a agenda não pôde ser refeita (falta de
         * início ou de fim da vigência, por exemplo). Dizer isso em voz alta é
         * melhor do que desfazer a edição que a pessoa acabou de conferir.
         */
        avisoGeracao =
          erro instanceof Error && NOMES_DE_ERRO.has(erro.name)
            ? ` Contrato salvo, mas as visitas não foram geradas: ${erro.message}`
            : " Contrato salvo, mas as visitas não puderam ser geradas.";
      }
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "MaintenanceContract",
      entidadeId: contrato.id,
      resumo: `Contrato ${contrato.number} · ${formatarData(inicio)} a ${formatarData(fim)} · ${formatarPreco(dados.data.precoCents)} · ${equipamentos.length} equipamento(s) coberto(s)${
        removidos.length > 0 ? `, ${removidos.length} retirado(s)` : ""
      }${acrescentados.length > 0 ? `, ${acrescentados.length} incluído(s)` : ""}`,
    });

    revalidar([
      "/admin/manutencao",
      "/admin/manutencao/contratos",
      `/admin/manutencao/contratos/${contrato.id}`,
      "/admin/agenda",
      "/minha-jb/manutencoes",
    ]);

    const partes = ["Contrato atualizado."];
    if (regenerar && !avisoGeracao) {
      partes.push(
        resultado.apagadas > 0
          ? `${resultado.apagadas} visita(s) prevista(s) refeita(s), ${geradas} gerada(s).`
          : `${geradas} visita(s) prevista(s) gerada(s).`,
      );
    }
    if (avisoGeracao) partes.push(avisoGeracao.trim());
    if (mudouVigencia && !podeRegerar) {
      partes.push(
        "A agenda ficou como estava: informe início e fim da vigência (ou escolha um plano) para as visitas serem refeitas.",
      );
    }
    if (semPeriodicidade.length > 0) {
      partes.push(`Sem periodicidade definida: ${semPeriodicidade.join(", ")}.`);
    }
    if (resultado.foraDaVigencia > 0) {
      partes.push(
        `${resultado.foraDaVigencia} visita(s) já marcada(s) ficaram fora da nova vigência — confira na agenda.`,
      );
    }

    return { ok: true, mensagem: partes.join(" ") };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o contrato.");
  }
}

const esquemaStatusContrato = z.object({
  contratoId: idObrigatorio,
  status: z.enum(ContractStatus),
});

export async function mudarStatusDoContrato(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaStatusContrato.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const contrato = await mudarStatusContrato(dados.data.contratoId, dados.data.status);
    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "MaintenanceContract",
      entidadeId: contrato.id,
      resumo: `Contrato ${contrato.number}: ${dados.data.status}`,
    });

    revalidar([
      "/admin/manutencao",
      "/admin/manutencao/contratos",
      `/admin/manutencao/contratos/${contrato.id}`,
      "/admin/agenda",
      "/minha-jb/manutencoes",
    ]);
    return { ok: true, mensagem: "Status do contrato atualizado." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível mudar o status do contrato.");
  }
}

const esquemaGerarVisitas = z.object({
  contratoId: idObrigatorio,
  intervaloMeses: z.string().trim().optional().default(""),
});

/**
 * Monta as visitas previstas até o fim da vigência.
 *
 * A operação é idempotente: rodar de novo só acrescenta o que falta. Quando
 * algum equipamento fica sem periodicidade, a mensagem diz quais — nada de
 * fingir que a agenda ficou completa.
 */
export async function gerarVisitasPrevistas(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaGerarVisitas.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const intervalo = dados.data.intervaloMeses.trim()
    ? Number(dados.data.intervaloMeses)
    : undefined;
  if (intervalo !== undefined && (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 60)) {
    return { erro: "Intervalo entre visitas de 1 a 60 meses.", campo: "intervaloMeses" };
  }

  try {
    const resultado = await gerarVisitasDoContrato(dados.data.contratoId, {
      intervaloMeses: intervalo,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "MaintenanceVisit",
      entidadeId: dados.data.contratoId,
      resumo: `${resultado.criadas} visita(s) prevista(s) gerada(s)`,
    });

    revalidar([
      "/admin/manutencao",
      `/admin/manutencao/contratos/${dados.data.contratoId}`,
      "/admin/agenda",
      "/minha-jb/manutencoes",
    ]);

    const pendencia =
      resultado.semPeriodicidade.length > 0
        ? ` Sem periodicidade definida: ${resultado.semPeriodicidade.join(", ")}.`
        : "";

    return {
      ok: true,
      mensagem:
        resultado.criadas === 0
          ? `Nenhuma visita nova a gerar.${pendencia}`
          : `${resultado.criadas} visita(s) prevista(s) criada(s).${pendencia}`,
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível gerar as visitas.");
  }
}

/* ==========================================================================
   MANUTENÇÃO — visitas
   ========================================================================== */

function revalidarVisita(visitaId: string, contratoId?: string | null) {
  revalidar([
    "/admin/manutencao",
    `/admin/manutencao/${visitaId}`,
    "/admin/agenda",
    "/admin",
    "/minha-jb/manutencoes",
    ...(contratoId ? [`/admin/manutencao/contratos/${contratoId}`] : []),
  ]);
}

const esquemaAgendarVisita = z.object({
  visitaId: idObrigatorio,
  quando: z.string().trim().min(1, "Informe a data e a hora."),
  tecnicoId: idOpcional,
  notas: textoOpcional,
});

export async function agendarVisitaPreventiva(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaAgendarVisita.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const quando = dataSP(dados.data.quando);
  if (!quando) return { erro: "Data ou hora inválida.", campo: "quando" };

  try {
    const visita = await agendarVisitaDeManutencao(dados.data.visitaId, {
      quando,
      tecnicoId: dados.data.tecnicoId ?? null,
      notas: dados.data.notas || undefined,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "MaintenanceVisit",
      entidadeId: visita.id,
      resumo: `Visita marcada para ${formatarDataHora(quando)}`,
    });

    revalidarVisita(visita.id, visita.contractId);
    return { ok: true, mensagem: `Visita marcada para ${formatarDataHora(quando)}.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível agendar a visita.");
  }
}

const esquemaConcluirVisita = z.object({
  visitaId: idObrigatorio,
  notas: textoOpcional,
  tecnicoId: idOpcional,
  abrirOS: marcado,
  defeitoEncontrado: z.string().trim().max(2000).optional().default(""),
});

export async function concluirVisitaPreventiva(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaConcluirVisita.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  if (dados.data.abrirOS && !dados.data.defeitoEncontrado.trim()) {
    return {
      erro: "Descreva a pendência encontrada para abrir a ordem de serviço.",
      campo: "defeitoEncontrado",
    };
  }

  try {
    const visita = await concluirVisita({
      visitaId: dados.data.visitaId,
      notas: dados.data.notas,
      tecnicoId: dados.data.tecnicoId ?? undefined,
      abrirOrdemDeServico: dados.data.abrirOS,
      defeitoEncontrado: dados.data.defeitoEncontrado,
      userId: usuario.id,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "MaintenanceVisit",
      entidadeId: visita.id,
      resumo: dados.data.abrirOS ? "Visita concluída com OS aberta" : "Visita concluída",
    });

    revalidarVisita(visita.id, visita.contractId);
    revalidar([`/admin/equipamentos/${visita.equipmentId}`, "/admin/os"]);
    return {
      ok: true,
      mensagem: dados.data.abrirOS
        ? "Visita concluída e ordem de serviço aberta."
        : "Visita concluída.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível concluir a visita.");
  }
}

const esquemaStatusVisita = z.object({
  visitaId: idObrigatorio,
  status: z.enum(VisitStatus),
  notas: textoOpcional,
});

/** Cancela ou devolve a visita para "prevista". Concluir tem função própria. */
export async function mudarStatusDaVisita(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaStatusVisita.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  if (dados.data.status === "concluida") {
    return { erro: "Use o bloco de conclusão: ele atualiza o prontuário do equipamento." };
  }

  try {
    const visita = await prisma.maintenanceVisit.update({
      where: { id: dados.data.visitaId },
      data: {
        status: dados.data.status,
        ...(dados.data.status === "prevista"
          ? { scheduledAt: null, technicianId: null }
          : {}),
        ...(dados.data.notas ? { notes: dados.data.notas } : {}),
      },
      select: { id: true, contractId: true, equipmentId: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: dados.data.status === "cancelada" ? "cancelar" : "status",
      entidade: "MaintenanceVisit",
      entidadeId: visita.id,
      resumo: `Visita: ${dados.data.status}`,
    });

    revalidarVisita(visita.id, visita.contractId);
    return { ok: true, mensagem: "Visita atualizada." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível atualizar a visita.");
  }
}

const esquemaLembrete = z.object({
  visitaId: idObrigatorio,
  diasAntes: z
    .string()
    .trim()
    .default("7")
    .transform((valor) => Number(valor))
    .refine((valor) => Number.isInteger(valor) && valor >= 0 && valor <= 90, {
      message: "Antecedência entre 0 e 90 dias.",
    }),
});

/**
 * Avisa o cliente da visita e trava o lembrete.
 *
 * O aviso é o da área Área da Clínica — que é o canal que existe hoje. O registro em
 * `MaintenanceReminder` é o que impede o mesmo lembrete de sair duas vezes.
 */
export async function enviarLembreteDeVisita(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("manutencao");
  const dados = esquemaLembrete.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const visita = await prisma.maintenanceVisit.findUnique({
      where: { id: dados.data.visitaId },
      select: {
        id: true,
        dueAt: true,
        scheduledAt: true,
        contractId: true,
        equipment: { select: { name: true, customerId: true } },
      },
    });
    if (!visita) return { erro: "Visita não encontrada." };

    const quando = visita.scheduledAt ?? visita.dueAt;

    const aviso = await notificar({
      customerId: visita.equipment.customerId,
      tipo: "manutencao",
      titulo: `Manutenção preventiva de ${visita.equipment.name}`,
      corpo: `Prevista para ${formatarData(quando)}. Nossa equipe entra em contato para confirmar o horário.`,
      href: "/minha-jb/manutencoes",
    });
    if (!aviso.ok) return { erro: aviso.motivo };

    const gravou = await prisma.maintenanceReminder
      .createMany({
        data: [{ visitId: visita.id, daysBefore: dados.data.diasAntes }],
        skipDuplicates: true,
      })
      .then((resultado) => resultado.count > 0);

    await registrarAuditoria({
      userId: usuario.id,
      acao: "enviar",
      entidade: "MaintenanceVisit",
      entidadeId: visita.id,
      resumo: `Lembrete de ${dados.data.diasAntes} dia(s) ${gravou ? "registrado" : "já existia"}`,
    });

    revalidarVisita(visita.id, visita.contractId);
    return { ok: true, mensagem: "Cliente avisado e lembrete registrado." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível enviar o lembrete.");
  }
}

/* ==========================================================================
   EQUIPAMENTOS
   ========================================================================== */

function revalidarEquipamento(equipamentoId: string) {
  revalidar([
    "/admin/equipamentos",
    `/admin/equipamentos/${equipamentoId}`,
    "/minha-jb/equipamentos",
    `/minha-jb/equipamentos/${equipamentoId}`,
  ]);
}

const esquemaEquipamento = z.object({
  customerId: idObrigatorio,
  nome: z.string().trim().min(2, "Informe o nome do equipamento.").max(180),
  categoriaId: idOpcional,
  marca: z.string().trim().max(120).optional().default(""),
  modelo: z.string().trim().max(120).optional().default(""),
  serie: z.string().trim().max(120).optional().default(""),
  voltagem: z.string().trim().max(20).optional().default(""),
  locationId: idOpcional,
  sala: z.string().trim().max(120).optional().default(""),
  compradoEm: z.string().trim().optional().default(""),
  instaladoEm: z.string().trim().optional().default(""),
  garantiaAte: z.string().trim().optional().default(""),
  intervaloDias: z.string().trim().optional().default(""),
  notas: textoOpcional,
});

export async function cadastrarEquipamentoNoAdmin(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("equipamentos");
  const dados = esquemaEquipamento.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const intervalo = dados.data.intervaloDias.trim() ? Number(dados.data.intervaloDias) : null;
  if (intervalo !== null && (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 3650)) {
    return { erro: "Intervalo de manutenção entre 1 e 3650 dias.", campo: "intervaloDias" };
  }

  let destino = "";
  try {
    const equipamento = await cadastrarEquipamento({
      customerId: dados.data.customerId,
      nome: dados.data.nome,
      categoriaId: dados.data.categoriaId ?? null,
      marca: dados.data.marca,
      modelo: dados.data.modelo,
      serie: dados.data.serie,
      voltagem: dados.data.voltagem || null,
      locationId: dados.data.locationId ?? null,
      sala: dados.data.sala,
      // cadastro feito pela equipe; "comprado na JB" só o fluxo de pedido carimba
      origem: "cadastro_tecnico",
      compradoEm: dataSP(dados.data.compradoEm),
      instaladoEm: dataSP(dados.data.instaladoEm),
      garantiaAte: dataSP(dados.data.garantiaAte),
      intervaloDias: intervalo,
      notas: dados.data.notas,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "Equipment",
      entidadeId: equipamento.id,
      resumo: `Equipamento "${equipamento.name}" cadastrado`,
    });

    revalidarEquipamento(equipamento.id);
    destino = `/admin/equipamentos/${equipamento.id}`;
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível cadastrar o equipamento.");
  }

  redirect(destino);
}

const esquemaStatusEquipamento = z.object({
  equipamentoId: idObrigatorio,
  status: z.enum(EquipmentStatus),
  nota: textoOpcional,
});

export async function mudarStatusDoEquipamento(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("equipamentos");
  const dados = esquemaStatusEquipamento.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const equipamento = await mudarStatusEquipamento(
      dados.data.equipamentoId,
      dados.data.status,
      { nota: dados.data.nota },
    );

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "Equipment",
      entidadeId: equipamento.id,
      resumo: `Situação: ${ROTULO_EQUIPAMENTO[dados.data.status]}`,
    });

    revalidarEquipamento(equipamento.id);
    return { ok: true, mensagem: `Situação: ${ROTULO_EQUIPAMENTO[dados.data.status]}.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível mudar a situação do equipamento.");
  }
}

const esquemaEvento = z.object({
  equipamentoId: idObrigatorio,
  kind: z.enum(["compra", "instalacao", "manutencao", "assistencia", "nota", "status"]),
  titulo: z.string().trim().min(2, "Descreva o que aconteceu.").max(180),
  descricao: z.string().trim().max(2000).optional().default(""),
  quando: z.string().trim().optional().default(""),
});

export async function registrarEventoDoEquipamento(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("equipamentos");
  const dados = esquemaEvento.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const evento = await registrarEvento(dados.data.equipamentoId, {
      kind: dados.data.kind,
      titulo: dados.data.titulo,
      descricao: dados.data.descricao,
      quando: dataSP(dados.data.quando) ?? undefined,
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "EquipmentEvent",
      entidadeId: evento.id,
      resumo: dados.data.titulo,
    });

    revalidarEquipamento(dados.data.equipamentoId);
    return { ok: true, mensagem: "Evento registrado no prontuário." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível registrar o evento.");
  }
}

const esquemaTransferir = z.object({
  equipamentoId: idObrigatorio,
  customerId: idObrigatorio,
  locationId: idOpcional,
  sala: z.string().trim().max(120).optional().default(""),
  motivo: z.string().trim().max(500).optional().default(""),
});

/**
 * Troca o dono ou a unidade do equipamento.
 *
 * O prontuário inteiro (chamados, OS, visitas, documentos) continua pendurado
 * no mesmo `Equipment`, então a transferência precisa deixar rastro: sem o
 * evento, o histórico de outro cliente apareceria sem explicação na ficha.
 * A unidade só é aceita se pertencer ao novo dono.
 */
export async function transferirEquipamento(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("equipamentos");
  const dados = esquemaTransferir.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const [equipamento, destino] = await Promise.all([
      prisma.equipment.findUnique({
        where: { id: dados.data.equipamentoId },
        select: {
          id: true,
          name: true,
          customerId: true,
          locationId: true,
          room: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.customer.findUnique({
        where: { id: dados.data.customerId },
        select: { id: true, name: true },
      }),
    ]);

    if (!equipamento) return { erro: "Equipamento não encontrado." };
    if (!destino) return { erro: "Cliente de destino não encontrado.", campo: "customerId" };

    let locationId = dados.data.locationId ?? null;
    if (locationId) {
      const unidade = await prisma.customerLocation.findFirst({
        where: { id: locationId, customerId: destino.id },
        select: { id: true },
      });
      if (!unidade) {
        return { erro: "A unidade escolhida não é deste cliente.", campo: "locationId" };
      }
    }
    // mudou de dono e não escolheu unidade: a antiga não vale mais
    if (equipamento.customerId !== destino.id && !locationId) locationId = null;

    const mudouDeDono = equipamento.customerId !== destino.id;

    await prisma.$transaction(async (tx) => {
      await tx.equipment.update({
        where: { id: equipamento.id },
        data: {
          customerId: destino.id,
          locationId,
          room: dados.data.sala,
        },
      });

      await tx.equipmentEvent.create({
        data: {
          equipmentId: equipamento.id,
          kind: "nota",
          title: mudouDeDono
            ? `Transferido de ${equipamento.customer.name} para ${destino.name}`
            : "Mudança de unidade",
          description: dados.data.motivo,
        },
      });
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "Equipment",
      entidadeId: equipamento.id,
      resumo: mudouDeDono
        ? `Transferido de ${equipamento.customer.name} para ${destino.name}`
        : "Unidade/sala atualizada",
    });

    revalidarEquipamento(equipamento.id);
    return {
      ok: true,
      mensagem: mudouDeDono ? `Equipamento transferido para ${destino.name}.` : "Local atualizado.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível transferir o equipamento.");
  }
}

/* ==========================================================================
   TÉCNICOS
   ========================================================================== */

const esquemaTecnico = z.object({
  tecnicoId: idOpcional,
  userId: idObrigatorio,
  especialidades: z.string().max(600).optional().default(""),
  cor: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((valor) => valor === "" || /^#[0-9a-fA-F]{6}$/.test(valor), {
      message: "Use uma cor no formato #RRGGBB.",
    }),
  ativo: marcado,
});

/**
 * Cria ou edita o técnico.
 *
 * `Technician` estende um `User` já existente — não cria conta nem muda papel.
 * Quem dá acesso ao painel é a área de Usuários; aqui só se diz quem atende em
 * campo, com quais especialidades e em que cor aparece na agenda.
 */
export async function salvarTecnico(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("tecnicos");
  const dados = esquemaTecnico.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const especialidades = dados.data.especialidades
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);

  try {
    const pessoa = await prisma.user.findUnique({
      where: { id: dados.data.userId },
      select: { id: true, name: true },
    });
    if (!pessoa) return { erro: "Pessoa da equipe não encontrada.", campo: "userId" };

    const conteudo = {
      specialties: especialidades,
      colorTag: dados.data.cor || null,
      active: dados.data.ativo,
    };

    if (dados.data.tecnicoId) {
      const antes = await prisma.technician.findUnique({ where: { id: dados.data.tecnicoId } });
      if (!antes) return { erro: "Técnico não encontrado." };

      const depois = await prisma.technician.update({
        where: { id: dados.data.tecnicoId },
        data: conteudo,
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "Technician",
        entidadeId: depois.id,
        antes,
        depois,
        resumo: `Técnico ${pessoa.name}`,
      });
    } else {
      const jaExiste = await prisma.technician.findUnique({
        where: { userId: pessoa.id },
        select: { id: true },
      });
      if (jaExiste) {
        return { erro: `${pessoa.name} já está cadastrado como técnico.`, campo: "userId" };
      }

      const criado = await prisma.technician.create({
        data: { userId: pessoa.id, ...conteudo },
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "criar",
        entidade: "Technician",
        entidadeId: criado.id,
        resumo: `Técnico ${pessoa.name} cadastrado`,
      });
    }

    revalidar(["/admin/tecnicos", "/admin/agenda", "/admin/manutencao", "/admin/assistencia"]);
    return { ok: true, mensagem: "Técnico salvo." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível salvar o técnico.");
  }
}

const esquemaAtivarTecnico = z.object({ tecnicoId: idObrigatorio, ativo: marcado });

/**
 * Liga ou desliga o técnico da escala.
 *
 * Nunca exclui: `Technician` está preso a visitas, OS e agendamentos antigos, e
 * apagar a linha apagaria o nome de quem fez o serviço no histórico do cliente.
 */
export async function alternarTecnicoAtivo(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("tecnicos");
  const dados = esquemaAtivarTecnico.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  try {
    const tecnico = await prisma.technician.update({
      where: { id: dados.data.tecnicoId },
      data: { active: dados.data.ativo },
      select: { id: true, active: true, user: { select: { name: true } } },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: tecnico.active ? "restaurar" : "arquivar",
      entidade: "Technician",
      entidadeId: tecnico.id,
      resumo: `${tecnico.user.name} ${tecnico.active ? "voltou para" : "saiu da"} escala`,
    });

    revalidar(["/admin/tecnicos", "/admin/agenda"]);
    return {
      ok: true,
      mensagem: tecnico.active ? "Técnico ativo na escala." : "Técnico fora da escala.",
    };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível atualizar o técnico.");
  }
}

/* ==========================================================================
   AGENDA — instalações
   ========================================================================== */

const esquemaInstalacao = z.object({
  tarefaId: idObrigatorio,
  quando: z.string().trim().optional().default(""),
  status: z.enum(["pendente", "agendada", "concluida", "cancelada"]),
  notas: textoOpcional,
});

/** Marca a instalação vendida junto do pedido. Aparece na agenda com o resto. */
export async function atualizarInstalacao(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaInstalacao.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const quando = dataSP(dados.data.quando);
  if (dados.data.status === "agendada" && !quando) {
    return { erro: "Informe a data e a hora da instalação.", campo: "quando" };
  }

  try {
    const tarefa = await prisma.installationTask.update({
      where: { id: dados.data.tarefaId },
      data: {
        status: dados.data.status,
        scheduledAt: quando,
        ...(dados.data.notas ? { notes: dados.data.notas } : {}),
      },
      select: { id: true, orderId: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "InstallationTask",
      entidadeId: tarefa.id,
      resumo: `Instalação: ${dados.data.status}`,
    });

    revalidar(["/admin/agenda", `/admin/pedidos/${tarefa.orderId}`, "/admin/pedidos"]);
    return { ok: true, mensagem: "Instalação atualizada." };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível atualizar a instalação.");
  }
}

/* ==========================================================================
   AGENDAMENTOS DE VISITA — status
   ========================================================================== */

const esquemaStatusAgendamento = z.object({
  agendamentoId: idObrigatorio,
  chamadoId: idOpcional,
  status: z.enum(["agendado", "em_andamento", "concluido", "cancelado"]),
  motivo: textoOpcional,
});

/**
 * Move a visita entre agendada, em andamento, concluída e cancelada.
 *
 * Cancelar uma visita não é só trocar uma palavra na tabela: o cliente foi
 * avisado da data e precisa saber que ela caiu. Por isso o cancelamento e a
 * conclusão gravam evento no chamado e aviso na Área da Clínica, na mesma transação
 * do próprio status — evento sem status é mentira, status sem evento é buraco
 * na linha do tempo.
 *
 * Cancelada a última visita aberta, o chamado não pode continuar dizendo
 * "visita agendada". Ele volta para triagem, que é onde alguém precisa
 * remarcá-lo. Isso roda depois da transação, de propósito: `mudarStatusChamado`
 * abre a transação dele, e aninhar as duas colocaria as mesmas linhas sob dois
 * bloqueios. O pior caso é um chamado com o status antigo — visível na tela e
 * corrigível num clique —, nunca um impasse no banco.
 */
export async function mudarStatusDoAgendamento(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("assistencia");
  const dados = esquemaStatusAgendamento.safeParse(comoObjeto(formData));
  if (!dados.success) return problemaZod(dados.error);

  const { agendamentoId, status } = dados.data;
  const motivo = dados.data.motivo.trim();

  const TITULO: Record<typeof status, string> = {
    agendado: "Visita reaberta",
    em_andamento: "Técnico a caminho",
    concluido: "Visita concluída",
    cancelado: "Visita cancelada",
  };

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const agendamento = await tx.serviceAppointment.findUnique({
        where: { id: agendamentoId },
        select: {
          id: true,
          status: true,
          startsAt: true,
          request: { select: { id: true, number: true, status: true, customerId: true } },
        },
      });
      if (!agendamento) return { falha: "Visita não encontrada." as const };
      if (agendamento.status === status) {
        return { falha: `A visita já está como "${status}".` as const };
      }

      // guarda na condição do UPDATE: quem mudou primeiro é quem vale
      const alteradas = await tx.serviceAppointment.updateMany({
        where: { id: agendamentoId, status: agendamento.status },
        data: { status },
      });
      if (alteradas.count === 0) {
        return {
          falha:
            "Alguém mudou esta visita enquanto a tela estava aberta. Recarregue a página." as const,
        };
      }

      let chamadoParaTriagem = false;

      if (agendamento.request) {
        await tx.serviceRequestEvent.create({
          data: {
            requestId: agendamento.request.id,
            title: TITULO[status],
            message:
              status === "cancelado"
                ? `A visita de ${formatarDataHora(agendamento.startsAt)} foi cancelada.${motivo ? ` ${motivo}` : ""}`
                : motivo,
            // a mudança de escala interna não interessa ao cliente; o
            // cancelamento e a conclusão, sim
            visibleToCustomer: status === "cancelado" || status === "concluido",
            userId: usuario.id,
          },
        });

        if (
          agendamento.request.customerId &&
          (status === "cancelado" || status === "concluido")
        ) {
          await tx.notification.create({
            data: {
              customerId: agendamento.request.customerId,
              kind: status === "cancelado" ? "visita_cancelada" : "visita_concluida",
              title: `Chamado ${agendamento.request.number}: ${TITULO[status].toLowerCase()}`,
              body:
                status === "cancelado"
                  ? "Entramos em contato para combinar uma nova data."
                  : "Obrigado por receber nossa equipe.",
              href: `/minha-jb/assistencia/${agendamento.request.id}`,
            },
          });
        }

        if (status === "cancelado") {
          const aindaAbertas = await tx.serviceAppointment.count({
            where: {
              requestId: agendamento.request.id,
              status: { in: ["agendado", "em_andamento"] },
            },
          });
          chamadoParaTriagem =
            aindaAbertas === 0 &&
            (agendamento.request.status === "visita_agendada" ||
              agendamento.request.status === "tecnico_a_caminho");
        }
      }

      return {
        chamadoId: agendamento.request?.id ?? null,
        anterior: agendamento.status,
        chamadoParaTriagem,
      };
    });

    if ("falha" in resultado) return { erro: resultado.falha };

    if (resultado.chamadoParaTriagem && resultado.chamadoId) {
      await mudarStatusChamado(resultado.chamadoId, "triagem", {
        userId: usuario.id,
        titulo: "Aguardando nova data",
        nota: "A visita foi cancelada e ainda não há outra marcada.",
      });
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "ServiceAppointment",
      entidadeId: agendamentoId,
      resumo: `Visita: ${resultado.anterior} → ${status}`,
    });

    revalidar(["/admin/agenda", "/admin/assistencia"]);
    if (resultado.chamadoId) revalidarChamado(resultado.chamadoId);
    return { ok: true, mensagem: `${TITULO[status]}.` };
  } catch (erro) {
    return mensagemDeErro(erro, "Não foi possível atualizar a visita.");
  }
}
