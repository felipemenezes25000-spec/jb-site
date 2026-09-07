"use server";

import { sugerir, SEM_SUGESTOES, type Sugestoes } from "@/lib/busca/sugestoes";

/* ============================================================================
   Sugestões da busca

   Porta única entre o campo de busca (cliente) e as consultas do catálogo
   (servidor). Não recebe nada além do texto digitado e não devolve nada que
   já não esteja publicado — o mesmo `PUBLICADO` que a vitrine usa.

   Sem gravação, sem sessão e sem parâmetro de identificação: esta ação não
   registra a consulta em lugar nenhum. Medir busca é trabalho do evento
   `search` em /busca, que passa por `consultaPodeSerMedida` antes de sair do
   navegador.
   ========================================================================== */

export async function sugestoesDaBusca(consulta: string): Promise<Sugestoes> {
  if (typeof consulta !== "string") return SEM_SUGESTOES;
  return sugerir(consulta);
}
