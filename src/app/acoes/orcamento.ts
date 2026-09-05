"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type EstadoOrcamento = { ok?: string; erro?: string; protocolo?: string };

const schema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().min(8, "Informe um telefone para contato."),
  assunto: z.enum(["equipamento", "peca", "assistencia", "outro"]),
  produto: z.string().trim().max(200).default(""),
  mensagem: z.string().trim().min(10, "Conte um pouco mais sobre o que você precisa.").max(3000),
});

const ROTULO: Record<string, string> = {
  equipamento: "Equipamento",
  peca: "Peça ou acessório",
  assistencia: "Assistência técnica",
  outro: "Outra necessidade",
};

export async function solicitarOrcamento(
  _anterior: EstadoOrcamento,
  formData: FormData,
): Promise<EstadoOrcamento> {
  const dados = schema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    assunto: formData.get("assunto"),
    produto: formData.get("produto") ?? "",
    mensagem: formData.get("mensagem"),
  });

  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Revise os dados do formulário." };
  }

  const h = await headers();
  const contexto = [
    `Solicitação de orçamento · ${ROTULO[dados.data.assunto] ?? dados.data.assunto}`,
    dados.data.produto ? `Produto de interesse: ${dados.data.produto}` : "",
    "",
    dados.data.mensagem,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const lead = await prisma.lead.create({
      data: {
        nome: dados.data.nome,
        email: dados.data.email.toLowerCase(),
        telefone: dados.data.telefone,
        obs: contexto,
        status: "orcamento",
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
        userAgent: h.get("user-agent") ?? "",
      },
    });

    return {
      ok: "Solicitação enviada. A equipe da JB já pode analisar o que você precisa.",
      protocolo: lead.id.slice(-8).toUpperCase(),
    };
  } catch {
    return { erro: "Não foi possível enviar agora. Tente novamente ou fale com a JB pelo WhatsApp." };
  }
}
