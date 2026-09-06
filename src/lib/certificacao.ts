import "server-only";

import crypto from "node:crypto";

import type { CertificationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/* ============================================================================
   Seminovo JB Certificado

   Programa próprio de inspeção da JB. Nada aqui insinua certificação
   independente ou regulatória — o selo diz de quem é, e a página pública de
   verificação existe para que a afirmação seja conferível por quem quiser.

   As regras que este módulo existe para garantir:

   1. **Pertence à unidade, não ao produto.** Duas autoclaves do mesmo modelo
      têm ciclos e desgaste diferentes. Um selo no SKU afirmaria sobre a
      segunda o que só foi verificado na primeira.

   2. **Item não aplicável não conta como aprovado.** Somar os dois é o jeito
      mais fácil de transformar "22 de 34" em "34 de 34" sem mentir em nenhuma
      linha isolada.

   3. **A conta é do fechamento, não do momento da leitura.** `itemsTotal` e
      `itemsApproved` são carimbados quando a inspeção fecha. Recontar na hora
      de exibir daria outro número se o checklist mudasse de versão — e a
      pessoa que comprou viu o número antigo.

   4. **Publicado não se reescreve em silêncio.** Alterar certificação
      publicada guarda a versão anterior. Alguém pode ter decidido a compra
      pelo que estava escrito antes.

   5. **Selo só com regra atendida.** `podePublicar` é a única porta, e ela
      recusa inspeção sem técnico, sem item aprovado ou com item pendente.
   ============================================================================ */

export const VERSAO_CHECKLIST = "v1";

/** Resultados possíveis de um item do checklist. Espelha `InventoryCheckItem.result`. */
export const RESULTADOS = ["verificado", "substituido", "reparado", "nao_aplicavel"] as const;
export type ResultadoDeItem = (typeof RESULTADOS)[number];

/** Os que contam como verificação aprovada. `nao_aplicavel` fica de fora. */
const APROVADOS: readonly string[] = ["verificado", "substituido", "reparado"];

export type ContagemDoChecklist = {
  total: number;
  aprovados: number;
  naoAplicaveis: number;
  pendentes: number;
};

/**
 * Conta os itens de um checklist.
 *
 * `pendentes` é o que sobra: resultado que não é aprovado nem "não aplicável".
 * Uma inspeção com pendente não fecha — e é essa contagem que impede publicar
 * um checklist pela metade.
 */
export function contarChecklist(
  itens: { result: string }[],
): ContagemDoChecklist {
  let aprovados = 0;
  let naoAplicaveis = 0;

  for (const item of itens) {
    if (APROVADOS.includes(item.result)) aprovados += 1;
    else if (item.result === "nao_aplicavel") naoAplicaveis += 1;
  }

  return {
    total: itens.length,
    aprovados,
    naoAplicaveis,
    pendentes: itens.length - aprovados - naoAplicaveis,
  };
}

export type ImpedimentoDePublicacao = { motivo: string };

/**
 * A inspeção pode virar selo público?
 *
 * Devolve `null` quando pode. Cada recusa tem motivo em português porque ela
 * vai para a tela de quem tentou publicar — "não foi possível publicar" sem
 * dizer o quê obriga a pessoa a adivinhar.
 */
export function podePublicar(entrada: {
  contagem: ContagemDoChecklist;
  temTecnico: boolean;
  status: CertificationStatus;
}): ImpedimentoDePublicacao | null {
  if (entrada.status === "revogada") {
    return {
      motivo:
        "Esta certificação foi revogada. Para publicar de novo, refaça a inspeção — o " +
        "histórico da revogação continua registrado.",
    };
  }

  if (!entrada.temTecnico) {
    return {
      motivo:
        "Informe o técnico responsável pela inspeção. Um laudo sem responsável não é laudo.",
    };
  }

  if (entrada.contagem.total === 0) {
    return { motivo: "O checklist está vazio. Não há o que certificar." };
  }

  if (entrada.contagem.pendentes > 0) {
    return {
      motivo:
        `Há ${entrada.contagem.pendentes} item(ns) sem resultado. Conclua o checklist ` +
        "antes de publicar.",
    };
  }

  if (entrada.contagem.aprovados === 0) {
    return {
      motivo:
        "Nenhum item foi aprovado — todos ficaram como não aplicáveis. Não há verificação " +
        "que sustente o selo.",
    };
  }

  return null;
}

/**
 * Como a verificação deve ser dita em texto.
 *
 * "22 de 34 itens verificados", nunca "34/34" quando 12 eram não aplicáveis.
 * A frase carrega os não aplicáveis à parte, porque escondê-los é o que
 * transforma uma inspeção parcial numa completa aos olhos de quem lê.
 */
export function frasedaVerificacao(contagem: ContagemDoChecklist): string {
  const base = `${contagem.aprovados} de ${contagem.total} ${
    contagem.total === 1 ? "item verificado" : "itens verificados"
  }`;

  if (contagem.naoAplicaveis === 0) return base;

  return `${base} · ${contagem.naoAplicaveis} não ${
    contagem.naoAplicaveis === 1 ? "aplicável" : "aplicáveis"
  } a este equipamento`;
}

/**
 * Código público da página de verificação.
 *
 * Aleatório e opaco. Não é o id da unidade nem o número de série: um
 * verificador previsível permitiria varrer o catálogo e descobrir o que a JB
 * tem em estoque, e um verificador que fosse o serial exporia o serial de
 * quem comprou.
 */
export function gerarCodigoPublico() {
  return crypto.randomBytes(9).toString("base64url").toUpperCase();
}

/** O selo pode ser exibido ao público? Só um estado responde que sim. */
export function seloVisivel(status: CertificationStatus) {
  return status === "publicada";
}

/* --------------------------------------------------------------- consultas */

/** Certificação publicada de uma unidade, ou `null`. Para a página do produto. */
export async function certificacaoPublicada(unitId: string) {
  return prisma.unitCertification.findFirst({
    where: { unitId, status: "publicada" },
    select: {
      publicCode: true,
      checklistVersion: true,
      itemsTotal: true,
      itemsApproved: true,
      itemsNotApplicable: true,
      summary: true,
      inspectedAt: true,
      publishedAt: true,
      technician: { select: { name: true } },
    },
  });
}

/**
 * A certificação por código público — publicada OU revogada.
 *
 * A revogada é devolvida de propósito. Um link que passa a responder 404
 * depois de a certificação cair deixa quem guardou o endereço sem resposta; a
 * página precisa poder dizer, com todas as letras, que aquele selo não vale
 * mais e por quê.
 */
export async function certificacaoPorCodigo(codigo: string) {
  return prisma.unitCertification.findFirst({
    where: {
      publicCode: codigo,
      status: { in: ["publicada", "revogada"] },
    },
    select: {
      status: true,
      publicCode: true,
      checklistVersion: true,
      itemsTotal: true,
      itemsApproved: true,
      itemsNotApplicable: true,
      summary: true,
      revokedReason: true,
      inspectedAt: true,
      publishedAt: true,
      revokedAt: true,
      technician: { select: { name: true } },
      unit: {
        select: {
          status: true,
          manufactureYear: true,
          usageCycles: true,
          conditionNotes: true,
          warrantyMonths: true,
          /* O SERIAL NÃO ENTRA aqui. Ele identifica o aparelho de quem
             comprou, e a página é pública. O que a verificação precisa provar
             é que aquele código corresponde a uma inspeção real — não qual é
             o número gravado na etiqueta. */
          product: {
            select: { name: true, slug: true, status: true, condition: true },
          },
          checklist: {
            orderBy: { order: "asc" },
            select: { label: true, result: true, note: true },
          },
        },
      },
    },
  });
}
