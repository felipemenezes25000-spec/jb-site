import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página da Área da Clínica.
 *
 * Um só desenho para as catorze telas: link de volta acima do título (alvo de
 * toque cheio, não uma seta minúscula), título, uma linha de contexto e as
 * ações à direita — que no celular caem para baixo em vez de espremer o
 * título.
 */
export function Topo({
  titulo,
  descricao,
  voltar,
  acoes,
  etiqueta,
  className,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  voltar?: { href: string; rotulo: string };
  acoes?: React.ReactNode;
  /** Etiqueta de status ao lado do título — status do pedido, do chamado. */
  etiqueta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7", className)}>
      {voltar ? (
        <Link
          href={voltar.href}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {voltar.rotulo}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title font-bold leading-tight text-graf-950">{titulo}</h1>
            {etiqueta}
          </div>
          {descricao ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graf-600">
              {descricao}
            </p>
          ) : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2.5">{acoes}</div> : null}
      </div>
    </header>
  );
}
