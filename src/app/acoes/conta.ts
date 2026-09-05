"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  autenticarCliente,
  bloqueadoPorTentativas,
  consumirTokenDeReset,
  criarSessaoCliente,
  criarTokenDeReset,
  encerrarSessaoCliente,
  hashSenhaCliente,
} from "@/lib/auth-cliente";
import { esquecerCarrinhoDoNavegador, fundirCarrinhoNoLogin } from "@/lib/carrinho";
import { cnpjValido, cpfValido, formatarTelefone, somenteDigitos } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Identidade do cliente final.
 *
 * Três regras valem para o arquivo inteiro:
 *  1. nenhuma resposta revela se um e-mail existe — nem no login, nem na
 *     recuperação, nem no cadastro;
 *  2. o destino do redirecionamento nunca é aceito como veio do navegador;
 *  3. a senha só existe em texto claro no caminho até o bcrypt de
 *     @/lib/auth-cliente — nunca é guardada, registrada nem devolvida.
 */

export type EstadoConta = { erro?: string; campo?: string; ok?: string };

const DESTINO_PADRAO = "/minha-jb";

/** Voltar para uma tela de autenticação depois de entrar viraria laço. */
const CAMINHOS_DE_AUTENTICACAO = ["/entrar", "/cadastro", "/recuperar-senha", "/redefinir-senha"];

/**
 * Só aceita caminho interno. Barra dupla, contrabarra e espaço em branco são
 * as formas clássicas de transformar `?destino=` em redirecionamento aberto.
 */
function temCaractereProibido(valor: string) {
  // espaço, tabulação, quebra de linha e qualquer caractere de controle
  for (const letra of valor) {
    const codigo = letra.codePointAt(0) ?? 0;
    if (codigo <= 32 || codigo === 127) return true;
  }
  return false;
}

function destinoSeguro(valor: unknown): string {
  const bruto = typeof valor === "string" ? valor.trim() : "";
  if (!bruto.startsWith("/")) return DESTINO_PADRAO;
  if (bruto.startsWith("//") || bruto.startsWith("/\\")) return DESTINO_PADRAO;
  if (temCaractereProibido(bruto)) return DESTINO_PADRAO;
  if (CAMINHOS_DE_AUTENTICACAO.some((rota) => bruto === rota || bruto.startsWith(`${rota}?`))) {
    return DESTINO_PADRAO;
  }
  return bruto;
}

function primeiroProblema(erro: z.ZodError): EstadoConta {
  const problema = erro.issues[0];
  return {
    erro: problema?.message ?? "Confira os dados informados.",
    campo: problema?.path[0] !== undefined ? String(problema.path[0]) : undefined,
  };
}

/* ============================================================================
   Entrar
   ============================================================================ */

const esquemaEntrar = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha."),
  destino: z.string().default(""),
});

export async function entrarCliente(
  _anterior: EstadoConta,
  formData: FormData,
): Promise<EstadoConta> {
  const dados = esquemaEntrar.safeParse({
    email: String(formData.get("email") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    destino: String(formData.get("destino") ?? ""),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const email = dados.data.email.toLowerCase().trim();

  if (await bloqueadoPorTentativas(email)) {
    return {
      erro:
        "Muitas tentativas seguidas. Aguarde 15 minutos e tente de novo, ou redefina sua senha.",
    };
  }

  const cliente = await autenticarCliente(email, dados.data.senha);

  // mensagem única: conta inexistente, senha errada e conta inativa soam igual
  if (!cliente) return { erro: "E-mail ou senha inválidos." };

  await criarSessaoCliente(cliente);
  await fundirCarrinhoNoLogin(cliente.id);

  revalidatePath("/", "layout");
  redirect(destinoSeguro(dados.data.destino));
}

/* ============================================================================
   Criar conta
   ============================================================================ */

const esquemaCadastro = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo."),
    email: z.email("Informe um e-mail válido."),
    telefone: z.string().trim().min(1, "Informe o telefone com DDD."),
    tipoPessoa: z.enum(["fisica", "juridica"]),
    documento: z.string().trim().min(1, "Informe o CPF ou CNPJ."),
    razaoSocial: z.string().trim().default(""),
    senha: z.string().min(8, "A senha precisa de ao menos 8 caracteres."),
    confirmacao: z.string().min(1, "Repita a senha para confirmar."),
    aceite: z.boolean(),
    novidades: z.boolean().default(false),
  })
  .superRefine((dados, ctx) => {
    const telefone = somenteDigitos(dados.telefone);
    if (telefone.length < 10 || telefone.length > 11) {
      ctx.addIssue({
        code: "custom",
        path: ["telefone"],
        message: "Informe o telefone com DDD, com 10 ou 11 dígitos.",
      });
    }

    const documento = somenteDigitos(dados.documento);
    const documentoOk =
      dados.tipoPessoa === "fisica" ? cpfValido(documento) : cnpjValido(documento);
    if (!documentoOk) {
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message: dados.tipoPessoa === "fisica" ? "CPF inválido." : "CNPJ inválido.",
      });
    }

    if (dados.tipoPessoa === "juridica" && dados.razaoSocial.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["razaoSocial"],
        message: "Informe a razão social da empresa.",
      });
    }

    if (dados.senha !== dados.confirmacao) {
      ctx.addIssue({ code: "custom", path: ["confirmacao"], message: "As senhas não conferem." });
    }

    if (!dados.aceite) {
      ctx.addIssue({
        code: "custom",
        path: ["aceite"],
        message: "É preciso aceitar os termos de uso e a política de privacidade.",
      });
    }
  });

/** Mesma resposta para e-mail já cadastrado e para colisão na gravação. */
const CONTA_NAO_CRIADA =
  "Não foi possível criar a conta com este e-mail. Se você já tem cadastro na JB, entre com sua senha ou peça a redefinição.";

function ehChaveDuplicada(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as { code?: unknown }).code === "P2002"
  );
}

export async function cadastrarCliente(
  _anterior: EstadoConta,
  formData: FormData,
): Promise<EstadoConta> {
  const dados = esquemaCadastro.safeParse({
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    tipoPessoa: String(formData.get("tipoPessoa") ?? "fisica"),
    documento: String(formData.get("documento") ?? ""),
    razaoSocial: String(formData.get("razaoSocial") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    confirmacao: String(formData.get("confirmacao") ?? ""),
    aceite: formData.get("aceite") === "on",
    novidades: formData.get("novidades") === "on",
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const email = dados.data.email.toLowerCase().trim();

  const jaCadastrado = await prisma.customer.findUnique({
    where: { email },
    select: { id: true },
  });
  if (jaCadastrado) return { erro: CONTA_NAO_CRIADA, campo: "email" };

  const juridica = dados.data.tipoPessoa === "juridica";

  let cliente: { id: string; name: string; email: string };
  try {
    cliente = await prisma.customer.create({
      data: {
        name: dados.data.nome,
        email,
        phone: formatarTelefone(dados.data.telefone),
        personType: dados.data.tipoPessoa,
        document: somenteDigitos(dados.data.documento),
        companyName: juridica ? dados.data.razaoSocial : "",
        passwordHash: await hashSenhaCliente(dados.data.senha),
        marketingOptInAt: dados.data.novidades ? new Date() : null,
      },
      select: { id: true, name: true, email: true },
    });
  } catch (erro) {
    if (ehChaveDuplicada(erro)) return { erro: CONTA_NAO_CRIADA, campo: "email" };
    console.error("[cadastro-cliente]", erro);
    return { erro: "Não foi possível concluir o cadastro agora. Tente novamente em instantes." };
  }

  await criarSessaoCliente(cliente);
  await fundirCarrinhoNoLogin(cliente.id);

  revalidatePath("/", "layout");
  redirect(destinoSeguro(formData.get("destino")));
}

/* ============================================================================
   Recuperação de senha
   ============================================================================ */

/** Resposta única — existindo ou não a conta, o texto é exatamente este. */
const RESPOSTA_RECUPERACAO =
  "Se este e-mail estiver cadastrado na JB, o link de redefinição chega em instantes. Ele vale por 1 hora — confira também a caixa de spam.";

const esquemaRecuperar = z.object({ email: z.email("Informe um e-mail válido.") });

/**
 * Enfileira o e-mail de redefinição.
 *
 * Ainda não há módulo de notificações no projeto, então o registro fica em
 * OutboundMessage com status `simulado`: a fila é real, o disparo é que
 * depende do provedor de e-mail ser ligado.
 */
async function enfileirarEmailDeReset(email: string, token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;

  await prisma.outboundMessage.create({
    data: {
      channel: "email",
      to: email,
      template: "senha_reset",
      // o token é aleatório: o prefixo já garante a unicidade da chave
      dedupeKey: `senha_reset:${token.slice(0, 24)}`,
      status: "simulado",
    },
  });

  if (process.env.NODE_ENV !== "production") {
    // Sem provedor ligado, o link precisa aparecer em algum lugar para o fluxo
    // ser testável em desenvolvimento. Em produção nunca é registrado.
    console.error("[senha_reset] link de redefinição:", link);
  }
}

export async function pedirRecuperacao(
  _anterior: EstadoConta,
  formData: FormData,
): Promise<EstadoConta> {
  const dados = esquemaRecuperar.safeParse({ email: String(formData.get("email") ?? "") });
  if (!dados.success) return primeiroProblema(dados.error);

  const email = dados.data.email.toLowerCase().trim();

  try {
    const cliente = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, active: true },
    });

    // conta desativada não recebe link — e o silêncio é o mesmo do e-mail inexistente
    if (cliente?.active) {
      const token = await criarTokenDeReset(cliente.id);
      await enfileirarEmailDeReset(email, token);
    }
  } catch (erro) {
    // falhar aqui não pode mudar a resposta, senão a tela vira um oráculo
    console.error("[recuperar-senha]", erro);
  }

  return { ok: RESPOSTA_RECUPERACAO };
}

/* ============================================================================
   Redefinir senha
   ============================================================================ */

const esquemaRedefinir = z
  .object({
    token: z.string().trim().min(10, "Link de redefinição inválido."),
    senha: z.string().min(8, "A senha precisa de ao menos 8 caracteres."),
    confirmacao: z.string().min(1, "Repita a nova senha para confirmar."),
  })
  .superRefine((dados, ctx) => {
    if (dados.senha !== dados.confirmacao) {
      ctx.addIssue({ code: "custom", path: ["confirmacao"], message: "As senhas não conferem." });
    }
  });

export async function redefinirSenha(
  _anterior: EstadoConta,
  formData: FormData,
): Promise<EstadoConta> {
  const dados = esquemaRedefinir.safeParse({
    token: String(formData.get("token") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    confirmacao: String(formData.get("confirmacao") ?? ""),
  });
  if (!dados.success) return primeiroProblema(dados.error);

  const cliente = await consumirTokenDeReset(dados.data.token, dados.data.senha);
  if (!cliente) {
    return {
      erro: "Este link expirou ou já foi usado. Peça um novo e-mail de redefinição.",
      campo: "token",
    };
  }

  await criarSessaoCliente({ id: cliente.id, name: cliente.name, email: cliente.email });
  await fundirCarrinhoNoLogin(cliente.id);

  revalidatePath("/", "layout");
  redirect(DESTINO_PADRAO);
}

/* ============================================================================
   Sair
   ============================================================================ */

export async function sairCliente() {
  await encerrarSessaoCliente();
  // o carrinho vai junto: em computador compartilhado, quem entra depois não
  // pode encontrar os itens de quem saiu
  await esquecerCarrinhoDoNavegador();
  revalidatePath("/", "layout");
  redirect("/");
}
