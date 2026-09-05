import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

import { sessaoCliente } from "@/lib/auth-cliente";

/**
 * Quem pode ver um chamado.
 *
 * O número (AT-000123) é curto de propósito — o cliente precisa conseguir
 * ditá-lo por telefone. Por isso o número sozinho não abre nada: quem não tem
 * sessão precisa repetir o e-mail ou o telefone informados na abertura, e só
 * então recebe um cookie assinado válido para aquele chamado.
 *
 * O cookie guarda uma assinatura HMAC do par (id, número), nunca os dados do
 * chamado. Adulterar o valor não cria acesso; copiá-lo para outro chamado
 * também não, porque a assinatura é de um chamado só.
 *
 * Este arquivo é de servidor (`server-only`) e fica fora de `acoes/` de
 * propósito: se estivesse no arquivo `"use server"`, cada função destas
 * viraria um endpoint público sem necessidade.
 */

const DIAS_DE_ACESSO = 7;

export function nomeDoCookieDoChamado(numero: string) {
  return `jb_at_${numero.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

function assinarAcesso(chamadoId: string, numero: string) {
  // segredo vazio produz um HMAC que qualquer um reproduz: a assinatura
  // deixaria de significar coisa alguma. Melhor falhar alto na subida.
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET ausente: a assinatura não pode ser gerada.");
  return crypto
    .createHmac("sha256", `${segredo}:chamado`)
    .update(`${chamadoId}|${numero.toUpperCase()}`)
    .digest("hex");
}

/** Grava o comprovante de acesso ao chamado no navegador de quem provou o contato. */
export async function liberarAcessoAoChamado(chamadoId: string, numero: string) {
  const jar = await cookies();
  jar.set(nomeDoCookieDoChamado(numero), assinarAcesso(chamadoId, numero), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_DE_ACESSO * 24 * 60 * 60,
  });
}

export type ChamadoProtegido = {
  id: string;
  number: string;
  customerId: string | null;
};

/**
 * Dono com sessão entra direto; o resto depende do cookie assinado. Usada
 * pela página e pela ação de resposta — a autorização é sempre conferida no
 * servidor, nunca presumida a partir do link.
 */
export async function podeVerChamado(chamado: ChamadoProtegido) {
  const cliente = await sessaoCliente();
  if (cliente && chamado.customerId && cliente.id === chamado.customerId) return true;

  const jar = await cookies();
  const guardado = jar.get(nomeDoCookieDoChamado(chamado.number))?.value ?? "";
  if (!guardado) return false;

  const esperado = Buffer.from(assinarAcesso(chamado.id, chamado.number), "utf8");
  const recebido = Buffer.from(guardado, "utf8");
  return (
    esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido)
  );
}
