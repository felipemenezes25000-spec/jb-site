import { describe, expect, it } from "vitest";

import {
  CONDICAO_GOOGLE,
  feedXml,
  itemXml,
  motivoDeExclusao,
  type ItemDoFeed,
} from "@/lib/feed";

/* ============================================================================
   Feed do Merchant Center

   O feed fala com um sistema que não pergunta duas vezes. Os testes cobrem os
   dois modos de falha que custam caro: anunciar o que não está à venda, e
   mandar um arquivo que o destino não consegue ler.
   ============================================================================ */

const base: ItemDoFeed = {
  id: "JB-AUTO-21",
  titulo: "Autoclave 21 litros",
  descricao: "Autoclave horizontal de 21 litros para consultório odontológico.",
  link: "https://exemplo.test/loja/autoclave-21",
  imagem: "https://exemplo.test/fotos/autoclave.jpg",
  precoCents: 899000,
  disponivel: true,
  condicao: "novo",
  marca: "Cristófoli",
};

describe("motivoDeExclusao", () => {
  const candidato = {
    publicado: true,
    slug: "autoclave-21",
    precoCents: 100,
    compraDireta: true,
    temImagem: true,
  };

  it("produto publicado, com preço, compra direta e foto entra", () => {
    expect(motivoDeExclusao(candidato)).toBeNull();
  });

  it("rascunho e arquivado ficam de fora", () => {
    expect(motivoDeExclusao({ ...candidato, publicado: false })).toBe("nao_publicado");
  });

  it("produto de demonstração fica de fora", () => {
    // o catálogo de demonstração existe para conferir tela, não para anunciar
    expect(motivoDeExclusao({ ...candidato, slug: "demo-autoclave-21l" })).toBe("demonstracao");
  });

  it("sem preço não vira oferta de zero real", () => {
    expect(motivoDeExclusao({ ...candidato, precoCents: 0 })).toBe("sem_preco");
    expect(motivoDeExclusao({ ...candidato, precoCents: -1 })).toBe("sem_preco");
  });

  it("só sob orçamento não é anunciado com preço", () => {
    // anunciar prometeria uma compra que a loja não deixa fechar
    expect(motivoDeExclusao({ ...candidato, compraDireta: false })).toBe("sem_compra_direta");
  });

  it("sem imagem fica de fora", () => {
    expect(motivoDeExclusao({ ...candidato, temImagem: false })).toBe("sem_imagem");
  });
});

describe("CONDICAO_GOOGLE", () => {
  it("traduz para os três valores admitidos, e só eles", () => {
    const admitidos = new Set(["new", "refurbished", "used"]);
    for (const valor of Object.values(CONDICAO_GOOGLE)) {
      expect(admitidos.has(valor)).toBe(true);
    }
  });

  it("seminovo vira used — o programa da JB não é valor de condição", () => {
    expect(CONDICAO_GOOGLE.seminovo).toBe("used");
    expect(JSON.stringify(CONDICAO_GOOGLE).toLowerCase()).not.toContain("certificado");
  });
});

describe("itemXml", () => {
  it("escreve preço com moeda e duas casas", () => {
    expect(itemXml(base)).toContain("<g:price>8990.00 BRL</g:price>");
  });

  it("disponibilidade usa os valores do destino", () => {
    expect(itemXml(base)).toContain("<g:availability>in_stock</g:availability>");
    expect(itemXml({ ...base, disponivel: false })).toContain(
      "<g:availability>out_of_stock</g:availability>",
    );
  });

  it("marca identifier_exists=no quando não há identificador nenhum", () => {
    expect(itemXml({ ...base, marca: null })).toContain(
      "<g:identifier_exists>no</g:identifier_exists>",
    );
  });

  it("GTIN cadastrado remove o identifier_exists", () => {
    const xml = itemXml({ ...base, gtin: "4006381333931" });
    expect(xml).toContain("<g:gtin>4006381333931</g:gtin>");
    expect(xml).not.toContain("identifier_exists");
  });

  it("marca com MPN também conta como identificador", () => {
    expect(itemXml({ ...base, mpn: "CD-8100" })).not.toContain("identifier_exists");
  });

  it("MPN sem marca não conta", () => {
    expect(itemXml({ ...base, marca: null, mpn: "CD-8100" })).toContain("identifier_exists");
  });

  it("o selo do programa viaja em custom_label, nunca em condition", () => {
    const xml = itemXml({ ...base, condicao: "seminovo", selo: true });
    expect(xml).toContain("<g:condition>used</g:condition>");
    expect(xml).toContain("<g:custom_label_0>seminovo_jb_certificado</g:custom_label_0>");
  });

  it("escapa & e < em título e descrição", () => {
    // um único & cru quebra o arquivo inteiro, não só o item
    const xml = itemXml({ ...base, titulo: "Compressor 40L & seco <novo>" });
    expect(xml).toContain("Compressor 40L &amp; seco &lt;novo&gt;");
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
  });

  it("remove caractere de controle vindo de PDF colado", () => {
    const xml = itemXml({ ...base, descricao: `Autoclave\x00 de bancada\u0007` });
    expect(xml).toContain("Autoclave de bancada");
    // eslint-disable-next-line no-control-regex
    expect(xml).not.toMatch(/[\x00-\x08]/);
  });

  it("corta título acima do limite do destino", () => {
    const xml = itemXml({ ...base, titulo: "A".repeat(200) });
    const titulo = xml.match(/<g:title>(.*?)<\/g:title>/)?.[1] ?? "";
    expect(titulo.length).toBeLessThanOrEqual(150);
  });

  it("campo ausente some do item, em vez de virar vazio", () => {
    const xml = itemXml({ ...base, marca: null, categoria: null });
    expect(xml).not.toContain("<g:brand>");
    expect(xml).not.toContain("<g:product_type>");
  });
});

describe("feedXml", () => {
  const loja = { nome: "JB", link: "https://exemplo.test", descricao: "Equipamentos" };

  it("declara o namespace do destino", () => {
    expect(feedXml(loja, [base])).toContain('xmlns:g="http://base.google.com/ns/1.0"');
  });

  it("feed vazio continua sendo um arquivo válido", () => {
    // catálogo sem item elegível não pode produzir XML quebrado
    const xml = feedXml(loja, []);
    expect(xml).toContain("<channel>");
    expect(xml.trimEnd().endsWith("</rss>")).toBe(true);
  });

  it("abre e fecha um item por produto", () => {
    const xml = feedXml(loja, [base, { ...base, id: "JB-2" }]);
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml.match(/<\/item>/g)).toHaveLength(2);
  });
});
