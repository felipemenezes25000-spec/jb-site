import { Esqueleto } from "@/components/ui/data";

/* ============================================================================
   Esqueletos de carregamento do backoffice comercial

   Servem aos `loading.tsx` das telas de venda. A forma imita o conteúdo real —
   mesma altura de cabeçalho, mesma grade de indicadores, mesmas linhas de
   tabela —, para a página não "pular" quando os dados chegam.
   ============================================================================ */

export function EsqueletoLista({
  indicadores = 4,
  linhas = 8,
}: {
  indicadores?: number;
  linhas?: number;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando a lista…</span>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-48" />
          <Esqueleto className="h-4 w-64" />
        </div>
        <Esqueleto className="h-9 w-40" />
      </div>

      {indicadores > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: indicadores }).map((_, i) => (
            <Esqueleto key={i} className="h-32" />
          ))}
        </div>
      ) : null}

      <Esqueleto className="h-[4.75rem] sm:h-[4.25rem]" />

      <div className="space-y-2 rounded-xl border border-graf-200 bg-white p-4">
        {Array.from({ length: linhas }).map((_, i) => (
          <Esqueleto key={i} className="h-11" />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoDetalhe() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando os dados…</span>

      <div className="space-y-2">
        <Esqueleto className="h-4 w-56" />
        <Esqueleto className="h-8 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Esqueleto className="h-64" />
          <Esqueleto className="h-48" />
          <Esqueleto className="h-56" />
        </div>
        <div className="space-y-6">
          <Esqueleto className="h-72" />
          <Esqueleto className="h-40" />
        </div>
      </div>
    </div>
  );
}
