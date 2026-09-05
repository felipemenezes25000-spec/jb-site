import { Esqueleto } from "@/components/ui/data";

/**
 * Estado de carregamento da fila de chamados.
 *
 * O desenho copia o da tela cheia — cabeçalho, faixa de contadores, barra de
 * filtros e linhas — para que o conteúdo apareça no lugar onde o olho já
 * estava, sem o salto que um "carregando…" centralizado provoca.
 */
export default function CarregandoChamados() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando os chamados…</span>

      <div className="space-y-2">
        <Esqueleto className="h-8 w-72" />
        <Esqueleto className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Esqueleto key={i} className="h-16 min-w-[7.5rem] flex-1" />
        ))}
      </div>

      <Esqueleto className="h-[4.75rem] sm:h-[4.25rem]" />

      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Esqueleto key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
