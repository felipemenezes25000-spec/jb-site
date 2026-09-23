import type { MetadataRoute } from "next";

import { SETTING_DEFAULTS, getSettings } from "@/lib/settings";

/**
 * manifest.webmanifest
 *
 * É o que o navegador lê quando alguém escolhe "adicionar à tela inicial": nome
 * do aplicativo, ícone, cor da barra e por onde abrir. Serve principalmente
 * para quem volta à assistência pelo celular e quer chegar ao diagnóstico ou
 * a um equipamento específico sem atravessar a home inteira.
 *
 * O nome e a descrição saem da configuração (`@/lib/settings`), como no resto
 * do site, para a JB poder mudar sem tocar em código. Se o banco estiver fora
 * do ar, cai nos padrões em vez de derrubar a rota — manifesto quebrado tira o
 * ícone da tela inicial de quem já instalou.
 *
 * Os ícones vêm de `public/marca`, e não de `src/app/icon.png`: os arquivos de
 * metadado do App Router são servidos numa URL com identificador de versão
 * (`/icon?<hash>`), que muda a cada build. URL de ícone de manifesto precisa
 * ser estável, senão o sistema operacional reinstala o ícone a cada visita.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let nome: string = SETTING_DEFAULTS.empresa_nome;
  let resumo: string = SETTING_DEFAULTS.empresa_resumo;

  try {
    const s = await getSettings();
    nome = s.empresa_nome;
    resumo = s.empresa_resumo;
  } catch (erro) {
    console.error("manifest: configurações indisponíveis, usando os padrões", erro);
  }

  return {
    id: "/",
    name: nome,
    short_name: "JB",
    description: resumo,
    lang: "pt-BR",
    dir: "ltr",

    start_url: "/",
    scope: "/",
    display: "standalone",

    // Vermelho da marca (--color-jb-500) na barra do aplicativo instalado,
    // sobre o fundo branco que a interface usa em todo lugar.
    theme_color: "#e0141b",
    background_color: "#ffffff",

    categories: ["business", "medical"],

    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/marca/jb-icone-512.png", sizes: "512x512", type: "image/png" },
    ],

    // Atalhos do ícone instalado. O diagnóstico continua sendo o primeiro;
    // os três seguintes cobrem intenções frequentes de anúncio sem inventar
    // uma navegação paralela à do site.
    shortcuts: [
      {
        name: "Chamar a assistência",
        short_name: "Assistência",
        description: "Montar a mensagem do equipamento parado e chamar no WhatsApp.",
        url: "/#diagnostico",
      },
      {
        name: "Conserto de autoclave",
        short_name: "Autoclave",
        description: "Abrir a triagem de autoclave e chamar a equipe da JB.",
        url: "/autoclave",
      },
      {
        name: "Conserto de compressor",
        short_name: "Compressor",
        description: "Abrir a triagem de compressor e chamar a equipe da JB.",
        url: "/compressor",
      },
      {
        name: "Conserto de cadeira odontológica",
        short_name: "Cadeira",
        description: "Abrir a triagem de cadeira odontológica e chamar a equipe da JB.",
        url: "/cadeira-odontologica",
      },
    ],
  };
}
