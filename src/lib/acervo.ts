/* ============================================================================
   Acervo — quando uma imagem pode ser publicada

   Uma regra só, e ela existe porque a alternativa é confiar em memória: foto
   com pessoa identificável não vai ao ar sem autorização registrada.

   Isso não é formalidade jurídica. É o mesmo princípio do resto do projeto —
   o site não afirma o que não foi verificado —, aplicado a imagem: publicar a
   foto de um técnico, de uma equipe ou da clínica de um cliente sem que
   alguém tenha perguntado é afirmar um consentimento que não existe.

   Módulo puro. A regra é testável sem banco, que é onde ela precisa valer.
   ============================================================================ */

export type FatosDaMidia = {
  /** Há pessoa identificável na imagem? */
  temPessoa: boolean;
  /** Quando a autorização foi obtida. `null` = não há. */
  autorizadaEm: Date | null;
  /** Texto alternativo cadastrado. */
  alt: string;
};

export type ImpedimentoDeUso =
  | "sem_autorizacao"
  | "sem_texto_alternativo";

export const EXPLICACAO_DO_IMPEDIMENTO: Record<ImpedimentoDeUso, string> = {
  sem_autorizacao:
    "Esta imagem tem pessoa identificável e não tem autorização registrada. " +
    "Registre quando e com quem a autorização foi obtida antes de publicá-la.",
  sem_texto_alternativo:
    "Falta o texto alternativo. Sem ele a imagem não existe para quem usa " +
    "leitor de tela — e o alt não é legenda: ele descreve o que a foto mostra.",
};

/**
 * O que impede esta imagem de ir a uma página pública — ou `null`.
 *
 * A ordem importa pouco aqui; as duas condições são independentes e a
 * primeira encontrada é a devolvida. Quem chama trata como bloqueio, não
 * como aviso.
 */
export function impedimentoDeUsoPublico(midia: FatosDaMidia): ImpedimentoDeUso | null {
  if (midia.temPessoa && !midia.autorizadaEm) return "sem_autorizacao";
  if (midia.alt.trim().length < 3) return "sem_texto_alternativo";
  return null;
}

/** Atalho para filtrar listas. */
export function podeUsarPublicamente(midia: FatosDaMidia): boolean {
  return impedimentoDeUsoPublico(midia) === null;
}

/**
 * A frase de crédito que acompanha a imagem, quando há o que creditar.
 *
 * Devolve `null` quando não há crédito. Um "Foto: JB" automático em imagem
 * cujo autor ninguém registrou é atribuição inventada — pequena, mas
 * inventada.
 */
export function creditoDaImagem(credito: string | null | undefined): string | null {
  const texto = (credito ?? "").trim();
  return texto ? `Foto: ${texto}` : null;
}
