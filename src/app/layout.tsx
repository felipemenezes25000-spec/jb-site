import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { configuracoesPublicas } from "@/lib/site-publico";
import { SCRIPT_DA_CENA } from "@/components/ui/motion-cena";
import { SITE_URL } from "@/lib/seo";

/* Só o design system comum. As folhas do Motion System entram pelo layout do
   painel (`app/(admin)/layout.tsx`), e as do site público pelo layout dele:
   uma página pública não baixa o CSS de animação do backoffice. As folhas do
   cabeçalho e do rodapé da loja saíram junto com ela. */
import "./globals.css";

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
  /* Faz `env(safe-area-inset-*)` representar de verdade o recorte do iPhone.
     Sem `viewport-fit=cover`, a barra fixa já tinha CSS de safe area, mas o
     navegador podia manter a área útil artificialmente encolhida e o padding
     não correspondia ao aparelho. */
  viewportFit: "cover",
};

/* A leitura passa por `configuracoesPublicas`, que já é cacheada, etiquetada e
   volta aos padrões da JB quando o banco não responde. */
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
    applicationName: textos.empresa,
    title: { default: textos.titulo, template: `%s · ${textos.empresa}` },
    description: textos.descricao,
    appleWebApp: {
      capable: true,
      title: textos.empresa,
      statusBarStyle: "default",
    },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* A cena continua marcada antes da primeira pintura para o backoffice.
            O runtime do Motion System, porém, é montado apenas no grupo admin;
            o site público tem sua própria coreografia mais leve. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_DA_CENA }} />
      </head>
      <body className="antialiased">
        {children}
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
