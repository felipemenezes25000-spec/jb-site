import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { configuracoesPublicas } from "@/lib/site-publico";
import { Medicao } from "@/components/analytics/medicao";
import { destinosDeMedicao } from "@/lib/analytics/destinos";
import { SCRIPT_DA_CENA } from "@/components/ui/motion-cena";
import { MotionSystem } from "@/components/ui/motion-system";
import { SITE_URL } from "@/lib/seo";

import "./globals.css";
import "./footer-alignment.css";
import "./cabecalho.css";
import "./motion.css";
import "./motion-scenes.css";
import "./motion-feedback.css";
import "./motion-signature.css";
import "./motion-signature-safety.css";

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

/* As duas leituras abaixo passam por `configuracoesPublicas`, que já é
   cacheada, etiquetada e volta aos padrões da JB quando o banco não responde.
   Antes cada uma consultava o banco por conta própria e, sem ele, derrubava o
   site inteiro, inclusive o botão do WhatsApp. */
async function textosDoSite() {
  const s = await configuracoesPublicas();
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

async function destinosDaMedicao() {
  return destinosDeMedicao(await configuracoesPublicas());
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DA_CENA }} />
      </head>
      <body className="antialiased">
        {children}
        <MotionSystem />
        <Medicao destinos={await destinosDaMedicao()} />
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
