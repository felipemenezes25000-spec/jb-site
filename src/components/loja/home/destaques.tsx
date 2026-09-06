import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import {
  BlocoPreco,
  CONDICAO_HOME,
  disponibilidadeDe,
  fotoDe,
  lerParcelamento,
  SELECAO_HOME,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

/* ============================================================================
   Equipamentos em destaque

   A vitrine usa hierarquia de verdade: um equipamento principal ocupa a área
   que merece, e os demais funcionam como atalhos. Quatro cards idênticos eram
   visualmente corretos e comercialmente mornos — nada dizia para onde olhar.
   ============================================================================ */

const PUBLICADO = { status: "active" } as const;
const NA_VITRINE = 5;

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

  const [principal, ...secundarios] = produtos;
  const parcelamento = lerParcelamento(s);

  return (
    <Secao fundo="clara" espaco="lg" separador>
      <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-graf-500">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            {curados ? "Em destaque" : "Novidades"}
          </p>
          <h2 className="mt-3 text-section text-graf-950">
            {curados ? "Equipamentos escolhidos pela JB" : "Últimos equipamentos publicados"}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-graf-600">
            Preço, condição e disponibilidade vêm do catálogo — sem vitrine paralela e sem informação desatualizada.
          </p>
        </div>

        <Link
          href="/loja"
          className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-graf-800 transition-colors hover:text-jb-700 sm:self-auto"
        >
          Ver todos os equipamentos
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:gap-5">
        <CartaoPrincipal produto={principal} parcelamento={parcelamento} />

        {secundarios.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-rows-2 xl:gap-5">
            {secundarios.map((produto) => (
              <li key={produto.slug} className="flex min-w-0">
                <CartaoCompacto produto={produto} parcelamento={parcelamento} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Secao>
  );
}

function CartaoPrincipal({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];
  const estado = disponibilidadeDe(produto);

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group grid min-h-[31rem] overflow-hidden rounded-[1.75rem] border border-graf-200 bg-white shadow-card transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-graf-300 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 md:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]"
    >
      <div className="relative min-h-72 overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#fff_0%,#fff_45%,#f2f3f4_100%)] md:min-h-full">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 768px) 92vw, 44vw"
            className="object-contain p-6 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] sm:p-8 lg:p-10"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-graf-300" aria-hidden>
            <ImageOff className="size-12" />
          </span>
        )}

        <span className="absolute left-5 top-5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex min-w-0 flex-col justify-center border-t border-graf-200 p-6 sm:p-8 md:border-l md:border-t-0 xl:p-9">
        {produto.brand ? (
          <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-graf-500">
            {produto.brand.name}
          </p>
        ) : null}
        <h3 className="mt-2 text-[clamp(1.75rem,2.3vw,2.7rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-graf-950 transition-colors group-hover:text-jb-700">
          {produto.name}
        </h3>
        {produto.model ? <p className="mt-2 text-sm text-graf-500">{produto.model}</p> : null}

        <BlocoPreco produto={produto} parcelamento={parcelamento} tamanho="lg" className="mt-7" />

        <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-graf-100 pt-6">
          <Etiqueta tom={estado.tom} ponto>
            {estado.texto}
          </Etiqueta>
          <span className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jb-700 transition-transform group-hover:translate-x-1">
            Ver equipamento
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CartaoCompacto({
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
      className="group grid w-full min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-graf-200 bg-white transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:grid-cols-1 lg:grid-cols-[8.5rem_minmax(0,1fr)] xl:grid-cols-[9.5rem_minmax(0,1fr)]"
    >
      <div className="relative min-h-40 overflow-hidden bg-gradient-to-br from-white to-graf-50 sm:min-h-48 lg:min-h-full">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 35vw, (max-width: 1280px) 42vw, 16vw"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.05] sm:p-4"
          />
        ) : null}
        <span className="absolute left-3 top-3 scale-90 origin-top-left">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex min-w-0 flex-col justify-center border-l border-graf-200 p-4 sm:border-l-0 sm:border-t lg:border-l lg:border-t-0 xl:p-5">
        {produto.brand ? (
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.12em] text-graf-500">
            {produto.brand.name}
          </p>
        ) : null}
        <h3 className="mt-1.5 line-2 text-base font-extrabold leading-snug text-graf-950 transition-colors group-hover:text-jb-700 xl:text-lg">
          {produto.name}
        </h3>
        <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-4" />
        <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-extrabold text-jb-700">
          Ver equipamento
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** Mantido exportado para quem já usa o cartão de destaque fora desta faixa. */
export function CartaoDestaque(props: { produto: ProdutoHome; parcelamento: Parcelamento }) {
  return <CartaoCompacto {...props} />;
}
