import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, PackageCheck, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Cabeçalho das coleções comerciais — /loja (novos) e /seminovos

   As duas páginas vendem a mesma casa: o que muda é a condição do
   equipamento, não o desenho da tela. Antes cada uma montava a própria
   abertura — uma com hero escrito à mão, a outra com o cabeçalho genérico da
   vitrine decorado por CSS — e o resultado eram duas páginas irmãs com
   hierarquias diferentes.

   Aqui a abertura é uma só: título curto, três garantias, foto real do
   destaque, fileira de categorias e o par de coleções. Quem troca de coleção
   continua na mesma página, com o mesmo lugar para cada coisa.
   ============================================================================ */

export type PontoDeColecao = {
  icone: React.ComponentType<{ className?: string }>;
  texto: string;
};

export type DestaqueDaColecao = {
  url: string;
  alt: string;
  nome: string;
  marca?: string | null;
};

export type CategoriaDaColecao = {
  slug: string;
  nome: string;
  quantidade: number;
  href: string;
};

/** A foto do destaque — ou um lugar declarado, quando ela ainda não existe. */
function PainelDaFoto({ destaque }: { destaque: DestaqueDaColecao | null }) {
  if (!destaque) {
    /* Sem foto no cadastro o painel não fica vazio: ele diz o que falta. Um
       retângulo em branco no alto da página parece defeito de carregamento. */
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2 text-graf-400">
        <ImageOff className="size-9" aria-hidden />
        <p className="text-[0.8125rem] font-semibold text-graf-500">Foto em cadastro</p>
      </div>
    );
  }

  return (
    <>
      <Image
        src={destaque.url}
        alt={destaque.alt || destaque.nome}
        fill
        preload
        unoptimized={destaque.url.startsWith("/")}
        sizes="(max-width: 1023px) 100vw, 25rem"
        className="object-contain p-5 xl:p-6"
      />
      <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3 rounded-xl border border-white/80 bg-white/90 px-4 py-3 shadow-card backdrop-blur">
        <div className="min-w-0">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-jb-600">
            Em destaque
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-graf-950">{destaque.nome}</p>
        </div>
        {destaque.marca ? (
          <span className="shrink-0 text-xs font-semibold text-graf-500">{destaque.marca}</span>
        ) : null}
      </div>
    </>
  );
}

export function CabecalhoColecao({
  sobretitulo,
  titulo,
  descricao,
  pontos,
  destaque,
  categorias,
  rotuloCategorias = "Categorias",
  colecao,
  totalNovos,
  totalSeminovos,
  className,
}: {
  sobretitulo: string;
  titulo: string;
  descricao: string;
  pontos: PontoDeColecao[];
  destaque: DestaqueDaColecao | null;
  categorias?: CategoriaDaColecao[];
  rotuloCategorias?: string;
  /** Qual das duas coleções está aberta — a outra vira link no seletor. */
  colecao: "novo" | "seminovo";
  totalNovos: number;
  totalSeminovos: number;
  className?: string;
}) {
  const emNovos = colecao === "novo";

  return (
    <div className={className}>
      {/* Abertura curta: a página existe para colocar a pessoa no catálogo,
          não para fazê-la atravessar uma landing antes de ver equipamento. */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at 82% 35%, rgb(224 20 27 / 0.07), transparent 28%), linear-gradient(115deg, #ffffff 0%, #ffffff 62%, #fafafa 100%)",
          }}
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9 xl:px-11">
            <p className="sobretitulo mb-2.5">{sobretitulo}</p>
            <h1 className="max-w-3xl text-display text-graf-950">{titulo}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-graf-600 sm:text-[1.0625rem]">
              {descricao}
            </p>

            {pontos.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-graf-100 pt-4 text-sm font-semibold text-graf-700">
                {pontos.map((ponto) => (
                  <span key={ponto.texto} className="inline-flex items-center gap-2">
                    <ponto.icone className="size-4 text-jb-600" aria-hidden />
                    {ponto.texto}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* A foto ajuda a vender, mas não pode dominar a dobra. No celular
              ela sai por completo: produto real começa logo abaixo. */}
          <div className="relative hidden min-h-[15.5rem] overflow-hidden border-l border-graf-100 bg-gradient-to-br from-white via-graf-50 to-jb-50/35 lg:block">
            <PainelDaFoto destaque={destaque} />
          </div>
        </div>
      </section>

      {/* Categorias: uma linha de descoberta, não uma segunda seção hero. */}
      {categorias && categorias.length > 0 ? (
        <nav aria-label="Categorias desta coleção" className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-graf-500">
              {rotuloCategorias}
            </p>
            <Link
              href="/marcas"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-bold text-jb-700 transition-colors hover:bg-jb-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              Ver marcas
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <ul className="scrollbar-none -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {categorias.map((categoria) => (
              <li key={categoria.slug} className="shrink-0">
                <Link
                  href={categoria.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 text-[0.8125rem] font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  {categoria.nome}
                  <span className="tabular text-xs font-medium text-graf-500">
                    {categoria.quantidade}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {/* Novo e seminovo são coleções diferentes. O controle é compacto e
          funciona como navegação — não como dois banners concorrendo. */}
      <nav
        aria-label="Escolher coleção por condição"
        className="mt-5 grid w-full max-w-2xl grid-cols-2 rounded-xl border border-graf-200 bg-graf-50 p-1"
      >
        <AbaDeColecao
          href="/loja"
          ativa={emNovos}
          icone={PackageCheck}
          rotulo="Novos"
          quantidade={totalNovos}
        />
        <AbaDeColecao
          href="/seminovos"
          ativa={!emNovos}
          icone={RefreshCcw}
          rotulo="Seminovo JB"
          quantidade={totalSeminovos}
        />
      </nav>
    </div>
  );
}

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
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        ativa
          ? "bg-jb-500 text-white shadow-card"
          : "text-graf-700 transition-colors hover:bg-white hover:text-graf-950",
      )}
    >
      <Icone className="size-4" aria-hidden />
      {rotulo}
      <span
        className={cn(
          "tabular rounded-full px-1.5 py-0.5 text-[0.6875rem]",
          ativa ? "bg-white/15" : "bg-graf-200 text-graf-600",
        )}
      >
        {quantidade}
      </span>
    </Link>
  );
}
