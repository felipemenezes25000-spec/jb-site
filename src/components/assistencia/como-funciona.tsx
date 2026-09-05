import { ETAPAS_PUBLICAS } from "@/components/assistencia/rotulos";
import { cn } from "@/lib/utils";

/**
 * As seis etapas do atendimento, do jeito que o cliente vive.
 *
 * A ordem é a mesma de `FLUXO_CHAMADO` em `@/lib/assistencia`, comprimida nas
 * etapas que a linha do tempo do chamado mostra. Não é um texto de vitrine
 * paralelo ao sistema: é o mesmo caminho que o número AT vai percorrer.
 */
export function ComoFunciona({ className }: { className?: string }) {
  return (
    <ol className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {ETAPAS_PUBLICAS.map((etapa, indice) => (
        <li
          key={etapa.titulo}
          className="relative rounded-xl border border-graf-200 bg-white p-6 shadow-card"
        >
          <span
            className="tabular flex size-9 items-center justify-center rounded-full bg-jb-50 text-sm font-bold text-jb-700 ring-1 ring-inset ring-jb-100"
            aria-hidden
          >
            {indice + 1}
          </span>
          <h3 className="mt-4 text-base font-bold text-graf-950">
            <span className="sr-only">Etapa {indice + 1}: </span>
            {etapa.titulo}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-graf-600">{etapa.texto}</p>
        </li>
      ))}
    </ol>
  );
}
