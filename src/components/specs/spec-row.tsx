import { BadgeCheck, Info } from "lucide-react";

import { PROCEDENCIA, type LinhaDaFicha, type ProcedenciaSpec } from "@/domain/specs/schema";
import { cn } from "@/lib/utils";

/* ============================================================================
   Uma linha de dado, um componente

   A ficha inteira era `<div>` genérico: o leitor de tela lia rótulo e valor
   como dois textos soltos, sem relação. Aqui a linha é `<dt>`/`<dd>` dentro de
   um `<dl>` — lista de definições, que é exatamente o que uma ficha técnica é.

   `tabular-nums` em todo valor: sem isso os números não alinham na vertical e
   comparar duas linhas exige reler cada dígito.
   ============================================================================ */

export function SpecSourceBadge({ source }: { source: ProcedenciaSpec }) {
  if (source === "fabricante") return null;

  const procedencia = PROCEDENCIA[source];

  return (
    <span
      title={procedencia.descricao}
      className={cn(
        "ml-2 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold",
        source === "inspecao-jb"
          ? "bg-jb-50 text-jb-700 ring-1 ring-jb-500/15"
          : "bg-graf-100 text-graf-600",
      )}
    >
      {source === "inspecao-jb" ? (
        <BadgeCheck className="size-3" aria-hidden />
      ) : null}
      {procedencia.rotulo}
    </span>
  );
}

export function SpecHelp({ text }: { text: string }) {
  return (
    <span className="ml-1 inline-flex align-middle text-graf-400" title={text}>
      <Info className="size-3.5" aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}

export function SpecRow({ linha }: { linha: LinhaDaFicha }) {
  const { definicao, valor, texto } = linha;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="min-w-0 text-sm leading-5 text-graf-600">
        {definicao.label}
        {definicao.helpText ? <SpecHelp text={definicao.helpText} /> : null}
      </dt>
      <dd className="min-w-0 break-words text-right text-sm font-semibold leading-5 tabular text-graf-950">
        {texto ?? (
          <span
            className="font-normal text-graf-400"
            title="Não informado pelo fabricante"
          >
            —
          </span>
        )}
        {valor ? <SpecSourceBadge source={valor.source} /> : null}
      </dd>
    </div>
  );
}
