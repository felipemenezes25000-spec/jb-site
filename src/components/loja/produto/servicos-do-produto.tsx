import Link from "next/link";
import type { ServiceKind } from "@prisma/client";
import { ArrowRight } from "lucide-react";

import { ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { Etiqueta } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Serviços que a JB executa neste equipamento

   São os `ProductAddon` do cadastro — os mesmos que aparecem para marcar na
   caixa de compra, aqui abertos com explicação e preço. Uma lista de preços,
   não uma grade de cartões: são dois ou três itens, e cartão para cada um só
   repetiria moldura.

   O valor exibido é o que o PRODUTO define para aquele serviço
   (`ProductAddon.priceCents`); só cai no preço padrão do serviço quando o
   produto não sobrescreve, que é exatamente a conta que o carrinho e o pedido
   fazem.
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
    <ul className="divide-y divide-graf-200 border-y border-graf-200">
      {servicos.map((servico) => {
        const preco = servico.precoCents ?? 0;

        return (
          <li
            key={servico.serviceId}
            className="flex flex-col gap-x-10 gap-y-4 py-6 md:flex-row md:items-start md:justify-between"
          >
            <div className="min-w-0 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
                  {ROTULO_SERVICO[servico.tipo]}
                </span>
                {servico.obrigatorio ? (
                  <Etiqueta tom="alerta">Obrigatório nesta compra</Etiqueta>
                ) : null}
              </div>

              <h3 className="mt-2 text-lg font-bold text-graf-950">{servico.nome}</h3>

              {servico.descricao ? (
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
                  {servico.descricao}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 md:shrink-0 md:flex-col md:items-end md:gap-y-3">
              <p className="text-xl font-extrabold tabular text-graf-950">
                {preco > 0 ? formatarPreco(preco) : "Sob orçamento"}
              </p>
              <Link
                href={`/servicos/${servico.slug}`}
                className="foco-jb inline-flex min-h-11 items-center gap-1.5 rounded-md text-[0.9375rem] font-semibold text-jb-700 transition-colors duration-150 hover:text-jb-500"
              >
                Como funciona
                <ArrowRight className="size-4" aria-hidden />
                <span className="sr-only">— {servico.nome}</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
