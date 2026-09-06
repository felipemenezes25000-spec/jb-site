import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { cacheLife, cacheTag } from "next/cache";

import { ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { Medicao } from "@/components/analytics/medicao";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
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
export async function generateMetadata(): Promise<Metadata> {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");

  const s = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.seo_titulo, template: `%s · ${s.empresa_nome}` },
    description: s.seo_descricao,
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: s.empresa_nome,
      title: s.seo_titulo,
      description: s.seo_descricao,
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
      className={`${manrope.variable} ${mono.variable}`}
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
