/* ============================================================================
   Marcas atendidas, assistência autorizada e revenda autorizada

   Três listas que não se misturam. "A JB conserta equipamento da marca X" não
   quer dizer que a JB é autorizada pela X, nem que revende X. Por isso:

   - `marca-atendida`: a JB faz manutenção. Não precisa de fonte, e nunca vira
     selo nem a palavra "autorizada" no site;
   - `assistencia-autorizada` e `revenda-autorizada`: só entram com `fonte`,
     uma página oficial do fabricante onde qualquer pessoa confere. Sem fonte
     verificável, a credencial não é publicada — nem por engano.

   Hoje só existe a EVOXX, na lista oficial de assistências do fabricante. O
   levantamento das demais marcas entra aqui, na categoria certa, quando
   chegar com a comprovação.

   Módulo puro: rodapé, faixa de credencial e testes leem daqui.
   ============================================================================ */

export type CategoriaDeCredencial = "marca-atendida" | "assistencia-autorizada" | "revenda-autorizada";

export type Credencial = {
  marca: string;
  categoria: CategoriaDeCredencial;
  /** Página oficial do fabricante que comprova a autorização. */
  fonte?: string;
};

/** Lista oficial da EVOXX, onde qualquer um confere a autorização da JB. */
export const LISTA_EVOXX = "https://evoxx.com.br/assistencia/?estado=SP&cidade=9668";

export const CREDENCIAIS: readonly Credencial[] = [
  { marca: "EVOXX", categoria: "assistencia-autorizada", fonte: LISTA_EVOXX },
];

/** Como a credencial aparece escrita no site. */
export const ROTULO_DA_CATEGORIA: Record<Exclude<CategoriaDeCredencial, "marca-atendida">, string> = {
  "assistencia-autorizada": "Assistência técnica autorizada",
  "revenda-autorizada": "Revenda autorizada",
};

function fonteVerificavel(fonte: string | undefined): fonte is string {
  if (!fonte) return false;
  try {
    return new URL(fonte).protocol === "https:";
  } catch {
    return false;
  }
}

export type CredencialPublicavel = Credencial & {
  categoria: Exclude<CategoriaDeCredencial, "marca-atendida">;
  fonte: string;
};

/** Autorizações que podem ir para a página: só as que têm fonte oficial. */
export function autorizacoesVerificaveis(
  lista: readonly Credencial[] = CREDENCIAIS,
): CredencialPublicavel[] {
  return lista.filter(
    (credencial): credencial is CredencialPublicavel =>
      credencial.categoria !== "marca-atendida" && fonteVerificavel(credencial.fonte),
  );
}

export function marcasAtendidas(lista: readonly Credencial[] = CREDENCIAIS): string[] {
  return lista.filter((credencial) => credencial.categoria === "marca-atendida").map((credencial) => credencial.marca);
}
