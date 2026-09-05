import { Esqueleto } from "@/components/ui/data";

/** Carregamento da agenda: barra de controles e a grade do mês. */
export default function CarregandoAgenda() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando a agenda…</span>

      <div className="space-y-2">
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="h-4 w-96 max-w-full" />
      </div>

      <Esqueleto className="h-28" />

      <Esqueleto className="h-[32rem]" />
    </div>
  );
}
