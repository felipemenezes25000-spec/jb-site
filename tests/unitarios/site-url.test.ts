import { describe, expect, it } from "vitest";

import {
  ambienteDePublicacao,
  conferirOrigem,
  normalizarOrigem,
  resolverOrigem,
} from "@/lib/site-url";

/* ============================================================================
   A origem pública do site

   O modo de falha que estes testes existem para impedir: uma produção
   publicada sem `NEXT_PUBLIC_SITE_URL`, gerando canônico e sitemap apontando
   para `localhost:3000`. Nada quebra na tela, nada aparece nos testes, e o
   site some do índice semanas depois.
   ============================================================================ */

describe("ambienteDePublicacao", () => {
  it("distingue produção, preview e desenvolvimento pelo VERCEL_ENV", () => {
    expect(ambienteDePublicacao({ VERCEL_ENV: "production" })).toBe("producao");
    expect(ambienteDePublicacao({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(ambienteDePublicacao({})).toBe("desenvolvimento");
  });

  it("NODE_ENV=production sozinho NÃO é produção", () => {
    // `next build` roda com NODE_ENV=production na máquina de quem desenvolve
    // e na CI. Confundir os dois tornaria impossível construir fora da Vercel.
    expect(ambienteDePublicacao({ NODE_ENV: "production" })).toBe(
      "desenvolvimento",
    );
  });
});

describe("conferirOrigem", () => {
  it("aceita uma origem HTTPS limpa em produção", () => {
    expect(conferirOrigem("https://jbsolucoesodontologicas.com.br", "producao")).toBeNull();
  });

  it("aceita localhost fora de produção", () => {
    expect(conferirOrigem("http://localhost:3000", "desenvolvimento")).toBeNull();
    expect(conferirOrigem("http://localhost:3000", "preview")).toBeNull();
  });

  it("em produção, ausência é impeditiva", () => {
    const p = conferirOrigem(undefined, "producao");
    expect(p?.impeditivo).toBe(true);
    expect(p?.mensagem).toContain("NEXT_PUBLIC_SITE_URL");
  });

  it("fora de produção, ausência é só aviso", () => {
    expect(conferirOrigem(undefined, "desenvolvimento")?.impeditivo).toBe(false);
    expect(conferirOrigem("", "preview")?.impeditivo).toBe(false);
  });

  it("recusa endereço sem protocolo em qualquer ambiente", () => {
    // era o fallback de `opengraph-image.tsx`: um domínio nu, que vira caminho
    // relativo quando concatenado
    for (const ambiente of ["producao", "preview", "desenvolvimento"] as const) {
      const p = conferirOrigem("jbsolucoesodontologicas.com.br", ambiente);
      expect(p?.impeditivo, ambiente).toBe(true);
    }
  });

  it("recusa protocolo que não serve para um site", () => {
    expect(conferirOrigem("ftp://exemplo.com.br", "producao")?.impeditivo).toBe(true);
  });

  it("recusa origem com caminho, busca ou âncora", () => {
    // concatenar "/loja/x" numa base que já tem caminho produz URL errada
    expect(conferirOrigem("https://exemplo.com.br/loja", "producao")?.impeditivo).toBe(true);
    expect(conferirOrigem("https://exemplo.com.br/?utm=1", "producao")?.impeditivo).toBe(true);
    expect(conferirOrigem("https://exemplo.com.br/#topo", "producao")?.impeditivo).toBe(true);
  });

  it("em produção recusa HTTP", () => {
    const p = conferirOrigem("http://jbsolucoesodontologicas.com.br", "producao");
    expect(p?.impeditivo).toBe(true);
    expect(p?.mensagem).toContain("HTTPS");
  });

  it("em produção recusa qualquer endereço local", () => {
    for (const host of ["localhost", "127.0.0.1", "0.0.0.0"]) {
      expect(conferirOrigem(`https://${host}`, "producao")?.impeditivo, host).toBe(true);
    }
  });

  it("a barra final não é problema — é normalizada", () => {
    expect(conferirOrigem("https://exemplo.com.br/", "producao")).toBeNull();
  });
});

describe("normalizarOrigem", () => {
  it("tira a barra do fim, inclusive repetida", () => {
    expect(normalizarOrigem("https://exemplo.com.br/")).toBe("https://exemplo.com.br");
    expect(normalizarOrigem("https://exemplo.com.br///")).toBe("https://exemplo.com.br");
    expect(normalizarOrigem("  https://exemplo.com.br  ")).toBe("https://exemplo.com.br");
  });
});

describe("resolverOrigem", () => {
  it("devolve a origem configurada", () => {
    const env = {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://jbsolucoesodontologicas.com.br/",
    };
    expect(resolverOrigem(env)).toBe("https://jbsolucoesodontologicas.com.br");
  });

  it("LANÇA em produção sem a variável — não cai em localhost", () => {
    // esta é a asserção central do arquivo
    expect(() => resolverOrigem({ VERCEL_ENV: "production" })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it("LANÇA em produção com localhost", () => {
    const env = {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://localhost:3000",
    };
    expect(() => resolverOrigem(env)).toThrow();
  });

  it("cai no padrão local fora de produção, sem lançar", () => {
    expect(resolverOrigem({})).toBe("http://localhost:3000");
  });

  it("preview sem a variável avisa mas não derruba", () => {
    expect(resolverOrigem({ VERCEL_ENV: "preview" })).toBe(
      "http://localhost:3000",
    );
  });
});
