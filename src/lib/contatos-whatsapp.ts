import { somenteDigitos, whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Quem atende em cada WhatsApp da JB

   As configurações têm dois WhatsApps, cada um com o nome de quem atende. O
   site mostra os dois lado a lado; aqui mora a regra de quais aparecem e da
   saudação da mensagem pronta.
   ============================================================================ */

export type ContatoWhatsapp = { numero: string; nome: string };

/** Os WhatsApps das configurações, principal primeiro, sem vazio, inválido ou repetido. */
export function contatosWhatsapp(
  s: Pick<SettingsMap, "whatsapp" | "whatsapp_nome" | "whatsapp_alternativo" | "whatsapp_alternativo_nome">,
): ContatoWhatsapp[] {
  const vistos = new Set<string>();
  return [
    { numero: s.whatsapp, nome: s.whatsapp_nome.trim() },
    { numero: s.whatsapp_alternativo, nome: s.whatsapp_alternativo_nome.trim() },
  ].filter(({ numero }) => {
    const digitos = somenteDigitos(numero);
    if (!whatsappHref(numero) || vistos.has(digitos)) return false;
    vistos.add(digitos);
    return true;
  });
}

/** "Olá, JB! …" vira "Olá, Jackson! …" quando se sabe quem atende. */
export function saudarPeloNome(mensagem: string, nome: string): string {
  return nome ? mensagem.replace(/^Olá, JB!/, `Olá, ${nome}!`) : mensagem;
}
