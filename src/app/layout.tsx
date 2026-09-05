import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { Toaster } from "sonner";

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

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${mono.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{ style: { fontFamily: "var(--font-manrope)" } }}
        />
      </body>
    </html>
  );
}
