import type { Metadata } from "next";

import {
  ArvoreCategorias,
  ArvoreVazia,
  montarArvore,
} from "@/components/admin/catalogo/arvore-categorias";
import { AtalhosCatalogo } from "@/components/admin/catalogo/atalhos-catalogo";
import { LinkBotao } from "@/components/ui/button";
import { Trilha } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { exigirArea, podeEditar, podeVer } from "@/lib/permissoes";
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
  title: "Categorias",
};

/**
 * Árvore de categorias.
 *
 * Sem paginação e sem filtro de propósito: categoria é estrutura, não volume.
 * Ver a árvore inteira de uma vez é justamente o que permite decidir onde uma
 * nova entra.
 */
export default async function PaginaCategorias() {
  const usuario = await exigirArea("produtos");
  const podeMexer = podeEditar(usuario, "produtos");
  const verEstoque = podeVer(usuario, "estoque");

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
      _count: { select: { products: true } },
    },
  });

  const arvore = montarArvore(
    linhas.map((linha) => ({
      id: linha.id,
      name: linha.name,
      slug: linha.slug,
      icon: linha.icon,
      published: linha.published,
      featured: linha.featured,
      parentId: linha.parentId,
      produtos: linha._count.products,
    })),
  );

  const publicadas = linhas.filter((linha) => linha.published).length;
  const semProduto = linhas.filter((linha) => linha._count.products === 0).length;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Categorias" },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-graf-950">Categorias</h1>
          <p className="mt-1 text-sm text-graf-500">
            {linhas.length === 0
              ? "A estrutura do menu e dos filtros da loja."
              : `${plural(linhas.length, "categoria", "categorias")} · ${plural(publicadas, "publicada", "publicadas")}${semProduto > 0 ? ` · ${semProduto} sem produto` : ""}`}
          </p>
        </div>
        {podeMexer ? (
          <LinkBotao href="/admin/categorias/nova">Nova categoria</LinkBotao>
        ) : (
          <p className="rounded-lg bg-graf-100 px-3 py-2 text-apoio font-semibold text-graf-600">
            Somente consulta
          </p>
        )}
      </header>

      <AtalhosCatalogo atual="categorias" mostrarEstoque={verEstoque} />

      {arvore.length === 0 ? (
        <ArvoreVazia
          acao={
            podeMexer ? (
              <LinkBotao href="/admin/categorias/nova">Criar a primeira categoria</LinkBotao>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-graf-500">
            As setas mudam a ordem dentro do mesmo nível. Para mover uma categoria para outro pai,
            abra a ficha dela e troque a categoria mãe.
          </p>
          <ArvoreCategorias nos={arvore} podeMexer={podeMexer} />
        </>
      )}
    </div>
  );
}
