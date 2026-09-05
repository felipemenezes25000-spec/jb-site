"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type EstadoContato = { ok?: string; erro?: string; protocolo?: string };

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().max(30).default(""),
  assunto: z.string().trim().min(2, "Selecione um assunto.").max(100),
  mensagem: z.string().trim().min(10, "Escreva uma mensagem com um pouco mais de detalhe.").max(3000),
});

export async function enviarContato(
  _anterior: EstadoContato,
  formData: FormData,
): Promise<EstadoContato> {
  const dados = schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone") ?? "",
    assunto: formData.get("assunto"),
    mensagem: formData.get("mensagem"),
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Revise os dados do formulário." };
  }

  const h = await headers();

  try {
    const lead = await prisma.lead.create({
      data: {
        nome: dados.data.nome,
        email: dados.data.email.toLowerCase(),
        telefone: dados.data.telefone,
        obs: `Contato pelo site · ${dados.data.assunto}\n\n${dados.data.mensagem}`,
        status: "novo",
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
        userAgent: h.get("user-agent") ?? "",
      },
    });

    return {
      ok: "Mensagem enviada. A equipe da JB recebeu seu contato.",
      protocolo: lead.id.slice(-8).toUpperCase(),
    };
  } catch {
    return { erro: "Não foi possível enviar agora. Tente novamente ou use um dos canais de atendimento." };
  }
}
