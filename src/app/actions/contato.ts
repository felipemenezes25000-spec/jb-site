"use server";

import crypto from "node:crypto";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.email("E-mail inválido.").max(180),
  endereco: z.string().trim().max(180).default(""),
  bairro: z.string().trim().max(120).default(""),
  cidade: z.string().trim().max(120).default(""),
  estado: z.string().trim().max(2).default(""),
  cep: z.string().trim().max(12).default(""),
  telefone: z.string().trim().max(40).default(""),
  obs: z.string().trim().max(4000).default(""),
  news: z.coerce.boolean().default(false),
  captcha: z.string().trim().min(1, "Digite o código da imagem."),
});

export type ContatoState = {
  status: "idle" | "ok" | "error";
  msg?: string;
  erros?: Record<string, string>;
};

function assinar(texto: string) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(texto.toUpperCase())
    .digest("hex");
}

export async function enviarContato(
  _anterior: ContatoState,
  formData: FormData,
): Promise<ContatoState> {
  const bruto = {
    ...Object.fromEntries(formData),
    news: formData.get("news") === "1",
  } as Record<string, unknown>;

  const parsed = schema.safeParse(bruto);
  if (!parsed.success) {
    const erros: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const chave = String(issue.path[0] ?? "form");
      erros[chave] ??= issue.message;
    }
    return { status: "error", msg: "Confira os campos destacados.", erros };
  }

  const jar = await cookies();
  const esperado = jar.get("jb_captcha")?.value;
  const { captcha, ...dados } = parsed.data;

  if (!esperado || assinar(captcha) !== esperado) {
    return {
      status: "error",
      msg: "O código de verificação não confere. Tente novamente.",
      erros: { captcha: "Código incorreto." },
    };
  }
  jar.delete("jb_captcha");

  const h = await headers();
  await prisma.lead.create({
    data: {
      ...dados,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
      userAgent: h.get("user-agent")?.slice(0, 400) ?? "",
    },
  });

  return { status: "ok", msg: "Dados enviados com sucesso! Obrigado." };
}
