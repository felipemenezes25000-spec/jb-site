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
        disallow: ["/admin", "/minha-jb", "/checkout", "/api"],
      },
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: SITE_URL,
  };
}
