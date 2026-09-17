import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, ImageOff, ShoppingCart } from "lucide-react";

import { adicionarAoCarrinhoDoCartao } from "@/app/acoes/carrinho";
import { alternarFavorito } from "@/app/acoes/minha-jb";
import { BotaoComparar } from "@/components/loja/comparador-cliente";
import { BotaoEnvio } from "@/components/ui/botao-envio";
import { Etiqueta } from "@/components/ui/data";
import { claimsDoCartao, type Parcelamento } from "@/domain/catalogo/cartao";
import type { TomDaDisponibilidade } from "@/domain/catalogo/disponibilidade";
import type { DestaqueTecnico } from "@/lib/comercio/destaques-card";
import { formatarPreco, semQuebraNaUnidade } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

export type ProdutoCard = {
  /** Chave do produto — usada por quem precisa agir sobre ele (guardar, etc.). */
  id: string;
  slug: string;
  name: string;
  model: string;
  condition: "novo" | "seminovo" | "usado" | "recondicionado";
  priceCents: number;
  compareAtCents: number | null;
  allowDirectPurchase: boolean;
  trackInventory: boolean;
  stock: number;
  unique: boolean;
  brandName: string | null;
  imageUrl: string | null;
  imageAlt: string;
  /** Só o catálogo traz: dois atributos que decidem, lidos da ficha. */
  destaques?: DestaqueTecnico[];
  /** Fallback da linha da marca quando o produto não tem marca cadastrada. */
  categoryName?: string | null;
};

export type { Parcelamento };

export type VarianteDoCartao = "grade" | "trilho";

export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "neutro" as const },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" as const },
  usado: { rotulo: "Usado", tom: "neutro" as const },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" as const },
};

const COR_DA_DISPONIBILIDADE: Record<TomDaDisponibilidade, { texto: string; ponto: string }> = {
  esgotado: { texto: "text-graf-500", ponto: "bg-graf-400" },
  unico: { texto: "text-jb-700", ponto: "bg-jb-500" },
  pouco: { texto: "text-warn-700", ponto: "bg-warn-500" },
  ok: { texto: "text-ok-700", ponto: "bg-ok-500" },
  "sob-encomenda": { texto: "text-graf-600", ponto: "bg-graf-400" },
};

export function CardProduto({
  produto,
  variante = "grade",
  prioridade,
  parcelamento,
  favoritado = false,
  voltar,
  nivelDoTitulo = "h3",
  className,
}: {
  produto: ProdutoCard;
  variante?: VarianteDoCartao;
  prioridade?: boolean;
  parcelamento?: Parcelamento;
  /** Já guardado por quem está logado. */
  favoritado?: boolean;
  /** Endereço desta listagem, para o formulário de favorito voltar para cá. */
  voltar?: string;
  nivelDoTitulo?: "h2" | "h3";
  className?: string;
}) {
  const claims = claimsDoCartao(produto, parcelamento);
  const condicao = CONDICAO[produto.condition];
  const corDoEstado = COR_DA_DISPONIBILIDADE[claims.disponibilidade.tom];
  const esgotado = claims.faixaDeEsgotado !== null;
  const podeComprar = claims.preco !== "Sob orçamento" && !esgotado;
  const Titulo = nivelDoTitulo;
  const destaques = produto.destaques?.slice(0, 2) ?? [];
  const noTrilho = variante === "trilho";

  return (
    <article
      data-cartao-produto
      data-motion-product-card
      className={cn(
        "placa group relative isolate flex flex-col overflow-hidden",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out-quint",
        "hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-raised",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div
        data-palco-imagem-produto
        className={cn(
          "relative overflow-hidden bg-surface",
          noTrilho ? "aspect-3/2 max-h-72 sm:aspect-4/3" : "p-4",
        )}
      >
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </div>

        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            {...(noTrilho
              ? { fill: true, sizes: "(max-width: 640px) 94vw, (max-width: 1024px) 46vw, 24vw" }
              : { width: 512, height: 512, sizes: "(max-width: 640px) 60vw, 12rem" })}
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            className={cn(
              "object-contain transition-transform duration-500 ease-out-quint",
              "group-hover:scale-[1.03] motion-reduce:transform-none",
              noTrilho ? "p-3" : "mx-auto aspect-square w-full max-w-[12rem]",
              esgotado && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 text-graf-500",
              noTrilho ? "size-full" : "mx-auto aspect-square w-full max-w-[12rem]",
            )}
          >
            <ImageOff className="size-6" aria-hidden />
            <span className="micro">Foto em cadastro</span>
          </div>
        )}

        {claims.faixaDeEsgotado ? (
          <p
            aria-hidden
            className="micro absolute inset-x-0 bottom-0 z-10 bg-graf-950/90 py-2 text-center text-white"
          >
            {claims.faixaDeEsgotado}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-graf-200 p-4">
        {produto.brandName || produto.categoryName ? (
          <p className="micro truncate text-graf-500">
            {produto.brandName || produto.categoryName}
          </p>
        ) : null}

        <Titulo className="mt-2 line-clamp-2 min-h-10 text-corpo leading-snug font-bold text-graf-950">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-jb-700"
          >
            {semQuebraNaUnidade(produto.name)}
          </Link>
        </Titulo>

        {destaques.length > 0 ? (
          <dl className="mt-3 grid gap-1.5 border-t border-graf-100 pt-3">
            {destaques.map((item) => (
              <div
                key={`${item.rotulo}-${item.valor}`}
                className="flex min-w-0 justify-between gap-2 text-xs"
              >
                <dt className="truncate text-graf-500">{item.rotulo}</dt>
                <dd className="truncate font-semibold text-graf-800">{item.valor}</dd>
              </div>
            ))}
          </dl>
        ) : produto.model ? (
          <p className="micro mt-1.5 truncate text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex h-4 items-center">
            {claims.precoAnteriorCents ? (
              <span className="micro tabular text-graf-500 line-through">
                {formatarPreco(claims.precoAnteriorCents)}
              </span>
            ) : null}
          </div>

          <p className="numero text-[1.45rem] leading-8 text-graf-950">{claims.preco}</p>
          <p className="micro tabular min-h-5 truncate text-graf-500">{claims.pagamento}</p>

          <p className={cn("micro mt-2.5 flex items-center gap-1.5", corDoEstado.texto)}>
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", corDoEstado.ponto)} />
            {claims.disponibilidade.texto}
          </p>
        </div>

        <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-graf-100 pt-3">
          {podeComprar ? (
            <form action={adicionarAoCarrinhoDoCartao} className="min-w-0 flex-1">
              <input type="hidden" name="produtoId" value={produto.id} />
              <BotaoEnvio
                pendente="Adicionando..."
                className="relative z-10 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-jb-500 px-3 text-apoio font-bold text-white transition-colors hover:bg-jb-600"
              >
                <ShoppingCart className="size-4" aria-hidden />
                Comprar
              </BotaoEnvio>
            </form>
          ) : (
            <Link
              href={`/loja/${produto.slug}`}
              className="relative z-10 inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-graf-450 px-3 text-apoio font-bold text-graf-900 hover:border-jb-500 hover:text-jb-700"
            >
              Ver detalhes
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}

          <BotaoComparar produtoId={produto.id} />

          <form action={alternarFavorito}>
            <input type="hidden" name="produtoId" value={produto.id} />
            {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
            <button
              type="submit"
              aria-label={favoritado ? `Remover ${produto.name} dos favoritos` : `Favoritar ${produto.name}`}
              aria-pressed={favoritado}
              className={cn(
                "relative z-10 inline-flex size-11 items-center justify-center rounded-lg border transition-colors",
                favoritado
                  ? "border-jb-200 bg-jb-50 text-jb-700"
                  : "border-graf-450 text-graf-700 hover:border-jb-500 hover:text-jb-700",
              )}
            >
              <Heart className={cn("size-4", favoritado && "fill-current")} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
