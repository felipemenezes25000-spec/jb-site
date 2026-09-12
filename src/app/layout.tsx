import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { cacheLife, cacheTag } from "next/cache";

import { ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { Medicao } from "@/components/analytics/medicao";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

import "./globals.css";
import "./footer-alignment.css";
import "./cabecalho.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * A fonte dos títulos.
 *
 * Até aqui título e corpo eram a mesma Manrope, e a hierarquia se apoiava só em
 * tamanho e peso. A Bricolage Grotesque dá ao título um desenho próprio — mais
 * estreita e de contraste maior — sem sair da família grotesca do corpo, que é
 * o que mantém a página como uma peça só.
 *
 * Só nos degraus de título. Corpo, rótulo e número continuam em Manrope: fonte
 * de display em texto corrido cansa, e a JB tem ficha técnica para ler.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

/**
 * A manuscrita do hero e do rodapé.
 *
 * Estava declarada como `"Ink Free", "Segoe Script", "Brush Script MT",
 * cursive` — nenhuma delas é webfont, todas dependem do que o visitante tem
 * instalado. No Windows saía Ink Free, no Mac caía em Brush Script e no
 * Android virava a cursiva genérica do sistema: a assinatura da marca mudava
 * de desenho conforme o aparelho de quem abria o site.
 *
 * Carregada como as outras duas, entra igual em todo lugar.
 */
const manuscrita = Caveat({
  subsets: ["latin"],
  variable: "--font-manuscrita",
  display: "swap",
  weight: ["400", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

/**
 * Metadados raiz.
 *
 * `use cache` porque estes valores são iguais para todo mundo — título,
 * descrição e Open Graph saem das configurações da loja. Sem ele, com Cache
 * Components ligado, a leitura em `generateMetadata` bloqueia o prerender de
 * TODA rota que herda este layout: o Next avisa que "os metadados desta rota
 * estão bloqueados" e a compilação para.
 *
 * A etiqueta é a mesma das configurações públicas, então salvar o painel
 * derruba este cache junto com o do cabeçalho.
 */
/**
 * Os textos de SEO, vindos das configurações.
 *
 * Só strings. Um objeto `URL` não atravessa a fronteira de um escopo `use
 * cache` — ele não é serializável, e o React avisa em tempo de execução que
 * "only plain objects can be passed to Client Components". Foi exatamente o
 * que aconteceu quando `metadataBase: new URL(...)` ficou dentro do cache: o
 * build passava e o console da home reclamava.
 *
 * Por isso a divisão: o que vem do banco é cacheado aqui, em texto puro, e o
 * objeto `Metadata` é montado fora, com o `URL` construído na hora.
 */
async function textosDoSite() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");

  const s = await getSettings();
  return {
    titulo: s.seo_titulo,
    descricao: s.seo_descricao,
    empresa: s.empresa_nome,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const textos = await textosDoSite();

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: textos.titulo, template: `%s · ${textos.empresa}` },
    description: textos.descricao,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: textos.empresa,
      title: textos.titulo,
      description: textos.descricao,
    },
    robots: { index: true, follow: true },
  };
}

/**
 * O identificador de medição configurado no painel.
 *
 * Cacheado com a mesma etiqueta das configurações: ele muda quando alguém
 * salva `/admin/configuracoes`, e não a cada requisição. Sem ele, ler as
 * configurações aqui derrubaria o prerender de todas as rotas.
 */
async function codigoDeMedicao() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");
  const s = await getSettings();
  return s.codigo_analytics ?? "";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      /* o CSS define scroll-behavior: smooth; isto avisa o Next de que a
         escolha é deliberada e não deve ser desligada na troca de rota */
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${display.variable} ${mono.variable} ${manuscrita.variable}`}
    >
      <body className="antialiased">
        {children}
        <Medicao identificador={await codigoDeMedicao()} />
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{ style: { fontFamily: "var(--font-manrope)" } }}
        />
      </body>
    </html>
  );
}
