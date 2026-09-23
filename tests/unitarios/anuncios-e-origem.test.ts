import { describe, expect, it } from "vitest";

import { envioDoGoogleAds } from "@/lib/analytics/anuncios";
import {
  limparRotulo,
  localizacaoParaMedicao,
  origemDaUrl,
  parametrosDeCampanha,
} from "@/lib/analytics/origem";
import type { DestinosDeMedicao } from "@/lib/analytics/destinos";

/* ============================================================================
   Anúncios e atribuição

   Estes testes protegem o contrato de privacidade do funil pago: a URL pode
   dizer de qual campanha a visita veio, mas o payload interno guarda apenas
   rótulos controlados/limpos e a plataforma de origem — nunca o valor bruto do
   click-id. Também garante que uma conversão de Google Ads só tenha `send_to`
   quando conta e rótulo foram configurados juntos.
   ============================================================================ */

function destinos(parcial: Partial<DestinosDeMedicao> = {}): DestinosDeMedicao {
  return {
    ga4: null,
    googleAds: null,
    rotuloWhatsapp: null,
    metaPixel: null,
    ...parcial,
  };
}

describe("limparRotulo", () => {
  it("normaliza rótulo de campanha sem carregar texto arbitrário", () => {
    expect(limparRotulo(" Pesquisa SP / Autoclave  ")).toBe("pesquisa-sp-autoclave");
    expect(limparRotulo("Campanha_2026.Setembro")).toBe("campanha_2026.setembro");
  });

  it("limita o tamanho do rótulo", () => {
    expect(limparRotulo("a".repeat(200))?.length).toBeLessThanOrEqual(60);
  });
});

describe("origemDaUrl", () => {
  it("UTM explícita prevalece e sai normalizada", () => {
    expect(
      origemDaUrl("?utm_source=Google&utm_medium=CPC&utm_campaign=Autoclave%20SP&gclid=segredo"),
    ).toEqual({ fonte: "google", meio: "cpc", campanha: "autoclave-sp" });
  });

  it("click-id do Google vira somente plataforma e meio", () => {
    const origem = origemDaUrl("?gclid=EAIaIQobChMI-identificador-bruto");
    expect(origem).toEqual({ fonte: "google", meio: "cpc" });
    expect(JSON.stringify(origem)).not.toContain("EAIaIQob");
  });

  it("gbraid e wbraid seguem a mesma regra sem persistir o identificador", () => {
    expect(origemDaUrl("?gbraid=abc123")).toEqual({ fonte: "google", meio: "cpc" });
    expect(origemDaUrl("?wbraid=xyz789")).toEqual({ fonte: "google", meio: "cpc" });
  });

  it("fbclid identifica Meta sem guardar o click-id", () => {
    const origem = origemDaUrl("?fbclid=valor-que-nao-deve-ser-persistido");
    expect(origem).toEqual({ fonte: "meta" });
    expect(JSON.stringify(origem)).not.toContain("valor-que-nao-deve");
  });

  it("visita sem marcador não inventa origem", () => {
    expect(origemDaUrl("?ref=rodape")).toBeNull();
  });
});

describe("envioDoGoogleAds", () => {
  it("monta send_to somente com conta e rótulo", () => {
    expect(
      envioDoGoogleAds(
        destinos({ googleAds: "AW-123456789", rotuloWhatsapp: "AbCdEfGhIjK" }),
      ),
    ).toBe("AW-123456789/AbCdEfGhIjK");
  });

  it("sem rótulo não emite conversão incompleta", () => {
    expect(envioDoGoogleAds(destinos({ googleAds: "AW-123456789" }))).toBeNull();
  });

  it("sem conta não usa rótulo solto", () => {
    expect(envioDoGoogleAds(destinos({ rotuloWhatsapp: "AbCdEfGhIjK" }))).toBeNull();
  });
});

describe("parametrosDeCampanha", () => {
  it("deixa passar só UTM e click-id do Google, na ordem da lista", () => {
    const saida = parametrosDeCampanha(
      "?email=ana%40clinica.com&utm_source=Google&telefone=11999990000&gclid=Cj0KCQ-abc_123&utm_campaign=Autoclave%20SP",
    );
    expect(saida.toString()).toBe("utm_source=google&utm_campaign=autoclave-sp&gclid=Cj0KCQ-abc_123");
  });

  it("descarta click-id com caractere fora do formato", () => {
    expect(parametrosDeCampanha("?gclid=<script>").toString()).toBe("");
  });

  it("fbclid não vai para o page_location", () => {
    expect(parametrosDeCampanha("?fbclid=abc123").toString()).toBe("");
  });
});

describe("localizacaoParaMedicao", () => {
  const ORIGEM = "https://www.jbsolucoesodontologicas.com.br";

  it("sem campanha, é origem + caminho", () => {
    expect(localizacaoParaMedicao(ORIGEM, "/autoclave", "?ref=x&nome=ana", null, true)).toBe(
      `${ORIGEM}/autoclave`,
    );
  });

  it("primeira visualização leva a campanha da URL", () => {
    expect(
      localizacaoParaMedicao(ORIGEM, "/autoclave", "?utm_source=google&utm_medium=cpc&gclid=abc", null, true),
    ).toBe(`${ORIGEM}/autoclave?utm_source=google&utm_medium=cpc&gclid=abc`);
  });

  it("aceite depois de navegar reconstrói a origem guardada, sem click-id", () => {
    expect(
      localizacaoParaMedicao(ORIGEM, "/", "", { fonte: "google", meio: "cpc", campanha: "autoclave-sp" }, true),
    ).toBe(`${ORIGEM}/?utm_source=google&utm_medium=cpc&utm_campaign=autoclave-sp`);
  });

  it("visualizações seguintes não repetem a campanha", () => {
    expect(localizacaoParaMedicao(ORIGEM, "/compressor", "?utm_source=google", null, false)).toBe(
      `${ORIGEM}/compressor`,
    );
  });
});
