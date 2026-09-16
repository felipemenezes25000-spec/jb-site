import Image from "next/image";
import Link from "next/link";

import { Trilha, type Migalha } from "@/components/ui/data";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

type AtalhoColecao = { rotulo: string; href: string; quantidade?: number };

export function CabecalhoColecao({
  sobretitulo,
  titulo,
  descricao,
  trilha,
  imagem,
  atalhos,
  rotuloAtalhos,
}: {
  sobretitulo?: string;
  titulo: string;
  descricao?: string;
  trilha: Migalha[];
  imagem?: { url: string; alt: string };
  atalhos?: AtalhoColecao[];
  rotuloAtalhos: string;
}) {
  return (
    <header data-cabecalho-colecao className="pt-2 lg:pt-3">
      <Trilha itens={trilha} />

      <div className="mt-3 grid min-w-0 gap-5 border-b border-graf-200 pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:gap-8 lg:pb-6">
        <div className="min-w-0 max-w-4xl">
          {sobretitulo ? (
            <p className="sobretitulo">
              {sobretitulo}
            </p>
          ) : null}
          <h1 className="mt-1.5 text-[clamp(1.85rem,1.4rem+1.8vw,2.85rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-graf-950">
            {titulo}
          </h1>
          {descricao ? (
            <p className="mt-2.5 max-w-3xl text-sm leading-6 text-graf-600 sm:text-corpo">
              {descricao}
            </p>
          ) : null}
        </div>

        {imagem ? (
          <div className="hidden min-h-16 min-w-28 items-center justify-center rounded-xl border border-hairline bg-surface-muted px-4 sm:flex">
            <Image
              src={imagemProdutoSemFundo(imagem.url)}
              alt={imagem.alt}
              width={160}
              height={64}
              className="h-11 w-auto max-w-36 object-contain"
            />
          </div>
        ) : null}
      </div>

      {atalhos?.length ? (
        <nav
          aria-label={rotuloAtalhos}
          /* A fileira rola na horizontal e não dizia isso a ninguém: a 1440px
             o último atalho aparecia cortado a seco no meio da palavra
             ("Todas as m…"), o que se lê como defeito, não como "tem mais para
             o lado". A máscara transforma o corte em esmaecimento — quando os
             atalhos cabem, ela cai sobre espaço vazio e não aparece.

             `scroll-p-4` é para o teclado: sem isso o atalho focado encostava
             na borda esmaecida. */
          className="scrollbar-none -mx-4 flex scroll-p-4 gap-2 overflow-x-auto px-4 py-3 [mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)] sm:mx-0 sm:px-0"
        >
          {atalhos.map((atalho) => (
            <Link
              key={atalho.href}
              href={atalho.href}
              className="foco-jb inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 text-apoio font-semibold text-graf-700 transition-colors hover:border-graf-400 hover:bg-graf-50 hover:text-jb-700"
            >
              <span>{atalho.rotulo}</span>
              {atalho.quantidade === undefined ? null : (
                <span className="tabular inline-flex min-w-5 items-center justify-center rounded-full bg-graf-100 px-1.5 py-0.5 text-xs font-bold text-graf-600">
                  {atalho.quantidade}
                </span>
              )}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
