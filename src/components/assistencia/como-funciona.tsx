import {
  CalendarCheck,
  ClipboardCheck,
  FileSearch,
  PencilLine,
  Stethoscope,
  Wrench,
} from "lucide-react";

import { ETAPAS_PUBLICAS } from "@/components/assistencia/rotulos";
import { PassosNumerados } from "@/components/ui/passos";

/**
 * As seis etapas do atendimento, do jeito que o cliente vive.
 *
 * A ordem é a mesma de `FLUXO_CHAMADO` em `@/lib/assistencia`, comprimida nas
 * etapas que a linha do tempo do chamado mostra. Não é um texto de vitrine
 * paralelo ao sistema: é o mesmo caminho que o número AT vai percorrer.
 *
 * O desenho vem do `PassosNumerados` do design system — numeração de verdade
 * em `<ol>`, com o fio ligando os números na disposição em coluna. Manter o
 * componente aqui é o que garante que a página pública e a linha do tempo do
 * chamado continuem contando a mesma história.
 */

/** Um ícone por etapa, na ordem de `ETAPAS_PUBLICAS`. Decorativo. */
const ICONES = [
  PencilLine,
  FileSearch,
  CalendarCheck,
  Stethoscope,
  Wrench,
  ClipboardCheck,
] as const;

export function ComoFunciona({
  disposicao = "coluna",
  className,
}: {
  /** `coluna` empilha com o fio ligando os números; `fileira` vira grade. */
  disposicao?: "coluna" | "fileira";
  className?: string;
}) {
  return (
    <PassosNumerados
      disposicao={disposicao}
      rotulo="Etapas do atendimento técnico"
      className={className}
      passos={ETAPAS_PUBLICAS.map((etapa, indice) => ({
        titulo: etapa.titulo,
        descricao: etapa.texto,
        icone: ICONES[indice],
      }))}
    />
  );
}
