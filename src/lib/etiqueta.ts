/* ============================================================================
   Etiqueta de QR do equipamento

   Duas etiquetas diferentes existem neste projeto, e confundi-las seria o erro
   grave:

   - **A privada**, desta seção: colada no equipamento da clínica, aponta para
     `/e/<localizador>` e exige sessão e titularidade. É localizador, não
     credencial — quem tem o código não tem acesso.
   - **A pública**, da fase 10: impressa na unidade seminova à venda, aponta
     para `/verificar/<código>` e mostra só a certificação. Nunca leva ao
     prontuário de ninguém.

   Este módulo cuida da primeira, e é puro: gera o código, formata o código
   legível e decide quem pode ver o quê. A regra de acesso mora aqui, longe da
   página, porque ela precisa ser testável sem sessão e sem banco.
   ============================================================================ */

import { randomBytes } from "node:crypto";

/**
 * O localizador.
 *
 * 15 bytes em base64url dão 20 caracteres — espaço grande o bastante para
 * não ser varrido, e curto o bastante para caber na etiqueta em fonte legível.
 * Não é derivado do id, do serial nem do cliente: um código derivado do serial
 * permitiria descobrir o parque de uma clínica a partir de um aparelho só.
 */
export function novoLocalizador(): string {
  return randomBytes(15).toString("base64url").toUpperCase();
}

/**
 * O código legível impresso ao lado do QR.
 *
 * Serve para quem está com o celular sem câmera, ou com a etiqueta arranhada
 * demais para ler. Grupos de cinco, separados por hífen — o mesmo agrupamento
 * que se usa ao ditar um código por telefone.
 */
export function codigoLegivel(localizador: string): string {
  return (localizador.match(/.{1,5}/g) ?? []).join("-");
}

/** Desfaz o agrupamento. Aceita o que a pessoa digitar com ou sem hífen. */
export function normalizarCodigo(bruto: string): string {
  return bruto.replace(/[^A-Za-z0-9_-]/g, "").replace(/-/g, "").toUpperCase();
}

/* ------------------------------------------------------------- acesso */

export type QuemAcessa =
  | { tipo: "visitante" }
  | { tipo: "cliente"; customerId: string }
  | { tipo: "staff"; podeVerEquipamentos: boolean };

export type EquipamentoDaEtiqueta = {
  customerId: string;
  /** `true` quando o equipamento foi desativado. */
  desativado: boolean;
};

export type Decisao =
  | { permitido: true; motivo: "titular" | "equipe" }
  | { permitido: false; motivo: "sem_sessao" | "outro_titular" | "sem_permissao" };

export const EXPLICACAO_DA_RECUSA: Record<
  "sem_sessao" | "outro_titular" | "sem_permissao",
  string
> = {
  sem_sessao: "Entre na sua conta para ver a ficha deste equipamento.",
  outro_titular:
    "Este equipamento está no prontuário de outra clínica. Se ele mudou de dono, a JB " +
    "precisa registrar a transferência antes de a ficha aparecer aqui.",
  sem_permissao:
    "A sua conta de equipe não tem acesso ao prontuário de equipamentos. " +
    "Peça a liberação a quem administra o painel.",
};

/**
 * Quem pode abrir a ficha deste equipamento.
 *
 * Três regras, e a terceira é a que costuma faltar em implementações
 * apressadas: **sessão de equipe não é autorização**. Um usuário do painel só
 * vê a ficha se tiver acesso à área de equipamentos — existir sessão staff
 * não basta, porque o painel tem gente comercial e editorial que não precisa
 * do prontuário de ninguém.
 *
 * Equipamento desativado não some daqui: o histórico continua sendo do
 * titular, e a página é que diz que ele saiu de operação. Esconder o aparelho
 * desativado faria a etiqueta colada nele responder "não existe" — e a pessoa
 * concluiria que perdeu o registro.
 */
export function quemPodeVer(
  quem: QuemAcessa,
  equipamento: EquipamentoDaEtiqueta,
): Decisao {
  if (quem.tipo === "visitante") return { permitido: false, motivo: "sem_sessao" };

  if (quem.tipo === "cliente") {
    return quem.customerId === equipamento.customerId
      ? { permitido: true, motivo: "titular" }
      : { permitido: false, motivo: "outro_titular" };
  }

  return quem.podeVerEquipamentos
    ? { permitido: true, motivo: "equipe" }
    : { permitido: false, motivo: "sem_permissao" };
}

/**
 * Para onde o login deve voltar.
 *
 * O destino é construído aqui a partir do localizador, e nunca lido de um
 * parâmetro da URL — que é como um retorno malicioso entra. Quem chega em
 * `/e/ABC` com `?voltar=https://outro.site` não leva o login a lugar nenhum:
 * este caminho é o único que a página oferece.
 */
export function destinoDoLogin(localizador: string): string {
  return `/e/${encodeURIComponent(localizador)}`;
}
