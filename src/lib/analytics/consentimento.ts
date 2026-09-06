/* ============================================================================
   Consentimento de medição

   A loja funciona inteira sem analytics. Isso não é uma frase de política — é
   a arquitetura: nenhum fluxo depende de um evento ter saído, e a recusa não
   degrada nada. Por isso o padrão é NÃO medir até alguém dizer que sim.

   Estado guardado em `localStorage`, não em cookie: a escolha é do navegador
   de quem visita e não precisa viajar em toda requisição para o servidor. Ela
   também não vale como identificador — guarda "sim" ou "não" e a data.

   Revogar é primeira classe. Quem aceitou pode desaceitar, e desaceitar
   precisa parar o envio na hora, sem recarregar a página — é por isso que o
   estado é observável e não lido uma vez na montagem.
   ============================================================================ */

export type EstadoDeConsentimento = "aceito" | "recusado" | "nao-decidido";

const CHAVE = "jb:consentimento-medicao";
const EVENTO_DE_MUDANCA = "jb:consentimento";

/** Lê a escolha guardada. Armazenamento bloqueado responde "não decidido". */
export function lerConsentimento(): EstadoDeConsentimento {
  if (typeof window === "undefined") return "nao-decidido";
  try {
    const valor = window.localStorage.getItem(CHAVE);
    return valor === "aceito" || valor === "recusado" ? valor : "nao-decidido";
  } catch {
    /* Navegação anônima com armazenamento bloqueado: sem escolha registrada, e
       sem escolha não se mede. Falhar para o lado de não medir é o único
       desfecho seguro. */
    return "nao-decidido";
  }
}

/**
 * Grava a escolha e avisa quem estiver ouvindo.
 *
 * O evento próprio existe porque `storage` só dispara em OUTRAS abas — a aba
 * que gravou não é notificada pelo navegador, e é justamente ela que precisa
 * parar de medir imediatamente ao receber uma recusa.
 */
export function gravarConsentimento(escolha: "aceito" | "recusado") {
  try {
    window.localStorage.setItem(CHAVE, escolha);
  } catch {
    /* Não conseguir gravar não pode travar a tela. O efeito é a pergunta
       voltar na próxima visita, o que é preferível a medir sem registro. */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_DE_MUDANCA, { detail: escolha }));
}

/** Ouve mudanças, nesta aba e nas outras. Devolve a função de parar. */
export function ouvirConsentimento(aoMudar: (estado: EstadoDeConsentimento) => void) {
  const local = () => aoMudar(lerConsentimento());
  const outraAba = (evento: StorageEvent) => {
    if (evento.key === CHAVE) aoMudar(lerConsentimento());
  };

  window.addEventListener(EVENTO_DE_MUDANCA, local);
  window.addEventListener("storage", outraAba);

  return () => {
    window.removeEventListener(EVENTO_DE_MUDANCA, local);
    window.removeEventListener("storage", outraAba);
  };
}
