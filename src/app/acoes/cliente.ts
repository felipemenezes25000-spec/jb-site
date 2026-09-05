"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  autenticarCliente,
  bloqueadoPorTentativas,
  criarSessaoCliente,
  encerrarSessaoCliente,
  hashSenhaCliente,
} from "@/lib/auth-cliente";
import { documentoValido } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type EstadoCliente = { erro?: string };

function destinoSeguro(valor: FormDataEntryValue | null, padrao = "/minha-jb") {
  const destino = String(valor ?? "");
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : padrao;
}

const loginSchema = z.object({
  email: z.string().trim().email(),
  senha: z.string().min(1),
});

export async function entrarCliente(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const dados = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!dados.success) return { erro: "Confira seu e-mail e sua senha." };
  if (await bloqueadoPorTentativas(dados.data.email)) {
    return { erro: "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente." };
  }

  const cliente = await autenticarCliente(dados.data.email, dados.data.senha);
  if (!cliente) return { erro: "E-mail ou senha incorretos." };

  await criarSessaoCliente(cliente);
  redirect(destinoSeguro(formData.get("voltar")));
}

const cadastroSchema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().max(30).default(""),
  tipo: z.enum(["fisica", "juridica"]).default("fisica"),
  documento: z.string().trim().max(30).default(""),
  empresa: z.string().trim().max(120).default(""),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export async function cadastrarCliente(
  _anterior: EstadoCliente,
  formData: FormData,
): Promise<EstadoCliente> {
  const dados = cadastroSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone") ?? "",
    tipo: formData.get("tipo") ?? "fisica",
    documento: formData.get("documento") ?? "",
    empresa: formData.get("empresa") ?? "",
    senha: formData.get("senha"),
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Revise os dados informados." };
  }

  if (dados.data.documento && !documentoValido(dados.data.documento, dados.data.tipo)) {
    return { erro: dados.data.tipo === "fisica" ? "Informe um CPF válido." : "Informe um CNPJ válido." };
  }

  const email = dados.data.email.toLowerCase();
  if (await prisma.customer.findUnique({ where: { email }, select: { id: true } })) {
    return { erro: "Já existe uma conta com este e-mail." };
  }

  const cliente = await prisma.customer.create({
    data: {
      name: dados.data.nome,
      email,
      phone: dados.data.telefone,
      personType: dados.data.tipo,
      document: dados.data.documento.replace(/\D/g, ""),
      companyName: dados.data.empresa,
      passwordHash: await hashSenhaCliente(dados.data.senha),
    },
    select: { id: true, name: true, email: true },
  });

  await criarSessaoCliente(cliente);
  redirect("/minha-jb");
}

export async function sairCliente() {
  await encerrarSessaoCliente();
  redirect("/");
}

export async function solicitarAssistencia(
  _anterior: EstadoCliente,
  _formData: FormData,
): Promise<EstadoCliente> {
  return { erro: "Diagnóstico temporário de tipagem." };
}
