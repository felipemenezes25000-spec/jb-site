import Link from "next/link";
import { PackageSearch } from "lucide-react";

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

/** Monta os grupos de filtro a partir do que existe publicado no catálogo. */
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
  travarMarca,
}: {
  titulo: string;
  descricao?: string;
  trilha: Migalha[];
  parametros: ParametrosVitrine;
  filtrosFixos?: Filtros;
  travarCategoria?: boolean;
  travarCondicao?: boolean;
  travarMarca?: boolean;
}) {
  const pagina = Number(parametros.pagina ?? 1) || 1;
  const ordem = (parametros.ordem as Ordenacao) ?? "relevancia";

  const categorias = lista(parametros.categoria);
  const marcas = lista(parametros.marca);
  const condicoes = lista(parametros.condicao);

  const filtros: Filtros = {
    busca: typeof parametros.q === "string" ? parametros.q : undefined,
    // listas inteiras, não só o primeiro item: a barra de filtros marca várias
    categoria: filtrosFixos?.categoria ?? (categorias.length ? categorias : undefined),
    marca: filtrosFixos?.marca ?? (marcas.length ? marcas : undefined),
    condicao:
      filtrosFixos?.condicao ??
      (condicoes.length ? (condicoes as Filtros["condicao"]) : undefined),
    voltagem: (() => {
      const v = lista(parametros.voltagem);
      return v.length ? v : undefined;
    })(),
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
    <div className="container-jb py-8 lg:py-12">
      <Trilha itens={trilha} className="mb-5" />

      <header className="mb-8 max-w-2xl">
        <h1 className="text-display leading-tight">{titulo}</h1>
        {descricao ? (
          <p className="mt-3 text-base leading-relaxed text-graf-600">{descricao}</p>
        ) : null}
      </header>

      <div className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <aside className="lg:order-first">
          <FiltrosCatalogo
            grupos={grupos}
            total={total}
            travarCategoria={travarCategoria}
            travarCondicao={travarCondicao}
            travarMarca={travarMarca}
          />
        </aside>

        <div className="min-w-0">
          {produtos.length === 0 ? (
            <Vazio
              icone={PackageSearch}
              titulo="Nenhum item com esses filtros"
              descricao="Tente remover algum filtro ou fale com a equipe — muita coisa é atendida sob orçamento."
              acao={
                <div className="flex flex-wrap justify-center gap-3">
                  <LinkBotao href="/loja" variante="secundario">
                    Limpar filtros
                  </LinkBotao>
                  <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
                </div>
              }
            />
          ) : (
            <>
              <GradeProdutos produtos={produtos} className="lg:grid-cols-3" />

              {paginas > 1 ? (
                <nav aria-label="Paginação" className="mt-10 flex justify-center gap-1.5">
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
                          "flex size-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                          atual
                            ? "border-jb-500 bg-jb-500 text-white"
                            : "border-graf-300 bg-white text-graf-700 hover:border-graf-400",
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
  );
}
