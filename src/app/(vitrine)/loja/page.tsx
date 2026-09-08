import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChevronRight, PackageCheck, RefreshCcw, Wrench } from "lucide-react";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { dadosDaColecao } from "@/lib/catalogo";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 */
export const instant = false;

const CAMINHO = "/loja";
const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Equipamentos" }];

export const metadata: Metadata = metadataDePagina({
  titulo: "Equipamentos odontológicos novos",
  descricao:
    "Equipamentos odontológicos novos, com ficha técnica completa, garantia informada e suporte da JB antes e depois da compra.",
  caminho: CAMINHO,
});

/**
 * O apoio no pé da coluna de filtros.
 *
 * Não é banner: é o caminho para quem chegou ao catálogo com um equipamento
 * parado em vez de uma compra em mente. Fica no fim da coluna, depois de
 * todos os filtros, porque é a saída de quem não achou o que queria.
 */
function ApoioDaAssistencia() {
  return (
    <div className="on-dark mt-4 rounded-xs bg-chrome p-5 text-white">
      <p className="micro text-jb-400">Assistência JB</p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/75">
        Equipamento parado? A equipe técnica assume a triagem e diz o que é antes de qualquer
        orçamento.
      </p>
      <Link
        href="/assistencia-tecnica/solicitar"
        className="micro mt-4 flex h-11 items-center justify-center gap-2 rounded-xs bg-jb-500 text-white transition-colors hover:bg-jb-600"
      >
        <Wrench className="size-3.5" aria-hidden />
        Abrir chamado
      </Link>
    </div>
  );
}

/** Seletor de coleção — a mesma navegação de antes, no traço da vitrine. */
function AbaDeColecao({
  href,
  ativa,
  icone: Icone,
  rotulo,
  quantidade,
}: {
  href: string;
  ativa: boolean;
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  quantidade: number;
}) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={cn(
        "micro flex h-11 items-center gap-2 rounded-xs px-4 transition-colors",
        ativa
          ? "bg-graf-950 text-white"
          : "border border-hairline bg-white text-graf-600 hover:border-graf-400 hover:text-graf-950",
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {rotulo}
      <span className={cn("tabular", ativa ? "text-white/50" : "text-graf-400")}>{quantidade}</span>
    </Link>
  );
}

export default async function LojaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametrosRecebidos, colecao] = await Promise.all([
    searchParams,
    dadosDaColecao("novo"),
  ]);

  /* /loja é a coleção de novos. Mesmo um endereço antigo com
   * `?condicao=seminovo` não mistura as duas jornadas. */
  const parametros = Object.fromEntries(
    Object.entries(parametrosRecebidos).filter(([chave]) => chave !== "condicao"),
  ) as ParametrosVitrine;

  return (
    <div className="vitrine">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <div className="container-jb pt-6">
        <nav aria-label="Trilha" className="micro flex items-center gap-2 text-graf-400">
          <Link href="/" className="transition-colors hover:text-graf-700">
            Início
          </Link>
          <ChevronRight className="size-3" aria-hidden />
          <span className="text-graf-700">Equipamentos</span>
        </nav>

        {/* O título é letreiro, não parágrafo: condensada, caixa alta, sem
            texto de apoio embaixo. A linha técnica que segue diz o que o
            visitante precisa saber antes de olhar preço. */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-hairline pb-5">
          <div>
            <h1 className="manchete text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] text-graf-950">
              Equipamentos odontológicos
            </h1>
            <p className="micro mt-3 text-graf-500">
              {colecao.totalNovos} equipamentos novos · nota fiscal e garantia · 12x sem juros ·
              instalação por equipe própria
            </p>
          </div>

          <nav aria-label="Escolher coleção por condição" className="flex gap-2">
            <AbaDeColecao
              href="/loja"
              ativa
              icone={PackageCheck}
              rotulo="Novos"
              quantidade={colecao.totalNovos}
            />
            <AbaDeColecao
              href="/seminovos"
              ativa={false}
              icone={RefreshCcw}
              rotulo="Seminovo JB"
              quantidade={colecao.totalSeminovos}
            />
          </nav>
        </div>

        {/* Categorias: fileira de entrada do catálogo, em rótulo técnico. */}
        {colecao.categorias.length > 0 ? (
          <nav
            aria-label="Categorias desta coleção"
            className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {colecao.categorias.map((categoria) => (
              <Link
                key={categoria.slug}
                href={categoria.href}
                className="micro flex h-11 shrink-0 items-center gap-2 rounded-xs border border-hairline bg-white px-4 text-graf-700 transition-colors hover:border-graf-400 hover:text-graf-950"
              >
                {categoria.nome}
                <span className="tabular text-graf-400">{categoria.quantidade}</span>
              </Link>
            ))}
            <Link
              href="/marcas"
              className="micro flex h-11 shrink-0 items-center gap-1.5 px-2 text-jb-600 transition-colors hover:text-jb-700"
            >
              Ver marcas
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </nav>
        ) : null}
      </div>

      <Vitrine
        titulo="Equipamentos novos"
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "novo" }}
        travarCondicao
        variante="vitrine"
        apoioNoFiltro={<ApoioDaAssistencia />}
      />
    </div>
  );
}
