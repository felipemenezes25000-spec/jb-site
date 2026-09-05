import Link from "next/link";
import { PackageSearch, SlidersHorizontal } from "lucide-react";

import { GradeProdutos } from "@/components/loja/card-produto";
import { FiltrosCatalogo, type GruposFiltro } from "@/components/loja/filtros-catalogo";
import { LinkBotao } from "@/components/ui/button";
import { Trilha, Vazio, type Migalha } from "@/components/ui/data";
import { buscarProdutos, type FiltrosCatalogo as Filtros, type Ordenacao } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const CONDICOES_ROTULO: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

export type ParametrosVitrine = Record<string, string | string[] | undefined>;

function lista(valor: string | string[] | undefined): string[] {
  if (!valor) return [];
  const texto = Array.isArray(valor) ? valor.join(",") : valor;
  return texto.split(",").filter(Boolean);
}

async function montarGrupos(): Promise<GruposFiltro> {
  const [categorias, marcas, condicoes, voltagens, faixa] = await Promise.all([
    prisma.category.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { status: "active" } } } },
      },
    }),
    prisma.brand.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { status: "active" } } } },
      },
    }),
    prisma.product.groupBy({
      by: ["condition"],
      where: { status: "active" },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { status: "active", voltage: { not: null } },
      distinct: ["voltage"],
      select: { voltage: true },
    }),
    prisma.product.aggregate({
      where: { status: "active", priceCents: { gt: 0 } },
      _min: { priceCents: true },
      _max: { priceCents: true },
    }),
  ]);

  return {
    categorias: categorias
      .filter((c) => c._count.products > 0)
      .map((c) => ({ valor: c.slug, rotulo: c.name, quantidade: c._count.products })),
    marcas: marcas
      .filter((m) => m._count.products > 0)
      .map((m) => ({ valor: m.slug, rotulo: m.name, quantidade: m._count.products })),
    condicoes: condicoes.map((c) => ({
      valor: c.condition,
      rotulo: CONDICOES_ROTULO[c.condition] ?? c.condition,
      quantidade: c._count._all,
    })),
    voltagens: voltagens
      .map((v) => v.voltage!)
      .filter(Boolean)
      .map((v) => ({ valor: v, rotulo: v === "bivolt" ? "Bivolt" : `${v} V` })),
    faixaPreco: {
      minCents: faixa._min.priceCents ?? 0,
      maxCents: faixa._max.priceCents ?? 0,
    },
  };
}

export async function Vitrine({
  titulo,
  descricao,
  trilha,
  parametros,
  filtrosFixos,
  travarCategoria,
  travarCondicao,
}: {
  titulo: string;
  descricao?: string;
  trilha: Migalha[];
  parametros: ParametrosVitrine;
  filtrosFixos?: Filtros;
  travarCategoria?: boolean;
  travarCondicao?: boolean;
}) {
  const pagina = Number(parametros.pagina ?? 1) || 1;
  const ordem = (parametros.ordem as Ordenacao) ?? "relevancia";

  const categorias = lista(parametros.categoria);
  const marcas = lista(parametros.marca);
  const condicoes = lista(parametros.condicao);

  const filtros: Filtros = {
    busca: typeof parametros.q === "string" ? parametros.q : undefined,
    categoria: filtrosFixos?.categoria ?? categorias[0],
    marca: filtrosFixos?.marca ?? marcas[0],
    condicao:
      filtrosFixos?.condicao ??
      (condicoes.length ? (condicoes as Filtros["condicao"]) : undefined),
    voltagem: lista(parametros.voltagem)[0],
    precoMin: parametros.preco_min ? Number(parametros.preco_min) : undefined,
    precoMax: parametros.preco_max ? Number(parametros.preco_max) : undefined,
    emEstoque: parametros.estoque === "1",
  };

  const [{ produtos, total, paginas }, grupos] = await Promise.all([
    buscarProdutos({ filtros, ordem, pagina, porPagina: 24 }),
    montarGrupos(),
  ]);

  const consulta = new URLSearchParams(
    Object.entries(parametros).flatMap(([k, v]) =>
      v && k !== "pagina" ? [[k, Array.isArray(v) ? v.join(",") : v] as [string, string]] : [],
    ),
  );

  return (
    <>
      <section className="border-b border-graf-200 bg-graf-50/70">
        <div className="container-jb py-8 lg:py-12">
          <Trilha itens={trilha} className="mb-5" />
          <div className="max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Catálogo JB</p>
            <h1 className="mt-3 text-display leading-[1.04]">{titulo}</h1>
            {descricao ? (
              <p className="mt-4 max-w-3xl text-base leading-7 text-graf-600 lg:text-lg">{descricao}</p>
            ) : null}
            <p className="mt-5 text-sm font-semibold text-graf-500">
              {total === 1 ? "1 equipamento encontrado" : `${total} equipamentos encontrados`}
            </p>
          </div>
        </div>
      </section>

      <div className="container-jb py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr] lg:gap-10 xl:gap-12">
          <aside className="lg:order-first">
            <div className="sticky top-32 overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
              <div className="flex items-center gap-2.5 border-b border-graf-200 px-5 py-4">
                <SlidersHorizontal className="size-4.5 text-jb-600" aria-hidden />
                <p className="text-sm font-extrabold text-graf-950">Filtrar catálogo</p>
              </div>
              <div className="p-4">
                <FiltrosCatalogo
                  grupos={grupos}
                  total={total}
                  travarCategoria={travarCategoria}
                  travarCondicao={travarCondicao}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {produtos.length === 0 ? (
              <Vazio
                icone={PackageSearch}
                titulo="Nenhum item com esses filtros"
                descricao="Tente remover algum filtro ou fale com a equipe — vários equipamentos e peças também podem ser atendidos sob orçamento."
                acao={
                  <div className="flex flex-wrap justify-center gap-3">
                    <LinkBotao href="/loja" variante="secundario">Limpar filtros</LinkBotao>
                    <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
                  </div>
                }
              />
            ) : (
              <>
                <GradeProdutos produtos={produtos} className="sm:grid-cols-2 xl:grid-cols-3" />

                {paginas > 1 ? (
                  <nav aria-label="Paginação" className="mt-12 flex flex-wrap justify-center gap-2">
                    {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => {
                      const params = new URLSearchParams(consulta);
                      if (n > 1) params.set("pagina", String(n));
                      const atual = n === pagina;
                      return (
                        <Link
                          key={n}
                          href={`?${params.toString()}`}
                          aria-current={atual ? "page" : undefined}
                          scroll={false}
                          className={cn(
                            "flex size-11 items-center justify-center rounded-xl border text-sm font-extrabold transition-colors",
                            atual
                              ? "border-jb-600 bg-jb-600 text-white"
                              : "border-graf-300 bg-white text-graf-700 hover:border-graf-400 hover:bg-graf-50",
                          )}
                        >
                          {n}
                        </Link>
                      );
                    })}
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
