import { Check } from "lucide-react";

import { Cartao, Etiqueta } from "@/components/ui/data";
import { formatarPreco, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Um plano de manutenção, como ele está cadastrado.
 *
 * Todo número desta tela sai de `MaintenancePlan`: preço, vigência, visitas
 * incluídas, desconto em peças e a lista de benefícios. Plano sem preço
 * cadastrado aparece como "sob consulta" — nunca com um valor de exemplo.
 */

export type PlanoPublico = {
  slug: string;
  nome: string;
  descricao: string;
  beneficios: string[];
  precoCents: number | null;
  mesesDeVigencia: number;
  visitasIncluidas: number;
  descontoEmPecas: number;
};

/** "12 meses com 2 visitas" → uma visita a cada 6 meses. */
export function periodicidade(plano: PlanoPublico) {
  if (plano.visitasIncluidas <= 0) return null;
  const meses = Math.max(1, Math.round(plano.mesesDeVigencia / plano.visitasIncluidas));
  if (meses === 1) return "Uma visita por mês";
  if (meses === 12) return "Uma visita por ano";
  return `Uma visita a cada ${meses} meses`;
}

export function CartaoPlano({
  plano,
  destaque,
  acao,
  className,
}: {
  plano: PlanoPublico;
  destaque?: boolean;
  acao?: React.ReactNode;
  className?: string;
}) {
  const ritmo = periodicidade(plano);

  return (
    <Cartao
      className={cn(
        "flex h-full flex-col p-6",
        destaque && "border-jb-200 ring-1 ring-jb-500/15",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-graf-950">{plano.nome}</h3>
        {destaque ? <Etiqueta tom="marca">Mais completo</Etiqueta> : null}
      </div>

      {plano.descricao ? (
        <p className="mt-2 text-sm leading-relaxed text-graf-600">{plano.descricao}</p>
      ) : null}

      <div className="mt-5 border-y border-graf-200 py-5">
        {plano.precoCents !== null && plano.precoCents > 0 ? (
          <>
            <p className="tabular text-title font-bold leading-none text-graf-950">
              {formatarPreco(plano.precoCents)}
            </p>
            <p className="mt-1.5 text-sm text-graf-500">
              por {plural(plano.mesesDeVigencia, "mês de cobertura", "meses de cobertura")}
            </p>
          </>
        ) : (
          <>
            <p className="text-title font-bold leading-none text-graf-950">Sob consulta</p>
            <p className="mt-1.5 text-sm text-graf-500">
              O valor depende dos equipamentos cobertos.
            </p>
          </>
        )}
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-graf-600">Vigência</dt>
          <dd className="tabular font-semibold text-graf-900">
            {plural(plano.mesesDeVigencia, "mês", "meses")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-graf-600">Visitas incluídas</dt>
          <dd className="tabular font-semibold text-graf-900">
            {plano.visitasIncluidas > 0
              ? plural(plano.visitasIncluidas, "visita", "visitas")
              : "A combinar"}
          </dd>
        </div>
        {ritmo ? (
          <div className="flex justify-between gap-4">
            <dt className="text-graf-600">Periodicidade</dt>
            <dd className="text-right font-semibold text-graf-900">{ritmo}</dd>
          </div>
        ) : null}
        {plano.descontoEmPecas > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-graf-600">Desconto em peças</dt>
            <dd className="tabular font-semibold text-ok-700">
              {plano.descontoEmPecas}%
            </dd>
          </div>
        ) : null}
      </dl>

      {plano.beneficios.length > 0 ? (
        <ul className="mt-5 space-y-2.5 border-t border-graf-200 pt-5">
          {plano.beneficios.map((beneficio) => (
            <li key={beneficio} className="flex gap-2.5 text-sm leading-relaxed text-graf-700">
              <Check className="mt-0.5 size-4 shrink-0 text-ok-700" aria-hidden />
              <span>{beneficio}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {acao ? <div className="mt-auto pt-6">{acao}</div> : null}
    </Cartao>
  );
}
