import type { Metadata } from "next";

import { achatarCategorias, montarArvore } from "@/components/admin/catalogo/arvore-categorias";
import { FormularioNovoProduto } from "@/components/admin/catalogo/formulario-novo-produto";
import { Trilha } from "@/components/ui/data";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

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
        <h1 className="text-2xl font-bold text-graf-950">Novo produto</h1>
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
