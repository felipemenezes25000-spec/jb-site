import { Esqueleto } from "@/components/ui/data";

/* ============================================================================
   Esqueletos de carregamento

   Mesmo desenho da tela pronta, sem conteúdo — a página não "pula" quando os
   dados chegam. As formas são `aria-hidden` (vem do próprio `Esqueleto`), então
   leitor de tela não lê um monte de caixa vazia: no lugar delas vai uma frase
   dita uma vez, igual à das áreas comercial e de conteúdo.
   ============================================================================ */

export function CarregandoLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        Carregando a lista…
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-48" />
          <Esqueleto className="h-4 w-72" />
        </div>
        <Esqueleto className="h-11 w-36" />
      </div>
      <Esqueleto className="h-[5.25rem] sm:h-[4.75rem]" />
      <div className="space-y-3">
        <Esqueleto className="h-12" />
        {Array.from({ length: linhas }, (_, indice) => (
          <Esqueleto key={indice} className="h-16" />
        ))}
      </div>
    </div>
  );
}

export function CarregandoFicha() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        Carregando a ficha…
      </p>
      <Esqueleto className="h-5 w-64" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-72" />
          <Esqueleto className="h-4 w-56" />
        </div>
        <Esqueleto className="h-11 w-64" />
      </div>
      <Esqueleto className="h-12" />
      <Esqueleto className="h-[32rem]" />
    </div>
  );
}
