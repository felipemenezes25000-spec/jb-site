"use client";

import { medir, podeMedir } from "@/lib/analytics/cliente";
import type { DestinosDeMedicao } from "@/lib/analytics/destinos";
import { origemDaVisita } from "@/lib/analytics/origem";

/* ============================================================================
   Conversão de anúncio: o clique no WhatsApp

   O site existe para uma coisa, a conversa no WhatsApp, e é ela que o Google
   Ads e a Meta precisam enxergar para saber qual anúncio funciona. Cada
   clique vira três avisos, cada um para quem precisa dele:

     · `whatsapp_click` no GA4, com a posição do botão, o equipamento e a
       origem da visita (campanha, fonte, meio);
     · `conversion` no Google Ads, no rótulo configurado no painel;
     · `Contact` no pixel da Meta, o evento padrão de "entrou em contato".

   As mesmas regras de `medir`: sem consentimento nada sai, e nada aqui lança
   nem espera. O link abre do mesmo jeito com bloqueador, sem rede ou com os
   três destinos desligados.

   Os identificadores chegam do layout pelo `Medicao`, que chama
   `configurarAnuncios` ao montar. Ficam em memória, e não em `window`, para
   que nenhum script de fora consiga trocá-los.
   ============================================================================ */

declare global {
  interface Window {
    fbq?: (...argumentos: unknown[]) => void;
  }
}

let destinos: DestinosDeMedicao = { ga4: null, googleAds: null, rotuloWhatsapp: null, metaPixel: null };

export function configurarAnuncios(novos: DestinosDeMedicao): void {
  destinos = novos;
}

/** O `send_to` do Google Ads, ou `null` quando falta a conta ou o rótulo. */
export function envioDoGoogleAds(d: DestinosDeMedicao): string | null {
  return d.googleAds && d.rotuloWhatsapp ? `${d.googleAds}/${d.rotuloWhatsapp}` : null;
}

export function conversaNoWhatsapp(posicao: string, equipamento?: string): void {
  medir("whatsapp_click", {
    etapa: posicao,
    ...(equipamento ? { categoria: equipamento } : {}),
    ...origemDaVisita(),
  });

  try {
    if (!podeMedir()) return;

    const envio = envioDoGoogleAds(destinos);
    if (envio && typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: envio });
    }

    if (destinos.metaPixel && typeof window.fbq === "function") {
      window.fbq("track", "Contact", {
        content_name: "whatsapp",
        content_category: equipamento ?? "geral",
      });
    }
  } catch (erro) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[anuncios] a conversão falhou, e o link abre igual:", erro);
    }
  }
}

/**
 * Mede todo clique em link marcado com `data-whatsapp`, venha de onde vier.
 *
 * Um ouvinte só, na página, em vez de um `onClick` por botão: o link do
 * rodapé, o da página de erro e o das páginas institucionais são HTML do
 * servidor, sem JavaScript próprio, e antes ficavam fora da conta. A marca é
 * obrigatória de propósito: os links de WhatsApp do painel (a equipe chamando
 * um cliente) não têm `data-whatsapp` e não viram conversão de anúncio.
 *
 * Escuta na captura, antes de qualquer `stopPropagation` do caminho, e
 * `auxclick` cobre o botão do meio, que abre o link em outra aba.
 */
export function ouvirCliquesNoWhatsapp(): () => void {
  const aoClicar = (evento: MouseEvent) => {
    if (evento.type === "auxclick" && evento.button !== 1) return;
    const alvo = evento.target instanceof Element ? evento.target : null;
    const link = alvo?.closest<HTMLAnchorElement>("a[data-whatsapp]");
    if (!link) return;
    conversaNoWhatsapp(link.dataset.whatsapp || "outro", link.dataset.equipamento || undefined);
  };

  document.addEventListener("click", aoClicar, true);
  document.addEventListener("auxclick", aoClicar, true);
  return () => {
    document.removeEventListener("click", aoClicar, true);
    document.removeEventListener("auxclick", aoClicar, true);
  };
}

/**
 * Liga ou desliga os destinos de anúncio já carregados.
 *
 * O script de terceiro não sai da página quando a pessoa recusa depois de
 * ter aceitado: o que o faz parar é o consentimento dele próprio, e é isso
 * que esta função muda. Na próxima visita ele nem é carregado.
 */
export function aplicarConsentimentoDosAnuncios(aceito: boolean): void {
  try {
    if (typeof window.fbq === "function") window.fbq("consent", aceito ? "grant" : "revoke");
    if (typeof window.gtag === "function") {
      const valor = aceito ? "granted" : "denied";
      window.gtag("consent", "update", {
        ad_storage: valor,
        ad_user_data: valor,
        ad_personalization: valor,
        analytics_storage: valor,
      });
    }
  } catch {
    /* Script de terceiro quebrado não pode derrubar a página. */
  }
}
