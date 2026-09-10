import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { GradeVitrine } from "@/components/loja/card-vitrine";

function CabecalhoColecao({
  sobretitulo,
  titulo,
  descricao,
  href,
  rotulo,
}: {
  sobretitulo: string;
  titulo: string;
  descricao: string;
  href: string;
  rotulo: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-graf-200 pb-5">
      <div className="max-w-2xl">
        <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
          {sobretitulo}
        </p>
        <h2 className="mt-2 text-[clamp(1.7rem,1.35rem+1.4vw,2.5rem)] font-extrabold tracking-[-0.035em] text-graf-950">
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">{descricao}</p>
      </div>

      <Link
        href={href}
        className="foco-jb inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-900"
      >
        {rotulo}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

export function SeminovosHome({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
}) {
  if (produtos.length === 0) return null;

  return (
    <section className="border-b border-graf-200 bg-graf-50/50 py-12 lg:py-16">
      <div className="container-jb max-w-[100rem]">
        <CabecalhoColecao
          sobretitulo="Seminovos JB"
          titulo="Unidades seminovas disponíveis"
          descricao="Cada anúncio representa uma unidade específica. Veja condição, identificação e informações registradas antes de decidir."
          href="/seminovos"
          rotulo="Ver todos os seminovos"
        />

        <GradeVitrine
          produtos={produtos.slice(0, 4)}
          parcelamento={parcelamento}
          colunas={{ base: 1, sm: 2, lg: 4 }}
          className="mt-6"
        />
      </div>
    </section>
  );
}

export function ProcuradosHome({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
}) {
  if (produtos.length === 0) return null;

  return (
    <section className="border-b border-graf-200 bg-white py-12 lg:py-16">
      <div className="container-jb max-w-[100rem]">
        <CabecalhoColecao
          sobretitulo="Mais procurados"
          titulo="Produtos em destaque no catálogo"
          descricao="Uma seleção para continuar explorando a loja sem sair da mesma linguagem de preço, condição e disponibilidade."
          href="/loja"
          rotulo="Ver catálogo completo"
        />

        <GradeVitrine
          produtos={produtos.slice(0, 4)}
          parcelamento={parcelamento}
          colunas={{ base: 1, sm: 2, lg: 4 }}
          className="mt-6"
        />
      </div>
    </section>
  );
}
