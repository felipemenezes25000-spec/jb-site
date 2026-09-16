import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Package, Trash2 } from "lucide-react";

import { excluirCategoria } from "@/app/acoes/admin-catalogo";
import {
  achatarCategorias,
  idsDaSubarvore,
  montarArvore,
} from "@/components/admin/catalogo/arvore-categorias";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { FormularioCategoria } from "@/components/admin/catalogo/formulario-categoria";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { formatarPreco, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
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
  title: "Categoria",
};

/**
 * Ficha da categoria.
 *
 * A lista de categorias mãe possíveis já sai daqui sem a própria categoria e
 * sem as descendentes dela — escolher uma delas criaria um anel na árvore. O
 * servidor confere de novo antes de gravar; este filtro é só para a pessoa não
 * ver uma opção que vai ser recusada.
 */
export default async function PaginaCategoria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("produtos");
  const { id } = await params;
  const somenteLeitura = !podeEditar(usuario, "produtos");

  const [categoria, linhas, produtos] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    }),
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
    prisma.product.findMany({
      where: { categoryId: id },
      orderBy: { name: "asc" },
      take: 12,
      select: { id: true, name: true, sku: true, priceCents: true, status: true },
    }),
  ]);

  if (!categoria) notFound();

  const arvore = montarArvore(linhas);
  const proibidos = new Set(idsDaSubarvore(arvore, id));
  const paisPossiveis = achatarCategorias(arvore).filter((item) => !proibidos.has(item.id));

  const bloqueiaExclusao = categoria._count.products > 0 || categoria._count.children > 0;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Categorias", href: "/admin/categorias" },
          { rotulo: categoria.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight text-graf-950">{categoria.name}</h1>
            <Etiqueta tom={categoria.published ? "ok" : "neutro"}>
              {categoria.published ? "Publicada" : "Oculta"}
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-graf-500">
            {plural(categoria._count.products, "produto", "produtos")} ·{" "}
            {plural(categoria._count.children, "subcategoria", "subcategorias")}
            {categoria.published ? (
              <>
                {" · "}
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
                >
                  Ver na loja
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : null}
          </p>
        </div>

        {!somenteLeitura ? (
          <BotaoAcao
            acao={excluirCategoria}
            campos={{ id: categoria.id }}
            rotulo="Excluir categoria"
            icone={<Trash2 className="size-4" aria-hidden />}
            variante="perigo"
            tamanho="md"
            desabilitado={bloqueiaExclusao}
            confirmar={{
              pergunta: `Excluir "${categoria.name}"?`,
              detalhe: "A categoria some do menu e da loja. Esta ação não pode ser desfeita.",
              rotuloConfirmar: "Excluir categoria",
            }}
          />
        ) : null}
      </header>

      {bloqueiaExclusao && !somenteLeitura ? (
        <Aviso tom="info" titulo="Não dá para apagar agora">
          {categoria._count.products > 0
            ? `Há ${plural(categoria._count.products, "produto", "produtos")} nesta categoria. `
            : ""}
          {categoria._count.children > 0
            ? `Há ${plural(categoria._count.children, "subcategoria", "subcategorias")} abaixo dela. `
            : ""}
          Mova o que estiver aqui para outra categoria e a exclusão fica liberada. Se a intenção é
          só tirá-la do site, desmarque &quot;Publicada&quot;.
        </Aviso>
      ) : null}

      <FormularioCategoria
        somenteLeitura={somenteLeitura}
        paisPossiveis={paisPossiveis}
        categoria={{
          id: categoria.id,
          name: categoria.name,
          slug: categoria.slug,
          description: categoria.description,
          parentId: categoria.parentId,
          icon: categoria.icon,
          order: categoria.order,
          published: categoria.published,
          featured: categoria.featured,
          seoTitle: categoria.seoTitle,
          seoDescription: categoria.seoDescription,
        }}
      />

      <Cartao>
        <CabecalhoCartao
          titulo="Produtos nesta categoria"
          descricao={
            categoria._count.products > produtos.length
              ? `Mostrando ${produtos.length} de ${categoria._count.products}.`
              : undefined
          }
          acao={
            categoria._count.products > 0 ? (
              <LinkBotao
                href={`/admin/produtos?categoria=${categoria.id}`}
                variante="secundario"
                tamanho="sm"
              >
                Ver todos
              </LinkBotao>
            ) : undefined
          }
        />
        {produtos.length === 0 ? (
          <Vazio
            icone={Package}
            titulo="Nenhum produto nesta categoria"
            descricao="Abra um produto e escolha esta categoria na aba Básico."
            className="m-4 border-graf-200 bg-transparent py-10"
          />
        ) : (
          <ul className="divide-y divide-graf-200">
            {produtos.map((produto) => (
              <li key={produto.id}>
                <Link
                  href={`/admin/produtos/${produto.id}`}
                  className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-graf-900">
                      {produto.name}
                    </span>
                    <span className="block truncate text-[0.8125rem] text-graf-500">
                      {produto.sku}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-graf-800">
                    {produto.priceCents > 0 ? (
                      <span className="tabular">{formatarPreco(produto.priceCents)}</span>
                    ) : (
                      <span className="font-normal text-graf-500">Sob consulta</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
