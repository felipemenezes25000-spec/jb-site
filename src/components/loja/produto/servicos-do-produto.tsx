import Link from "next/link";
import type { ServiceKind } from "@prisma/client";
import { ArrowRight } from "lucide-react";

import { ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { Etiqueta } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Serviços que a JB executa neste equipamento

   São os `ProductAddon` do cadastro — os mesmos que aparecem para marcar na
   caixa de compra, aqui abertos com explicação e preço. O valor exibido é o
   que o PRODUTO define para aquele serviço (`ProductAddon.priceCents`); só cai
   no preço padrão do serviço quando o produto não sobrescreve, que é
   exatamente a conta que o carrinho e o pedido fazem.
   ============================================================================ */

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
    <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
      {servicos.map((servico) => {
        const preco = servico.precoCents ?? 0;

        return (
          <li key={servico.serviceId} className="flex">
            <article className="flex w-full flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-graf-500">
                  {ROTULO_SERVICO[servico.tipo]}
                </span>
                {servico.obrigatorio ? (
                  <Etiqueta tom="alerta">Obrigatório nesta compra</Etiqueta>
                ) : null}
              </div>

              <h3 className="mt-2 text-base font-bold text-graf-950">{servico.nome}</h3>

              {servico.descricao ? (
                <p className="mt-2 text-sm leading-relaxed text-graf-600">
                  {servico.descricao}
                </p>
              ) : null}

              <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pt-5">
                <p className="text-lg font-extrabold tabular text-graf-950">
                  {preco > 0 ? formatarPreco(preco) : "Sob orçamento"}
                </p>
                <Link
                  href={`/servicos/${servico.slug}`}
                  className="foco-jb inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-jb-700 transition-colors duration-150 hover:text-jb-500"
                >
                  Como funciona
                  <ArrowRight className="size-4" aria-hidden />
                  <span className="sr-only">— {servico.nome}</span>
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
