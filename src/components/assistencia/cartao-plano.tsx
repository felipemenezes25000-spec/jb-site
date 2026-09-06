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
 *
 * A ordem do cartão é a de uma ficha técnica: nome, o que é, quanto custa e,
 * depois, os números que dá para comparar linha a linha entre um plano e
 * outro. Campo não cadastrado não vira linha vazia — some.
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
  const temPreco = plano.precoCents !== null && plano.precoCents > 0;

  return (
    <Cartao
      className={cn(
        "flex h-full flex-col p-6 sm:p-7",
        destaque && "border-jb-200 ring-1 ring-jb-500/15",
        className,
      )}
    >
      {/* h2, não h3: em /planos-de-manutencao o cartão vem logo abaixo do h1
          da página e cada plano é uma seção de primeiro nível. Com h3 o
          documento pulava de h1 para h3. */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-title texto-forte">{plano.nome}</h2>
        {destaque ? (
          <Etiqueta tom="marca" className="mt-1 shrink-0">
            Mais completo
          </Etiqueta>
        ) : null}
      </div>

      {plano.descricao ? (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-600">
          {plano.descricao}
        </p>
      ) : null}

      <div className="mt-7">
        {temPreco ? (
          <>
            <p className="tabular text-display leading-none text-graf-950">
              {formatarPreco(plano.precoCents ?? 0)}
            </p>
            <p className="mt-2.5 text-sm text-graf-500">
              por {plural(plano.mesesDeVigencia, "mês de cobertura", "meses de cobertura")}
            </p>
          </>
        ) : (
          <>
            <p className="text-title texto-forte">Sob consulta</p>
            <p className="mt-2.5 text-sm text-graf-500">
              O valor depende dos equipamentos cobertos.
            </p>
          </>
        )}
      </div>

      <dl className="mt-7 divide-y divide-graf-100 border-y border-graf-200 text-sm">
        <Ficha rotulo="Vigência" valor={plural(plano.mesesDeVigencia, "mês", "meses")} />
        <Ficha
          rotulo="Visitas incluídas"
          valor={
            plano.visitasIncluidas > 0
              ? plural(plano.visitasIncluidas, "visita", "visitas")
              : "A combinar"
          }
        />
        {ritmo ? <Ficha rotulo="Periodicidade" valor={ritmo} /> : null}
        {plano.descontoEmPecas > 0 ? (
          <Ficha
            rotulo="Desconto em peças"
            valor={`${plano.descontoEmPecas}%`}
            destaque="text-ok-700"
          />
        ) : null}
      </dl>

      {plano.beneficios.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {plano.beneficios.map((beneficio) => (
            <li
              key={beneficio}
              className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-graf-700"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-ok-700" aria-hidden />
              <span>{beneficio}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {acao ? <div className="mt-auto pt-7">{acao}</div> : null}
    </Cartao>
  );
}

/** Uma linha da ficha técnica do plano: rótulo à esquerda, número à direita. */
function Ficha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  /** Cor do valor quando ele é uma vantagem, e não só um dado. */
  destaque?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-graf-500">{rotulo}</dt>
      <dd className={cn("tabular text-right font-semibold text-graf-950", destaque)}>
        {valor}
      </dd>
    </div>
  );
}
