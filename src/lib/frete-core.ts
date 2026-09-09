import "server-only";

import { cookies } from "next/headers";
import type { Prisma, ShippingKind } from "@prisma/client";

import { lerCarrinho } from "@/lib/carrinho";
import { somenteDigitos } from "@/lib/format";
import {
  cotacoesMelhorEnvio,
  rotuloDaOpcaoMelhorEnvio,
  statusMelhorEnvio,
  type ItemCotacaoMelhorEnvio,
} from "@/lib/melhor-envio";
import { prisma } from "@/lib/prisma";
import { COOKIE_ESCOLHA_FRETE, lerEscolhaFrete } from "@/lib/selecao-frete";

export type FaixaDeFrete = {
  id: string;
  nome: string;
  cepInicio: string;
  cepFim: string;
  valorCents: number;
  prazoDias: number | null;
  ordem: number;
};

export type PerfilDeFrete = {
  id: string;
  nome: string;
  tipo: ShippingKind;
  gratisAcimaCents: number | null;
  faixas: FaixaDeFrete[];
};

export type ItemDoFrete = {
  perfil: PerfilDeFrete | null;
};

export type MotivoDoFrete =
  | "faixa"
  | "gratis"
  | "retirada"
  | "sem_frete"
  | "cep_invalido"
  | "sem_faixa";

export type Frete = {
  tipo: ShippingKind;
  rotulo: string;
  valorCents: number;
  prazoDias: number | null;
  motivo: MotivoDoFrete;
  melhorEnvio?: {
    companyId: number;
    serviceId: number;
    companyName: string;
    serviceName: string;
    packages: import("@/lib/logistica-meta").PacoteMelhorEnvio[];
  };
};

export type FreteExibido = {
  rotulo: string;
  valorCents: number;
  prazoDias: number | null;
  orcadoDepois: boolean;
};

export class ErroFreteSelecionado extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroFreteSelecionado";
  }
}

export const ROTULO_SOB_ORCAMENTO = "Entrega — frete calculado após análise";
export const ROTULO_RETIRADA = "Retirada na JB";
export const ROTULO_GRATIS = "Entrega — frete grátis";
export const ROTULO_SEM_FRETE = "Entrega — sem custo de transporte";

export function normalizarCep(cep: string | null | undefined): string | null {
  const digitos = somenteDigitos(cep ?? "");
  return digitos.length === 8 ? digitos : null;
}

function limitesDaFaixa(faixa: FaixaDeFrete): { inicio: string; fim: string } | null {
  const inicio = somenteDigitos(faixa.cepInicio);
  const fim = somenteDigitos(faixa.cepFim);
  if (inicio.length < 5 || fim.length < 5) return null;

  const de = inicio.slice(0, 8).padEnd(8, "0");
  const ate = fim.slice(0, 8).padEnd(8, "9");
  return ate < de ? null : { inicio: de, fim: ate };
}

export function faixaParaCep(perfil: PerfilDeFrete, cep: string): FaixaDeFrete | null {
  const candidatas = perfil.faixas.filter((faixa) => {
    const limites = limitesDaFaixa(faixa);
    return limites !== null && cep >= limites.inicio && cep <= limites.fim;
  });

  return candidatas.reduce<FaixaDeFrete | null>((melhor, faixa) => {
    if (!melhor) return faixa;
    if (faixa.ordem !== melhor.ordem) return faixa.ordem < melhor.ordem ? faixa : melhor;
    if (faixa.valorCents !== melhor.valorCents) {
      return faixa.valorCents < melhor.valorCents ? faixa : melhor;
    }
    return faixa.id.localeCompare(melhor.id) < 0 ? faixa : melhor;
  }, null);
}

function sobOrcamento(motivo: MotivoDoFrete): Frete {
  return {
    tipo: "sob_orcamento",
    rotulo: ROTULO_SOB_ORCAMENTO,
    valorCents: 0,
    prazoDias: null,
    motivo,
  };
}

export function freteDeRetirada(): Frete {
  return {
    tipo: "retirada",
    rotulo: ROTULO_RETIRADA,
    valorCents: 0,
    prazoDias: null,
    motivo: "retirada",
  };
}

export function paraExibicao(frete: Frete): FreteExibido {
  return {
    rotulo: frete.rotulo,
    valorCents: frete.valorCents,
    prazoDias: frete.prazoDias,
    orcadoDepois: frete.tipo === "sob_orcamento",
  };
}

type Contribuicao = {
  tipo: ShippingKind;
  rotulo: string;
  valorCents: number;
  prazoDias: number | null;
};

/** Regra própria da JB, pura e sem rede. */
export function calcularFrete(entrada: {
  cep: string;
  subtotalCents: number;
  produtos: readonly ItemDoFrete[];
  perfilPadrao?: PerfilDeFrete | null;
}): Frete {
  const cep = normalizarCep(entrada.cep);
  const perfilPadrao = entrada.perfilPadrao ?? null;
  const efetivos = new Map<string, PerfilDeFrete>();
  let semPerfil = false;

  for (const item of entrada.produtos) {
    const perfil = item.perfil ?? perfilPadrao;
    if (!perfil) {
      semPerfil = true;
      continue;
    }
    if (perfil.tipo === "nao_aplicavel") continue;
    efetivos.set(perfil.id, perfil);
  }

  if (semPerfil) return sobOrcamento("sem_faixa");

  if (efetivos.size === 0) {
    return {
      tipo: "nao_aplicavel",
      rotulo: ROTULO_SEM_FRETE,
      valorCents: 0,
      prazoDias: null,
      motivo: "sem_frete",
    };
  }

  const contribuicoes: Contribuicao[] = [];

  for (const perfil of efetivos.values()) {
    if (perfil.tipo === "retirada") {
      contribuicoes.push({
        tipo: "retirada",
        rotulo: ROTULO_RETIRADA,
        valorCents: 0,
        prazoDias: null,
      });
      continue;
    }

    if (perfil.tipo === "sob_orcamento") return sobOrcamento("sem_faixa");

    if (perfil.tipo === "gratis") {
      const faixa = cep ? faixaParaCep(perfil, cep) : null;
      contribuicoes.push({
        tipo: "gratis",
        rotulo: ROTULO_GRATIS,
        valorCents: 0,
        prazoDias: faixa?.prazoDias ?? null,
      });
      continue;
    }

    if (!cep) return sobOrcamento("cep_invalido");
    const faixa = faixaParaCep(perfil, cep);
    if (!faixa) return sobOrcamento("sem_faixa");

    const minimo = perfil.gratisAcimaCents;
    const gratis = minimo !== null && minimo >= 0 && entrada.subtotalCents >= minimo;

    contribuicoes.push({
      tipo: gratis ? "gratis" : perfil.tipo,
      rotulo: gratis ? ROTULO_GRATIS : `Entrega — ${faixa.nome}`,
      valorCents: gratis ? 0 : Math.max(0, Math.trunc(faixa.valorCents)),
      prazoDias: faixa.prazoDias,
    });
  }

  const cobrancas = contribuicoes.filter((c) => c.tipo !== "retirada");
  if (cobrancas.length === 0) return freteDeRetirada();

  const dominante = cobrancas.reduce((maior, atual) =>
    atual.valorCents > maior.valorCents ? atual : maior,
  );

  const prazoDias = cobrancas.reduce<number | null>((maior, atual) => {
    if (atual.prazoDias === null) return maior;
    return maior === null ? atual.prazoDias : Math.max(maior, atual.prazoDias);
  }, null);

  if (dominante.valorCents === 0) {
    return {
      tipo: "gratis",
      rotulo: ROTULO_GRATIS,
      valorCents: 0,
      prazoDias,
      motivo: "gratis",
    };
  }

  return {
    tipo: dominante.tipo,
    rotulo: dominante.rotulo,
    valorCents: dominante.valorCents,
    prazoDias,
    motivo: "faixa",
  };
}

const SELECAO_PERFIL = {
  id: true,
  name: true,
  kind: true,
  freeAboveCents: true,
  zones: {
    select: {
      id: true,
      name: true,
      zipStart: true,
      zipEnd: true,
      priceCents: true,
      etaDays: true,
      order: true,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ShippingProfileSelect;

type PerfilBruto = Prisma.ShippingProfileGetPayload<{ select: typeof SELECAO_PERFIL }>;

function paraPerfil(bruto: PerfilBruto | null): PerfilDeFrete | null {
  if (!bruto) return null;
  return {
    id: bruto.id,
    nome: bruto.name,
    tipo: bruto.kind,
    gratisAcimaCents: bruto.freeAboveCents,
    faixas: bruto.zones.map((zona) => ({
      id: zona.id,
      nome: zona.name,
      cepInicio: zona.zipStart,
      cepFim: zona.zipEnd,
      valorCents: zona.priceCents,
      prazoDias: zona.etaDays,
      ordem: zona.order,
    })),
  };
}

/** Calcula só pela tabela interna; usado também como fallback do agregador. */
export async function calcularFreteTabelaDePedido(entrada: {
  cep: string;
  subtotalCents: number;
  produtoIds: readonly string[];
}): Promise<Frete> {
  const ids = [...new Set(entrada.produtoIds)];
  if (ids.length === 0) {
    return calcularFrete({ cep: entrada.cep, subtotalCents: entrada.subtotalCents, produtos: [] });
  }

  const [produtos, padrao] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, shippingProfile: { select: SELECAO_PERFIL } },
    }),
    prisma.shippingProfile.findFirst({
      where: { isDefault: true },
      select: SELECAO_PERFIL,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return calcularFrete({
    cep: entrada.cep,
    subtotalCents: entrada.subtotalCents,
    produtos: produtos.map((produto) => ({ perfil: paraPerfil(produto.shippingProfile) })),
    perfilPadrao: paraPerfil(padrao),
  });
}

async function itensDoCarrinhoParaMelhorEnvio(): Promise<ItemCotacaoMelhorEnvio[]> {
  const carrinho = await lerCarrinho();
  if (!carrinho) return [];

  return carrinho.items.flatMap((item) => {
    if (item.parentId || !item.productId || item.product?.status !== "active") return [];
    const produto = item.product;
    return [
      {
        id: produto.id,
        name: produto.name,
        quantity: item.quantity,
        unitPriceCents: produto.priceCents,
        weightGrams: produto.weightGrams,
        widthMm: produto.widthMm,
        heightMm: produto.heightMm,
        depthMm: produto.depthMm,
      },
    ];
  });
}

function paraFreteMelhorEnvio(opcao: Awaited<ReturnType<typeof cotacoesMelhorEnvio>>[number]): Frete {
  return {
    tipo: "transportadora",
    rotulo: rotuloDaOpcaoMelhorEnvio(opcao),
    valorCents: opcao.priceCents,
    prazoDias: opcao.deliveryDays,
    motivo: "faixa",
    melhorEnvio: {
      companyId: opcao.companyId,
      serviceId: opcao.serviceId,
      companyName: opcao.companyName,
      serviceName: opcao.serviceName,
      packages: opcao.packages,
    },
  };
}

/**
 * Porta única usada pelo checkout.
 *
 * Se o comprador escolheu explicitamente uma modalidade do Melhor Envio, ela
 * NÃO pode virar tabela própria em silêncio. O servidor recota a MESMA opção;
 * falha, indisponibilidade ou mudança de serviço interrompem o fechamento para
 * o cliente escolher novamente. O fallback local só vale quando não existe
 * escolha externa explícita.
 */
export async function calcularFreteDePedido(entrada: {
  cep: string;
  subtotalCents: number;
  produtoIds: readonly string[];
}): Promise<Frete> {
  const jar = await cookies();
  const escolha = lerEscolhaFrete(jar.get(COOKIE_ESCOLHA_FRETE)?.value);
  const status = statusMelhorEnvio();

  if (escolha?.kind === "melhor_envio") {
    if (!status.quoteReady) {
      throw new ErroFreteSelecionado(
        "Não conseguimos confirmar a transportadora escolhida agora. Volte à etapa de entrega e escolha outra modalidade.",
      );
    }

    try {
      const itens = await itensDoCarrinhoParaMelhorEnvio();
      const opcoes = await cotacoesMelhorEnvio({ postalCode: entrada.cep, items: itens });
      const opcao = opcoes.find((item) => item.serviceId === escolha.serviceId);
      if (!opcao) {
        throw new ErroFreteSelecionado(
          "A transportadora escolhida não atende mais este carrinho/CEP. Volte à etapa de entrega e escolha outra modalidade.",
        );
      }
      return paraFreteMelhorEnvio(opcao);
    } catch (erro) {
      if (erro instanceof ErroFreteSelecionado) throw erro;
      console.error("[frete/melhor-envio] recotação da escolha falhou", erro);
      throw new ErroFreteSelecionado(
        "Não foi possível reconfirmar o preço do frete escolhido. Nada será cobrado; volte à etapa de entrega e tente outra modalidade.",
      );
    }
  }

  if (escolha?.kind === "tabela" || escolha?.kind === "retirada") {
    return calcularFreteTabelaDePedido(entrada);
  }

  // Chamadas internas antigas, sem cookie de escolha, continuam resilientes:
  // tentam a melhor opção externa e caem na tabela local se a dependência cair.
  if (status.quoteReady) {
    try {
      const itens = await itensDoCarrinhoParaMelhorEnvio();
      if (itens.length > 0) {
        const opcoes = await cotacoesMelhorEnvio({ postalCode: entrada.cep, items: itens });
        if (opcoes[0]) return paraFreteMelhorEnvio(opcoes[0]);
      }
    } catch (erro) {
      console.error("[frete/melhor-envio] fallback para tabela", erro);
    }
  }

  return calcularFreteTabelaDePedido(entrada);
}
