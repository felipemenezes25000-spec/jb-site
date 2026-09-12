import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Box, ShieldCheck, Sparkles, Star } from "lucide-react";
import { chaveDaMarca, logoDaMarca } from "@/lib/marcas";

type Marca = {
  slug: string;
  name: string;
  logo: { url: string; alt: string | null } | null;
};

/** Segundos que cada card leva para atravessar a faixa. */
const RITMO = 6;

const TAGLINES: Record<string, string> = {
  alt: "Soluções em odontologia",
  schuster: "Tradição que evolui",
  suctron: "Aspiração de alto desempenho",
  sugmaster: "Qualidade em cada detalhe",
};

const BENEFICIOS = [
  { icone: ShieldCheck, titulo: "Marcas de confiança", apoio: "Qualidade comprovada" },
  {
    icone: Box,
    titulo: "Equipamentos para todas as necessidades",
    apoio: "Do consultório ao centro cirúrgico",
  },
  { icone: Star, titulo: "Suporte da equipe JB", apoio: "Da escolha ao pós-venda" },
];

/**
 * O trilho é a fila repetida duas vezes e anda exatamente metade da própria
 * largura: quando a animação reinicia, a segunda cópia já está no lugar da
 * primeira e a emenda não aparece.
 */
const CSS_TICKER = `
@keyframes jb-marcas-ticker { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
.jb-marcas-trilho { animation: jb-marcas-ticker var(--jb-ritmo) linear infinite; will-change: transform; }
.jb-marcas:hover .jb-marcas-trilho,
.jb-marcas:focus-within .jb-marcas-trilho { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .jb-marcas-trilho { animation: none; }
  .jb-marcas { overflow-x: auto; }
}
`;

function chave(marca: Marca) {
  return chaveDaMarca(marca.slug);
}

function legenda(marca: Marca) {
  return TAGLINES[chave(marca)] ?? "Tecnologia para o seu consultório";
}

function arteDaMarca(marca: Marca) {
  return logoDaMarca(marca);
}

function CartaoMarca({ marca }: { marca: Marca }) {
  const arte = arteDaMarca(marca);

  return (
    <Link
      href={`/marcas/${marca.slug}`}
      /* Sem prefetch: o trilho repete a fila inteira duas vezes para a emenda
         do laço não aparecer, então cada marca vira dois links e o Next pedia
         a mesma rota uma vez por cópia — medido, nove chamadas idênticas a
         /marcas/demo-alt numa só visita à home. É uma faixa de logotipos que
         passa andando, não o caminho por onde se navega; quem clica aceita
         esperar o carregamento normal. */
      prefetch={false}
      className="group foco-jb flex h-[12rem] w-[16.4rem] shrink-0 flex-col items-center justify-center placa px-5 text-center transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-graf-400 hover:shadow-raised"
    >
      <span className="flex h-[4.4rem] w-full items-center justify-center">
        {arte ? (
          <Image
            src={arte.url}
            alt={arte.alt}
            width={300}
            height={120}
            sizes="262px"
            className="max-h-[3.9rem] w-auto max-w-[78%] object-contain"
          />
        ) : (
          <span className="text-2xl font-black tracking-[-0.04em] text-graf-900">
            {marca.name}
          </span>
        )}
      </span>
      <span className="mt-4 block text-base font-bold text-graf-800">{marca.name}</span>
      <span className="mt-1.5 block micro leading-[1.5] tracking-[0.2em] text-graf-500">
        {legenda(marca)}
      </span>
    </Link>
  );
}

export function MarcasCarousel({ marcas }: { marcas: Marca[] }) {
  if (marcas.length === 0) return null;

  /* Poucas marcas dariam um trilho curto demais para cobrir telas largas:
     repetir a fila antes de duplicá-la mantém a faixa sempre cheia. */
  const repeticoes = Math.max(1, Math.ceil(6 / marcas.length));
  const fila = Array.from({ length: repeticoes }, () => marcas).flat();
  const ritmo = `${fila.length * RITMO}s`;

  /* Região com nome: a faixa é um trilho que rola sozinho, e leitor de tela
     precisa saber onde entrou. Também é o que dá a um teste como alcançá-la
     sem depender de classe de estilo. */
  return (
    <section
      aria-label="Marcas no catálogo"
      className="relative isolate overflow-hidden bg-surface py-16 min-[640px]:py-20 min-[1024px]:min-h-[40rem] min-[1024px]:pb-[1.8rem] min-[1024px]:pt-[3.9rem]">
      <style>{CSS_TICKER}</style>

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_44%,rgba(214,24,34,0.05),transparent_34%),radial-gradient(circle_at_16%_10%,rgba(214,24,34,0.022),transparent_36%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[22rem] -top-[26rem] size-[52rem] rounded-full bg-white shadow-[0_0_120px_rgba(25,25,28,0.04)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[27rem] -right-[19rem] size-[52rem] rounded-full border border-jb-200/40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[22rem] -right-[15rem] size-[43rem] rounded-full border border-jb-100/80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-4 hidden h-[38rem] w-56 -rotate-[26deg] opacity-30 blur-lg min-[1024px]:block"
        aria-hidden
      >
        <span className="absolute left-14 top-0 h-80 w-9 rounded-full bg-gradient-to-b from-transparent via-graf-300/45 to-transparent" />
        <span className="absolute left-4 top-32 h-64 w-10 rounded-full bg-gradient-to-b from-transparent via-jb-600/50 to-transparent" />
        <span className="absolute left-32 top-2 h-[26rem] w-11 rounded-full bg-gradient-to-b from-transparent via-graf-200/70 to-transparent" />
      </div>

      <div className="revelar container-loja relative z-10 min-[1024px]:pt-12">
        <div className="pointer-events-none absolute top-0 hidden w-max items-center gap-5 min-[1024px]:right-10 min-[1024px]:flex min-[1840px]:-right-10">
          <span className="grid size-[3.15rem] shrink-0 place-items-center rounded-full bg-jb-50/70 text-graf-800">
            <Sparkles className="size-[1.05rem]" aria-hidden />
          </span>
          <p className="whitespace-nowrap micro leading-[1.6] tracking-[0.32em] text-graf-500">
            Marcas
            <br />
            que a equipe
            <br />
            conhece
          </p>
        </div>

        <div className="grid gap-12 min-[1024px]:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] min-[1024px]:items-center min-[1024px]:gap-x-12 min-[1360px]:gap-x-[5.5rem] min-[1600px]:grid-cols-[30rem_minmax(0,1fr)]">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-[2px] w-9 shrink-0 rounded-full bg-jb-600" aria-hidden />
              <p className="micro tracking-[0.26em] text-jb-700">
                Marcas no catálogo
              </p>
            </div>

            {/* `font-extrabold` para casar com as outras seis faixas da home:
                `manchete` traz peso 700 e as demais estão em 800. Mesmo
                tamanho com peso diferente, na mesma página, lê-se como
                descuido. */}
            <h2 className="manchete mt-6 max-w-[32rem] text-section font-extrabold text-graf-950">
              Marcas que <span className="text-jb-700">fazem parte do</span> dia a dia da JB.
            </h2>

            <p className="mt-7 max-w-[30rem] text-base leading-[1.5] text-graf-500">
              Navegue por fabricante para encontrar os equipamentos publicados e os modelos que a
              equipe acompanha.
            </p>

            <div className="mt-9 flex flex-col gap-6 min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-6">
              <Link
                href="/marcas"
                className="group foco-jb micro inline-flex min-h-12 w-fit shrink-0 items-center gap-6 whitespace-nowrap rounded-lg bg-jb-500 py-2 pl-7 pr-3 text-white transition-colors hover:bg-jb-600"
              >
                Ver todas as marcas
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="size-[1.05rem]" aria-hidden />
                </span>
              </Link>

              <div className="hidden h-12 w-px shrink-0 bg-graf-200 min-[640px]:block" aria-hidden />
              <p className="whitespace-nowrap text-corpo leading-[1.4] text-graf-500">
                As melhores marcas
                <br />
                para o seu consultório.
              </p>
            </div>
          </div>

          <div className="min-w-0 min-[1840px]:-mr-[8.25rem]">
            <div
              className="jb-marcas relative overflow-hidden py-5 [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_92%,transparent)]"
              style={{ ["--jb-ritmo" as string]: ritmo }}
            >
              <ul className="jb-marcas-trilho flex w-max items-center gap-3.5">
                {[0, 1].map((copia) =>
                  fila.map((marca, posicao) => (
                    <li
                      key={`${copia}-${posicao}-${marca.slug}`}
                      /* A segunda cópia existe só para a emenda do laço não
                         aparecer. `aria-hidden` sozinho a escondia do leitor de
                         tela e deixava os links dela na ordem de tabulação —
                         o Tab parava num cartão que ninguém consegue ouvir. O
                         `inert` tira o ramo inteiro do foco e do apontador
                         junto, que é o que ele foi feito para fazer. */
                      aria-hidden={copia === 1 ? true : undefined}
                      inert={copia === 1}
                    >
                      <CartaoMarca marca={marca} />
                    </li>
                  )),
                )}
              </ul>
            </div>

            <p className="mt-7 flex items-center gap-4 pl-1 micro tracking-[0.24em] text-graf-500 min-[1024px]:mt-9">
              <span className="h-[3px] w-16 shrink-0 rounded-full bg-jb-600" aria-hidden />
              {marcas.length} marcas com equipamentos publicados
            </p>
          </div>
        </div>

        <div className="placa mt-14 px-6 py-5 min-[640px]:px-8 min-[1024px]:mt-6 min-[1024px]:ml-[16%] min-[1024px]:max-w-[70%]">
          <div className="grid gap-6 min-[640px]:grid-cols-3 min-[640px]:divide-x min-[640px]:divide-graf-200/80">
            {BENEFICIOS.map(({ icone: IconeBeneficio, titulo, apoio }, posicao) => (
              <div
                key={titulo}
                className={`flex items-center gap-4 ${
                  posicao === 0
                    ? "min-[640px]:pr-7"
                    : posicao === 1
                      ? "min-[640px]:px-7"
                      : "min-[640px]:pl-7"
                }`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-600">
                  <IconeBeneficio className="size-[1.2rem]" aria-hidden />
                </span>
                <p className="text-sm font-semibold leading-[1.35] text-graf-700 min-[1840px]:whitespace-nowrap">
                  {titulo}
                  <span className="mt-0.5 block text-apoio font-normal text-graf-500">
                    {apoio}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-[1.5rem] right-10 hidden w-max min-[1600px]:block min-[1840px]:-right-10"
          aria-hidden
        >
          <p className="micro leading-[1.6] tracking-[0.28em] text-graf-300">
            Juntos
            <br />
            por uma odontologia
            <br />
            mais forte
          </p>
          <span className="mt-3.5 block h-[2px] w-9 rounded-full bg-jb-400" />
        </div>
      </div>
    </section>
  );
}
