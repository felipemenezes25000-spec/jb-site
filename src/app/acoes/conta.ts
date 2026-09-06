"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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
import { esquecerPedidosDoNavegador } from "@/lib/acompanhamento";
import { cnpjValido, cpfValido, formatarTelefone, somenteDigitos } from "@/lib/format";
import { LIMITE_RECUPERACAO, checarFormulario, mensagemDeEspera } from "@/lib/limite";
import { enfileirar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { ipDoPedido } from "@/lib/seguranca";

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
 * Vai por `enfileirar`, e não por um INSERT à mão em `OutboundMessage`, por
 * duas razões: o status precisa ser `pendente` para o worker da fila pegar a
 * linha (`simulado` ele ignora), e a `dedupeKey` precisa sair no formato
 * canônico `canal|template|refTipo|refId` para o modelo conseguir ler a
 * referência de volta.
 *
 * O TOKEN INTEIRO é o `refId` porque ele é a única forma de remontar o link:
 * `PasswordResetToken` guarda apenas o sha256, e `OutboundMessage` não tem
 * coluna de corpo (schema congelado). O preço é que o token viaja em texto
 * claro na chave da fila; ele vale por uma hora, serve uma vez só e é
 * invalidado por um pedido novo — mas quem lê a fila no painel, durante essa
 * hora, consegue entrar na conta. Se a coluna de corpo existir um dia, o link
 * deve ser montado aqui e a chave voltar a ser o id do cliente.
 */
async function enfileirarEmailDeReset(email: string, token: string) {
  const resultado = await enfileirar({
    canal: "email",
    para: email,
    assunto: "Redefinição de senha",
    corpo: "",
    refTipo: "senha",
    refId: token,
    template: "senha_reset",
  });

  if (process.env.NODE_ENV !== "production") {
    // Sem provedor de e-mail ligado, o link precisa aparecer em algum lugar
    // para o fluxo ser testável em desenvolvimento. Em produção, nunca.
    const base = SITE_URL;
    console.error(
      "[senha_reset] link de redefinição:",
      `${base}/redefinir-senha?token=${encodeURIComponent(token)}`,
    );
  }

  // não muda a resposta da tela (ela é sempre a mesma), mas sem isto uma fila
  // recusando mensagem ficaria invisível
  if (!resultado.ok) {
    console.error("[senha_reset] e-mail não entrou na fila:", resultado.motivo);
  }
}

export async function pedirRecuperacao(
  _anterior: EstadoConta,
  formData: FormData,
): Promise<EstadoConta> {
  const dados = esquemaRecuperar.safeParse({ email: String(formData.get("email") ?? "") });
  if (!dados.success) return primeiroProblema(dados.error);

  const email = dados.data.email.toLowerCase().trim();

  /*
   * Freio de taxa — a tela não tinha nenhum, e cada envio manda um e-mail para
   * uma caixa que pode não ser de quem digitou.
   *
   * A recusa por volume não vira oráculo: a contagem é do que foi digitado,
   * pelo IP e pelo e-mail, e não muda conforme a conta existir ou não. Por isso
   * pode dizer a verdade ("muitos pedidos") em vez de repetir a resposta única.
   *
   * Vale por instância do processo — ver o cabeçalho de `@/lib/limite`. Aqui
   * não há tabela para contar pedidos de redefinição (o token de reset não
   * guarda o e-mail digitado quando a conta não existe), então esta é a única
   * camada; um armazenamento compartilhado entra por `checarLimiteEm` no dia
   * em que houver um.
   */
  const ip = ipDoPedido(await headers());
  const freio = checarFormulario("/recuperar-senha", { ip, email }, LIMITE_RECUPERACAO);
  if (!freio.ok) {
    return {
      erro: `Muitos pedidos de redefinição em pouco tempo. ${mensagemDeEspera(freio.esperaMs)}`,
    };
  }

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
  /* Quem veio do checkout redefinir a senha precisa voltar para lá com o
     carrinho intacto, e não cair na visão geral da conta tendo de recomeçar.
     O destino passa pelo mesmo filtro de redirecionamento aberto. */
  redirect(destinoSeguro(formData.get("destino")));
}

/* ============================================================================
   Sair
   ============================================================================ */

export async function sairCliente() {
  await encerrarSessaoCliente();
  // o carrinho vai junto: em computador compartilhado, quem entra depois não
  // pode encontrar os itens de quem saiu
  await esquecerCarrinhoDoNavegador();
  /*
   * E o cookie de acompanhamento de pedidos também.
   *
   * Ele lista números de pedido fechados neste navegador e abre
   * `/pedido/[numero]` sem pedir mais nada. Enquanto todo pedido novo era de
   * convidado isso era o único caminho que essa pessoa tinha; agora que a
   * compra exige conta, deixá-lo para trás no logout entrega o pedido de quem
   * saiu para quem entrar depois no mesmo computador.
   *
   * Quem comprou como visitante antes desta mudança não perde nada: a página
   * do pedido tem a conferência de e-mail, com freio de tentativas, e ela
   * regrava o cookie.
   */
  await esquecerPedidosDoNavegador();
  revalidatePath("/", "layout");
  redirect("/");
}
