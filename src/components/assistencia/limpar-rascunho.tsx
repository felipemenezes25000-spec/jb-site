"use client";

import { useEffect } from "react";

/**
 * Apaga o rascunho do assistente de chamado.
 *
 * Fica na página do chamado recém-criado porque é ali que se sabe que o envio
 * deu certo: a Server Action termina em `redirect`, e a árvore do formulário
 * é desmontada sem chance de rodar limpeza. Um componente de uma linha na
 * chegada resolve, e sem depender de o envio ter sido feito com JavaScript.
 */
export function LimparRascunho({ chave = "jb:chamado:rascunho" }: { chave?: string }) {
  useEffect(() => {
    try {
      sessionStorage.removeItem(chave);
    } catch {
      // armazenamento bloqueado: não havia rascunho para apagar
    }
  }, [chave]);

  return null;
}
