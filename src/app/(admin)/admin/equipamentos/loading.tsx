import { Esqueleto } from "@/components/ui/data";

/** Carregamento do parque instalado. */
export default function CarregandoEquipamentos() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando os equipamentos…</span>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-56" />
          <Esqueleto className="h-4 w-96 max-w-full" />
        </div>
        <Esqueleto className="h-11 w-44" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Esqueleto key={i} className="h-16 min-w-[7.5rem] flex-1" />
        ))}
      </div>

      <Esqueleto className="h-[4.75rem] sm:h-[4.25rem]" />

      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Esqueleto key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
