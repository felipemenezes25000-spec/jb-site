import Image from "next/image";
import Link from "next/link";

import { Trilha, type Migalha } from "@/components/ui/data";

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
    <header data-cabecalho-colecao className="pt-4 lg:pt-5">
      <Trilha itens={trilha} />

      <div className="mt-2 flex min-w-0 items-end justify-between gap-6 border-b border-graf-200 pb-4">
        <div className="min-w-0 max-w-4xl">
          {sobretitulo ? (
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.1em] text-jb-600">
              {sobretitulo}
            </p>
          ) : null}
          <h1 className="mt-1 text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-graf-950">
            {titulo}
          </h1>
          {descricao ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">
              {descricao}
            </p>
          ) : null}
        </div>

        {imagem ? (
          <Image
            src={imagem.url}
            alt={imagem.alt}
            width={160}
            height={64}
            className="hidden h-12 w-auto max-w-40 shrink-0 object-contain sm:block"
          />
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
              className="foco-jb flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-graf-200 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 hover:text-jb-700"
            >
              {atalho.rotulo}
              {atalho.quantidade === undefined ? null : (
                <span className="tabular text-xs font-medium text-graf-500">
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
