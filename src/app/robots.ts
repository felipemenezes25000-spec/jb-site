import type { MetadataRoute } from "next";

import { SITE_URL, urlAbsoluta } from "@/lib/seo";

/**
 * robots.txt
 *
 * Só a produção é indexável. Preview de branch e ambiente local devolvem
 * bloqueio total — uma cópia de teste do catálogo competindo com o site real
 * no Google seria pior do que não existir.
 *
 * A checagem é `VERCEL_ENV === "production"`. Se um dia a JB sair da Vercel,
 * este é o ponto a ajustar: sem a variável, o robots bloqueia tudo.
 */
export default function robots(): MetadataRoute.Robots {
  const producao = process.env.VERCEL_ENV === "production";

  if (!producao) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // painel, área do cliente, checkout e rotas de dados
        /* `/verificar` é o comprovante de uma unidade física. Uma página por
           unidade vendida não é conteúdo — é recibo, e recibo não se indexa. */
        /* `/avaliar` carrega um token que identifica a transacao de uma
           pessoa. O endereco nao pertence ao indice de ninguem. */
        /* `/e` e a etiqueta colada no equipamento de um cliente. Ela nao e
           conteudo, e cada endereco identifica um bem fisico. */
        disallow: [
          "/admin",
          "/minha-jb",
          "/checkout",
          "/api",
          "/verificar",
          "/avaliar",
          "/e",
        ],
      },
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: SITE_URL,
  };
}
