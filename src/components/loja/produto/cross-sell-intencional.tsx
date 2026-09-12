"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, ShoppingCart } from "lucide-react";
import { useActionState } from "react";

import {
  adicionarAoCarrinho,
  adicionarConjuntoAoCarrinho,
  type EstadoCarrinho,
} from "@/app/acoes/carrinho";
import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Produtos relacionados

   Antes eram DUAS seções de página inteira — "Complete sua compra" e "Funciona
   melhor junto" — cada uma com chip de 40px, título, subtítulo, o rótulo
   "Seleção JB" solto na direita e o MESMO rodapé de confiança repetido. Com um
   acessório cadastrado, isso rendia 1.360px de seção para um cartão de
   332×540, e 1.000px de vazio ao lado dele.

   Agora é uma seção só, e o que separa acessório de complemento é a etiqueta
   no próprio item — não um cabeçalho novo. O item também deixou de ser cartão
   vertical: virou linha (miniatura + texto), que é o formato que enche a
   largura com 1, 2, 3 ou 6 itens sem abrir buraco, e que se lê mais rápido num
   contexto técnico. A moldura saiu junto: o que separa uma linha da outra é
   filete, a mesma língua do resto da ficha.
   ============================================================================ */

export type ItemCrossSell = {
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

export type DadosCrossSell = {
  acessorios: ItemCrossSell[];
  complementos: ItemCrossSell[];
};

type ItemComTipo = ItemCrossSell & { tipo: "acessorio" | "complemento" };

const SELO: Record<ItemComTipo["tipo"], string> = {
  acessorio: "Acessório compatível",
  complemento: "Funciona junto",
};

function AdicionarAcessorio({ item }: { item: ItemCrossSell }) {
  const [estado, acao, pendente] = useActionState<EstadoCarrinho, FormData>(
    adicionarAoCarrinho,
    {},
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3">
      <form action={acao}>
        <input type="hidden" name="produtoId" value={item.id} />
        <input type="hidden" name="quantidade" value="1" />
        <button
          type="submit"
          disabled={pendente}
          className="foco-jb inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-graf-300 px-3 text-xs font-extrabold text-graf-900 transition-colors hover:border-graf-400 hover:bg-graf-50 disabled:cursor-wait disabled:opacity-65"
        >
          {estado.ok ? (
            <Check className="size-3.5 text-ok-700" aria-hidden />
          ) : (
            <ShoppingCart className="size-3.5" aria-hidden />
          )}
          {pendente ? "Adicionando…" : estado.ok ? "Adicionado" : "Adicionar"}
        </button>
      </form>

      <div aria-live="polite" className="texto-apoio min-h-4">
        {estado.ok ? (
          <Link
            href="/carrinho"
            className="foco-jb inline-flex min-h-9 items-center font-bold text-ok-700 underline underline-offset-2"
          >
            Ver carrinho
          </Link>
        ) : estado.erro ? (
          <span className="text-perigo-700">{estado.erro}</span>
        ) : null}
      </div>
    </div>
  );
}

function LinhaProduto({ item }: { item: ItemComTipo }) {
  return (
    <article className="group grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-4 border-t border-hairline py-4">
      <Link
        href={`/loja/${item.slug}`}
        className="foco-jb relative aspect-square overflow-hidden rounded-xl bg-graf-50"
        aria-label={`Ver ${item.nome}`}
      >
        {item.imagem ? (
          <Image
            src={item.imagem}
            alt=""
            fill
            sizes="72px"
            className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-center micro text-graf-400">
            Sem foto
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <p className="micro text-graf-500">{SELO[item.tipo]}</p>
        <Link
          href={`/loja/${item.slug}`}
          className="foco-jb mt-0.5 block text-sm font-extrabold leading-5 text-graf-950 hover:text-jb-700"
        >
          {item.nome}
        </Link>
        {item.descricao ? (
          <p className="mt-1 line-clamp-2 texto-apoio text-graf-500">{item.descricao}</p>
        ) : null}

        <p className="tabular mt-2 text-sm font-extrabold text-graf-950">
          {item.precoCents === null ? "Sob orçamento" : formatarPreco(item.precoCents)}
        </p>

        {item.tipo === "acessorio" && item.compraRapida ? (
          <AdicionarAcessorio item={item} />
        ) : (
          <Link
            href={`/loja/${item.slug}`}
            className="foco-jb mt-1 inline-flex min-h-9 items-center gap-1.5 text-xs font-extrabold text-jb-700 hover:text-jb-800"
          >
            Ver produto
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

export type ProdutoDoConjunto = {
  id: string;
  nome: string;
  precoCents: number | null;
  imagem: string | null;
  alt: string;
};

export function CrossSellIntencional({
  dados,
  produto,
}: {
  dados: DadosCrossSell;
  /** O próprio equipamento da ficha. Sem ele não há conjunto — só lista. */
  produto?: ProdutoDoConjunto;
}) {
  const itens: ItemComTipo[] = [
    ...dados.acessorios.map((item) => ({ ...item, tipo: "acessorio" as const })),
    ...dados.complementos.map((item) => ({ ...item, tipo: "complemento" as const })),
  ];

  if (itens.length === 0) return null;

  /* O conjunto lista EXATAMENTE o que o botão vai adicionar.

     A primeira versão exigia que todos os relacionados fossem compráveis, e
     com isso o bloco não aparecia nunca: o catálogo tem acessório vinculado
     que está sob orçamento ou sem estoque. Somar esses no total anunciaria um
     número que a pessoa não consegue pagar; escondê-los do total mas
     adicioná-los ao carrinho seria pior.

     Então o conjunto é o equipamento mais os relacionados que dá para comprar
     agora — e o total é a soma desses. Quem ficou de fora continua na lista
     acima, com "Ver produto". */
  const compraveis = itens.filter((item) => item.compraRapida && (item.precoCents ?? 0) > 0);
  const conjunto =
    produto && (produto.precoCents ?? 0) > 0 && compraveis.length > 0
      ? {
          itens: compraveis,
          totalCents:
            (produto.precoCents ?? 0) +
            compraveis.reduce((soma, item) => soma + (item.precoCents ?? 0), 0),
        }
      : null;

  return (
    <section
      id="relacionados-do-produto"
      aria-labelledby="relacionados-do-produto-titulo"
      className="scroll-mt-[var(--jb-topo-secoes)] border-t border-graf-200 py-8 lg:py-10"
    >
      <header className="mb-2 max-w-2xl lg:mb-3">
        <h2 id="relacionados-do-produto-titulo" className="text-bloco text-graf-950">
          Para completar este equipamento
        </h2>
        <p className="texto-apoio mt-1.5 text-graf-600">
          Acessórios e produtos de uso conjunto que a JB vinculou a este modelo no catálogo — não é
          sugestão automática por categoria.
        </p>
      </header>

      <div className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
        {itens.slice(0, 6).map((item) => (
          <LinhaProduto key={item.id} item={item} />
        ))}
      </div>

      <p className="texto-apoio mt-4 flex items-start gap-2 text-graf-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok-700" aria-hidden />
        Compatibilidade conferida pela equipe técnica da JB.
      </p>

      {/* O conjunto como uma linha só.

          Levar o equipamento mais os acessórios para o carrinho eram três
          cliques em três formulários, cada um recarregando a página no meio da
          decisão. Aqui é o total somado e uma ação — que continua dentro da
          loja, em vez de jogar a pessoa no WhatsApp com um texto pronto. */}
      {conjunto ? (
        <div className="mt-6 rounded-2xl border border-graf-200 bg-surface p-5 sm:p-6">
          <p className="micro text-jb-700">Curadoria JB</p>
          <ul className="mt-3 grid gap-2">
            <li className="flex items-center gap-4 rounded-xl border border-jb-500 bg-jb-50 p-3.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-apoio font-bold text-graf-950">
                  {produto!.nome}
                </span>
                <span className="micro text-graf-500">Este equipamento</span>
              </span>
              <span className="tabular shrink-0 text-apoio font-black text-graf-950">
                {formatarPreco(produto!.precoCents!)}
              </span>
            </li>
            {conjunto.itens.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-graf-200 p-3.5"
              >
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/loja/${item.slug}`}
                    className="foco-jb block truncate text-apoio font-bold text-graf-950 hover:text-jb-700"
                  >
                    {item.nome}
                  </Link>
                  <span className="micro text-graf-500">{SELO[item.tipo]}</span>
                </span>
                <span className="tabular shrink-0 text-apoio font-black text-graf-950">
                  {formatarPreco(item.precoCents!)}
                </span>
              </li>
            ))}
          </ul>

          <form
            action={adicionarConjuntoAoCarrinho}
            className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-graf-200 pt-5"
          >
            <input type="hidden" name="produtoId" value={produto!.id} />
            {conjunto.itens.map((item) => (
              <input key={item.id} type="hidden" name="produtoId" value={item.id} />
            ))}
            <p className="text-apoio text-graf-700">
              Conjunto completo:{" "}
              <strong className="tabular text-lg text-graf-950">
                {formatarPreco(conjunto.totalCents)}
              </strong>
            </p>
            <button
              type="submit"
              className="botao-jb foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-apoio"
            >
              <ShoppingCart className="size-4" aria-hidden />
              Adicionar o conjunto
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
