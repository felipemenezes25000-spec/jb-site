"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { ETIQUETA_CATALOGO } from "@/lib/loja-publica";
import {
  codificarOrdemRelacao,
  TIPOS_RELACAO_PRODUTO,
  type TipoRelacaoProduto,
} from "@/lib/marketplace/relacionamentos-produto";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export type EstadoRelacionamentos = {
  ok?: boolean;
  mensagem?: string;
  erro?: string;
};

const linha = z.object({
  targetId: z.string().trim().min(1).max(40),
  tipo: z.enum(TIPOS_RELACAO_PRODUTO),
});

const lista = z.array(linha).max(100);

function lerItens(valor: FormDataEntryValue | null) {
  if (typeof valor !== "string") return null;
  try {
    const parsed = JSON.parse(valor) as unknown;
    const resultado = lista.safeParse(parsed);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

export async function salvarRelacionamentosTipados(
  _estado: EstadoRelacionamentos,
  formData: FormData,
): Promise<EstadoRelacionamentos> {
  const usuario = await exigirEdicao("produtos");
  const sourceId = String(formData.get("id") ?? "").trim();
  if (!sourceId) return { erro: "Produto não informado." };

  const itens = lerItens(formData.get("itens"));
  if (!itens) return { erro: "Confira os relacionamentos informados." };
  if (itens.some((item) => item.targetId === sourceId)) {
    return { erro: "Um produto não pode se relacionar com ele mesmo." };
  }

  const chaves = new Set<string>();
  for (const item of itens) {
    if (chaves.has(item.targetId)) {
      return { erro: "O mesmo produto não pode aparecer duas vezes no cross-sell." };
    }
    chaves.add(item.targetId);
  }

  const produto = await prisma.product.findUnique({
    where: { id: sourceId },
    select: { id: true, slug: true, name: true },
  });
  if (!produto) return { erro: "Produto não encontrado." };

  const ids = [...chaves];
  if (ids.length > 0) {
    const existentes = await prisma.product.findMany({
      where: { id: { in: ids }, status: { not: "archived" } },
      select: { id: true },
    });
    if (existentes.length !== ids.length) {
      return { erro: "Um dos produtos escolhidos não existe mais ou foi arquivado." };
    }
  }

  const antes = await prisma.productRelation.findMany({
    where: { sourceId },
    orderBy: { order: "asc" },
    select: { targetId: true, order: true },
  });

  const indicePorTipo: Record<TipoRelacaoProduto, number> = {
    alternativa: 0,
    acessorio: 0,
    complemento: 0,
  };

  const depois = itens.map((item) => ({
    targetId: item.targetId,
    tipo: item.tipo,
    order: codificarOrdemRelacao(item.tipo, indicePorTipo[item.tipo]++),
  }));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productRelation.deleteMany({ where: { sourceId } });
      if (depois.length > 0) {
        await tx.productRelation.createMany({
          data: depois.map((item) => ({
            sourceId,
            targetId: item.targetId,
            order: item.order,
          })),
        });
      }
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto_relacionamentos",
      entidadeId: sourceId,
      antes: { relacionamentos: antes },
      depois: { relacionamentos: depois },
      resumo: `Atualizou o cross-sell de ${produto.name}`,
    });

    updateTag(ETIQUETA_CATALOGO);
    revalidatePath(`/loja/${produto.slug}`);
    revalidatePath(`/admin/produtos/${sourceId}`);
    revalidatePath(`/admin/produtos/${sourceId}/relacionamentos`);

    return { ok: true, mensagem: "Cross-sell salvo." };
  } catch (erro) {
    console.error("Falha ao salvar relacionamentos tipados", erro);
    return { erro: "Não foi possível salvar o cross-sell agora." };
  }
}
