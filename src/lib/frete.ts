import "server-only";

import type { Prisma, ShippingKind } from "@prisma/client";

import { somenteDigitos } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Cálculo do frete.
 *
 * A JB cadastra em /admin/frete um `ShippingProfile` (a regra) com N
 * `ShippingZone` (faixa de CEP com preço e prazo fixos). Até aqui nada lia
 * esses dados: o checkout mandava `sob_orcamento` para todo mundo e a loja
 * vendia com frete a combinar mesmo tendo tabela cadastrada.
 *
 * Três decisões sustentam este arquivo:
 *
 * 1. `calcularFrete` é pura — recebe os perfis já lidos e devolve o valor.
 *    É ela que o teste exercita, e é ela que o servidor chama. Não existe uma
 *    segunda conta em lugar nenhum.
 *
 * 2. Na dúvida, `sob_orcamento`. CEP fora de toda faixa, produto sem perfil e
 *    sem padrão, perfil marcado como "sob orçamento": tudo cai no
 *    comportamento de hoje. Errar para menos aqui é a JB pagar frete que não
 *    cobrou; errar para "orçar depois" é só um telefonema.
 *
 * 3. O CEP é comparado como texto de 8 dígitos, exatamente como
 *    `salvarZonaFrete` grava (início completado com zeros, fim com noves).
 *    Comparar número perderia o zero à esquerda de todo CEP do Sudeste.
 */

/* ------------------------------------------------------------------ tipos */

export type FaixaDeFrete = {
  id: string;
  nome: string;
  /** 8 dígitos, sem máscara — como o admin grava. */
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
  /** a partir deste subtotal o frete deste perfil zera; `null` = nunca */
  gratisAcimaCents: number | null;
  faixas: FaixaDeFrete[];
};

/** Um item do carrinho, do ponto de vista do frete. */
export type ItemDoFrete = {
  /** perfil próprio do produto; `null` cai no perfil padrão da loja */
  perfil: PerfilDeFrete | null;
};

export type MotivoDoFrete =
  | "faixa" // casou com uma faixa de CEP e tem preço
  | "gratis" // acima do mínimo, ou perfil do tipo grátis
  | "retirada" // o próprio perfil só admite retirada
  | "sem_frete" // não há nada físico para transportar
  | "cep_invalido" // CEP ausente ou com menos de 8 dígitos
  | "sem_faixa"; // CEP fora de toda faixa, ou perfil sem regra de preço

export type Frete = {
  tipo: ShippingKind;
  rotulo: string;
  valorCents: number;
  prazoDias: number | null;
  motivo: MotivoDoFrete;
};

/**
 * O recorte que a tela usa.
 *
 * A loja não precisa do enum do banco nem do motivo — precisa saber o que
 * escrever, quanto somar e se o valor ainda vai ser orçado. Manter este tipo
 * separado deixa o componente cliente importar só um `type`.
 */
export type FreteExibido = {
  rotulo: string;
  valorCents: number;
  prazoDias: number | null;
  /** `true` quando a JB ainda vai orçar — o valor NÃO entra no total. */
  orcadoDepois: boolean;
};

/* --------------------------------------------------------------- rótulos */

/** Mesmo texto que o checkout gravava antes de existir cálculo. */
export const ROTULO_SOB_ORCAMENTO = "Entrega — frete calculado após análise";
export const ROTULO_RETIRADA = "Retirada na JB";
export const ROTULO_GRATIS = "Entrega — frete grátis";
export const ROTULO_SEM_FRETE = "Entrega — sem custo de transporte";

/* ------------------------------------------------------------- utilitários */

/** 8 dígitos ou `null`. Nada de "quase um CEP". */
export function normalizarCep(cep: string | null | undefined): string | null {
  const digitos = somenteDigitos(cep ?? "");
  return digitos.length === 8 ? digitos : null;
}

/**
 * Limites da faixa em 8 dígitos.
 *
 * O admin exige no mínimo 5 dígitos e completa: início com zeros, fim com
 * noves. Faixa gravada fora desse formato (importação antiga, edição direta no
 * banco) é ignorada — deixá-la passar como "00000000–99999999" faria uma
 * linha quebrada cobrir o Brasil inteiro.
 */
function limitesDaFaixa(faixa: FaixaDeFrete): { inicio: string; fim: string } | null {
  const inicio = somenteDigitos(faixa.cepInicio);
  const fim = somenteDigitos(faixa.cepFim);
  if (inicio.length < 5 || fim.length < 5) return null;

  const de = inicio.slice(0, 8).padEnd(8, "0");
  const ate = fim.slice(0, 8).padEnd(8, "9");
  return ate < de ? null : { inicio: de, fim: ate };
}

/**
 * Faixa que atende o CEP dentro de um perfil.
 *
 * Faixas podem se sobrepor — o cadastro não impede. Quando isso acontece vence
 * a de menor `ordem`, que é a coluna com que a JB ordena a tabela; empatou,
 * vence a mais barata, para nunca cobrar a mais por acidente de cadastro.
 */
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

/** Retirada não passa por faixa nenhuma: é sempre zero. */
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

/* ------------------------------------------------------------- o cálculo */

type Contribuicao = {
  tipo: ShippingKind;
  rotulo: string;
  valorCents: number;
  prazoDias: number | null;
};

/**
 * Quanto custa entregar este carrinho neste CEP.
 *
 * `subtotalCents` é o que a pessoa paga pelos itens (já sem o cupom): é sobre
 * esse valor que o "frete grátis acima de X" decide. Usar o subtotal cheio
 * daria frete grátis a quem, com o desconto, não chegou ao mínimo.
 *
 * Com perfis diferentes no mesmo carrinho, é uma entrega só: vale o perfil
 * mais caro e o prazo mais longo. Somar os perfis cobraria dois fretes de
 * quem comprou duas coisas que vão no mesmo caminhão.
 */
export function calcularFrete(entrada: {
  cep: string;
  subtotalCents: number;
  produtos: readonly ItemDoFrete[];
  /** perfil marcado como padrão em /admin/frete, para quem não tem o seu */
  perfilPadrao?: PerfilDeFrete | null;
}): Frete {
  const cep = normalizarCep(entrada.cep);
  const perfilPadrao = entrada.perfilPadrao ?? null;

  // o mesmo perfil em três produtos é um perfil só: cobrar por item seria
  // cobrar três fretes da mesma tabela
  const efetivos = new Map<string, PerfilDeFrete>();
  let semPerfil = false;

  for (const item of entrada.produtos) {
    const perfil = item.perfil ?? perfilPadrao;
    if (!perfil) {
      semPerfil = true;
      continue;
    }
    // `nao_aplicavel` é o produto que não viaja (licença, serviço embutido):
    // não exige frete e não impede o cálculo dos outros
    if (perfil.tipo === "nao_aplicavel") continue;
    efetivos.set(perfil.id, perfil);
  }

  // produto sem perfil e sem padrão: ninguém sabe quanto custa levar isso
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
      // grátis é grátis em qualquer lugar; a faixa entra só pelo prazo
      const faixa = cep ? faixaParaCep(perfil, cep) : null;
      contribuicoes.push({
        tipo: "gratis",
        rotulo: ROTULO_GRATIS,
        valorCents: 0,
        prazoDias: faixa?.prazoDias ?? null,
      });
      continue;
    }

    // entrega_local e transportadora precisam da faixa para ter preço
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

  // todo item do carrinho é de perfil "só retirada"
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

/* --------------------------------------------------------- leitura do banco */

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

/**
 * Lê os perfis do banco e calcula. É a porta que o servidor usa.
 *
 * Só entram produtos: serviço não tem perfil de frete, e carrinho sem produto
 * nenhum não tem o que transportar.
 */
export async function calcularFreteDePedido(entrada: {
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
    /**
     * `salvarPerfilFrete` garante um padrão só por transação, mas o banco não
     * tem índice único para isso. `orderBy` fixo faz duas leituras seguidas
     * escolherem o mesmo perfil, em vez de alternarem conforme o plano do
     * Postgres — o cliente veria o frete mudar sem mexer em nada.
     */
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
