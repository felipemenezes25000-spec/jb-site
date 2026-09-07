"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { formatarTelefone, somenteDigitos } from "@/lib/format";
import { LIMITE_PERGUNTA, checarFormulario, mensagemDeEspera } from "@/lib/limite";
import { enfileirar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";
import { getSettings } from "@/lib/settings";

/* ============================================================================
   Pergunta sobre um equipamento

   A ficha respondia as dúvidas que a JB já tinha escrito. A dúvida que ainda
   não foi escrita — que é a que faz a pessoa fechar a aba — não tinha para
   onde ir sem sair da página.

   O caminho aqui é o mesmo do formulário de contato, e de propósito: a
   pergunta vira um `Lead` com o equipamento identificado, aparece em
   /admin/leads como qualquer outra oportunidade, e a equipe responde à pessoa.
   Quando a resposta serve para as próximas clínicas, ela é publicada como FAQ
   daquele produto em /admin/conteudo/faq, e a partir dali aparece na ficha
   para todo mundo — inclusive no dado estruturado de FAQ.

   O QUE ESTA AÇÃO NÃO FAZ

   Não publica nada. Nenhum texto escrito por visitante aparece no site sem
   passar por alguém da JB — uma pergunta pública que se auto-publica é um
   canal aberto de spam com o domínio da empresa em volta.

   E não enfileira e-mail para o endereço digitado: só para o interno
   configurado no painel. É a mesma regra de `enviarContato`, pelo mesmo
   motivo — formulário público que dispara e-mail para endereço arbitrário
   vira ferramenta de spam de terceiros.
   ============================================================================ */

export type EstadoPergunta = { erro?: string; campo?: string; ok?: string };

const MENSAGEM_DE_SUCESSO =
  "Pergunta enviada. A equipe da JB responde por e-mail no horário de atendimento.";

const MENSAGEM_DE_LIMITE =
  "Já recebemos suas perguntas nos últimos minutos. Se for urgente, chame a JB no WhatsApp.";

const esquema = z.object({
  produtoId: z.string().trim().min(1).max(60),
  nome: z.string().trim().min(3, "Informe seu nome.").max(120),
  email: z.email("Informe um e-mail válido."),
  telefone: z.string().trim().default(""),
  pergunta: z
    .string()
    .trim()
    .min(12, "Escreva um pouco mais — o que exatamente você precisa saber?")
    .max(1200, "Pergunta muito longa. Resuma em até 1200 caracteres."),
});

export async function perguntarSobreProduto(
  _anterior: EstadoPergunta,
  formData: FormData,
): Promise<EstadoPergunta> {
  // Campo escondido: humano nunca preenche, robô preenche tudo. A resposta é
  // a mesma do envio real — robô que descobre que foi barrado só volta melhor.
  if (String(formData.get("assunto_alternativo") ?? "").trim() !== "") {
    return { ok: MENSAGEM_DE_SUCESSO };
  }

  const dados = esquema.safeParse({
    produtoId: String(formData.get("produtoId") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    pergunta: String(formData.get("pergunta") ?? ""),
  });
  if (!dados.success) {
    const problema = dados.error.issues[0];
    return {
      erro: problema?.message ?? "Confira os dados informados.",
      campo: problema?.path[0] !== undefined ? String(problema.path[0]) : undefined,
    };
  }

  const telefone = somenteDigitos(dados.data.telefone);
  if (telefone && (telefone.length < 10 || telefone.length > 11)) {
    return { erro: "Informe o telefone com DDD, com 10 ou 11 dígitos.", campo: "telefone" };
  }

  const email = dados.data.email.toLowerCase();
  const h = await headers();
  const ip = ipDoPedido(h);
  const userAgent = (h.get("user-agent") ?? "").slice(0, 400);

  const freio = checarFormulario("/pergunta-de-produto", { ip, email }, LIMITE_PERGUNTA);
  if (!freio.ok) {
    return { erro: `${MENSAGEM_DE_LIMITE} ${mensagemDeEspera(freio.esperaMs)}` };
  }

  try {
    /* O equipamento é lido do banco, não do formulário: o nome que vai para o
       lead e para o aviso interno precisa ser o do cadastro. Um `produtoId`
       inventado simplesmente não encontra nada, e a pergunta é recusada em vez
       de virar um lead sobre um equipamento que não existe. */
    const produto = await prisma.product.findFirst({
      where: { id: dados.data.produtoId, status: { not: "draft" } },
      select: { name: true, sku: true, slug: true },
    });
    if (!produto) {
      return { erro: "Este equipamento não está mais disponível para perguntas." };
    }

    const lead = await prisma.lead.create({
      data: {
        nome: dados.data.nome,
        email,
        telefone: telefone ? formatarTelefone(telefone) : "",
        obs: [
          `Pergunta sobre o equipamento: ${produto.name} (SKU ${produto.sku})`,
          `Ficha: /loja/${produto.slug}`,
          "",
          dados.data.pergunta,
        ].join("\n"),
        status: "novo",
        ip,
        userAgent,
      },
      select: { id: true },
    });

    const s = await getSettings();
    const destinoInterno = (s.pedido_email_copia || s.email).trim();

    if (destinoInterno) {
      await enfileirar({
        canal: "email",
        para: destinoInterno,
        assunto: `Pergunta sobre ${produto.name}`,
        corpo: [
          `Nome: ${dados.data.nome}`,
          `E-mail: ${email}`,
          telefone ? `Telefone: ${formatarTelefone(telefone)}` : null,
          `Equipamento: ${produto.name} (SKU ${produto.sku})`,
          `Ficha: /loja/${produto.slug}`,
          "",
          dados.data.pergunta,
        ]
          .filter((linha) => linha !== null)
          .join("\n"),
        refTipo: "lead",
        refId: lead.id,
        template: "pergunta_de_produto",
      });
    }

    revalidatePath("/admin/leads");

    return { ok: MENSAGEM_DE_SUCESSO };
  } catch (erro) {
    console.error("Falha ao registrar pergunta sobre produto", erro);
    return {
      erro:
        "Não foi possível enviar sua pergunta agora. Tente de novo em instantes ou fale com a JB pelo WhatsApp.",
    };
  }
}
