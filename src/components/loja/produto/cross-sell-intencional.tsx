"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PackagePlus, Puzzle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { formatarPreco } from "@/lib/format";

type ItemCrossSell = {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  precoCents: number | null;
  imagem: string | null;
  alt: string;
  ordem: number;
};

type Resposta = {
  acessorios: ItemCrossSell[];
  complementos: ItemCrossSell[];
};

function CartaoProduto({ item, selo }: { item: ItemCrossSell; selo: string }) {
  return (
    <article className="group grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] gap-4 rounded-2xl border border-graf-200 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:grid-cols-1 sm:p-4">
      <Link
        href={`/loja/${item.slug}`}
        className="foco-jb relative aspect-square overflow-hidden rounded-xl bg-graf-50 sm:aspect-[4/3]"
        aria-label={`Ver ${item.nome}`}
      >
        {item.imagem ? (
          <Image
            src={item.imagem}
            alt={item.alt}
            fill
            sizes="(max-width: 640px) 92px, (max-width: 1024px) 30vw, 260px"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-xs font-semibold text-graf-400">
            Sem foto
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-col">
        <span className="mb-1.5 inline-flex w-fit rounded-full bg-graf-100 px-2 py-0.5 text-[0.625rem] font-extrabold uppercase tracking-[0.07em] text-graf-600">
          {selo}
        </span>
        <Link
          href={`/loja/${item.slug}`}
          className="foco-jb line-clamp-2 text-sm font-extrabold leading-5 text-graf-950 hover:text-jb-700"
        >
          {item.nome}
        </Link>
        {item.descricao ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-graf-500 sm:min-h-10">{item.descricao}</p>
        ) : null}
        <div className="mt-auto pt-3">
          <p className="text-sm font-extrabold tabular text-graf-950">
            {item.precoCents === null ? "Sob orçamento" : formatarPreco(item.precoCents)}
          </p>
          <Link
            href={`/loja/${item.slug}`}
            className="foco-jb mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-jb-700 hover:text-jb-800"
          >
            Ver produto
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Secao({
  titulo,
  subtitulo,
  itens,
  tipo,
}: {
  titulo: string;
  subtitulo: string;
  itens: ItemCrossSell[];
  tipo: "acessorio" | "complemento";
}) {
  if (itens.length === 0) return null;
  const Icone = tipo === "acessorio" ? PackagePlus : Puzzle;

  return (
    <section className="border-t border-graf-200 py-9 lg:py-11" aria-labelledby={`cross-${tipo}-titulo`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
          <Icone className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id={`cross-${tipo}-titulo`} className="text-xl font-extrabold tracking-[-0.025em] text-graf-950 lg:text-2xl">
            {titulo}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-graf-500">{subtitulo}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {itens.slice(0, 4).map((item) => (
          <CartaoProduto
            key={item.id}
            item={item}
            selo={tipo === "acessorio" ? "Compatível" : "Funciona junto"}
          />
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-graf-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok-700" aria-hidden />
        Esta recomendação foi configurada no catálogo da JB para este equipamento — não é uma sugestão genérica por categoria.
      </p>
    </section>
  );
}

export function CrossSellIntencional({ slug }: { slug: string }) {
  const [dados, setDados] = useState<Resposta | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    void fetch(`/api/loja/${encodeURIComponent(slug)}/cross-sell`, {
      signal: controlador.signal,
      cache: "no-store",
    })
      .then(async (resposta) => {
        if (!resposta.ok) return null;
        return (await resposta.json()) as Resposta;
      })
      .then((resultado) => {
        if (resultado) setDados(resultado);
      })
      .catch((erro: unknown) => {
        if (erro instanceof DOMException && erro.name === "AbortError") return;
        console.error("Falha ao carregar cross-sell da PDP", erro);
      });

    return () => controlador.abort();
  }, [slug]);

  if (!dados || (dados.acessorios.length === 0 && dados.complementos.length === 0)) return null;

  return (
    <div className="container-jb max-w-[112rem]">
      <Secao
        tipo="acessorio"
        titulo="Complete sua compra"
        subtitulo="Acessórios explicitamente vinculados a este equipamento para reposição, expansão ou uso completo."
        itens={dados.acessorios}
      />
      <Secao
        tipo="complemento"
        titulo="Funciona melhor junto"
        subtitulo="Produtos que complementam o fluxo da clínica sem competir com este equipamento."
        itens={dados.complementos}
      />
    </div>
  );
}
