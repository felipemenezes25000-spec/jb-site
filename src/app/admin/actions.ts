"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  authenticate,
  createSession,
  destroySession,
  hashPassword,
  logAction,
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type FormState = { erro?: string; ok?: string };

/** Revalida tudo que o site público renderiza a partir do banco. */
async function revalidarSite() {
  for (const rota of ["/", "/empresa", "/estrutura", "/solucoes", "/contato"]) {
    revalidatePath(rota);
  }
}

function paraSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ------------------------------------------------------------------ sessão */

export async function entrar(_anterior: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const user = await authenticate(email, senha);
  if (!user) return { erro: "E-mail ou senha incorretos." };

  await createSession(user);
  await logAction({ userId: user.id, action: "login", entity: "sessao" });
  redirect("/admin");
}

export async function sair() {
  const user = await requireUser();
  await logAction({ userId: user.id, action: "logout", entity: "sessao" });
  await destroySession();
  redirect("/admin/login");
}

/* ----------------------------------------------------------------- páginas */

const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().trim().min(1, "O título é obrigatório."),
  lead: z.string().trim().max(400).default(""),
  body: z.string().default(""),
  videoId: z.string().trim().max(40).default(""),
  seoTitle: z.string().trim().max(120).default(""),
  seoDescription: z.string().trim().max(300).default(""),
  coverId: z.string().trim().default(""),
});

export async function salvarPagina(_anterior: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const dados = pageSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };

  const { slug, coverId, videoId, ...resto } = dados.data;
  await prisma.page.update({
    where: { slug },
    data: { ...resto, coverId: coverId || null, videoId: videoId || null },
  });

  const galeria = formData.getAll("galeria").map(String).filter(Boolean);
  await prisma.pageImage.deleteMany({ where: { pageSlug: slug } });
  for (const [i, mediaId] of galeria.entries()) {
    await prisma.pageImage.create({ data: { pageSlug: slug, mediaId, order: i } });
  }

  await logAction({ userId: user.id, action: "update", entity: "pagina", entityId: slug });
  await revalidarSite();
  return { ok: "Página salva." };
}

/* ---------------------------------------------------------------- soluções */

const solucaoSchema = z.object({
  slug: z.string().trim().default(""),
  name: z.string().trim().min(1, "O nome é obrigatório."),
  description: z.string().default(""),
  imageId: z.string().trim().default(""),
  order: z.coerce.number().int().default(0),
  published: z.coerce.boolean().default(false),
});

export async function salvarSolucao(_anterior: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const bruto = { ...Object.fromEntries(formData), published: formData.get("published") === "on" };
  const dados = solucaoSchema.safeParse(bruto);
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };

  const { slug, imageId, ...resto } = dados.data;
  const alvo = slug || paraSlug(resto.name);

  await prisma.serviceCategory.upsert({
    where: { slug: alvo },
    update: { ...resto, imageId: imageId || null },
    create: { slug: alvo, ...resto, imageId: imageId || null },
  });

  await logAction({
    userId: user.id,
    action: slug ? "update" : "create",
    entity: "solucao",
    entityId: alvo,
    summary: resto.name,
  });
  await revalidarSite();
  revalidatePath("/admin/solucoes");
  if (!slug) redirect(`/admin/solucoes/${alvo}`);
  return { ok: "Solução salva." };
}

export async function excluirSolucao(slug: string) {
  const user = await requireAdmin();
  await prisma.serviceCategory.delete({ where: { slug } });
  await logAction({ userId: user.id, action: "delete", entity: "solucao", entityId: slug });
  await revalidarSite();
  redirect("/admin/solucoes");
}

/* ------------------------------------------------- chamadas da home e banners */

export async function salvarChamada(_anterior: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const dados = {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    body: String(formData.get("body") ?? "").trim() || null,
    href: String(formData.get("href") ?? "").trim() || null,
    target: formData.get("target") === "_blank" ? "_blank" : "_self",
    imageId: String(formData.get("imageId") ?? "") || null,
    order: Number(formData.get("order") ?? 0),
    published: formData.get("published") === "on",
  };
  if (!dados.title) return { erro: "O título é obrigatório." };

  if (id) await prisma.highlight.update({ where: { id }, data: dados });
  else await prisma.highlight.create({ data: dados });

  await logAction({
    userId: user.id,
    action: id ? "update" : "create",
    entity: "chamada",
    entityId: id,
  });
  await revalidarSite();
  revalidatePath("/admin/home");
  return { ok: "Chamada salva." };
}

export async function excluirChamada(id: string) {
  const user = await requireAdmin();
  await prisma.highlight.delete({ where: { id } });
  await logAction({ userId: user.id, action: "delete", entity: "chamada", entityId: id });
  await revalidarSite();
  revalidatePath("/admin/home");
}

export async function salvarSlide(_anterior: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const saida = String(formData.get("endsAt") ?? "").trim();
  const dados = {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim() || null,
    href: String(formData.get("href") ?? "").trim() || null,
    imageId: String(formData.get("imageId") ?? "") || null,
    order: Number(formData.get("order") ?? 0),
    published: formData.get("published") === "on",
    endsAt: saida ? new Date(`${saida}T23:59:59`) : null,
  };
  if (!dados.imageId) return { erro: "Escolha a imagem do banner." };

  if (id) await prisma.slide.update({ where: { id }, data: dados });
  else await prisma.slide.create({ data: dados });

  await logAction({
    userId: user.id,
    action: id ? "update" : "create",
    entity: "banner",
    entityId: id,
  });
  await revalidarSite();
  revalidatePath("/admin/banners");
  return { ok: "Banner salvo." };
}

export async function excluirSlide(id: string) {
  const user = await requireAdmin();
  await prisma.slide.delete({ where: { id } });
  await logAction({ userId: user.id, action: "delete", entity: "banner", entityId: id });
  await revalidarSite();
  revalidatePath("/admin/banners");
}

/* ------------------------------------------------------------ configurações */

export async function salvarConfiguracoes(
  _anterior: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const chaves = await prisma.setting.findMany({ select: { key: true } });
  const validas = new Set(chaves.map((c) => c.key));

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || !validas.has(key)) continue;
    await prisma.setting.update({ where: { key }, data: { value } });
  }

  await logAction({ userId: user.id, action: "update", entity: "configuracoes" });
  await revalidarSite();
  return { ok: "Configurações salvas." };
}

/* --------------------------------------------------------------- cadastros */

export async function atualizarCadastro(
  _anterior: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.lead.update({
    where: { id },
    data: {
      status: String(formData.get("status") ?? "novo"),
      notas: String(formData.get("notas") ?? ""),
    },
  });
  await logAction({ userId: user.id, action: "update", entity: "cadastro", entityId: id });
  revalidatePath("/admin/cadastros");
  return { ok: "Cadastro atualizado." };
}

export async function excluirCadastro(id: string) {
  const user = await requireAdmin();
  await prisma.lead.delete({ where: { id } });
  await logAction({ userId: user.id, action: "delete", entity: "cadastro", entityId: id });
  revalidatePath("/admin/cadastros");
}

/* ---------------------------------------------------------------- usuários */

const usuarioSchema = z.object({
  id: z.string().default(""),
  name: z.string().trim().min(2, "Informe o nome."),
  email: z.email("E-mail inválido."),
  role: z.enum(["admin", "editor"]).default("editor"),
  senha: z.string().default(""),
  active: z.coerce.boolean().default(true),
});

export async function salvarUsuario(_anterior: FormState, formData: FormData): Promise<FormState> {
  const atual = await requireAdmin();
  const bruto = { ...Object.fromEntries(formData), active: formData.get("active") === "on" };
  const dados = usuarioSchema.safeParse(bruto);
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };

  const { id, senha, ...resto } = dados.data;

  if (id) {
    await prisma.user.update({
      where: { id },
      data: { ...resto, ...(senha ? { passwordHash: await hashPassword(senha) } : {}) },
    });
  } else {
    if (senha.length < 8) return { erro: "A senha precisa de ao menos 8 caracteres." };
    const existe = await prisma.user.findUnique({ where: { email: resto.email } });
    if (existe) return { erro: "Já existe um usuário com esse e-mail." };
    await prisma.user.create({ data: { ...resto, passwordHash: await hashPassword(senha) } });
  }

  await logAction({
    userId: atual.id,
    action: id ? "update" : "create",
    entity: "usuario",
    entityId: id,
  });
  revalidatePath("/admin/usuarios");
  return { ok: "Usuário salvo." };
}

export async function excluirUsuario(id: string) {
  const atual = await requireAdmin();
  if (atual.id === id) return;
  await prisma.user.delete({ where: { id } });
  await logAction({ userId: atual.id, action: "delete", entity: "usuario", entityId: id });
  revalidatePath("/admin/usuarios");
}

export async function trocarPropriaSenha(
  _anterior: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");

  if (nova.length < 8) return { erro: "A nova senha precisa de ao menos 8 caracteres." };

  const conferido = await authenticate(user.email, atual);
  if (!conferido) return { erro: "A senha atual está incorreta." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(nova) },
  });
  await logAction({ userId: user.id, action: "update", entity: "senha" });
  return { ok: "Senha alterada." };
}

/* ------------------------------------------------------------------- mídia */

export async function excluirMidia(id: string) {
  const user = await requireAdmin();
  await prisma.media.delete({ where: { id } });
  await logAction({ userId: user.id, action: "delete", entity: "midia", entityId: id });
  revalidatePath("/admin/midia");
  await revalidarSite();
}
