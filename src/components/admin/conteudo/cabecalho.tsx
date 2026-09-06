import { CabecalhoBase } from "@/components/admin/pagina";
import type { Migalha } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/* ============================================================================
   Cabeçalho das telas de conteúdo

   Trilha, título, uma frase de contexto e os comandos da tela. O desenho vem
   de `admin/pagina.tsx`, que é o mesmo usado pelas áreas comercial e técnica —
   aqui fica só o respiro de baixo, que estas telas já contavam ter.
   ============================================================================ */

export function CabecalhoDeSecao({
  trilha,
  titulo,
  descricao,
  acoes,
  etiqueta,
  className,
}: {
  trilha?: Migalha[];
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Selo ao lado do título — situação, contagem, aviso curto. */
  etiqueta?: React.ReactNode;
  className?: string;
}) {
  return (
    <CabecalhoBase
      trilha={trilha}
      titulo={titulo}
      descricao={descricao}
      etiquetas={etiqueta}
      acoes={acoes}
      className={cn("mb-6", className)}
    />
  );
}
