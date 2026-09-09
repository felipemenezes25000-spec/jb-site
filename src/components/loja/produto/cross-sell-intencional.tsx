"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, PackagePlus, Puzzle, ShieldCheck, ShoppingCart } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  adicionarAoCarrinho,
  type EstadoCarrinho,
} from "@/app/acoes/carrinho";
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
  compraRapida: boolean;
};

type Resposta = {
  acessorios: ItemCrossSell[];
  complementos: ItemCrossSell[];
};

function AdicionarAcessorio({ item }: { item: ItemCrossSell }) {
  const [estado, acao, pendente] = useActionState<EstadoCarrinho, FormData>(
    adicionarAoCarrinho,
    {},
  );

  return (
    <div className="mt-2">
      <form action={acao}>
        <input type="hidden" name="produtoId" value={item.id} />
        <input type="hidden" name="quantidade" value="1" />
        <button
          type="submit"
          disabled={pendente}
          className="foco-jb inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-graf-950 px-3 text-xs font-extrabold text-white transition-colors hover:bg-graf-800 disabled:cursor-wait disabled:opacity-65"
        >
          {estado.ok ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <ShoppingCart className="size-3.5" aria-hidden />
          )}
          {pendente ? "Adicionando…" : estado.ok ? "Adicionado" : "Adicionar ao carrinho"}
        </button>
      </form>

      <div aria-live="polite" className="mt-1.5 min-h-4 text-[0.6875rem] leading-4">
        {estado.ok ? (
          <Link href="/carrinho" className="font-bold text-ok-700 underline underline-offset-2">
            Ver carrinho
          </Link>
        ) : estado.erro ? (
          <span className="text-perigo-700">{estado.erro}</span>
        ) : null}
      </div>
    </div>
  );
}

function CartaoProduto({
  item,
  selo,
  tipo,
}: {
  item: ItemCrossSell;
  selo: string;
  tipo: "acessorio" | "complemento";
}) {
  const compraDireta = tipo === "acessorio" && item.compraRapida;

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

          {compraDireta ? (
            <>
              <AdicionarAcessorio item={item} />
              <Link
                href={`/loja/${item.slug}`}
                className="foco-jb mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-bold text-graf-500 hover:text-jb-700"
              >
                Ver detalhes
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </>
          ) : (
            <Link
              href={`/loja/${item.slug}`}
              className="foco-jb mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-jb-700 hover:text-jb-800"
            >
              {tipo === "acessorio" ? "Ver e configurar" : "Ver produto"}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
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
  const id = tipo === "acessorio" ? "acessorios-compativeis" : "produtos-complementares";

  return (
    <section
      id={id}
      className="scroll-mt-32 border-t border-graf-200 py-9 lg:py-11"
      aria-labelledby={`${id}-titulo`}
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
          <Icone className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id={`${id}-titulo`} className="text-xl font-extrabold tracking-[-0.025em] text-graf-950 lg:text-2xl">
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
            tipo={tipo}
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
