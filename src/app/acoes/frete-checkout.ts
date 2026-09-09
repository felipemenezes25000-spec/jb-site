"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { calcularTotais, lerCarrinho } from "@/lib/carrinho";
import { calcularFreteTabelaDePedido } from "@/lib/frete";
import { somenteDigitos } from "@/lib/format";
import { chaveDeIp, checarLimite, segundosDeEspera } from "@/lib/limite";
import {
  cotacoesMelhorEnvio,
  statusMelhorEnvio,
  type ItemCotacaoMelhorEnvio,
} from "@/lib/melhor-envio";
import { ipDoPedido } from "@/lib/seguranca";
import {
  COOKIE_ESCOLHA_FRETE,
  serializarEscolhaFrete,
  type EscolhaFrete,
} from "@/lib/selecao-frete";
import { getSettings, ligado } from "@/lib/settings";

export type OpcaoEntregaCheckout = {
  key: string;
  provider: "melhor_envio" | "tabela";
  companyName: string;
  serviceName: string;
  priceCents: number;
  deliveryDays: number | null;
  quotedLater: boolean;
};

export type EstadoOpcoesEntrega = {
  erro?: string;
  cep?: string;
  opcoes?: OpcaoEntregaCheckout[];
};

async function itensDoCarrinho() {
  const carrinho = await lerCarrinho();
  if (!carrinho) return { carrinho: null, itens: [] as ItemCotacaoMelhorEnvio[], produtoIds: [] as string[] };

  const itens: ItemCotacaoMelhorEnvio[] = [];
  const produtoIds: string[] = [];
  for (const item of carrinho.items) {
    if (item.parentId || !item.productId || item.product?.status !== "active") continue;
    produtoIds.push(item.productId);
    itens.push({
      id: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      unitPriceCents: item.product.priceCents,
      weightGrams: item.product.weightGrams,
      widthMm: item.product.widthMm,
      heightMm: item.product.heightMm,
      depthMm: item.product.depthMm,
    });
  }
  return { carrinho, itens, produtoIds };
}

async function montarOpcoes(cep: string): Promise<OpcaoEntregaCheckout[]> {
  const { carrinho, itens, produtoIds } = await itensDoCarrinho();
  if (!carrinho || carrinho.items.length === 0) return [];

  const totais = calcularTotais(carrinho);
  const opcoes: OpcaoEntregaCheckout[] = [];

  if (statusMelhorEnvio().quoteReady && itens.length > 0) {
    try {
      const externas = await cotacoesMelhorEnvio({ postalCode: cep, items: itens });
      opcoes.push(
        ...externas.map((item) => ({
          key: item.key,
          provider: "melhor_envio" as const,
          companyName: item.companyName,
          serviceName: item.serviceName,
          priceCents: item.priceCents,
          deliveryDays: item.deliveryDays,
          quotedLater: false,
        })),
      );
    } catch (erro) {
      console.error("[escolher-entrega] Melhor Envio indisponível", erro);
    }
  }

  const interno = await calcularFreteTabelaDePedido({
    cep,
    subtotalCents: Math.max(0, totais.subtotalCents - totais.descontoCents),
    produtoIds,
  });

  // A tabela própria continua disponível como contingência e também cobre
  // entrega local que não passa por transportadora.
  if (interno.tipo !== "nao_aplicavel" && interno.tipo !== "retirada") {
    opcoes.push({
      key: "tabela",
      provider: "tabela",
      companyName: "JB Soluções Odontológicas",
      serviceName: interno.rotulo,
      priceCents: interno.valorCents,
      deliveryDays: interno.prazoDias,
      quotedLater: interno.tipo === "sob_orcamento",
    });
  }

  return opcoes.sort((a, b) => {
    if (a.quotedLater !== b.quotedLater) return a.quotedLater ? 1 : -1;
    return a.priceCents - b.priceCents || (a.deliveryDays ?? 999) - (b.deliveryDays ?? 999);
  });
}

export async function consultarOpcoesEntrega(
  _anterior: EstadoOpcoesEntrega,
  formData: FormData,
): Promise<EstadoOpcoesEntrega> {
  const cep = somenteDigitos(String(formData.get("cep") ?? ""));
  if (cep.length !== 8) return { erro: "Informe um CEP com 8 dígitos." };

  const { ok, esperaMs } = checarLimite(
    chaveDeIp(ipDoPedido(await headers()), "/escolher-entrega"),
    { limite: 30, janelaMs: 60_000 },
  );
  if (!ok) {
    return { erro: `Muitas cotações seguidas. Tente novamente em ${segundosDeEspera(esperaMs)}s.` };
  }

  const { carrinho } = await itensDoCarrinho();
  if (!carrinho || carrinho.items.length === 0) return { erro: "Seu carrinho está vazio." };

  const opcoes = await montarOpcoes(cep);
  if (opcoes.length === 0) {
    return {
      cep,
      erro:
        "Não encontramos uma modalidade automática para este CEP. Confira peso e dimensões dos produtos ou use retirada.",
    };
  }
  return { cep, opcoes };
}

function salvarCookie(escolha: EscolhaFrete) {
  return cookies().then((jar) =>
    jar.set(COOKIE_ESCOLHA_FRETE, serializarEscolhaFrete(escolha), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 48,
    }),
  );
}

export async function escolherEntrega(formData: FormData) {
  const escolha = String(formData.get("escolha") ?? "").trim();
  const cep = somenteDigitos(String(formData.get("cep") ?? ""));

  if (escolha === "retirada") {
    const s = await getSettings();
    if (!ligado(s.retirada_disponivel)) throw new Error("Retirada não está disponível.");
    await salvarCookie({ kind: "retirada" });
    redirect("/checkout");
  }

  if (cep.length !== 8) throw new Error("CEP inválido.");
  const opcoes = await montarOpcoes(cep);

  if (escolha === "tabela") {
    if (!opcoes.some((item) => item.key === "tabela")) throw new Error("Esta entrega não está mais disponível.");
    await salvarCookie({ kind: "tabela" });
    redirect("/checkout");
  }

  const achou = escolha.match(/^me:(\d+)$/);
  const serviceId = achou ? Number(achou[1]) : 0;
  const valida = opcoes.find(
    (item) => item.provider === "melhor_envio" && item.key === `me:${serviceId}`,
  );
  if (!valida) throw new Error("A modalidade escolhida não está mais disponível para este CEP.");

  await salvarCookie({ kind: "melhor_envio", serviceId });
  redirect("/checkout");
}
