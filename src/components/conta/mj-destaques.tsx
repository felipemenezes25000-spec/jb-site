import { cn } from "@/lib/utils";

export type TomDestaque = "neutro" | "ok" | "atencao" | "alerta" | "info";

const TONS: Record<TomDestaque, { valor: string; selo: string }> = {
  neutro: { valor: "text-graf-950", selo: "bg-graf-100 text-graf-600 ring-graf-500/10" },
  ok: { valor: "text-ok-700", selo: "bg-ok-50 text-ok-700 ring-ok-500/10" },
  atencao: { valor: "text-warn-700", selo: "bg-warn-50 text-warn-700 ring-warn-500/10" },
  alerta: { valor: "text-jb-700", selo: "bg-jb-50 text-jb-700 ring-jb-500/10" },
  info: { valor: "text-info-700", selo: "bg-info-50 text-info-700 ring-info-500/10" },
};

const GRADE = [
  "grid-cols-1",
  "grid-cols-1",
  "grid-cols-1 sm:grid-cols-2",
  "grid-cols-1 sm:grid-cols-3",
  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
] as const;

export type Destaque = {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: string;
  icone?: React.ComponentType<{ className?: string }>;
  tom?: TomDestaque;
};

export function Destaques({
  itens,
  className,
}: {
  itens: Destaque[];
  className?: string;
}) {
  const lista = itens.slice(0, 4);
  if (lista.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-2xl border border-graf-200/90 bg-graf-200/80 shadow-[0_1px_2px_rgba(18,24,35,0.025),0_18px_46px_-36px_rgba(18,24,35,0.34)]",
        GRADE[lista.length],
        className,
      )}
    >
      {lista.map((item) => {
        const cores = TONS[item.tom ?? "neutro"];
        const Icone = item.icone;

        return (
          <div
            key={item.rotulo}
            className={cn(
              "relative min-w-0 bg-white p-4.5 transition-colors hover:bg-graf-50/45",
              Icone && "pl-[4.35rem]",
            )}
          >
            <dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-graf-500">
              {Icone ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-4 top-4 flex size-9 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset",
                    cores.selo,
                  )}
                >
                  <Icone className="size-[17px]" />
                </span>
              ) : null}
              {item.rotulo}
            </dt>
            <dd className="mt-1">
              <span className={cn("block text-[0.96rem] font-extrabold leading-snug tracking-[-0.012em]", cores.valor)}>
                {item.valor}
              </span>
              {item.detalhe ? (
                <span className="mt-1 block text-xs leading-relaxed text-graf-500">
                  {item.detalhe}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
