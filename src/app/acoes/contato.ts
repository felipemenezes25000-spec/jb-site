"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { formatarTelefone, somenteDigitos } from "@/lib/format";
import { LIMITE_CONTATO, checarFormulario, mensagemDeEspera } from "@/lib/limite";
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

/**
 * Janela e tetos vêm de `LIMITE_CONTATO`, em `@/lib/limite`. Ficavam aqui, em
 * três constantes só deste arquivo; agora existe um lugar só para todos os
 * formulários públicos, e as duas camadas de freio deste arquivo (memória e
 * banco) leem os mesmos números.
 */

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
 *
 * Continua sendo a barreira que vale. O freio de `@/lib/limite`, logo antes,
 * é só o porteiro barato: responde sem ir ao banco e conta por instância do
 * processo. Os dois usam a mesma janela e os mesmos tetos.
 */
async function excedeuNoBanco(ip: string, email: string) {
  const desdeIp = new Date(Date.now() - LIMITE_CONTATO.porIp.janelaMs);
  const desdeEmail = new Date(Date.now() - LIMITE_CONTATO.porEmail.janelaMs);

  const [porIp, porEmail] = await Promise.all([
    ip ? prisma.lead.count({ where: { ip, createdAt: { gte: desdeIp } } }) : Promise.resolve(0),
    prisma.lead.count({ where: { email, createdAt: { gte: desdeEmail } } }),
  ]);

  return porIp >= LIMITE_CONTATO.porIp.limite || porEmail >= LIMITE_CONTATO.porEmail.limite;
}

const MENSAGEM_DE_LIMITE =
  "Já recebemos suas mensagens nos últimos minutos. Se for urgente, ligue para a JB ou chame no WhatsApp.";

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

  // Porteiro em memória: vale por instância do processo (ver o cabeçalho de
  // `@/lib/limite`), e por isso não substitui a contagem no banco logo abaixo.
  const freio = checarFormulario("/contato", { ip, email }, LIMITE_CONTATO);
  if (!freio.ok) {
    return { erro: `${MENSAGEM_DE_LIMITE} ${mensagemDeEspera(freio.esperaMs)}` };
  }

  try {
    if (await excedeuNoBanco(ip, email)) {
      return { erro: MENSAGEM_DE_LIMITE };
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
