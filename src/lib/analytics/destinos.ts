/* ============================================================================
   Para onde a medição pode ir

   Três destinos, todos opcionais e todos configurados no painel: o Google
   Analytics (uso do site), o Google Ads (conversão de anúncio) e o pixel da
   Meta (anúncio no Facebook e no Instagram). Nenhum deles aceita HTML ou
   script colado: o painel guarda só o identificador, validado pelo formato
   abaixo, e o site monta o carregador. Um campo que aceitasse o "código do
   pixel" inteiro seria injeção de script com um passo administrativo no meio.

   Módulo puro, sem navegador e sem banco: o painel usa os mesmos padrões para
   validar ao salvar, o layout para decidir o que entregar à página, e os
   testes para provar que lixo não passa.
   ============================================================================ */

/** Google Analytics 4: `G-` seguido de 6 a 14 letras ou dígitos. */
export const GA4_VALIDO = /^G-[A-Z0-9]{6,14}$/i;

/** Google Ads: `AW-` seguido do número da conta de conversão. */
export const GOOGLE_ADS_VALIDO = /^AW-\d{6,14}$/i;

/**
 * Rótulo de conversão do Google Ads, a parte depois da barra em
 * `AW-123456789/AbC-D_efG12`. Letras, dígitos, hífen e sublinhado.
 */
export const ROTULO_CONVERSAO_VALIDO = /^[A-Za-z0-9_-]{6,40}$/;

/** Pixel da Meta: só dígitos, hoje com 15 ou 16. */
export const META_PIXEL_VALIDO = /^\d{10,20}$/;

export type DestinosDeMedicao = {
  ga4: string | null;
  googleAds: string | null;
  /** Rótulo da conversão "conversa no WhatsApp". Sem ele o Ads só faz remarketing. */
  rotuloWhatsapp: string | null;
  metaPixel: string | null;
};

type ConfiguracoesDeMedicao = {
  codigo_analytics?: string;
  google_ads_id?: string;
  google_ads_rotulo_whatsapp?: string;
  meta_pixel_id?: string;
};

function valido(valor: string | undefined, padrao: RegExp): string | null {
  const limpo = (valor ?? "").trim();
  return padrao.test(limpo) ? limpo : null;
}

/**
 * O que das configurações pode virar script na página.
 *
 * Valida de novo, mesmo com o painel validando ao salvar: um valor gravado
 * direto no banco, ou antes desta regra existir, não pode chegar ao
 * navegador só porque está lá. Inválido vale como vazio.
 */
export function destinosDeMedicao(s: ConfiguracoesDeMedicao): DestinosDeMedicao {
  const googleAds = valido(s.google_ads_id, GOOGLE_ADS_VALIDO);
  return {
    ga4: valido(s.codigo_analytics, GA4_VALIDO),
    googleAds: googleAds?.toUpperCase() ?? null,
    rotuloWhatsapp: googleAds ? valido(s.google_ads_rotulo_whatsapp, ROTULO_CONVERSAO_VALIDO) : null,
    metaPixel: valido(s.meta_pixel_id, META_PIXEL_VALIDO),
  };
}

export function algumDestino(d: DestinosDeMedicao): boolean {
  return Boolean(d.ga4 || d.googleAds || d.metaPixel);
}

/** Quem recebe a medição, em palavras, para o aviso de consentimento. */
export function nomesDosDestinos(d: DestinosDeMedicao): string[] {
  const nomes: string[] = [];
  if (d.ga4 || d.googleAds) nomes.push("Google");
  if (d.metaPixel) nomes.push("Meta (Facebook e Instagram)");
  return nomes;
}
