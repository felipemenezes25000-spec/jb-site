import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { cacheLife, cacheTag } from "next/cache";

import { ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { Medicao } from "@/components/analytics/medicao";
import { SCRIPT_DA_CENA } from "@/components/ui/motion-cena";
import { MotionSystem } from "@/components/ui/motion-system";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

import "./globals.css";
import "./footer-alignment.css";
import "./cabecalho.css";
import "./motion.css";
import "./motion-scenes.css";
import "./motion-commerce.css";
import "./motion-feedback.css";
import "./motion-signature.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

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

async function codigoDeMedicao() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");
  const s = await getSettings();
  return s.codigo_analytics ?? "";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* `suppressHydrationWarning` vale só para os atributos do próprio `<html>`:
       o script abaixo grava a cena do Motion System antes da primeira pintura,
       e o React não pode tratar isso como divergência do servidor. */
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${display.variable} ${mono.variable} ${manuscrita.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DA_CENA }} />
      </head>
      <body className="antialiased">
        {children}
        <MotionSystem />
        <Medicao identificador={await codigoDeMedicao()} />
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          duration={6000}
          toastOptions={{ style: { fontFamily: "var(--font-manrope)" } }}
        />
      </body>
    </html>
  );
}
