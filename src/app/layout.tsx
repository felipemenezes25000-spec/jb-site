import type { Metadata } from "next";

import { getSettings } from "@/lib/settings";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: s.site_titulo, template: `%s | ${s.site_titulo}` },
    authors: [{ name: "G4web Agência de Internet" }],
    icons: { icon: "/images/ico/favicon.ico" },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
