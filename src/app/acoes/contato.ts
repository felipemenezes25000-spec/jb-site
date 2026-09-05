"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { formatarTelefone, somenteDigitos } from "@/lib/format";
import { enfileirar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ipDoPedido } from "@/lib/seguranca";

/**
 * Formulário de contato do site.
 *
 * O que a ação faz, em ordem: valida no servidor, descarta robô, freia
 * repetição pelo IP e pelo e-mail, grava o `Lead` e coloca UM aviso interno na
 * fila de mensagens. Nada é enviado aqui — `enfileirar` só grava
 * `OutboundMessage` com status pendente, e quem dispara é o worker.
 *
 * Duas decisões de segurança que não são óbvias:
 *
 *  1. a armadilha (campo escondido) responde com a MESMA mensagem de sucesso
 *     do envio real. Robô que descobre que foi barrado só volta melhor;
 *  2. nenhuma mensagem é enfileirada para o e-mail digitado pelo visitante,
 *     apenas para o endereço interno configurado no painel. Um formulário
 *     público que enfileira e-mail para endereço arbitrário vira ferramenta
 *     de spam com o domínio da JB no remetente.
 */

export type EstadoContato = { erro?: string; campo?: string; ok?: string };

/** Janela e tetos do freio por origem. Vale para o par IP + e-mail. */
const JANELA_MINUTOS = 10;
const MAX_POR_IP = 3;
const MAX_POR_EMAIL = 2;

const MENSAGEM_DE_SUCESSO =
  "Mensagem recebida. A equipe da JB responde no horário de atendimento.";

const esquema = z.object({
  nome: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  email: z.email("Informe um e-mail válido."),
  telefone: z.string().trim().min(1, "Informe o telefone com DDD."),
  cidade: z.string().trim().max(80).default(""),
  mensagem: z
    .string()
    .trim()
    .min(10, "Escreva um pouco mais sobre o que você precisa.")
    .max(4000, "Mensagem muito longa. Resuma em até 4000 caracteres."),
  novidades: z.boolean().default(false),
});

function primeiroProblema(erro: z.ZodError): EstadoContato {
  const problema = erro.issues[0];
  return {
    erro: problema?.message ?? "Confira os dados informados.",
    campo: problema?.path[0] !== undefined ? String(problema.path[0]) : undefined,
  };
}

async function origem() {
  const h = await headers();
  return {
    ip: ipDoPedido(h),
    userAgent: (h.get("user-agent") ?? "").slice(0, 400),
  };
}

/**
 * Freio por origem, medido na própria tabela de leads — vale para todas as
 * instâncias do servidor, coisa que um contador em memória não conseguiria
 * garantir em ambiente serverless.
 */
async function excedeuOLimite(ip: string, email: string) {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000);

  const [porIp, porEmail] = await Promise.all([
    ip ? prisma.lead.count({ where: { ip, createdAt: { gte: desde } } }) : Promise.resolve(0),
    prisma.lead.count({ where: { email, createdAt: { gte: desde } } }),
  ]);

  return porIp >= MAX_POR_IP || porEmail >= MAX_POR_EMAIL;
}

export async function enviarContato(
  _anterior: EstadoContato,
  formData: FormData,
): Promise<EstadoContato> {
  // Campo escondido do formulário: humano nunca preenche, robô preenche tudo.
  if (String(formData.get("assunto_alternativo") ?? "").trim() !== "") {
    return { ok: MENSAGEM_DE_SUCESSO };
  }

  const dados = esquema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    mensagem: String(formData.get("mensagem") ?? ""),
    novidades: formData.get("novidades") !== null,
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const telefone = somenteDigitos(dados.data.telefone);
  if (telefone.length < 10 || telefone.length > 11) {
    return {
      erro: "Informe o telefone com DDD, com 10 ou 11 dígitos.",
      campo: "telefone",
    };
  }

  const email = dados.data.email.toLowerCase();
  const { ip, userAgent } = await origem();

  try {
    if (await excedeuOLimite(ip, email)) {
      return {
        erro:
          "Já recebemos suas mensagens nos últimos minutos. Se for urgente, ligue para a JB ou chame no WhatsApp.",
      };
    }

    const lead = await prisma.lead.create({
      data: {
        nome: dados.data.nome,
        email,
        telefone: formatarTelefone(telefone),
        cidade: dados.data.cidade,
        obs: dados.data.mensagem,
        news: dados.data.novidades,
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
        assunto: `Contato pelo site — ${dados.data.nome}`,
        corpo: [
          `Nome: ${dados.data.nome}`,
          `E-mail: ${email}`,
          `Telefone: ${formatarTelefone(telefone)}`,
          dados.data.cidade ? `Cidade: ${dados.data.cidade}` : null,
          dados.data.novidades ? "Aceita receber novidades: sim" : null,
          "",
          dados.data.mensagem,
        ]
          .filter((linha) => linha !== null)
          .join("\n"),
        refTipo: "lead",
        refId: lead.id,
        template: "contato_site",
      });
    }

    // A lista de leads do painel precisa mostrar o recém-chegado.
    revalidatePath("/admin/leads");
    revalidatePath("/contato");

    return { ok: MENSAGEM_DE_SUCESSO };
  } catch (erro) {
    console.error("Falha ao registrar contato do site", erro);
    return {
      erro:
        "Não foi possível enviar sua mensagem agora. Tente de novo em instantes ou fale com a JB pelo telefone.",
    };
  }
}
