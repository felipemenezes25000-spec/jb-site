"use server";

import { z } from "zod";

import { normalizarCep, paraExibicao } from "@/lib/frete";
import { calcularFreteDaPdp } from "@/lib/frete-produto";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";

/* ============================================================================
   Estimativa de entrega na página do equipamento

   A pergunta que fazia a pessoa sair da página e não voltar era "chega aqui, e
   quando?". Ela só era respondida no checkout — depois do cadastro, depois do
   carrinho. Agora é respondida onde é feita.

   A PDP não usa o carrinho como fonte da cotação. Com o Melhor Envio ativo,
   `calcularFreteDaPdp` envia exatamente UMA unidade do produto aberto, com o
   peso e as dimensões cadastrados nele. Isso evita dois erros sutis: carrinho
   vazio cair sempre na tabela local e carrinho com outro produto cotar o item
   errado. Se a transportadora estiver indisponível ou o cadastro físico não
   permitir cotação, a tabela JB continua como fallback honesto.

   O subtotal usado é o do próprio equipamento, uma unidade. É o que decide
   "frete grátis acima de X" — e é a leitura correta de quem está olhando um
   equipamento só. Somar o carrinho aqui mostraria frete grátis para quem, ao
   comprar só este item, pagaria frete.
   ============================================================================ */

export type EstimativaDeEntrega =
  | { ok: false; erro: string }
  | {
      ok: true;
      cep: string;
      rotulo: string;
      valorCents: number;
      prazoDias: number | null;
      /** `true` quando a JB ainda vai orçar: não há valor a mostrar. */
      orcadoDepois: boolean;
      /** Instruções de retirada, quando a loja aceita retirar no balcão. */
      retirada: string | null;
    };

const entrada = z.object({
  produtoId: z.string().min(1).max(60),
  cep: z.string().min(8).max(12),
});

export async function estimarEntrega(
  produtoId: string,
  cepBruto: string,
): Promise<EstimativaDeEntrega> {
  const dados = entrada.safeParse({ produtoId, cep: cepBruto });
  if (!dados.success) return { ok: false, erro: "Informe um CEP com 8 dígitos." };

  const cep = normalizarCep(dados.data.cep);
  if (!cep) return { ok: false, erro: "Informe um CEP com 8 dígitos." };

  const produto = await prisma.product.findFirst({
    where: { id: dados.data.produtoId, status: { not: "draft" } },
    select: {
      id: true,
      name: true,
      priceCents: true,
      weightGrams: true,
      widthMm: true,
      heightMm: true,
      depthMm: true,
    },
  });
  if (!produto) return { ok: false, erro: "Equipamento não encontrado." };

  const [frete, s] = await Promise.all([
    calcularFreteDaPdp({ cep, produto }),
    getSettings(),
  ]);

  const exibido = paraExibicao(frete);

  return {
    ok: true,
    cep,
    rotulo: exibido.rotulo,
    valorCents: exibido.valorCents,
    prazoDias: exibido.prazoDias,
    orcadoDepois: exibido.orcadoDepois,
    retirada: ligado(s.retirada_disponivel) ? s.retirada_instrucoes.trim() || null : null,
  };
}
