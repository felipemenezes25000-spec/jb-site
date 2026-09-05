import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Boxes, PackageSearch, ScanBarcode, TriangleAlert } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Indicador, Indicadores } from "@/components/admin/indicador";
import { AtalhosCatalogo } from "@/components/admin/catalogo/atalhos-catalogo";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta, Trilha, type Tom } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { formatarPreco } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Estoque",
};

/**
 * Visão de estoque por produto.
 *
 * A comparação "saldo abaixo do alerta" é feita no banco, com referência de
 * campo do Prisma (`stock <= lowStockAlert`), em vez de trazer o catálogo
 * inteiro para comparar em memória. Cada produto tem o seu próprio ponto de
 * alerta, então não existe um número mágico único.
 */

const POR_PAGINA = 25;

/** Produtos que dependem de reposição: controlam estoque e chegaram no alerta. */
const FILTRO_BAIXO: Prisma.ProductWhereInput = {
  status: { not: "archived" },
  trackInventory: true,
  stock: { lte: prisma.product.fields.lowStockAlert },
};

type Busca = {
  q?: string;
  situacao?: string;
  categoria?: string;
  pagina?: string;
};

export default async function PaginaEstoque({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("estoque");
  const parametros = await searchParams;
  const podeMexer = podeEditar(usuario, "estoque");

  const categorias = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <Trilha itens={[{ rotulo: "Painel", href: "/admin" }, { rotulo: "Estoque" }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graf-950">Estoque</h1>
          <p className="mt-1 text-sm text-graf-500">
            Saldo por produto, movimentações e as unidades identificadas de seminovos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkBotao href="/admin/estoque/unidades" variante="secundario">
            Unidades
          </LinkBotao>
          {podeMexer ? (
            <LinkBotao href="/admin/estoque/unidades/nova">Nova unidade</LinkBotao>
          ) : null}
        </div>
      </header>

      <AtalhosCatalogo atual="estoque" />

      <Suspense fallback={<EsqueletoIndicadores />}>
        <Resumo />
      </Suspense>

      <FiltrosLista
        campos={[
          { tipo: "busca", nome: "q", rotulo: "Buscar", placeholder: "Nome ou SKU" },
          {
            tipo: "selecao",
            nome: "situacao",
            rotulo: "Situação do saldo",
            todos: "Todos",
            opcoes: [
              { valor: "baixo", rotulo: "Abaixo do alerta" },
              { valor: "zerado", rotulo: "Sem estoque" },
              { valor: "ok", rotulo: "Acima do alerta" },
              { valor: "sem_controle", rotulo: "Sem controle de estoque" },
            ],
          },
          {
            tipo: "selecao",
            nome: "categoria",
            rotulo: "Categoria",
            todos: "Todas",
            opcoes: categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.name })),
          },
        ]}
      />

      <Suspense key={JSON.stringify(parametros)} fallback={<EsqueletoLista />}>
        <Lista parametros={parametros} />
      </Suspense>
    </div>
  );
}

function EsqueletoIndicadores() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((indice) => (
        <Esqueleto key={indice} className="h-32" />
      ))}
    </div>
  );
}

function EsqueletoLista() {
  return (
    <div className="space-y-3">
      <Esqueleto className="h-12" />
      {[0, 1, 2, 3, 4].map((indice) => (
        <Esqueleto key={indice} className="h-16" />
      ))}
    </div>
  );
}

async function Resumo() {
  const [baixo, zerado, disponiveis, reservadas] = await Promise.all([
    prisma.product.count({ where: FILTRO_BAIXO }),
    prisma.product.count({
      where: { status: { not: "archived" }, trackInventory: true, stock: { lte: 0 } },
    }),
    prisma.inventoryUnit.count({ where: { status: "disponivel" } }),
    prisma.inventoryUnit.count({ where: { status: "reservado" } }),
  ]);

  return (
    <Indicadores>
      <Indicador
        rotulo="Produtos abaixo do alerta"
        valor={baixo}
        icone={TriangleAlert}
        tom={baixo > 0 ? "aviso" : "ok"}
        detalhe="Cada produto tem o próprio ponto de reposição."
        href="/admin/estoque?situacao=baixo"
        hrefRotulo="Ver lista"
      />
      <Indicador
        rotulo="Sem estoque"
        valor={zerado}
        icone={PackageSearch}
        tom={zerado > 0 ? "aviso" : "ok"}
        detalhe="Saldo zero ou negativo, com controle ligado."
        href="/admin/estoque?situacao=zerado"
        hrefRotulo="Ver lista"
      />
      <Indicador
        rotulo="Unidades disponíveis"
        valor={disponiveis}
        icone={ScanBarcode}
        tom="neutro"
        detalhe="Peças identificadas prontas para venda."
        href="/admin/estoque/unidades?status=disponivel"
        hrefRotulo="Ver unidades"
      />
      <Indicador
        rotulo="Unidades reservadas"
        valor={reservadas}
        icone={Boxes}
        tom="info"
        detalhe="Separadas para um cliente, ainda não faturadas."
        href="/admin/estoque/unidades?status=reservado"
        hrefRotulo="Ver unidades"
      />
    </Indicadores>
  );
}

type LinhaEstoque = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockAlert: number;
  trackInventory: boolean;
  priceCents: number;
  category: { name: string } | null;
  _count: { units: number };
};

function tomDoSaldo(linha: LinhaEstoque): { tom: Tom; texto: string } {
  if (!linha.trackInventory) return { tom: "neutro", texto: "Sem controle" };
  if (linha.stock <= 0) return { tom: "alerta", texto: "Sem estoque" };
  if (linha.stock <= linha.lowStockAlert) return { tom: "aguardando", texto: "Repor" };
  return { tom: "ok", texto: "Normal" };
}

async function Lista({ parametros }: { parametros: Busca }) {
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const where: Prisma.ProductWhereInput = { status: { not: "archived" } };
  const termo = parametros.q?.trim();
  if (termo) {
    where.OR = [
      { name: { contains: termo, mode: "insensitive" } },
      { sku: { contains: termo, mode: "insensitive" } },
    ];
  }
  if (parametros.categoria) where.categoryId = parametros.categoria;

  if (parametros.situacao === "baixo") {
    where.trackInventory = true;
    where.stock = { lte: prisma.product.fields.lowStockAlert };
  } else if (parametros.situacao === "zerado") {
    where.trackInventory = true;
    where.stock = { lte: 0 };
  } else if (parametros.situacao === "ok") {
    where.trackInventory = true;
    where.stock = { gt: prisma.product.fields.lowStockAlert };
  } else if (parametros.situacao === "sem_controle") {
    where.trackInventory = false;
  }

  const [produtos, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockAlert: true,
        trackInventory: true,
        priceCents: true,
        category: { select: { name: true } },
        _count: { select: { units: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const colunas: Coluna<LinhaEstoque>[] = [
    {
      chave: "name",
      rotulo: "Produto",
      renderizar: (linha) => (
        <span className="block">
          <span className="block truncate font-semibold">{linha.name}</span>
          <span className="block truncate text-xs font-normal text-graf-500">
            {linha.sku}
            {linha.category ? ` · ${linha.category.name}` : ""}
          </span>
        </span>
      ),
    },
    {
      chave: "stock",
      rotulo: "Saldo",
      alinhamento: "direita",
      renderizar: (linha) => (
        <span className="tabular font-semibold">{linha.trackInventory ? linha.stock : "—"}</span>
      ),
    },
    {
      chave: "lowStockAlert",
      rotulo: "Alerta",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="tabular">{linha.lowStockAlert}</span>,
    },
    {
      chave: "units",
      rotulo: "Unidades",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="tabular">{linha._count.units === 0 ? "—" : linha._count.units}</span>
      ),
    },
    {
      chave: "priceCents",
      rotulo: "Preço",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="tabular">
          {linha.priceCents > 0 ? formatarPreco(linha.priceCents) : "—"}
        </span>
      ),
    },
    {
      chave: "situacao",
      rotulo: "Situação",
      renderizar: (linha) => {
        const { tom, texto } = tomDoSaldo(linha);
        return <Etiqueta tom={tom}>{texto}</Etiqueta>;
      },
    },
  ];

  const filtrando = Boolean(parametros.q || parametros.situacao || parametros.categoria);

  return (
    <div className="space-y-5">
      <Tabela<LinhaEstoque>
        colunas={colunas}
        linhas={produtos}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/estoque/produto/${linha.id}`}
        legenda="Saldo de estoque por produto"
        vazio={
          filtrando
            ? {
                icone: PackageSearch,
                titulo: "Nenhum produto com esses filtros",
                descricao: "Ajuste a busca ou limpe os filtros na barra acima.",
                acao: (
                  <LinkBotao href="/admin/estoque" variante="secundario">
                    Limpar filtros
                  </LinkBotao>
                ),
              }
            : {
                icone: Boxes,
                titulo: "Nenhum produto ativo no catálogo",
                descricao: "Cadastre um produto para começar a controlar o estoque dele.",
                acao: <LinkBotao href="/admin/produtos/novo">Novo produto</LinkBotao>,
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
