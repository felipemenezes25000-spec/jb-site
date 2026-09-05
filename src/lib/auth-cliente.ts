import "server-only";

import crypto from "node:crypto";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";

/**
 * Sessão do cliente final — separada da equipe interna de ponta a ponta:
 * cookie próprio, tabela própria, nenhuma permissão administrativa.
 * Um cliente jamais vira staff por engano.
 */

const COOKIE = "jb_cliente";
const DURACAO = 60 * 60 * 24 * 30; // 30 dias

const MAX_TENTATIVAS = 8;
const JANELA_MINUTOS = 15;

function segredo() {
  const valor = process.env.AUTH_SECRET;
  if (!valor) throw new Error("AUTH_SECRET ausente no ambiente");
  // deriva uma chave distinta da usada pela equipe interna
  return new TextEncoder().encode(`${valor}:cliente`);
}

export type ClienteSessao = {
  id: string;
  name: string;
  email: string;
};

export async function criarSessaoCliente(cliente: ClienteSessao) {
  const token = await new SignJWT({ ...cliente })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO}s`)
    .sign(segredo());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO,
  });
}

export async function encerrarSessaoCliente() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function sessaoCliente(): Promise<ClienteSessao | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, segredo());
    if (!payload.id || !payload.email) return null;
    return {
      id: String(payload.id),
      name: String(payload.name ?? ""),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

/**
 * Sessão obrigatória. Toda rota de /minha-jb passa por aqui, e todo acesso a
 * dado do cliente filtra por este id — nunca por id vindo do navegador.
 */
export async function exigirCliente(destino?: string): Promise<ClienteSessao> {
  const cliente = await sessaoCliente();
  if (!cliente) {
    const volta = destino ? `?voltar=${encodeURIComponent(destino)}` : "";
    redirect(`/entrar${volta}`);
  }
  return cliente;
}

/* ---------------------------------------------------------------- login */

async function ipDaRequisicao() {
  const h = await headers();
  return ipDoPedido(h);
}

/** Bloqueia força bruta contando tentativas recentes por e-mail e por IP. */
export async function bloqueadoPorTentativas(email: string) {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000);
  const ip = await ipDaRequisicao();

  const [porEmail, porIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: {
        identifier: `cliente:${email.toLowerCase()}`,
        success: false,
        createdAt: { gte: desde },
      },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: {
            ip,
            identifier: { startsWith: "cliente:" },
            success: false,
            createdAt: { gte: desde },
          },
        })
      : Promise.resolve(0),
  ]);

  return porEmail >= MAX_TENTATIVAS || porIp >= MAX_TENTATIVAS * 3;
}

async function registrarTentativa(email: string, sucesso: boolean, customerId?: string) {
  await prisma.loginAttempt.create({
    data: {
      identifier: `cliente:${email.toLowerCase()}`,
      ip: await ipDaRequisicao(),
      success: sucesso,
      customerId: customerId ?? null,
    },
  });

  // acertar a senha limpa as falhas daquele e-mail: quem provou ser o dono não
  // pode ficar trancado por tentativas antigas
  if (sucesso) {
    await prisma.loginAttempt.deleteMany({
      where: { identifier: `cliente:${email.toLowerCase()}`, success: false },
    });
  }
}

export async function autenticarCliente(email: string, senha: string) {
  const normalizado = email.toLowerCase().trim();
  const cliente = await prisma.customer.findUnique({ where: { email: normalizado } });

  // compara mesmo sem cliente, para o tempo de resposta não revelar se o e-mail existe
  const hash = cliente?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await bcrypt.compare(senha, hash);

  if (!cliente || !cliente.passwordHash || !cliente.active || !ok) {
    await registrarTentativa(normalizado, false, cliente?.id);
    return null;
  }

  await registrarTentativa(normalizado, true, cliente.id);
  await prisma.customer.update({
    where: { id: cliente.id },
    data: { lastLoginAt: new Date() },
  });

  return { id: cliente.id, name: cliente.name, email: cliente.email };
}

/* ------------------------------------------------------- redefinir senha */

const VALIDADE_TOKEN_MINUTOS = 60;

export async function criarTokenDeReset(customerId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // invalida os anteriores: só o link mais recente vale
  await prisma.passwordResetToken.updateMany({
    where: { customerId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      customerId,
      tokenHash,
      expiresAt: new Date(Date.now() + VALIDADE_TOKEN_MINUTOS * 60_000),
    },
  });

  return token;
}

export async function consumirTokenDeReset(token: string, novaSenha: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const registro = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { customer: true },
  });

  if (!registro || registro.usedAt || registro.expiresAt < new Date()) return null;

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: registro.customerId },
      data: { passwordHash: await bcrypt.hash(novaSenha, 12) },
    }),
    prisma.passwordResetToken.update({
      where: { id: registro.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return registro.customer;
}

export async function hashSenhaCliente(senha: string) {
  return bcrypt.hash(senha, 12);
}
