import { Esqueleto } from "@/components/ui/data";

/* ============================================================================
   Esqueletos de carregamento

   Mesmo desenho da tela pronta, sem conteúdo — a página não "pula" quando os
   dados chegam. Tudo aqui é `aria-hidden` (vem do próprio `Esqueleto`), então
   leitor de tela não lê um monte de caixa vazia.
   ============================================================================ */

export function CarregandoLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-48" />
          <Esqueleto className="h-4 w-72" />
        </div>
        <Esqueleto className="h-11 w-36" />
      </div>
      <Esqueleto className="h-[4.25rem]" />
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
    <div className="space-y-6">
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
