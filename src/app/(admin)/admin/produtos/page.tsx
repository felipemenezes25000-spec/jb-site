import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, ProductCondition, ProductStatus } from "@prisma/client";
import { Package, PackageX, TriangleAlert } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { AtalhosCatalogo } from "@/components/admin/catalogo/atalhos-catalogo";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta, type Tom } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna, type Direcao } from "@/components/ui/tabela";
import { formatarData, formatarPreco } from "@/lib/format";
import { exigirArea, podeEditar, podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Produtos",
};

/**
 * Listagem do catálogo.
 *
 * Filtro, ordenação e página moram inteiramente na query string: a lista
 * continua sendo renderizada no servidor, o botão "voltar" do navegador
 * funciona e o link filtrado pode ser passado adiante. Nada disso vira estado
 * de componente.
 */

const POR_PAGINA = 20;

const ROTULO_STATUS: Record<ProductStatus, string> = {
  draft: "Rascunho",
  active: "Publicado",
  archived: "Arquivado",
};

const TOM_STATUS: Record<ProductStatus, Tom> = {
  draft: "aguardando",
  active: "ok",
  archived: "neutro",
};

const ROTULO_CONDICAO: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
  recondicionado: "Recondicionado",
};

const ORDENAVEIS = ["name", "priceCents", "stock", "updatedAt", "createdAt"] as const;
type ChaveOrdem = (typeof ORDENAVEIS)[number];

function ehChaveOrdem(valor: string | undefined): valor is ChaveOrdem {
  return Boolean(valor) && (ORDENAVEIS as readonly string[]).includes(valor as string);
}

/** Mapa fechado em vez de chave dinâmica: o Prisma exige o campo tipado. */
const ORDENACOES: Record<
  ChaveOrdem,
  (direcao: Prisma.SortOrder) => Prisma.ProductOrderByWithRelationInput
> = {
  name: (direcao) => ({ name: direcao }),
  priceCents: (direcao) => ({ priceCents: direcao }),
  stock: (direcao) => ({ stock: direcao }),
  updatedAt: (direcao) => ({ updatedAt: direcao }),
  createdAt: (direcao) => ({ createdAt: direcao }),
};

type Busca = {
  q?: string;
  status?: string;
  condicao?: string;
  categoria?: string;
  marca?: string;
  ordem?: string;
  direcao?: string;
  pagina?: string;
};

export default async function PaginaProdutos({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("produtos");
  const parametros = await searchParams;
  const podeMexer = podeEditar(usuario, "produtos");
  const verEstoque = podeVer(usuario, "estoque");

  const [categorias, marcas] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.brand.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graf-950">Produtos</h1>
          <p className="mt-1 text-sm text-graf-500">
            Catálogo completo — publicados, rascunhos e arquivados.
          </p>
        </div>
        {podeMexer ? (
          <LinkBotao href="/admin/produtos/novo">Novo produto</LinkBotao>
        ) : (
          <p className="rounded-lg bg-graf-100 px-3 py-2 text-xs font-semibold text-graf-600">
            Seu perfil abre o catálogo apenas para consulta.
          </p>
        )}
      </header>

      <AtalhosCatalogo atual="produtos" mostrarEstoque={verEstoque} />

      <FiltrosLista
        campos={[
          { tipo: "busca", nome: "q", rotulo: "Buscar", placeholder: "Nome, SKU ou modelo" },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: [
              { valor: "active", rotulo: "Publicado" },
              { valor: "draft", rotulo: "Rascunho" },
              { valor: "archived", rotulo: "Arquivado" },
            ],
          },
          {
            tipo: "selecao",
            nome: "condicao",
            rotulo: "Condição",
            todos: "Todas",
            opcoes: [
              { valor: "novo", rotulo: "Novo" },
              { valor: "seminovo", rotulo: "Seminovo" },
              { valor: "usado", rotulo: "Usado" },
              { valor: "recondicionado", rotulo: "Recondicionado" },
            ],
          },
          {
            tipo: "selecao",
            nome: "categoria",
            rotulo: "Categoria",
            todos: "Todas",
            opcoes: categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.name })),
          },
          {
            tipo: "selecao",
            nome: "marca",
            rotulo: "Marca",
            todos: "Todas",
            opcoes: marcas.map((marca) => ({ valor: marca.id, rotulo: marca.name })),
          },
        ]}
      />

      <Suspense key={JSON.stringify(parametros)} fallback={<EsqueletoLista />}>
        <Lista parametros={parametros} podeMexer={podeMexer} />
      </Suspense>
    </div>
  );
}

function EsqueletoLista() {
  return (
    <div className="space-y-3">
      <Esqueleto className="h-12" />
      {[0, 1, 2, 3, 4, 5].map((linha) => (
        <Esqueleto key={linha} className="h-16" />
      ))}
    </div>
  );
}

type LinhaProduto = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  status: ProductStatus;
  condition: ProductCondition;
  priceCents: number;
  stock: number;
  lowStockAlert: number;
  trackInventory: boolean;
  featured: boolean;
  updatedAt: Date;
  brand: { name: string } | null;
  category: { name: string } | null;
};

async function Lista({ parametros, podeMexer }: { parametros: Busca; podeMexer: boolean }) {
  const pagina = Math.max(1, Number(parametros.pagina) || 1);
  const chave: ChaveOrdem = ehChaveOrdem(parametros.ordem) ? parametros.ordem : "updatedAt";
  const direcao: Direcao = parametros.direcao === "asc" ? "asc" : "desc";

  const where: Prisma.ProductWhereInput = {};
  const termo = parametros.q?.trim();
  if (termo) {
    where.OR = [
      { name: { contains: termo, mode: "insensitive" } },
      { sku: { contains: termo, mode: "insensitive" } },
      { model: { contains: termo, mode: "insensitive" } },
    ];
  }
  if (parametros.status === "active" || parametros.status === "draft" || parametros.status === "archived") {
    where.status = parametros.status;
  }
  if (
    parametros.condicao === "novo" ||
    parametros.condicao === "seminovo" ||
    parametros.condicao === "usado" ||
    parametros.condicao === "recondicionado"
  ) {
    where.condition = parametros.condicao;
  }
  if (parametros.categoria) where.categoryId = parametros.categoria;
  if (parametros.marca) where.brandId = parametros.marca;

  const [produtos, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [ORDENACOES[chave](direcao), { id: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        status: true,
        condition: true,
        priceCents: true,
        stock: true,
        lowStockAlert: true,
        trackInventory: true,
        featured: true,
        updatedAt: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  /** Mantém filtro e página fora do caminho ao trocar a ordenação. */
  function hrefOrdenar(coluna: string, novaDirecao: Direcao) {
    const parametrosNovos = new URLSearchParams();
    for (const [campo, valor] of Object.entries(parametros)) {
      if (valor && campo !== "ordem" && campo !== "direcao" && campo !== "pagina") {
        parametrosNovos.set(campo, valor);
      }
    }
    parametrosNovos.set("ordem", coluna);
    parametrosNovos.set("direcao", novaDirecao);
    return `/admin/produtos?${parametrosNovos.toString()}`;
  }

  const colunas: Coluna<LinhaProduto>[] = [
    {
      chave: "name",
      rotulo: "Produto",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="block">
          <span className="block truncate font-semibold">{linha.name}</span>
          <span className="block truncate text-xs font-normal text-graf-500">
            {linha.sku}
            {linha.brand ? ` · ${linha.brand.name}` : ""}
            {linha.featured ? " · destaque" : ""}
          </span>
        </span>
      ),
    },
    {
      chave: "category",
      rotulo: "Categoria",
      esconderNoMobile: true,
      renderizar: (linha) => linha.category?.name ?? "—",
    },
    {
      chave: "condition",
      rotulo: "Condição",
      renderizar: (linha) => ROTULO_CONDICAO[linha.condition],
    },
    {
      chave: "priceCents",
      rotulo: "Preço",
      alinhamento: "direita",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="tabular">{linha.priceCents > 0 ? formatarPreco(linha.priceCents) : "—"}</span>
      ),
    },
    {
      chave: "stock",
      rotulo: "Estoque",
      alinhamento: "direita",
      ordenavel: true,
      renderizar: (linha) => {
        if (!linha.trackInventory) return <span className="text-graf-500">Sem controle</span>;
        const baixo = linha.stock <= linha.lowStockAlert;
        return (
          <span
            className={cn(
              "tabular inline-flex items-center gap-1.5 font-semibold",
              baixo ? "text-jb-700" : "text-graf-800",
            )}
          >
            {baixo ? <TriangleAlert className="size-3.5" aria-hidden /> : null}
            {linha.stock}
            {baixo ? <span className="sr-only">— abaixo do alerta</span> : null}
          </span>
        );
      },
    },
    {
      chave: "status",
      rotulo: "Situação",
      renderizar: (linha) => (
        <Etiqueta tom={TOM_STATUS[linha.status]}>{ROTULO_STATUS[linha.status]}</Etiqueta>
      ),
    },
    {
      chave: "updatedAt",
      rotulo: "Atualizado",
      esconderNoMobile: true,
      ordenavel: true,
      renderizar: (linha) => formatarData(linha.updatedAt),
    },
  ];

  const filtrando = Boolean(
    parametros.q || parametros.status || parametros.condicao || parametros.categoria || parametros.marca,
  );

  return (
    <div className="space-y-5">
      <Tabela<LinhaProduto>
        colunas={colunas}
        linhas={produtos}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/produtos/${linha.id}`}
        ordenacao={{ chave, direcao }}
        hrefOrdenar={hrefOrdenar}
        legenda="Produtos do catálogo, com preço, estoque e situação"
        vazio={
          filtrando
            ? {
                icone: PackageX,
                titulo: "Nenhum produto com esses filtros",
                descricao: "Ajuste a busca ou limpe os filtros na barra acima.",
                acao: <LinkBotao href="/admin/produtos" variante="secundario">Limpar filtros</LinkBotao>,
              }
            : {
                icone: Package,
                titulo: "O catálogo está vazio",
                descricao: "Cadastre o primeiro produto para começar a vender pela loja.",
                acao: podeMexer ? <LinkBotao href="/admin/produtos/novo">Novo produto</LinkBotao> : undefined,
              }
        }
      />

      {total > 0 ? (
        <Suspense fallback={<Esqueleto className="h-11" />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="produto"
            rotuloPlural="produtos"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
