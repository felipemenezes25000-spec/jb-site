import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CreditCard, ImageOff, ShieldCheck, Wrench } from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";

/* ============================================================================
   Abertura da home

   A dobra faz três coisas, nessa ordem: diz o que a JB resolve, prova com
   número do próprio catálogo e mostra um equipamento de verdade.

   O fundo é claro. Chegou a ser preto por um dia, copiado de um protótipo, e
   o resultado foi ruim por dois motivos: texto branco em área grande cansa a
   leitura, e a foto de equipamento — que é branca sobre branco — ficava
   ilhada num buraco escuro. O vermelho continua sendo o sinal, e ele acende
   melhor sobre claro, que é o que o design system da JB sempre disse.
   ============================================================================ */

export type NumeroDaHome = { valor: string; rotulo: string };

const GARANTIAS = [
  { icone: ShieldCheck, titulo: "Laudo técnico no seminovo", apoio: "Item a item, antes de anunciar" },
  { icone: Wrench, titulo: "Assistência própria", apoio: "Equipe JB, sem terceirizar" },
  { icone: CreditCard, titulo: "12x sem juros", apoio: "No cartão, em todo o catálogo" },
  { icone: CalendarCheck, titulo: "Entrega agendada", apoio: "Instalação combinada com a clínica" },
];

export function HeroVitrine({
  cidade,
  numeros,
  destaque,
  parcelamento,
}: {
  cidade?: string;
  numeros: NumeroDaHome[];
  destaque: ProdutoCard | null;
  parcelamento?: { max: number; minimoCents: number };
}) {
  const parcelas =
    destaque && destaque.priceCents > 0
      ? calcularParcelas(destaque.priceCents, parcelamento?.max, parcelamento?.minimoCents)
      : null;

  return (
    <section className="relative isolate overflow-hidden border-b border-graf-200">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 90% at 82% 10%, rgb(224 20 27 / 0.07), transparent 58%), linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #fafafa 100%)",
        }}
      />

      <div className="container-jb grid items-center gap-x-12 gap-y-10 py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-20 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="max-w-3xl">
          <p className="sobretitulo">Estoque próprio{cidade ? ` · ${cidade}` : ""}</p>

          {/* Duas frases numa: o que a pessoa quer fazer e o medo que ela tem
              de fazer errado. O vermelho fica na segunda metade — é o risco
              que a JB se propõe a tirar da mesa. */}
          <h1 className="mt-4 text-hero text-graf-950">
            Equipar consultório <span className="text-jb-600">sem apostar no escuro.</span>
          </h1>

          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            Catálogo de equipamentos novos e seminovos revisados, com ficha técnica completa,
            comparação lado a lado e a mesma equipe que dá assistência depois da venda.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="foco-jb flex h-12 items-center gap-2 rounded-lg bg-jb-500 px-6 text-[0.9375rem] font-bold text-white transition-colors hover:bg-jb-600"
            >
              Ver catálogo completo
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/seminovos"
              className="foco-jb flex h-12 items-center gap-2 rounded-lg border border-graf-300 bg-white px-6 text-[0.9375rem] font-bold text-graf-800 transition-colors hover:border-graf-450 hover:bg-graf-50"
            >
              Seminovos revisados
            </Link>
          </div>

          {/* Os números saem do catálogo publicado. Nenhum é redondo de
              propósito: número redondo em vitrine cheira a enfeite. */}
          {numeros.length > 0 ? (
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-graf-200 pt-7">
              {numeros.map((numero) => (
                <div key={numero.rotulo}>
                  <dt className="micro text-graf-500">{numero.rotulo}</dt>
                  <dd className="numero mt-2 text-3xl text-jb-600">{numero.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {/* Um equipamento de verdade, com preço de verdade, na primeira tela.
            Sem produto com foto cadastrada o painel não entra — melhor uma
            dobra mais curta do que uma moldura vazia. */}
        {destaque ? (
          <Link
            href={`/loja/${destaque.slug}`}
            className="group placa block overflow-hidden transition-[transform,box-shadow] duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-raised"
          >
            <div className="relative aspect-square max-h-80 bg-white">
              {destaque.imageUrl ? (
                <Image
                  src={destaque.imageUrl}
                  alt={destaque.imageAlt || destaque.name}
                  fill
                  preload
                  unoptimized={destaque.imageUrl.startsWith("/")}
                  sizes="(max-width: 1024px) 92vw, 25rem"
                  className="object-contain p-6 transition-transform duration-500 ease-out-quint group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-graf-400">
                  <ImageOff className="size-8" aria-hidden />
                </div>
              )}
              <span className="micro absolute left-4 top-4 rounded-md bg-jb-500 px-2.5 py-1.5 text-white">
                Mais procurado
              </span>
            </div>

            <div className="border-t border-graf-100 p-5">
              {destaque.brandName ? (
                <p className="micro text-graf-500">{destaque.brandName}</p>
              ) : null}
              <p className="mt-2 line-2 text-[0.9375rem] font-bold leading-snug text-graf-950">
                {destaque.name}
              </p>
              <p className="numero mt-3 text-2xl text-graf-950">
                {formatarPreco(destaque.priceCents)}
              </p>
              {parcelas ? (
                <p className="mt-1.5 text-[0.8125rem] text-graf-500">
                  em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </p>
              ) : null}
            </div>
          </Link>
        ) : null}
      </div>

      <div className="border-t border-graf-200 bg-surface-muted">
        <ul className="container-jb grid gap-x-10 gap-y-6 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {GARANTIAS.map((garantia) => (
            <li key={garantia.titulo} className="flex items-start gap-3">
              <garantia.icone className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-bold text-graf-900">{garantia.titulo}</p>
                <p className="mt-1 text-[0.8125rem] text-graf-500">{garantia.apoio}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
