import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { StaffRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const COOKIE = "jb_staff";
const DURACAO = 60 * 60 * 8; // 8h

function segredo() {
  const valor = process.env.AUTH_SECRET;
  if (!valor) throw new Error("AUTH_SECRET ausente no ambiente");
  return new TextEncoder().encode(valor);
}

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
};

/**
 * Hierarquia de permissão. Quem está acima herda o que está abaixo, exceto
 * `tecnico`, que é uma trilha operacional paralela e não gerencia catálogo.
 */
const NIVEL: Record<StaffRole, number> = {
  admin: 100,
  gestor: 80,
  comercial: 60,
  editor: 40,
  tecnico: 40,
};

export function temNivel(user: StaffUser | null, minimo: StaffRole) {
  if (!user) return false;
  return NIVEL[user.role] >= NIVEL[minimo];
}

/** Capacidades nomeadas — mais legível que espalhar comparação de papel. */
export const PODE = {
  gerenciarUsuarios: (u: StaffUser | null) => u?.role === "admin",
  excluirRegistros: (u: StaffUser | null) => u?.role === "admin",
  confirmarPagamentoManual: (u: StaffUser | null) => temNivel(u, "gestor"),
  editarCatalogo: (u: StaffUser | null) =>
    Boolean(u) && ["admin", "gestor", "comercial", "editor"].includes(u!.role),
  editarConteudo: (u: StaffUser | null) =>
    Boolean(u) && ["admin", "gestor", "editor"].includes(u!.role),
  operarComercial: (u: StaffUser | null) =>
    Boolean(u) && ["admin", "gestor", "comercial"].includes(u!.role),
  operarAssistencia: (u: StaffUser | null) =>
    Boolean(u) && ["admin", "gestor", "comercial", "tecnico"].includes(u!.role),
  verCustos: (u: StaffUser | null) => temNivel(u, "gestor"),
} as const;

export async function hashSenha(texto: string) {
  return bcrypt.hash(texto, 12);
}

export async function conferirSenha(texto: string, hash: string) {
  return bcrypt.compare(texto, hash);
}

export async function criarSessaoStaff(user: StaffUser) {
  const token = await new SignJWT({ ...user })
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

export async function encerrarSessaoStaff() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function sessaoStaff(): Promise<StaffUser | null> {
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
      role: payload.role as StaffRole,
    };
  } catch {
    return null;
  }
}

export async function exigirStaff(): Promise<StaffUser> {
  const user = await sessaoStaff();
  if (!user) redirect("/admin/login");
  return user;
}

export async function exigirNivel(minimo: StaffRole): Promise<StaffUser> {
  const user = await exigirStaff();
  if (!temNivel(user, minimo)) redirect("/admin?erro=permissao");
  return user;
}

export async function exigirAdmin(): Promise<StaffUser> {
  const user = await exigirStaff();
  if (user.role !== "admin") redirect("/admin?erro=permissao");
  return user;
}

export async function autenticarStaff(email: string, senha: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || !user.active) return null;

  const ok = await conferirSenha(senha, user.passwordHash);
  if (!ok) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function registrar(input: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  summary?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? "",
      summary: input.summary ?? "",
    },
  });
}
