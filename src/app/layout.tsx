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
