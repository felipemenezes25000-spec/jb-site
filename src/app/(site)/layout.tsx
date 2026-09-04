import { Analytics } from "@/components/site/analytics";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { LegacyStyles } from "@/components/site/legacy-styles";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();

  return (
    <>
      <LegacyStyles />
      <Header />
      {children}
      <Footer />
      <Analytics id={s.codigo_analytics} />
    </>
  );
}
