"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  autenticarStaff,
  criarSessaoStaff,
  encerrarSessaoStaff,
  registrar,
  sessaoStaff,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ipDoPedido } from "@/lib/seguranca";

export type EstadoEntrar = { erro?: string; campo?: string };

/** Janela e limites do freio de força bruta. */
const JANELA_MINUTOS = 15;
const MAX_POR_EMAIL = 5;
const MAX_POR_IP = 15;

const esquema = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
  destino: z.string().default("/admin"),
});

async function ipDaRequisicao() {
  const h = await headers();
  return ipDoPedido(h);
}

/**
 * Só aceita destino interno do painel. Sem isso o campo escondido do
 * formulário viraria redirecionamento aberto para fora do site.
 */
function destinoSeguro(valor: string) {
  if (!valor.startsWith("/admin")) return "/admin";
  if (valor.startsWith("//")) return "/admin";
  if (valor.startsWith("/admin/entrar")) return "/admin";
  return valor;
}

/**
 * Cada freio conta só as próprias tentativas.
 *
 * `LoginAttempt` é uma tabela só, usada pelo login da equipe, pelo login do
 * cliente e pela conferência de pedido e de chamado. Sem prefixo no
 * `identifier`, a contagem por IP somava tudo: uma varredura de número de
 * pedido derrubava o login da equipe do mesmo escritório. O prefixo separa os
 * orçamentos de tentativa sem precisar de tabela nova.
 */
async function bloqueado(email: string, ip: string) {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000);

  const [porEmail, porIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { identifier: `staff:${email}`, success: false, createdAt: { gte: desde } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: {
            ip,
            identifier: { startsWith: "staff:" },
            success: false,
            createdAt: { gte: desde },
          },
        })
      : Promise.resolve(0),
  ]);

  return porEmail >= MAX_POR_EMAIL || porIp >= MAX_POR_IP;
}

async function registrarTentativa(email: string, ip: string, sucesso: boolean) {
  await prisma.loginAttempt.create({
    data: { identifier: `staff:${email}`, ip, success: sucesso },
  });

  /**
   * Acertar a senha limpa as falhas anteriores daquele e-mail.
   *
   * Sem isto, quem erra quatro vezes, acerta na quinta e volta a errar uma vez
   * mais tarde é trancado — mesmo tendo provado que é o dono da conta. O
   * contador existe para segurar quem tenta adivinhar, e quem adivinhou parou
   * de tentar. O limite por IP continua de pé, porque esse não depende de
   * ninguém ter provado nada.
   */
  if (sucesso) {
    await prisma.loginAttempt.deleteMany({
      where: { identifier: `staff:${email}`, success: false },
    });
  }
}

/**
 * Entrada da equipe no backoffice.
 *
 * A mensagem de erro é sempre a mesma para e-mail inexistente, senha errada e
 * usuário desativado — quem tenta adivinhar não descobre qual dos três é. O
 * número de tentativas falhas por e-mail e por IP fica em `LoginAttempt`, que
 * é o mesmo freio usado na área do cliente.
 */
export async function entrarStaff(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const dados = esquema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    destino: formData.get("destino") ?? "/admin",
  });

  if (!dados.success) {
    const problema = dados.error.issues[0];
    return {
      erro: problema?.message ?? "Confira os dados informados.",
      campo: String(problema?.path[0] ?? ""),
    };
  }

  const email = dados.data.email.toLowerCase().trim();
  const ip = await ipDaRequisicao();

  if (await bloqueado(email, ip)) {
    return {
      erro: `Muitas tentativas seguidas. Aguarde ${JANELA_MINUTOS} minutos antes de tentar de novo.`,
    };
  }

  const user = await autenticarStaff(email, dados.data.senha);

  if (!user) {
    await registrarTentativa(email, ip, false);
    return { erro: "E-mail ou senha incorretos.", campo: "senha" };
  }

  await registrarTentativa(email, ip, true);
  await criarSessaoStaff(user);
  await registrar({
    userId: user.id,
    action: "login",
    entity: "User",
    entityId: user.id,
    summary: `Entrou no painel${ip ? ` a partir de ${ip}` : ""}`,
  });

  revalidatePath("/admin", "layout");

  // fora de qualquer try/catch: redirect() sinaliza a navegação lançando
  redirect(destinoSeguro(dados.data.destino));
}

/** Encerra a sessão da equipe e volta para a tela de entrada. */
export async function sairStaff() {
  const user = await sessaoStaff();

  if (user) {
    await registrar({
      userId: user.id,
      action: "logout",
      entity: "User",
      entityId: user.id,
      summary: "Saiu do painel",
    });
  }

  await encerrarSessaoStaff();
  revalidatePath("/admin", "layout");
  redirect("/admin/entrar");
}
