import { Esqueleto } from "@/components/ui/data";

/** Carregamento da lista de técnicos, no formato dos cartões da tela cheia. */
export default function CarregandoTecnicos() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando os técnicos…</span>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Esqueleto className="h-8 w-44" />
          <Esqueleto className="h-4 w-96 max-w-full" />
        </div>
        <Esqueleto className="h-11 w-36" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}
