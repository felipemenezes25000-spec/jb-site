import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { registrar, sessaoStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TIPOS = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const LIMITE = 8 * 1024 * 1024;

/**
 * Extensão e tipo saem do formato que o sharp reconheceu NO CONTEÚDO, nunca do
 * nome nem do `type` que o navegador mandou — os dois são texto livre de quem
 * envia. Derivar a extensão do nome permitia gravar `.html` ou `.svg` na
 * própria origem: um PNG válido com HTML embutido, servido como página, é XSS
 * armazenado no mesmo domínio da sessão do painel.
 */
const FORMATOS: Record<string, { extensao: string; mime: string }> = {
  jpeg: { extensao: ".jpg", mime: "image/jpeg" },
  png: { extensao: ".png", mime: "image/png" },
  gif: { extensao: ".gif", mime: "image/gif" },
  webp: { extensao: ".webp", mime: "image/webp" },
};

/**
 * Upload da biblioteca de mídia.
 *
 * Onde o arquivo vai depende do ambiente: se existe BLOB_READ_WRITE_TOKEN
 * (Vercel), vai para o Vercel Blob, porque lá o disco é efêmero. Sem a
 * variável, grava em public/uploads — o que basta em servidor próprio ou VPS.
 * O resto do painel não muda: tudo referencia Media.url.
 */
async function guardar(nome: string, bytes: Buffer, mime: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const enviado = await put(`midia/${nome}`, bytes, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return enviado.url;
  }

  const destino = path.join(process.cwd(), "public", "uploads", nome);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, bytes);
  return `/uploads/${nome}`;
}
export async function POST(request: Request) {
  const user = await sessaoStaff();
  if (!user) return Response.json({ erro: "Não autorizado." }, { status: 401 });

  const form = await request.formData();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) {
    return Response.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!TIPOS.includes(arquivo.type)) {
    return Response.json({ erro: "Formato aceito: JPG, PNG, GIF ou WebP." }, { status: 400 });
  }
  if (arquivo.size > LIMITE) {
    return Response.json({ erro: "O arquivo passa de 8 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  let largura: number | null = null;
  let altura: number | null = null;
  let formato = "";
  try {
    const meta = await sharp(bytes).metadata();
    largura = meta.width ?? null;
    altura = meta.height ?? null;
    formato = meta.format ?? "";
  } catch {
    return Response.json({ erro: "Não foi possível ler a imagem." }, { status: 400 });
  }

  const reconhecido = FORMATOS[formato];
  if (!reconhecido) {
    return Response.json({ erro: "Formato aceito: JPG, PNG, GIF ou WebP." }, { status: 400 });
  }

  const extensao = reconhecido.extensao;
  const base = path
    .basename(arquivo.name, path.extname(arquivo.name))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();
  const nome = `${base || "imagem"}-${crypto.randomBytes(4).toString("hex")}${extensao}`;

  const url = await guardar(nome, bytes, reconhecido.mime);

  const media = await prisma.media.create({
    data: {
      filename: nome,
      url,
      mime: reconhecido.mime,
      size: arquivo.size,
      width: largura,
      height: altura,
      alt: String(form.get("alt") ?? ""),
      folder: "uploads",
    },
  });

  await registrar({
    userId: user.id,
    action: "create",
    entity: "midia",
    entityId: media.id,
    summary: nome,
  });

  return Response.json({ media });
}
