import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ProdutoCard = {
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
};

/** Rótulo e tom de cada condição. Texto sempre presente — nunca só a cor. */
export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "neutro" as const },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" as const },
  usado: { rotulo: "Usado", tom: "neutro" as const },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" as const },
};

export function CardProduto({
  produto,
  prioridade,
  className,
}: {
  produto: ProdutoCard;
  prioridade?: boolean;
  className?: string;
}) {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const poucasUnidades =
    produto.trackInventory && !produto.unique && produto.stock > 0 && produto.stock <= 3;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = soOrcamento ? null : calcularParcelas(produto.priceCents);
  const condicao = CONDICAO[produto.condition];

  const desconto =
    produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? Math.round(
          ((produto.compareAtCents - produto.priceCents) / produto.compareAtCents) * 100,
        )
      : 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow] duration-200 hover:border-graf-300 hover:shadow-raised",
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden bg-graf-50">
        {produto.imageUrl ? (
          <Image
            src={produto.imageUrl}
            alt={produto.imageAlt || produto.name}
            fill
            priority={prioridade}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
            className={cn(
              "object-contain p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-graf-300">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {desconto >= 5 && !semEstoque ? (
            <Etiqueta tom="ok">−{desconto}%</Etiqueta>
          ) : null}
        </div>

        {semEstoque ? (
          <div className="absolute inset-x-0 bottom-0 bg-graf-900/85 py-2 text-center text-xs font-bold uppercase tracking-wide text-white">
            {produto.unique ? "Vendido" : "Indisponível"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {produto.brandName ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-graf-400">
            {produto.brandName}
          </p>
        ) : null}

        <h3 className="mt-1 line-2 text-[0.9375rem] font-bold leading-snug text-graf-900">
          <Link href={`/loja/${produto.slug}`} className="after:absolute after:inset-0">
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="mt-0.5 text-xs text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          {soOrcamento ? (
            <p className="text-sm font-bold text-graf-800">Sob orçamento</p>
          ) : (
            <>
              {produto.compareAtCents && produto.compareAtCents > produto.priceCents ? (
                <p className="text-xs text-graf-400 line-through">
                  {formatarPreco(produto.compareAtCents)}
                </p>
              ) : null}
              <p className="text-lg font-extrabold tracking-tight text-graf-950">
                {formatarPreco(produto.priceCents)}
              </p>
              {parcelas ? (
                <p className="mt-0.5 text-xs text-graf-500">
                  em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </p>
              ) : null}
            </>
          )}

          {poucasUnidades ? (
            <p className="mt-2 text-xs font-semibold text-warn-700">
              Últimas {produto.stock} unidades
            </p>
          ) : null}
          {produto.unique && !semEstoque ? (
            <p className="mt-2 text-xs font-semibold text-jb-700">Unidade única</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function GradeProdutos({
  produtos,
  className,
}: {
  produtos: ProdutoCard[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4",
        className,
      )}
    >
      {produtos.map((produto, i) => (
        <li key={produto.slug} className="flex">
          <CardProduto produto={produto} prioridade={i < 4} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
