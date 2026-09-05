"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  autenticarCliente,
  bloqueadoPorTentativas,
  criarSessaoCliente,
  encerrarSessaoCliente,
} from "@/lib/auth-cliente";

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

export async function cadastrarCliente(
  _anterior: EstadoCliente,
  _formData: FormData,
): Promise<EstadoCliente> {
  return { erro: "Diagnóstico temporário de tipagem." };
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
