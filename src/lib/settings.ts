import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Espelha a tabela `configuracoes` do MARS mais os blocos da `institucional`
 * que o site antigo usava como configuração (endereço, mapa e e-mail de envio).
 */
export const SETTING_DEFAULTS = {
  site_titulo: "JB Soluções Odontológicas",
  descricao_master:
    "“O trabalho perseverante vence todos os obstáculos com confiabilidade, transparência e sinceridade.”",
  telefone_rodape: "(11) 3715-6362 | (11) 9.6341-7994",
  endereco_rodape: "Rua Domingos de Braga, 200, CJ 153, Bloco 3 - São Paulo/SP",
  email_contato: "comercial@jbsolucoesodontologicas.com.br",
  contato_html: "",
  maps_html: "",
  codigo_analytics: "",
  fanpage_link: "https://www.facebook.com/jbsolucoesodontologicas/",
  twitter_link: "",
  instagram_link: "",
  pinterest_link: "",
  google_plus_link: "",
  linkedin_link: "",
  youtube_link: "",
  skype_link: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingsMap = Record<SettingKey, string>;

/** Metadados para montar o formulário do painel. */
export const SETTING_FIELDS: {
  key: SettingKey;
  label: string;
  group: "geral" | "contato" | "social";
  type: "text" | "textarea" | "url" | "email" | "html";
  hint?: string;
}[] = [
  { key: "site_titulo", label: "Nome do site", group: "geral", type: "text" },
  {
    key: "descricao_master",
    label: "Frase da home",
    group: "geral",
    type: "textarea",
    hint: "Aparece em destaque logo abaixo do banner.",
  },
  { key: "codigo_analytics", label: "Código do Google Analytics", group: "geral", type: "text" },
  { key: "telefone_rodape", label: "Telefone do rodapé", group: "contato", type: "text" },
  { key: "endereco_rodape", label: "Endereço do rodapé", group: "contato", type: "text" },
  {
    key: "email_contato",
    label: "E-mail que recebe o formulário",
    group: "contato",
    type: "email",
  },
  {
    key: "contato_html",
    label: "Bloco de endereço da página de contato",
    group: "contato",
    type: "html",
  },
  {
    key: "maps_html",
    label: "Google Maps (código de incorporação)",
    group: "contato",
    type: "textarea",
    hint: "No Google Maps: Compartilhar › Incorporar um mapa › copie o <iframe> inteiro.",
  },
  { key: "fanpage_link", label: "Facebook", group: "social", type: "url" },
  { key: "instagram_link", label: "Instagram", group: "social", type: "url" },
  { key: "twitter_link", label: "Twitter", group: "social", type: "url" },
  { key: "linkedin_link", label: "LinkedIn", group: "social", type: "url" },
  { key: "youtube_link", label: "YouTube", group: "social", type: "url" },
  { key: "pinterest_link", label: "Pinterest", group: "social", type: "url" },
  { key: "google_plus_link", label: "Google+", group: "social", type: "url" },
  { key: "skype_link", label: "Skype", group: "social", type: "url" },
];

export const getSettings = cache(async (): Promise<SettingsMap> => {
  const rows = await prisma.setting.findMany();
  const map = { ...SETTING_DEFAULTS } as SettingsMap;
  for (const row of rows) {
    if (row.key in map) map[row.key as SettingKey] = row.value;
  }
  return map;
});

/**
 * O rodapé antigo tentava separar o DDD com reset()/end() sobre um explode()
 * temporário — o que em PHP 5 não devolve o último pedaço, e sim a string
 * inteira. O resultado na tela era o <span class="ddd"> vazio seguido do
 * telefone completo. Mantido igual, porque é o que o site mostra hoje.
 */
export function splitTelefoneRodape(value: string) {
  const primeiro = value.trim().split(" ")[0] ?? "";
  return { ddd: primeiro.length === 2 ? primeiro : "", numero: value };
}

/** Redes sociais na mesma ordem e com os mesmos ícones do site antigo. */
export function redesSociais(s: SettingsMap) {
  return (
    [
      { key: "fanpage_link", img: "/images/facebook.png", label: "Facebook" },
      { key: "twitter_link", img: "/images/twitter.png", label: "Twitter" },
      { key: "instagram_link", img: "/images/instagram.png", label: "Instagram" },
      { key: "pinterest_link", img: "/images/pinterest.png", label: "Pinterest" },
      { key: "google_plus_link", img: "/images/google_plus.png", label: "Google+" },
      { key: "linkedin_link", img: "/images/linkedin.png", label: "LinkedIn" },
      { key: "youtube_link", img: "/images/youtube.png", label: "YouTube" },
      { key: "skype_link", img: "/images/skype.png", label: "Skype" },
    ] as const
  )
    .map((item) => ({ ...item, href: s[item.key] }))
    .filter((item) => item.href.trim() !== "");
}
