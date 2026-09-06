import type { Metadata } from "next";

import {
  achatarCategorias,
  montarArvore,
} from "@/components/admin/catalogo/arvore-categorias";
import { FormularioCategoria } from "@/components/admin/catalogo/formulario-categoria";
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
  title: "Nova categoria",
};

export default async function PaginaNovaCategoria() {
  await exigirEdicao("produtos");

  const linhas = await prisma.category.findMany({
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
  });

  const arvore = montarArvore(linhas);
  const raizes = arvore.length;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Categorias", href: "/admin/categorias" },
          { rotulo: "Nova categoria" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-bold leading-tight text-graf-950">Nova categoria</h1>
        <p className="mt-1 text-sm text-graf-500">
          Deixe a categoria mãe vazia para criar um item de primeiro nível.
        </p>
      </header>

      <FormularioCategoria
        paisPossiveis={achatarCategorias(arvore)}
        ordemSugerida={raizes}
      />
    </div>
  );
}
