"use client";

import { medir, podeMedir } from "@/lib/analytics/cliente";
import type { DestinosDeMedicao } from "@/lib/analytics/destinos";
import { origemDaVisita } from "@/lib/analytics/origem";

/* ============================================================================
   Conversão de anúncio: intenção de contato pelo WhatsApp

   O evento é o **clique que abre o WhatsApp**, não a conversa concluída: a
   pessoa ainda pode desistir antes de enviar. Essa distinção precisa continuar
   explícita nos nomes e comentários para ninguém apresentar o número como
   atendimento efetivo.

   Depois do consentimento, o clique pode gerar:

     · `whatsapp_click` no GA4, com posição, equipamento, rota (adicionada pelo
       emissor) e origem de campanha permitida;
     · `conversion` no Google Ads, no rótulo configurado no painel;
     · `Contact` no pixel da Meta, com equipamento e posição do CTA como dados
       de conteúdo controlados pelo próprio código.

   Nenhum desses eventos recebe mensagem do WhatsApp, cidade digitada, nome,
   telefone ou outro texto livre. Sem consentimento nada sai, e falha de
   medição nunca bloqueia a abertura do link.
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
        content_name: equipamento ? `whatsapp:${equipamento}` : "whatsapp:geral",
        content_category: posicao,
      });
    }
  } catch (erro) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[anuncios] a medição do clique falhou, e o link abre igual:", erro);
    }
  }
}

/**
 * Mede todo clique em link marcado com `data-whatsapp`, venha de onde vier.
 *
 * Um ouvinte só, na página, em vez de um `onClick` por botão. Links internos
 * do painel não carregam `data-whatsapp`, então a equipe chamando um cliente
 * nunca vira conversão de anúncio.
 *
 * Escuta na captura, antes de qualquer `stopPropagation`, e `auxclick` cobre o
 * botão do meio. O atributo `data-equipamento` recebe apenas ids controlados do
 * diagnóstico; a mensagem pronta vive no `href` e não é lida por este módulo.
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
 * O script de terceiro não sai da página quando a pessoa recusa depois de ter
 * aceitado: o que o faz parar é o consentimento do próprio provedor. Na visita
 * seguinte ele nem é carregado.
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
