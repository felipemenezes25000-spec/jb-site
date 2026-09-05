import { Trilha, type Migalha } from "@/components/ui/data";

/* ============================================================================
   Cabeçalho das telas do painel

   Trilha, título, uma frase de contexto e os comandos da tela. Componente de
   servidor: só marcação, nenhum estado.
   ============================================================================ */

export function CabecalhoDeSecao({
  trilha,
  titulo,
  descricao,
  acoes,
  etiqueta,
}: {
  trilha?: Migalha[];
  titulo: string;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Selo ao lado do título — situação, contagem, aviso curto. */
  etiqueta?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {trilha && trilha.length > 0 ? <Trilha itens={trilha} className="mb-2" /> : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold leading-tight text-graf-950">{titulo}</h1>
            {etiqueta}
          </div>
          {descricao ? (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-graf-500">{descricao}</p>
          ) : null}
        </div>

        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
    </header>
  );
}
