import type { Metadata } from "next";

import { getSettings } from "@/lib/settings";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    // O site antigo imprimia sempre o mesmo <title> ($tit do inc_topo.php);
    // só a meta description mudava por página. Mantido igual.
    title: s.site_titulo,
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
