import type { MetadataRoute } from "next";

import { SETTING_DEFAULTS, getSettings } from "@/lib/settings";

/**
 * manifest.webmanifest
 *
 * É o que o navegador lê quando alguém escolhe "adicionar à tela inicial": nome
 * do aplicativo, ícone, cor da barra e por onde abrir. Serve principalmente
 * para a equipe da JB e para o cliente que acompanha chamado pelo celular.
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
export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // anotação explícita porque SETTING_DEFAULTS é `as const`: sem ela o tipo
  // ficaria preso ao texto padrão e o valor vindo do banco não caberia
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
    orientation: "portrait",

    // Vermelho da marca (--color-jb-500) na barra do aplicativo instalado,
    // sobre o fundo branco que a interface usa em todo lugar.
    theme_color: "#e0141b",
    background_color: "#ffffff",

    categories: ["business", "shopping", "medical"],

    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/marca/jb-icone-512.png", sizes: "512x512", type: "image/png" },
    ],

    // Atalhos que aparecem ao segurar o ícone do aplicativo. Só rotas que
    // resolvem para todo mundo: a área do cliente pede login e, sem sessão, a
    // pessoa cai na tela de entrar — que é o comportamento certo.
    shortcuts: [
      {
        name: "Solicitar assistência",
        short_name: "Assistência",
        description: "Abrir um chamado para um equipamento parado.",
        url: "/assistencia-tecnica/solicitar",
      },
      {
        name: "Minha JB",
        short_name: "Minha JB",
        description: "Pedidos, chamados, orçamentos e equipamentos.",
        url: "/minha-jb",
      },
      {
        name: "Equipamentos",
        short_name: "Loja",
        description: "Equipamentos novos, seminovos e peças.",
        url: "/loja",
      },
    ],
  };
}
