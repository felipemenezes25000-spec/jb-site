"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Order, PaymentMethod } from "@prisma/client";

import { criarSessaoCliente, hashSenhaCliente, sessaoCliente } from "@/lib/auth-cliente";
import { lerCarrinho } from "@/lib/carrinho";
import {
  calcularParcelas,
  cnpjValido,
  cpfValido,
  paraCentavos,
  somenteDigitos,
} from "@/lib/format";
import { provedorPagamento } from "@/lib/pagamento";
import {
  confirmarPagamento,
  criarPedido,
  ErroDeEstoque,
  ErroDeItemIndisponivel,
} from "@/lib/pedido";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export type EstadoCheckout = { erro?: string; campo?: string; ok?: boolean };

/* --------------------------------------------- acompanhamento do convidado */

/**
 * Quem compra como convidado precisa acompanhar o pedido logo depois de
 * fechá-lo, e não tem sessão. Jogar o e-mail na URL resolveria — e vazaria em
 * histórico, referer e link compartilhado. Em vez disso gravamos um cookie
 * assinado com os números dos últimos pedidos abertos neste navegador.
 *
 * A assinatura é obrigatória: cookie é dado do cliente. Sem HMAC bastaria
 * digitar o número de outra pessoa no devtools para ler o pedido dela.
 *
 * O par de leitura vive em src/app/(loja)/pedido/[numero]/page.tsx e precisa
 * andar junto com estas funções — o formato do valor é `n1.n2~assinatura`.
 */
const COOKIE_PEDIDOS = "jb_pedidos";
const DURACAO_PEDIDOS = 60 * 60 * 24 * 30; // 30 dias
const MAX_PEDIDOS_NO_COOKIE = 10;

function assinarPedidos(lista: string) {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET ausente no ambiente");
  return crypto.createHmac("sha256", `${segredo}:pedido`).update(lista).digest("base64url");
}

function numerosDoCookie(bruto: string | undefined) {
  if (!bruto) return [];
  const separador = bruto.lastIndexOf("~");
  if (separador <= 0) return [];
  const lista = bruto.slice(0, separador);
  const assinatura = bruto.slice(separador + 1);
  return assinatura === assinarPedidos(lista) ? lista.split(".") : [];
}

/** Dá a este navegador o direito de ver o pedido recém-aberto. */
async function liberarAcompanhamento(numero: string) {
  const jar = await cookies();
  const anteriores = numerosDoCookie(jar.get(COOKIE_PEDIDOS)?.value);
  const lista = [numero, ...anteriores.filter((n) => n !== numero)]
    .slice(0, MAX_PEDIDOS_NO_COOKIE)
    .join(".");

  jar.set(COOKIE_PEDIDOS, `${lista}~${assinarPedidos(lista)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_PEDIDOS,
  });
}

/** Sessão dona do pedido ou cookie assinado. Nada mais abre a porta. */
async function temAcessoAoPedido(pedido: Pick<Order, "number" | "customerId">) {
  const sessao = await sessaoCliente();
  if (sessao && pedido.customerId === sessao.id) return true;

  const jar = await cookies();
  return numerosDoCookie(jar.get(COOKIE_PEDIDOS)?.value).includes(pedido.number);
}

const esquema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo."),
    email: z.email("E-mail inválido."),
    telefone: z.string().trim().min(10, "Informe o telefone com DDD."),
    tipoPessoa: z.enum(["fisica", "juridica"]),
    documento: z.string().trim().min(11, "Informe o CPF ou CNPJ."),
    razaoSocial: z.string().trim().default(""),

    entrega: z.enum(["retirada", "entrega"]),
    cep: z.string().trim().default(""),
    logradouro: z.string().trim().default(""),
    numero: z.string().trim().default(""),
    complemento: z.string().trim().default(""),
    bairro: z.string().trim().default(""),
    cidade: z.string().trim().default(""),
    uf: z.string().trim().default(""),
    referencia: z.string().trim().default(""),

    metodo: z.enum(["pix", "cartao", "boleto"]),
    parcelas: z.coerce.number().int().min(1).max(12).default(1),
    tokenCartao: z.string().trim().default(""),
    bandeira: z.string().trim().default(""),

    observacao: z.string().trim().max(1000).default(""),
    criarConta: z.coerce.boolean().default(false),
    senha: z.string().default(""),
  })
  .superRefine((dados, ctx) => {
    const doc = somenteDigitos(dados.documento);
    const valido = dados.tipoPessoa === "fisica" ? cpfValido(doc) : cnpjValido(doc);
    if (!valido) {
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message: dados.tipoPessoa === "fisica" ? "CPF inválido." : "CNPJ inválido.",
      });
    }

    if (dados.entrega === "entrega") {
      for (const campo of ["cep", "logradouro", "numero", "bairro", "cidade", "uf"] as const) {
        if (!dados[campo]) {
          ctx.addIssue({ code: "custom", path: [campo], message: "Campo obrigatório." });
        }
      }
    }

    if (dados.criarConta && dados.senha.length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["senha"],
        message: "A senha precisa de ao menos 8 caracteres.",
      });
    }
  });

/**
 * Fecha o pedido.
 *
 * O total é recalculado no servidor a partir do carrinho — o formulário não
 * envia preço nenhum. Só depois do pedido criado é que a cobrança é aberta no
 * provedor, e o estado do pagamento nunca vem do navegador.
 */
export async function finalizarCompra(
  _anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  const bruto = {
    ...Object.fromEntries(formData),
    criarConta: formData.get("criarConta") === "on",
  };
  const dados = esquema.safeParse(bruto);

  if (!dados.success) {
    const problema = dados.error.issues[0];
    return { erro: problema?.message ?? "Confira os dados.", campo: String(problema?.path[0] ?? "") };
  }

  const carrinho = await lerCarrinho();
  if (!carrinho || carrinho.items.length === 0) {
    return { erro: "Seu carrinho está vazio." };
  }

  const provedor = provedorPagamento();
  if (!provedor.metodos.includes(dados.data.metodo)) {
    return { erro: "Esta forma de pagamento não está disponível.", campo: "metodo" };
  }

  const sessao = await sessaoCliente();
  let customerId = sessao?.id ?? null;

  // compra como convidado pode virar conta no mesmo passo
  if (!customerId) {
    const email = dados.data.email.toLowerCase();
    const existente = await prisma.customer.findUnique({ where: { email } });

    if (existente) {
      // Definir senha aqui seria tomar uma conta alheia só sabendo o e-mail:
      // o caminho para virar dono do cadastro é entrar ou redefinir a senha,
      // que passa pela caixa de entrada.
      if (dados.data.criarConta) {
        return {
          erro:
            "Este e-mail já tem cadastro na JB. Entre na sua conta para concluir a compra, " +
            "ou desmarque a criação de conta e siga como convidado.",
          campo: "criarConta",
        };
      }
      /**
       * O pedido NÃO é pendurado na conta existente.
       *
       * Digitar um e-mail não prova ser dono dele. Se alguém erra uma letra e
       * cai no e-mail de outro cliente da JB, o nome, o endereço e os itens
       * dessa compra apareceriam no "Minha JB" de um estranho. Vínculo com
       * conta exige sessão; quem compra como convidado acompanha o pedido pelo
       * cookie assinado, que é o mesmo caminho de sempre.
       */
      customerId = null;
    } else {
      const novo = await prisma.customer.create({
        data: {
          name: dados.data.nome,
          email,
          phone: dados.data.telefone,
          personType: dados.data.tipoPessoa,
          document: somenteDigitos(dados.data.documento),
          companyName: dados.data.razaoSocial,
          passwordHash: dados.data.criarConta
            ? await hashSenhaCliente(dados.data.senha)
            : null,
        },
      });
      customerId = novo.id;

      if (dados.data.criarConta) {
        await criarSessaoCliente({ id: novo.id, name: novo.name, email: novo.email });
      }
    }
  }

  const retirada = dados.data.entrega === "retirada";

  let pedido;
  try {
    pedido = await criarPedido({
      carrinhoId: carrinho.id,
      customerId,
      comprador: {
        nome: dados.data.nome,
        email: dados.data.email.toLowerCase(),
        telefone: dados.data.telefone,
        documento: somenteDigitos(dados.data.documento),
        tipoPessoa: dados.data.tipoPessoa,
        razaoSocial: dados.data.razaoSocial,
      },
      entrega: {
        tipo: retirada ? "retirada" : "sob_orcamento",
        rotulo: retirada ? "Retirada na JB" : "Entrega — frete calculado após análise",
        // frete de equipamento grande é orçado depois; nada é cobrado aqui
        valorCents: 0,
        cep: dados.data.cep,
        logradouro: dados.data.logradouro,
        numero: dados.data.numero,
        complemento: dados.data.complemento,
        bairro: dados.data.bairro,
        cidade: dados.data.cidade,
        uf: dados.data.uf.toUpperCase(),
        referencia: dados.data.referencia,
      },
      observacao: dados.data.observacao,
    });
  } catch (erro) {
    if (erro instanceof ErroDeItemIndisponivel) {
      return {
        erro: `${erro.produto} saiu do catálogo enquanto você comprava. Remova o item do carrinho para continuar.`,
      };
    }
    if (erro instanceof ErroDeEstoque) {
      return {
        erro: `${erro.produto} acabou de sair de estoque. Ajuste o carrinho e tente de novo.`,
      };
    }
    console.error("[checkout]", erro);
    return { erro: "Não foi possível fechar o pedido. Tente novamente em instantes." };
  }

  // guarda o endereço para as próximas compras
  if (customerId && !retirada) {
    const jaTem = await prisma.customerAddress.findFirst({ where: { customerId } });
    if (!jaTem) {
      await prisma.customerAddress.create({
        data: {
          customerId,
          recipient: dados.data.nome,
          zip: dados.data.cep,
          street: dados.data.logradouro,
          number: dados.data.numero,
          complement: dados.data.complemento,
          district: dados.data.bairro,
          city: dados.data.cidade,
          state: dados.data.uf.toUpperCase(),
          reference: dados.data.referencia,
          isDefault: true,
        },
      });
    }
  }

  await abrirCobranca(pedido.id, dados.data.metodo, dados.data.parcelas, {
    token: dados.data.tokenCartao,
    bandeira: dados.data.bandeira,
  });

  // convidado precisa entrar na página do pedido sem sessão
  await liberarAcompanhamento(pedido.number);

  revalidatePath("/carrinho");
  revalidatePath("/checkout");
  revalidatePath(`/pedido/${pedido.number}`);

  redirect(`/pedido/${pedido.number}`);
}

/**
 * Abre a cobrança no provedor e registra o pagamento.
 *
 * NÃO é exportada de propósito: todo export de um arquivo "use server" vira
 * um endpoint público. Exposta, esta função deixaria qualquer um criar
 * cobrança para um pedido alheio — e, com o provedor de teste, marcar o
 * pedido como pago. Quem precisar dela de fora chama por uma ação que
 * confere autorização antes.
 */
async function abrirCobranca(
  pedidoId: string,
  metodo: PaymentMethod,
  parcelas: number,
  cartao?: { token?: string; bandeira?: string },
) {
  const pedido = await prisma.order.findUnique({ where: { id: pedidoId } });
  if (!pedido) return;

  const provedor = provedorPagamento();

  // o número de parcelas vem do formulário; o limite vem das configurações da
  // loja e do total real do pedido — nunca do que o navegador mandou
  const s = await getSettings();
  const maximoConfigurado = Math.min(12, Math.max(1, Number(s.parcelas_max) || 1));
  const permitido =
    metodo === "cartao"
      ? (calcularParcelas(pedido.totalCents, maximoConfigurado, paraCentavos(s.parcela_minima))
          ?.parcelas ?? 1)
      : 1;
  const parcelasFinais = Math.min(Math.max(1, Math.trunc(parcelas) || 1), permitido);

  const pagamento = await prisma.payment.create({
    data: {
      orderId: pedido.id,
      provider: provedor.nome,
      method: metodo,
      status: "criado",
      amountCents: pedido.totalCents,
      installments: parcelasFinais,
    },
  });

  // A chave carrega o id desta tentativa. Amarrada só ao pedido e ao método,
  // uma segunda tentativa após recusa receberia de volta a mesma cobrança
  // recusada — que é justamente o que a idempotência do provedor garante.
  const chave = `pedido:${pedido.id}:${metodo}:${pagamento.id}`;

  try {
    const resultado = await provedor.criarCobranca({
      pedidoId: pedido.id,
      pedidoNumero: pedido.number,
      valorCents: pedido.totalCents,
      metodo,
      parcelas: parcelasFinais,
      pagador: {
        nome: pedido.buyerName,
        email: pedido.buyerEmail,
        documento: pedido.buyerDocument,
        telefone: pedido.buyerPhone,
      },
      tokenCartao: cartao?.token || undefined,
      bandeira: cartao?.bandeira || undefined,
      chaveIdempotencia: chave,
    });

    await prisma.payment.update({
      where: { id: pagamento.id },
      data: {
        externalId: resultado.externalId,
        status: resultado.status,
        pixQrCode: resultado.qrCode,
        pixCopyPaste: resultado.copiaECola,
        expiresAt: resultado.expiraEm,
        cardBrand: resultado.bandeira,
        cardLast4: resultado.ultimos4,
        failReason: resultado.motivoFalha ?? "",
        approvedAt: resultado.status === "aprovado" ? new Date() : null,
      },
    });

    if (resultado.status === "aprovado") {
      await confirmarPagamento(pedido.id);
    } else if (resultado.status === "em_analise") {
      await prisma.order.update({
        where: { id: pedido.id },
        data: { status: "pagamento_em_analise" },
      });
    }
  } catch (erro) {
    console.error("[cobranca]", erro);

    /**
     * Não afirme o que não se sabe.
     *
     * A exceção pode ser recusa do provedor, mas pode ser a resposta que se
     * perdeu no caminho depois de a cobrança já existir do outro lado. Marcar
     * "recusado" convidava a pessoa a tentar de novo e pagar duas vezes.
     * `pendente` é a verdade: o estado é desconhecido até alguém conferir — o
     * webhook, ou a reconsulta em `tentarPagamentoNovamente`.
     */
    await prisma.payment.update({
      where: { id: pagamento.id },
      data: {
        status: "pendente",
        failReason:
          "A resposta do provedor não chegou. O estado desta cobrança precisa ser conferido " +
          "antes de gerar outra.",
      },
    });
  }
}

/**
 * Gera uma nova tentativa quando a anterior expirou ou foi recusada.
 *
 * A cobrança anterior não é cancelada de propósito: se a pessoa acabou de
 * pagar o Pix antigo, o webhook daquele pagamento ainda precisa valer.
 */
export async function tentarPagamentoNovamente(
  _anterior: EstadoCheckout,
  formData: FormData,
): Promise<EstadoCheckout> {
  const numero = String(formData.get("numero") ?? "")
    .trim()
    .toUpperCase();
  const metodoPedido = String(formData.get("metodo") ?? "pix");

  const pedido = numero ? await prisma.order.findUnique({ where: { number: numero } }) : null;

  // mensagem única: quem não tem acesso não descobre se o pedido existe
  if (!pedido || !(await temAcessoAoPedido(pedido))) {
    return { erro: "Pedido não encontrado." };
  }
  if (pedido.paidAt) return { erro: "Este pedido já está pago." };
  if (pedido.status === "cancelado" || pedido.status === "reembolsado") {
    return { erro: "Este pedido foi encerrado e não aceita um novo pagamento." };
  }

  const provedor = provedorPagamento();
  const metodo = provedor.metodos.find((m) => m === metodoPedido);
  if (!metodo) return { erro: "Esta forma de pagamento não está disponível.", campo: "metodo" };

  /**
   * Uma cobrança aberta por vez.
   *
   * Sem isto, cada clique em "tentar de novo" criava mais um Pix do valor
   * cheio. Com dois QR vivos ao mesmo tempo, a pessoa podia pagar os dois — e
   * só um seria reconhecido como o pagamento do pedido.
   *
   * Antes de barrar, o estado é reconferido no provedor: uma cobrança que
   * ficou `pendente` porque a resposta se perdeu pode já estar aprovada, ou já
   * ter morrido lá. Quem manda é o provedor, nunca o nosso registro.
   */
  const aberta = await prisma.payment.findFirst({
    where: { orderId: pedido.id, status: { in: ["criado", "pendente", "em_analise"] } },
    orderBy: { createdAt: "desc" },
  });

  if (aberta) {
    let status = aberta.status;

    if (aberta.externalId) {
      const atual = await provedor.consultar(aberta.externalId).catch(() => null);
      if (atual && atual.status !== status) {
        status = atual.status;
        await prisma.payment.update({ where: { id: aberta.id }, data: { status } });
        if (status === "aprovado") {
          await confirmarPagamento(pedido.id);
          revalidatePath(`/pedido/${pedido.number}`);
          redirect(`/pedido/${pedido.number}`);
        }
      }
    }

    const expirou = aberta.expiresAt !== null && aberta.expiresAt <= new Date();
    const aindaVale = ["criado", "pendente", "em_analise"].includes(status) && !expirou;

    if (aindaVale) {
      return {
        erro:
          "Já existe uma cobrança aberta para este pedido. Use a que está nesta página, " +
          "ou aguarde ela expirar antes de gerar outra.",
      };
    }

    if (expirou && (status === "criado" || status === "pendente")) {
      await prisma.payment.update({ where: { id: aberta.id }, data: { status: "expirado" } });
    }
  }

  await abrirCobranca(pedido.id, metodo, 1);
  revalidatePath(`/pedido/${pedido.number}`);
  redirect(`/pedido/${pedido.number}`);
}
