import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  configurarAnuncios,
  conversaNoWhatsapp,
  envioDoGoogleAds,
  ouvirCliquesNoWhatsapp,
} from "@/lib/analytics/anuncios";
import { destinosDeMedicao, nomesDosDestinos, type DestinosDeMedicao } from "@/lib/analytics/destinos";
import { limparRotulo, origemDaUrl } from "@/lib/analytics/origem";
import { limparPayload } from "@/lib/analytics/taxonomia";

/* ============================================================================
   Medição de anúncio: Google Ads, pixel da Meta e origem da visita

   O que estes testes protegem:

   - só identificador no formato certo vira script na página. O painel valida
     ao salvar, mas um valor gravado direto no banco ("<script>…" no lugar do
     número do pixel) tem de morrer aqui também;
   - a conversão do clique no WhatsApp sai para o Google Ads e para a Meta só
     com consentimento, e nunca impede o link de abrir;
   - a origem da visita (UTM do anúncio) chega limpa ao evento: rótulo de
     campanha, e nada que pareça dado de alguém.
   ============================================================================ */

describe("destinos de medição", () => {
  it("aceita os três identificadores no formato de cada plataforma", () => {
    const destinos = destinosDeMedicao({
      codigo_analytics: " G-ABC123XYZ ",
      google_ads_id: "aw-123456789",
      google_ads_rotulo_whatsapp: "AbC-D_efG12",
      meta_pixel_id: "123456789012345",
    });

    expect(destinos).toEqual({
      ga4: "G-ABC123XYZ",
      googleAds: "AW-123456789",
      rotuloWhatsapp: "AbC-D_efG12",
      metaPixel: "123456789012345",
    });
  });

  it("descarta o que não é só identificador, inclusive código colado", () => {
    const destinos = destinosDeMedicao({
      codigo_analytics: "G-ABC123'); alert(1); //",
      google_ads_id: "AW-12345678/AbCdEf",
      meta_pixel_id: "<script>fbq('init','123')</script>",
    });

    expect(destinos).toEqual({ ga4: null, googleAds: null, rotuloWhatsapp: null, metaPixel: null });
  });

  it("ignora o rótulo de conversão quando falta a conta do Google Ads", () => {
    const destinos = destinosDeMedicao({ google_ads_rotulo_whatsapp: "AbC-D_efG12" });
    expect(destinos.rotuloWhatsapp).toBeNull();
    expect(envioDoGoogleAds(destinos)).toBeNull();
  });

  it("monta o send_to da conversão com conta e rótulo", () => {
    const destinos = destinosDeMedicao({
      google_ads_id: "AW-123456789",
      google_ads_rotulo_whatsapp: "AbC-D_efG12",
    });
    expect(envioDoGoogleAds(destinos)).toBe("AW-123456789/AbC-D_efG12");
  });

  it("diz no aviso quem recebe a medição", () => {
    expect(nomesDosDestinos(destinosDeMedicao({ codigo_analytics: "G-ABC123XYZ" }))).toEqual(["Google"]);
    expect(
      nomesDosDestinos(destinosDeMedicao({ google_ads_id: "AW-123456789", meta_pixel_id: "1234567890123456" })),
    ).toEqual(["Google", "Meta (Facebook e Instagram)"]);
  });
});

describe("origem da visita", () => {
  it("lê a UTM do anúncio e reduz a rótulo simples", () => {
    expect(
      origemDaUrl("?utm_source=Google&utm_medium=CPC&utm_campaign=Conserto Autoclave São Paulo!"),
    ).toEqual({ fonte: "google", meio: "cpc", campanha: "conserto-autoclave-sao-paulo" });
  });

  it("sem UTM, o carimbo do clique ainda diz a plataforma", () => {
    expect(origemDaUrl("?gclid=abc123")).toEqual({ fonte: "google", meio: "cpc" });
    expect(origemDaUrl("?wbraid=xyz")).toEqual({ fonte: "google", meio: "cpc" });
    expect(origemDaUrl("?fbclid=IwAR0abc")).toEqual({ fonte: "meta" });
  });

  it("UTM ganha do carimbo, e visita direta não tem origem", () => {
    expect(origemDaUrl("?gclid=abc&utm_source=instagram")).toEqual({ fonte: "instagram" });
    expect(origemDaUrl("")).toBeNull();
    expect(origemDaUrl("?utm_source=%20%20")).toBeNull();
  });

  it("limpa o rótulo: acento, espaço, símbolo e tamanho", () => {
    expect(limparRotulo("  Promoção  Setembro/2026  ")).toBe("promocao-setembro2026");
    expect(limparRotulo("<b>x</b>")).toBe("bxb");
    expect(limparRotulo("a".repeat(200))).toHaveLength(60);
    expect(limparRotulo("---")).toBeUndefined();
    expect(limparRotulo(null)).toBeUndefined();
  });

  it("os campos de origem estão na lista de permissão da medição", () => {
    const { payload, descartados } = limparPayload({ fonte: "google", meio: "cpc", campanha: "autoclave-sp" });
    expect(payload).toEqual({ fonte: "google", meio: "cpc", campanha: "autoclave-sp" });
    expect(descartados).toEqual([]);
  });
});

/* ------------------------------------------------ conversão no navegador */

type Chamada = unknown[];

function navegadorFalso({ aceito, origem }: { aceito: boolean; origem?: object }) {
  const armazenamento = (inicial: Record<string, string>) => {
    const dados = new Map(Object.entries(inicial));
    return {
      getItem: (chave: string) => dados.get(chave) ?? null,
      setItem: (chave: string, valor: string) => void dados.set(chave, valor),
      removeItem: (chave: string) => void dados.delete(chave),
    };
  };

  const gtag: Chamada[] = [];
  const fbq: Chamada[] = [];

  vi.stubGlobal("window", {
    location: { pathname: "/autoclave", search: "" },
    localStorage: armazenamento(aceito ? { "jb:consentimento-medicao": "aceito" } : {}),
    sessionStorage: armazenamento(origem ? { "jb:origem": JSON.stringify(origem) } : {}),
    gtag: (...argumentos: unknown[]) => gtag.push(argumentos),
    fbq: (...argumentos: unknown[]) => fbq.push(argumentos),
    dispatchEvent: () => true,
  });

  return { gtag, fbq };
}

const TODOS: DestinosDeMedicao = {
  ga4: "G-ABC123XYZ",
  googleAds: "AW-123456789",
  rotuloWhatsapp: "AbC-D_efG12",
  metaPixel: "123456789012345",
};

describe("conversão do clique no WhatsApp", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    configurarAnuncios(TODOS);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sem consentimento, nada sai para Google nem Meta", () => {
    const { gtag, fbq } = navegadorFalso({ aceito: false });
    conversaNoWhatsapp("abertura", "autoclave");
    expect(gtag).toEqual([]);
    expect(fbq).toEqual([]);
  });

  it("com consentimento, avisa o GA4, o Google Ads e a Meta", () => {
    const { gtag, fbq } = navegadorFalso({
      aceito: true,
      origem: { fonte: "google", meio: "cpc", campanha: "autoclave-sp" },
    });

    conversaNoWhatsapp("defeito", "autoclave");

    expect(gtag).toContainEqual([
      "event",
      "whatsapp_click",
      expect.objectContaining({
        etapa: "defeito",
        categoria: "autoclave",
        fonte: "google",
        meio: "cpc",
        campanha: "autoclave-sp",
        rota: "/autoclave",
      }),
    ]);
    expect(gtag).toContainEqual(["event", "conversion", { send_to: "AW-123456789/AbC-D_efG12" }]);
    expect(fbq).toContainEqual([
      "track",
      "Contact",
      { content_name: "whatsapp:defeito", content_category: "autoclave" },
    ]);
  });

  it("sem rótulo de conversão, o Google Ads não recebe conversão solta", () => {
    configurarAnuncios({ ...TODOS, rotuloWhatsapp: null });
    const { gtag } = navegadorFalso({ aceito: true });
    conversaNoWhatsapp("abertura");
    expect(gtag.some((chamada) => chamada[1] === "conversion")).toBe(false);
  });

  it("script de terceiro quebrado não derruba o clique", () => {
    navegadorFalso({ aceito: true });
    (window as unknown as { fbq: () => void }).fbq = () => {
      throw new Error("fbevents fora do ar");
    };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => conversaNoWhatsapp("abertura")).not.toThrow();
  });
});

describe("ouvinte de cliques", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function paginaFalsa() {
    const ouvintes: Record<string, (evento: unknown) => void> = {};
    class ElementoFalso {
      constructor(private readonly link: unknown) {}
      closest() {
        return this.link;
      }
    }
    vi.stubGlobal("Element", ElementoFalso);
    vi.stubGlobal("document", {
      addEventListener: (tipo: string, ouvinte: (evento: unknown) => void) => {
        ouvintes[tipo] = ouvinte;
      },
      removeEventListener: (tipo: string) => {
        delete ouvintes[tipo];
      },
    });
    return { ouvintes, ElementoFalso };
  }

  it("mede o link marcado com data-whatsapp e ignora o resto", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    configurarAnuncios(TODOS);
    const { gtag } = navegadorFalso({ aceito: true });
    const { ouvintes, ElementoFalso } = paginaFalsa();

    const parar = ouvirCliquesNoWhatsapp();

    const link = { dataset: { whatsapp: "rodape-numero", equipamento: "" } };
    ouvintes.click({ type: "click", button: 0, target: new ElementoFalso(link) });
    ouvintes.click({ type: "click", button: 0, target: new ElementoFalso(null) });

    const cliques = gtag.filter((chamada) => chamada[1] === "whatsapp_click");
    expect(cliques).toHaveLength(1);
    expect(cliques[0][2]).toMatchObject({ etapa: "rodape-numero" });
    expect(cliques[0][2]).not.toHaveProperty("categoria");

    parar();
    expect(ouvintes.click).toBeUndefined();
  });
});
