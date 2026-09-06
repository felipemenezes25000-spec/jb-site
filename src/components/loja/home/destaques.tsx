import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import {
  BlocoPreco,
  CONDICAO_HOME,
  fotoDe,
  lerParcelamento,
  SELECAO_HOME,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const PUBLICADO = { status: "active" } as const;
const NA_VITRINE = 4;

async function carregar() {
  const marcados = await prisma.product.findMany({
    where: { ...PUBLICADO, featured: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: NA_VITRINE,
    select: SELECAO_HOME,
  });

  if (marcados.length > 0) return { produtos: marcados, curados: true };

  const recentes = await prisma.product.findMany({
    where: PUBLICADO,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: NA_VITRINE,
    select: SELECAO_HOME,
  });

  return { produtos: recentes, curados: false };
}

export async function SecaoDestaques() {
  const [{ produtos, curados }, s] = await Promise.all([carregar(), getSettings()]);
  if (produtos.length === 0) return null;

  const parcelamento = lerParcelamento(s);

  return (
    <Secao fundo="clara" espaco="lg" separador classNameInterno="max-w-[112rem]">
      <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            {curados ? "Seleção JB" : "Novidades"}
          </p>
          <h2 className="mt-3 max-w-3xl text-section text-graf-950">
            {curados ? "Equipamentos que merecem sua atenção agora." : "Chegaram novos equipamentos ao catálogo."}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-graf-500">
            Compare condição, preço e forma de compra sem perder de vista o suporte depois da entrega.
          </p>
        </div>

        <Link href="/loja" className="group inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jb-700 hover:text-jb-900">
          Ver catálogo completo
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {produtos.map((produto) => (
          <li key={produto.slug} className="min-w-0">
            <CartaoDestaque produto={produto} parcelamento={parcelamento} />
          </li>
        ))}
      </ul>
    </Secao>
  );
}

export function CartaoDestaque({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.4rem] border border-graf-200 bg-white shadow-[0_14px_42px_-36px_rgba(50,0,0,0.28)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-jb-200 hover:shadow-[0_24px_58px_-34px_rgba(103,0,0,0.34)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(145deg,#ffffff_0%,#fafafa_100%)]">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 24vw"
            className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.055]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-200" aria-hidden>
            <ImageOff className="size-11" />
          </span>
        )}
        <span className="absolute left-4 top-4">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col border-t border-graf-100 p-5 sm:p-6">
        {produto.brand ? (
          <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-jb-700">{produto.brand.name}</p>
        ) : null}
        <h3 className="mt-1.5 line-2 min-h-[3.1rem] text-lg font-extrabold leading-snug text-graf-950 transition-colors group-hover:text-jb-700">
          {produto.name}
        </h3>
        <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-4" />

        <span className="mt-5 flex min-h-11 items-center justify-between gap-3 border-t border-graf-100 pt-4 text-sm font-extrabold text-jb-700">
          Ver equipamento
          <span className="flex size-9 items-center justify-center rounded-full border border-jb-100 transition-colors group-hover:bg-jb-600 group-hover:text-white">
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </span>
      </div>
    </Link>
  );
}
