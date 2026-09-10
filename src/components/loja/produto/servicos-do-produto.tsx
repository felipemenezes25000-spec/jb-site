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
    <ul className="divide-y divide-graf-150 border-y border-graf-200">
      {servicos.map((servico) => {
        const preco = servico.precoCents ?? 0;

        return (
          <li key={servico.serviceId} className="group py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-jb-700">
                  <Wrench className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[0.625rem] font-bold uppercase tracking-[0.09em] text-graf-500">
                      {ROTULO_SERVICO[servico.tipo]}
                    </p>
                    {servico.obrigatorio ? <Etiqueta tom="alerta">Obrigatório</Etiqueta> : null}
                  </div>
                  <h3 className="mt-1 text-sm font-extrabold text-graf-950">{servico.nome}</h3>
                  {servico.descricao ? (
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-graf-600">{servico.descricao}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-4 pl-11 sm:block sm:pl-0 sm:text-right">
                <p className="tabular text-sm font-extrabold text-graf-950">
                  {preco > 0 ? formatarPreco(preco) : "Sob orçamento"}
                </p>
                <Link
                  href={`/servicos/${servico.slug}`}
                  className="foco-jb mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-bold text-jb-700 hover:text-jb-800"
                >
                  Como funciona
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  <span className="sr-only">— {servico.nome}</span>
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
