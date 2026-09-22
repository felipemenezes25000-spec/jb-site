"use server";

import { revalidatePath } from "next/cache";
import { PersonType, Prisma } from "@prisma/client";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { documentoValido, formatarDataHora, somenteDigitos } from "@/lib/format";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Ficha do cliente: editar o cadastro e anotar.
 *
 * Saiu de `admin-vendas.ts` quando a loja foi retirada. Criar cliente e
 * unidade continua em `admin-clientes.ts`; aqui é só o que acontece dentro da
 * ficha que já existe. Senha não passa por aqui, e desde a saída da área do
 * cliente nem existe mais uso para ela.
 */

export type EstadoFicha = { erro?: string; campo?: string; ok?: string };

function primeiroProblema(erro: z.ZodError): EstadoFicha {
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

/** Edita o cadastro do cliente. */
export async function salvarCliente(
  _anterior: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
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
    console.error("Não foi possível salvar o cliente.", erro);
    return { erro: "Não foi possível salvar o cliente." };
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
 * `Customer.notes` é um campo de texto único no schema; não existe tabela de
 * notas. Por isso cada nota entra como um bloco datado e assinado, com a mais
 * recente no topo, e o histórico anterior é preservado inteiro.
 */
export async function adicionarNotaDoCliente(
  _anterior: EstadoFicha,
  formData: FormData,
): Promise<EstadoFicha> {
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
