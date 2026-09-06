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
    <Secao
      fundo="branco"
      espaco="lg"
      separador
      className="border-t-4 border-jb-500"
      classNameInterno="max-w-[112rem]"
    >
      <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            {curados ? "Em destaque" : "Novidades"}
          </p>
          <h2 className="mt-3 text-section text-graf-950">
            {curados ? "Equipamentos escolhidos pela JB" : "Últimos equipamentos publicados"}
          </h2>
        </div>

        <Link href="/loja" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jb-700 hover:text-jb-900">
          Ver todos os equipamentos
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
      className="group flex h-full min-w-0 flex-col border-t-2 border-jb-100 bg-white pt-4 transition-colors hover:border-jb-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 24vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-200" aria-hidden>
            <ImageOff className="size-11" />
          </span>
        )}
        <span className="absolute left-2 top-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col pt-4">
        {produto.brand ? (
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-jb-700">{produto.brand.name}</p>
        ) : null}
        <h3 className="mt-1.5 line-2 text-lg font-extrabold leading-snug text-graf-950 group-hover:text-jb-700">{produto.name}</h3>
        <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-4" />
        <span className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-sm font-extrabold text-jb-700">
          Ver equipamento
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
