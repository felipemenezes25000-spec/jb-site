import Link from "next/link";
import { ArrowRight, PackageCheck, ShoppingBag, Wrench } from "lucide-react";

const ETAPAS = [
  {
    icone: ShoppingBag,
    titulo: "Escolha e compra",
    texto: "Compare produtos e confira preço, condição e disponibilidade antes de fechar o pedido.",
  },
  {
    icone: PackageCheck,
    titulo: "Entrega",
    texto: "Frete ou retirada ficam vinculados ao pedido e são conferidos antes do pagamento.",
  },
  {
    icone: Wrench,
    titulo: "Continuidade",
    texto: "Quando houver assistência técnica ou histórico de equipamento, a relação continua na JB.",
  },
] as const;

export function FechamentoHome() {
  return (
    <section className="border-b border-graf-200 bg-graf-50/50 py-14 lg:py-20">
      <div className="container-jb max-w-[100rem]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              Depois da compra
            </p>
            <h2 className="mt-2 text-section font-extrabold tracking-[-0.04em] text-graf-950">
              O pedido termina no checkout. O relacionamento com a JB, não.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-graf-600 sm:text-corpo">
              Compra, entrega e suporte ficam conectados sem transformar a página em uma sequência de
              promessas ou etapas que não se aplicam a todos os produtos.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row lg:justify-self-end">
            <Link
              href="/loja"
              className="foco-jb inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-jb-600 px-4 text-sm font-bold text-white transition-colors hover:bg-jb-700"
            >
              Explorar loja
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/assistencia-tecnica"
              className="foco-jb inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-bold text-graf-800 transition-colors hover:border-jb-200 hover:bg-jb-50 hover:text-jb-700"
            >
              Assistência técnica
            </Link>
          </div>
        </div>

        <ol className="mt-7 grid overflow-hidden rounded-xl border border-graf-200 bg-white md:grid-cols-3">
          {ETAPAS.map(({ icone: Icone, titulo, texto }, indice) => (
            <li
              key={titulo}
              className="min-w-0 border-b border-graf-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
                  <Icone className="size-4" aria-hidden />
                </span>
                <span className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-graf-500">
                  0{indice + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-extrabold text-graf-950">{titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-graf-600">{texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
