import Link from "next/link";
import type { ServiceKind } from "@prisma/client";
import { ArrowRight, Wrench } from "lucide-react";

import { ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { Etiqueta } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";

export type ServicoDoProduto = {
  serviceId: string;
  slug: string;
  nome: string;
  descricao: string;
  tipo: ServiceKind;
  precoCents: number | null;
  obrigatorio: boolean;
};

export function ServicosDoProduto({ servicos }: { servicos: ServicoDoProduto[] }) {
  if (servicos.length === 0) return null;

  return (
    <ul className="grid gap-4 lg:grid-cols-3">
      {servicos.map((servico) => {
        const preco = servico.precoCents ?? 0;

        return (
          <li
            key={servico.serviceId}
            className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                  <Wrench className="size-[18px]" aria-hidden />
                </span>
                {servico.obrigatorio ? (
                  <Etiqueta tom="alerta">Obrigatório</Etiqueta>
                ) : null}
              </div>

              <p className="mt-5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-graf-500">
                {ROTULO_SERVICO[servico.tipo]}
              </p>
              <h3 className="mt-1.5 text-lg font-bold tracking-[-0.015em] text-graf-950">
                {servico.nome}
              </h3>

              {servico.descricao ? (
                <p className="mt-2.5 flex-1 text-[0.875rem] leading-6 text-graf-600">
                  {servico.descricao}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              <div className="mt-6 border-t border-graf-200 pt-4">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
                  Valor do serviço
                </p>
                <p className="tabular mt-1 text-xl font-extrabold text-graf-950">
                  {preco > 0 ? formatarPreco(preco) : "Sob orçamento"}
                </p>
              </div>
            </div>

            <Link
              href={`/servicos/${servico.slug}`}
              className="foco-jb flex min-h-12 items-center justify-between gap-2 border-t border-graf-200 bg-graf-50/70 px-5 text-[0.875rem] font-bold text-jb-700 transition-colors hover:bg-graf-100 sm:px-6"
            >
              Como funciona
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
              <span className="sr-only">— {servico.nome}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
