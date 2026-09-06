import type { Metadata } from "next";

import { achatarCategorias, montarArvore } from "@/components/admin/catalogo/arvore-categorias";
import { FormularioNovoProduto } from "@/components/admin/catalogo/formulario-novo-produto";
import { Trilha } from "@/components/ui/data";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Novo produto",
};

/**
 * Sugestão de SKU baseada em quantos produtos já existem. É só um ponto de
 * partida editável — o servidor recusa duplicado e a tela explica.
 */
function sugerirSku(total: number) {
  return `JB-${String(total + 1).padStart(4, "0")}`;
}

export default async function PaginaNovoProduto() {
  await exigirEdicao("produtos");

  const [categorias, marcas, total] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        published: true,
        featured: true,
        parentId: true,
      },
    }),
    prisma.brand.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.product.count(),
  ]);

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Produtos", href: "/admin/produtos" },
          { rotulo: "Novo produto" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-bold leading-tight text-graf-950">Novo produto</h1>
        <p className="mt-1 text-sm text-graf-500">
          Depois de criar, a ficha completa abre com abas para fotos, preços, estoque e ficha
          técnica.
        </p>
      </header>

      <FormularioNovoProduto
        categorias={achatarCategorias(montarArvore(categorias))}
        marcas={marcas.map((marca) => ({ id: marca.id, nome: marca.name }))}
        sugestaoSku={sugerirSku(total)}
      />
    </div>
  );
}
