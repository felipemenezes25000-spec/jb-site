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

      {/* A grade explícita é o que resolve a primeira dobra do celular.

          Em coluna única, o equipamento entrava DEPOIS de sobretítulo,
          título, parágrafo, dois botões e três números: em 390 × 844 a visita
          começava sem ver nada do que a JB vende
          (`docs/auditoria-visual-2026-09-08/24-home-mobile.png`). Aqui o
          painel do produto é o segundo filho, então no celular ele sobe para
          logo abaixo do título; no desktop a colocação por linha e coluna
          devolve exatamente o desenho anterior — texto à esquerda em duas
          linhas de grade, painel à direita ocupando as duas. */}
      <div className="container-jb grid items-center gap-x-12 gap-y-7 py-9 sm:py-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-y-10 lg:py-20 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="entrada max-w-3xl lg:col-start-1 lg:row-start-1">
          <p className="sobretitulo">Estoque próprio{cidade ? ` · ${cidade}` : ""}</p>

          {/* Duas frases numa: o que a pessoa quer fazer e o medo que ela tem
              de fazer errado. O vermelho fica na segunda metade — é o risco
              que a JB se propõe a tirar da mesa.

              O degrau menor até `sm` é de propósito: em 390px o `text-hero`
              cheio quebrava a frase em quatro linhas e sozinho empurrava a
              foto para fora da tela. Do tablet para cima nada muda. */}
          <h1 className="mt-4 text-[2.125rem] font-extrabold leading-[1.06] tracking-[-0.03em] text-graf-950 sm:text-hero">
            Equipar consultório <span className="text-jb-600">sem apostar no escuro.</span>
          </h1>

          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-graf-600 sm:mt-6 sm:texto-guia">
            Equipamentos novos e seminovos revisados, com ficha técnica completa e a mesma
            equipe que dá assistência depois da venda.
          </p>
        </div>

        {/* Um equipamento de verdade, com preço de verdade, na primeira tela.
            Sem produto com foto cadastrada o painel não entra — melhor uma
            dobra mais curta do que uma moldura vazia.

            No celular ele é deitado: uma foto quadrada com a largura inteira
            teria 358px de altura e comeria de volta o espaço que a subida
            economizou. Do `lg` para cima volta a ser o painel em pé. */}
        {destaque ? (
          <Link
            href={`/loja/${destaque.slug}`}
            className="entrada group placa flex overflow-hidden [animation-delay:140ms] transition-[transform,box-shadow] duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-raised lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:self-center"
          >
            <div className="relative aspect-square w-2/5 shrink-0 bg-white lg:max-h-80 lg:w-full">
              {destaque.imageUrl ? (
                <Image
                  src={destaque.imageUrl}
                  alt={destaque.imageAlt || destaque.name}
                  fill
                  preload
                  unoptimized={destaque.imageUrl.startsWith("/")}
                  sizes="(max-width: 1024px) 40vw, 25rem"
                  className="object-contain p-3 transition-transform duration-500 ease-out-quint group-hover:scale-[1.03] lg:p-6"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-graf-400">
                  <ImageOff className="size-8" aria-hidden />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 border-l border-graf-100 p-4 lg:border-l-0 lg:border-t lg:p-5">
              {/* A etiqueta saiu de cima da foto. Na versão deitada do celular
                  ela quebrava em duas linhas e cobria justamente o
                  equipamento — a peça que a dobra existe para mostrar. Aqui
                  ela é uma linha de rótulo, e a fotografia fica limpa nos dois
                  desenhos. */}
              <p className="micro inline-flex rounded-md bg-jb-500 px-2 py-1 text-white">
                Mais procurado
              </p>
              {destaque.brandName ? (
                <p className="micro mt-2.5 text-graf-500">{destaque.brandName}</p>
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

        <div className="entrada max-w-3xl [animation-delay:260ms] lg:col-start-1 lg:row-start-2">
          <div className="flex flex-wrap gap-3">
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
            <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6 border-t border-graf-200 pt-7 lg:mt-10">
              {numeros.map((numero) => (
                <div key={numero.rotulo}>
                  <dt className="micro text-graf-500">{numero.rotulo}</dt>
                  <dd className="numero mt-2 text-3xl text-jb-600">{numero.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
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
