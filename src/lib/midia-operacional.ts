export const PASTAS_MIDIA_OPERACIONAL_PRIVADA = [
  "chamados",
  "equipamentos",
  "ordens",
  "documentos",
] as const;

const privadas = new Set<string>(PASTAS_MIDIA_OPERACIONAL_PRIVADA);

export function midiaOperacionalEhPrivada(folder: string) {
  return privadas.has(folder);
}

/**
 * URL que pode sair para o navegador.
 *
 * O endereço real do Blob/disco continua no banco e nunca é a fronteira de
 * autorização de uma mídia operacional. Fotos de produto/CMS permanecem
 * públicas; chamados, equipamentos, OS e documentos passam pelo servidor.
 */
export function urlExpostaDaMidia(midia: { id: string; folder: string; url: string }) {
  return midiaOperacionalEhPrivada(midia.folder)
    ? `/api/midia/${encodeURIComponent(midia.id)}`
    : midia.url;
}
