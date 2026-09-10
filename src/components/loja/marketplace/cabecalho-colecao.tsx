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
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-600">
              {sobretitulo}
            </p>
          ) : null}
          <h1 className="mt-1.5 text-[clamp(1.85rem,1.4rem+1.8vw,2.85rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-graf-950">
            {titulo}
          </h1>
          {descricao ? (
            <p className="mt-2.5 max-w-3xl text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">
              {descricao}
            </p>
          ) : null}
        </div>

        {imagem ? (
          <div className="hidden min-h-16 min-w-28 items-center justify-center rounded-xl border border-graf-150 bg-graf-50/60 px-4 sm:flex">
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
          className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0"
        >
          {atalhos.map((atalho) => (
            <Link
              key={atalho.href}
              href={atalho.href}
              className="foco-jb inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 text-[0.8125rem] font-semibold text-graf-750 transition-colors hover:border-graf-400 hover:bg-graf-50 hover:text-jb-700"
            >
              <span>{atalho.rotulo}</span>
              {atalho.quantidade === undefined ? null : (
                <span className="tabular inline-flex min-w-5 items-center justify-center rounded-full bg-graf-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-graf-600">
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
