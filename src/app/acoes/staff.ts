"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import {
  autenticarStaff,
  conferirSenha,
  criarSessaoStaff,
  encerrarSessaoStaff,
  exigirStaff,
  hashSenha,
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

/* ============================================================================
   Troca da própria senha

   Quem está logado troca a sua senha aqui. É o par que faltava da senha
   temporária gerada em /admin/usuarios/[id]: sem esta ação, a senha que o
   administrador leu na tela seria, para sempre, a senha do funcionário.

   Não existe "esqueci minha senha" para a equipe, e não é esquecimento: não há
   provedor de e-mail ligado neste projeto, e um fluxo de recuperação que não
   consegue entregar o link é pior do que não existir. Quem perdeu a senha pede
   uma temporária a um administrador — é o que a tela de entrada já diz.
   ============================================================================ */

export type EstadoSenha = { erro?: string; campo?: string; ok?: string };

/**
 * Freio da troca de senha, separado do freio do login.
 *
 * A contagem vai para `LoginAttempt` — banco, como manda `@/lib/limite`: o
 * limitador em memória conta por instância e, em serverless, um limite de 5
 * viraria 5 por instância quente. O prefixo `troca-senha:` mantém os dois
 * orçamentos independentes: errar a senha atual nesta tela não pode trancar a
 * entrada de quem está trabalhando, e uma varredura no login não pode trancar
 * esta tela.
 */
const MAX_TROCA_POR_USUARIO = 5;

function chaveDeTroca(email: string) {
  return `troca-senha:${email.toLowerCase().trim()}`;
}

async function bloqueadoParaTroca(chave: string) {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60_000);
  const falhas = await prisma.loginAttempt.count({
    where: { identifier: chave, success: false, createdAt: { gte: desde } },
  });
  return falhas >= MAX_TROCA_POR_USUARIO;
}

async function registrarTentativaDeTroca(chave: string, ip: string, sucesso: boolean) {
  await prisma.loginAttempt.create({ data: { identifier: chave, ip, success: sucesso } });
  // acertou a senha atual: as falhas anteriores não seguram mais ninguém
  if (sucesso) {
    await prisma.loginAttempt.deleteMany({ where: { identifier: chave, success: false } });
  }
}

const esquemaSenha = z
  .object({
    atual: z.string().min(1, "Informe a senha atual."),
    nova: z.string().min(8, "A nova senha precisa de ao menos 8 caracteres."),
    confirmacao: z.string().min(1, "Repita a nova senha para confirmar."),
  })
  .superRefine((dados, ctx) => {
    if (dados.nova.trim().length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["nova"],
        message: "A nova senha precisa de ao menos 8 caracteres além de espaços.",
      });
    }
    if (dados.nova !== dados.confirmacao) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmacao"],
        message: "As senhas não conferem.",
      });
    }
    if (dados.nova === dados.atual) {
      ctx.addIssue({
        code: "custom",
        path: ["nova"],
        message: "A nova senha precisa ser diferente da atual.",
      });
    }
  });

/**
 * Troca a senha de quem está logado.
 *
 * SOBRE ENCERRAR AS OUTRAS SESSÕES — NÃO DÁ, E ESTE É O MOTIVO
 *
 * A sessão da equipe é um JWT assinado guardado no cookie `jb_staff` (ver
 * `criarSessaoStaff`/`sessaoStaff` em `@/lib/auth`). Não há tabela de sessões,
 * e o token não é conferido contra o banco em nenhum momento — `sessaoStaff()`
 * só verifica a assinatura e a validade. Para derrubar os outros dispositivos
 * seria preciso um dado do lado do servidor que o token pudesse contradizer:
 * uma tabela de sessões, um `tokenVersion` ou um `passwordChangedAt` em `User`.
 * Nenhum dos três existe, e o schema está congelado — não posso criar coluna
 * nem migration. Trocar o segredo de assinatura derrubaria o painel inteiro,
 * inclusive quem não trocou senha nenhuma.
 *
 * Resultado honesto: os outros dispositivos continuam dentro até o token
 * expirar (8h). A tela de conta diz isso em voz alta, em vez de prometer o que
 * o sistema não faz. O caminho para resolver de verdade está registrado nas
 * pendências.
 */
export async function trocarSenhaStaff(
  _anterior: EstadoSenha,
  formData: FormData,
): Promise<EstadoSenha> {
  // autorização no servidor: sem sessão, nem chega a ler o formulário
  const sessao = await exigirStaff();

  const dados = esquemaSenha.safeParse({
    atual: String(formData.get("atual") ?? ""),
    nova: String(formData.get("nova") ?? ""),
    confirmacao: String(formData.get("confirmacao") ?? ""),
  });

  if (!dados.success) {
    const problema = dados.error.issues[0];
    return {
      erro: problema?.message ?? "Confira os dados informados.",
      campo: problema?.path[0] !== undefined ? String(problema.path[0]) : undefined,
    };
  }

  const chave = chaveDeTroca(sessao.email);
  const ip = await ipDaRequisicao();

  if (await bloqueadoParaTroca(chave)) {
    return {
      erro: `Muitas tentativas seguidas. Aguarde ${JANELA_MINUTOS} minutos antes de tentar de novo.`,
      campo: "atual",
    };
  }

  // o hash vem do banco, não do cookie: o token não carrega senha e pode estar
  // velho em relação ao papel e à situação do acesso
  const pessoa = await prisma.user.findUnique({
    where: { id: sessao.id },
    select: { id: true, name: true, email: true, role: true, active: true, passwordHash: true },
  });

  if (!pessoa || !pessoa.active) {
    await encerrarSessaoStaff();
    return { erro: "Este acesso não está mais ativo. Fale com um administrador." };
  }

  if (!(await conferirSenha(dados.data.atual, pessoa.passwordHash))) {
    await registrarTentativaDeTroca(chave, ip, false);
    await registrarAuditoria({
      userId: pessoa.id,
      acao: "editar",
      entidade: "usuario",
      entidadeId: pessoa.id,
      resumo: "Tentou trocar a própria senha e errou a senha atual",
    });
    return { erro: "A senha atual não confere.", campo: "atual" };
  }

  /**
   * A guarda de concorrência está na condição do UPDATE, não em JavaScript:
   * `passwordHash` precisa ser exatamente o que foi conferido acima. Se um
   * administrador gerou uma senha temporária entre a conferência e a gravação,
   * `count` volta 0 e a senha dele não é sobrescrita sem que ninguém perceba.
   */
  const { count } = await prisma.user.updateMany({
    where: { id: pessoa.id, active: true, passwordHash: pessoa.passwordHash },
    data: { passwordHash: await hashSenha(dados.data.nova) },
  });

  if (count === 0) {
    return {
      erro:
        "A senha deste acesso mudou enquanto o formulário estava aberto. Confira a senha atual e tente de novo.",
      campo: "atual",
    };
  }

  await registrarTentativaDeTroca(chave, ip, true);

  // Auditoria fora da transação de propósito: `registrarAuditoria` nunca lança
  // e engolir a falha dela é melhor do que desfazer uma troca de senha que já
  // deu certo — a pessoa ficaria sem saber qual das duas senhas vale.
  await registrarAuditoria({
    userId: pessoa.id,
    acao: "editar",
    entidade: "usuario",
    entidadeId: pessoa.id,
    resumo: "Trocou a própria senha",
  });

  // Renova só o cookie DESTE dispositivo, com os dados frescos do banco. Não
  // encerra as outras sessões (ver o comentário acima); serve para que quem
  // acabou de provar a senha atual não seja expulso no meio do expediente.
  await criarSessaoStaff({
    id: pessoa.id,
    name: pessoa.name,
    email: pessoa.email,
    role: pessoa.role,
  });

  revalidatePath("/admin/conta");
  // a troca aparece no histórico de auditoria da ficha do usuário
  revalidatePath(`/admin/usuarios/${pessoa.id}`);

  return {
    ok: "Senha alterada. Use a nova senha da próxima vez que entrar no painel.",
  };
}
