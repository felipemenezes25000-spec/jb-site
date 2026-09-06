import Link from "next/link";
import { ArrowRight, CircleAlert, TriangleAlert } from "lucide-react";

import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   "Precisa da sua atenção"

   O primeiro bloco do painel da clínica, e o único que não é resumo: aqui só
   entra o que está parado esperando UMA DECISÃO DE QUEM ESTÁ LENDO —
   equipamento fora de operação, manutenção vencida, orçamento aguardando
   aprovação, chamado aguardando resposta, pedido aguardando pagamento.

   O que já está com a JB (em triagem, em manutenção, aguardando peça) não
   entra: é andamento, não pendência, e misturar os dois transforma a lista em
   mais um resumo — que é justamente o que o resto da tela já faz.

   Sem pendência, o bloco não aparece. Um painel que diz "tudo certo" numa
   caixa grande gasta a primeira dobra para não informar nada.
   ============================================================================ */

export type Urgencia = "alta" | "media";

export type Pendencia = {
  /** Chave estável — normalmente o id do registro. */
  chave: string;
  urgencia: Urgencia;
  /** O que aconteceu, em uma frase curta. */
  titulo: string;
  /** Qual registro é, para a pessoa reconhecer sem abrir. */
  detalhe: string;
  href: string;
  /** O que a pessoa vai fazer lá dentro — verbo, não "ver mais". */
  acao: string;
};

const TONS: Record<Urgencia, { selo: string; icone: typeof TriangleAlert }> = {
  alta: { selo: "bg-jb-50 text-jb-700", icone: TriangleAlert },
  media: { selo: "bg-warn-50 text-warn-700", icone: CircleAlert },
};

export function PrecisaDeAtencao({ pendencias }: { pendencias: Pendencia[] }) {
  if (pendencias.length === 0) return null;

  const altas = pendencias.filter((p) => p.urgencia === "alta").length;

  return (
    <section
      aria-labelledby="mj-atencao"
      className="overflow-hidden rounded-2xl border border-graf-200 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-graf-200 bg-graf-50 px-5 py-4">
        <h2 id="mj-atencao" className="text-[1.0625rem] font-bold text-graf-950">
          Precisa da sua atenção
        </h2>
        <p className="text-sm text-graf-600">
          {plural(pendencias.length, "item", "itens")}
          {altas > 0 ? (
            <span className="font-semibold text-jb-700">
              {` · ${altas} ${altas === 1 ? "urgente" : "urgentes"}`}
            </span>
          ) : null}
        </p>
      </div>

      <ul className="divide-y divide-graf-100">
        {pendencias.map((pendencia) => {
          const tom = TONS[pendencia.urgencia];
          const Icone = tom.icone;

          return (
            <li key={pendencia.chave}>
              <Link
                href={pendencia.href}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    tom.selo,
                  )}
                >
                  <Icone className="size-[18px]" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-bold leading-snug text-graf-950">
                    {pendencia.titulo}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-graf-500">
                    {pendencia.detalhe}
                  </span>
                </span>

                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
                  <span className="hidden sm:inline">{pendencia.acao}</span>
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
