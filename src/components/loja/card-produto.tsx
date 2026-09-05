import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, PackageCheck } from "lucide-react";

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

export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "ok" as const },
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
      ? Math.round(((produto.compareAtCents - produto.priceCents) / produto.compareAtCents) * 100)
      : 0;

  return (
    <article
      className={cn(
        "hover-lift group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white",
        className,
      )}
    >
      <Link
        href={`/loja/${produto.slug}`}
        aria-label={`Ver ${produto.name}`}
        className="absolute inset-0 z-10 rounded-2xl"
      />

      <div className="relative aspect-[1.12/1] overflow-hidden border-b border-graf-100 bg-gradient-to-b from-white to-graf-50/80">
        {produto.imageUrl ? (
          <Image
            src={produto.imageUrl}
            alt={produto.imageAlt || produto.name}
            fill
            priority={prioridade}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            className={cn(
              "object-contain p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] sm:p-6",
              semEstoque && "opacity-55 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-graf-300">
            <ImageOff className="size-9" aria-hidden />
          </div>
        )}

        <div className="absolute left-3.5 top-3.5 z-20 flex max-w-[75%] flex-wrap gap-1.5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {desconto >= 5 && !semEstoque ? <Etiqueta tom="marca">−{desconto}%</Etiqueta> : null}
        </div>

        {semEstoque ? (
          <div className="absolute inset-x-0 bottom-0 bg-graf-950/90 py-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] text-white backdrop-blur">
            {produto.unique ? "Unidade vendida" : "Indisponível no momento"}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="min-h-[4.5rem]">
          {produto.brandName ? (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-graf-400">
              {produto.brandName}
            </p>
          ) : null}
          <h3 className="mt-1.5 line-2 text-[0.95rem] font-extrabold leading-[1.35] tracking-[-0.025em] text-graf-950 sm:text-base">
            {produto.name}
          </h3>
          {produto.model ? <p className="mt-1 text-xs text-graf-500">{produto.model}</p> : null}
        </div>

        <div className="mt-auto pt-4">
          {soOrcamento ? (
            <div>
              <p className="text-lg font-extrabold tracking-[-0.02em] text-graf-950">Sob orçamento</p>
              <p className="mt-1 text-xs text-graf-500">Fale com a equipe para receber uma proposta.</p>
            </div>
          ) : (
            <>
              {produto.compareAtCents && produto.compareAtCents > produto.priceCents ? (
                <p className="text-xs text-graf-400 line-through">{formatarPreco(produto.compareAtCents)}</p>
              ) : (
                <div className="h-4" aria-hidden />
              )}
              <p className="text-xl font-extrabold tracking-[-0.04em] text-graf-950">
                {formatarPreco(produto.priceCents)}
              </p>
              {parcelas ? (
                <p className="mt-1 text-xs leading-5 text-graf-500">
                  em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </p>
              ) : null}
            </>
          )}

          <div className="mt-4 min-h-5">
            {poucasUnidades ? (
              <p className="text-xs font-bold text-warn-700">Últimas {produto.stock} unidades</p>
            ) : produto.unique && !semEstoque ? (
              <p className="flex items-center gap-1.5 text-xs font-bold text-jb-700">
                <PackageCheck className="size-3.5" aria-hidden /> Unidade única
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-graf-100 pt-4 text-sm font-extrabold text-jb-700">
            <span>{soOrcamento ? "Ver detalhes" : "Ver equipamento"}</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </div>
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
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4", className)}>
      {produtos.map((produto, i) => (
        <li key={produto.slug} className="flex min-w-0">
          <CardProduto produto={produto} prioridade={i < 4} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
