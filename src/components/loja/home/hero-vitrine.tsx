import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CreditCard, ImageOff, ShieldCheck, Wrench } from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";

/* ============================================================================
   Abertura da home

   A dobra faz três coisas, nessa ordem: diz o que a JB resolve, prova com
   número do próprio catálogo e mostra um equipamento de verdade.

   O fundo é preto porque o argumento é o texto. Nas páginas de coleção o
   preto está a serviço do produto — aqui ele está a serviço da frase, e o
   vermelho marca a parte dela que o cliente precisa levar embora.
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
    <section className="on-dark relative isolate overflow-hidden bg-chrome text-white">
      <div aria-hidden className="malha-escura pointer-events-none absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 90% at 78% 12%, rgb(224 20 27 / 0.28), transparent 60%)",
        }}
      />

      <div className="container-jb grid items-center gap-x-12 gap-y-10 py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-20 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="max-w-3xl">
          <p className="micro text-jb-400">
            Estoque próprio{cidade ? ` · ${cidade}` : ""}
          </p>

          {/* Duas frases numa: o que a pessoa quer fazer e o medo que ela tem
              de fazer errado. O vermelho fica na segunda metade — é o risco
              que a JB se propõe a tirar da mesa. */}
          <h1 className="manchete mt-5 text-[clamp(2.5rem,1.6rem+4vw,4.5rem)] text-white">
            Equipar consultório{" "}
            <span className="text-jb-500">sem apostar no escuro.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-white/70">
            Catálogo de equipamentos novos e seminovos revisados, com ficha técnica completa,
            comparação lado a lado e a mesma equipe que dá assistência depois da venda.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="micro flex h-12 items-center gap-2 rounded-xs bg-jb-500 px-6 text-white transition-colors hover:bg-jb-600"
            >
              Ver catálogo completo
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link
              href="/seminovos"
              className="micro flex h-12 items-center gap-2 rounded-xs border border-white/25 px-6 text-white transition-colors hover:bg-white/10"
            >
              Seminovos revisados
            </Link>
          </div>

          {/* Os números saem do catálogo publicado. Nenhum é redondo de
              propósito: número redondo em vitrine cheira a enfeite. */}
          {numeros.length > 0 ? (
            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/15 pt-7">
              {numeros.map((numero) => (
                <div key={numero.rotulo}>
                  <dt className="micro text-white/45">{numero.rotulo}</dt>
                  <dd className="numero mt-2 text-3xl text-jb-400">{numero.valor}</dd>
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
            className="group placa block overflow-hidden text-graf-950 transition-transform duration-200 ease-out-quint hover:-translate-y-1"
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
              <span className="micro absolute left-4 top-4 rounded-xs bg-jb-500 px-2 py-1.5 text-white">
                Mais procurado
              </span>
            </div>

            <div className="border-t border-hairline p-5">
              {destaque.brandName ? (
                <p className="micro text-graf-500">{destaque.brandName}</p>
              ) : null}
              <p className="mt-2 line-2 text-[0.9375rem] font-semibold leading-snug">
                {destaque.name}
              </p>
              <p className="numero mt-3 text-2xl">{formatarPreco(destaque.priceCents)}</p>
              {parcelas ? (
                <p className="micro mt-1.5 text-graf-500">
                  {parcelas.parcelas}x {formatarPreco(parcelas.valorCents)}
                </p>
              ) : null}
            </div>
          </Link>
        ) : null}
      </div>

      <div className="border-t border-chrome-line">
        <ul className="container-jb grid gap-x-10 gap-y-6 py-7 sm:grid-cols-2 lg:grid-cols-4">
          {GARANTIAS.map((garantia) => (
            <li key={garantia.titulo} className="flex items-start gap-3">
              <garantia.icone className="mt-0.5 size-4 shrink-0 text-jb-500" aria-hidden />
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-semibold text-white">{garantia.titulo}</p>
                <p className="micro mt-1.5 text-white/45">{garantia.apoio}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
