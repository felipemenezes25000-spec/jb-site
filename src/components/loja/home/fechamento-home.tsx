import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  PackageCheck,
  ShoppingBag,
  Wrench,
} from "lucide-react";

const ETAPAS = [
  {
    numero: "01",
    icone: ShoppingBag,
    titulo: "Escolha",
    texto: "Catálogo, ficha técnica e comparação para decidir com contexto.",
  },
  {
    numero: "02",
    icone: BadgeCheck,
    titulo: "Compra",
    texto: "Condição, preço e disponibilidade apresentados sem ruído.",
  },
  {
    numero: "03",
    icone: PackageCheck,
    titulo: "Entrega",
    texto: "Entrega e instalação combinadas com a rotina da clínica.",
  },
  {
    numero: "04",
    icone: Wrench,
    titulo: "Continuidade",
    texto: "A mesma equipe segue com assistência e histórico do equipamento.",
  },
] as const;

export function FechamentoHome() {
  return (
    <section className="relative isolate overflow-hidden border-y border-jb-100 bg-[#fff9f9] py-16 lg:py-20">
      <div
        className="pointer-events-none absolute -right-44 -top-52 size-[34rem] rounded-full bg-jb-50/80 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-64 -left-52 size-[38rem] rounded-full border border-jb-100/70"
        aria-hidden
      />

      <div className="container-jb relative z-10 max-w-[112rem]">
        <div className="grid gap-8 border-b border-jb-100 pb-9 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.62fr)] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-10 bg-jb-600" aria-hidden />
              <p className="text-[0.67rem] font-black uppercase tracking-[0.19em] text-jb-700">
                Um marketplace que continua depois do checkout
              </p>
            </div>
            <h2 className="mt-5 max-w-[17ch] font-display text-[clamp(2.15rem,4.1vw,4.7rem)] font-black leading-[0.91] tracking-[-0.055em] text-graf-950">
              Comprar é só o começo da relação com a JB.
            </h2>
          </div>

          <div className="lg:pb-1">
            <p className="max-w-xl text-[0.98rem] font-semibold leading-[1.65] text-graf-950/70">
              A experiência fica melhor quando escolha, compra, instalação e suporte fazem parte do
              mesmo fluxo — sem obrigar sua clínica a recomeçar do zero em cada etapa.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/loja"
                className="group foco-jb inline-flex min-h-12 items-center gap-5 rounded-full bg-jb-500 py-2 pl-5 pr-2.5 text-[0.8rem] font-black text-white shadow-[0_18px_38px_-26px_rgba(143,8,17,0.75)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-600"
              >
                Explorar catálogo
                <span className="grid size-8 place-items-center rounded-full bg-white text-jb-600 transition-transform group-hover:translate-x-1">
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
              <Link
                href="/assistencia-tecnica/solicitar"
                className="foco-jb inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white px-5 text-[0.8rem] font-black text-graf-950 shadow-[0_14px_34px_-28px_rgba(93,15,18,0.55)] ring-1 ring-jb-100 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-jb-50"
              >
                <Wrench className="size-4 text-jb-600" aria-hidden />
                Solicitar assistência
              </Link>
            </div>
          </div>
        </div>

        <ol className="mt-8 grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPAS.map(({ numero, icone: Icone, titulo, texto }, indice) => (
            <li
              key={titulo}
              className="group relative min-h-[12rem] border-t border-jb-100 px-1 pb-5 pt-5 sm:px-5 sm:first:pl-0 lg:px-7 lg:first:pl-0 lg:last:pr-0"
            >
              <span
                className="absolute left-0 top-[-3px] h-[5px] w-12 rounded-full bg-jb-500 transition-[width] duration-300 group-hover:w-20 sm:left-5 sm:first:left-0 lg:left-7 lg:first:left-0"
                aria-hidden
              />
              <div className="flex items-center justify-between gap-4">
                <span className="font-display text-[2.35rem] font-black leading-none tracking-[-0.06em] text-jb-500/20">
                  {numero}
                </span>
                <span className="grid size-10 place-items-center rounded-full bg-white text-jb-700 shadow-[0_12px_30px_-24px_rgba(123,12,18,0.65)] ring-1 ring-jb-100 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  <Icone className="size-4" aria-hidden />
                </span>
              </div>
              <h3 className="mt-6 font-display text-[1.55rem] font-black tracking-[-0.04em] text-graf-950">
                {titulo}
              </h3>
              <p className="mt-2.5 max-w-[18rem] text-[0.79rem] font-semibold leading-[1.55] text-graf-950/65">
                {texto}
              </p>
              {indice < ETAPAS.length - 1 ? (
                <span className="absolute right-0 top-6 hidden h-20 w-px bg-jb-100 lg:block" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
