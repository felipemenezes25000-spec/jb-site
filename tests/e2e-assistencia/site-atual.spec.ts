import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/* ============================================================================
   E2E do produto público atual: assistência técnica, e só isso

   Cobre a jornada anúncio → landing/home → equipamento → sintoma → situação →
   cidade → Jeferson ou Jackson → WhatsApp, nas quatro larguras do config
   (320, 390, 1440 e 1920), mais o que cerca essa jornada: metadados das sete
   landings, sitemap e robots, 410 da loja removida, admin protegido,
   consentimento, PageView em navegação SPA e medição do clique.

   Medição: a validação final grava identificadores FICTÍCIOS de GA4, Google
   Ads e Meta no banco efêmero, e aqui toda requisição a Google e Meta é
   interceptada e respondida com um script vazio. Nada sai para a internet, e
   o que o site mandaria fica em `dataLayer` e na fila do `fbq`, onde o teste
   lê. Sem destinos configurados (CI com banco sem IDs), os testes de medição
   se declaram pulados — a menos que `E2E_EXIGE_MEDICAO=1`, que é o que a
   validação final usa para que "pulado" nunca vire "verde".
   ============================================================================ */

const LANDINGS = [
  { rota: "/autoclave", nome: "Autoclave", chave: /autoclave/i, equipamento: "autoclave", defeito: "Não pressuriza" },
  { rota: "/compressor", nome: "Compressor", chave: /compressor/i, equipamento: "compressor", defeito: "Não liga" },
  { rota: "/cadeira-odontologica", nome: "Cadeira", chave: /cadeira/i, equipamento: "cadeira", defeito: "Pedal não responde" },
  { rota: "/bomba-de-vacuo", nome: "Bomba de vácuo", chave: /bomba de vácuo/i, equipamento: "bomba-vacuo", defeito: "Sem sucção" },
  { rota: "/seladora", nome: "Seladora", chave: /seladora/i, equipamento: "seladora", defeito: "Não sela direito" },
  { rota: "/destilador", nome: "Destilador", chave: /destilador/i, equipamento: "destilador", defeito: "Não destila" },
  { rota: "/lavadora-ultrassonica", nome: "Lavadora", chave: /lavadora/i, equipamento: "lavadora", defeito: "Não vibra" },
] as const;

const REMOVIDAS = ["/loja", "/carrinho", "/checkout", "/seminovos", "/comparar", "/loja/autoclave-21-litros"] as const;

const JEFERSON = "5511963417994";
const JACKSON = "5511986038421";
const TELEFONE_FIXO = "tel:+551137156362";
const CHAVE_CONSENTIMENTO = "jb:consentimento-medicao";
const TERCEIROS = /googletagmanager\.com|google-analytics\.com|googleadservices\.com|doubleclick\.net|facebook\.net|facebook\.com/;

/* ------------------------------------------------------------------ apoio */

function errosDeConsole(page: Page) {
  const erros: string[] = [];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });
  page.on("pageerror", (erro) => erros.push(erro.message));
  return erros;
}

/** Google e Meta nunca saem do navegador de teste: scripts vazios, e a lista do que foi pedido. */
async function isolarTerceiros(context: BrowserContext) {
  const pedidos: string[] = [];
  await context.route(TERCEIROS, (rota) => {
    pedidos.push(rota.request().url());
    return rota.fulfill({ status: 200, contentType: "text/javascript", body: "/* terceiro isolado no e2e */" });
  });
  /* O WhatsApp abre em outra aba: responde em branco para o clique não sair do teste. */
  await context.route(/^https:\/\/wa\.me\//, (rota) =>
    rota.fulfill({ status: 200, contentType: "text/html", body: "<title>wa.me</title>" }),
  );
  return pedidos;
}

async function semVazamentoHorizontal(page: Page) {
  const largura = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(largura.documento).toBeLessThanOrEqual(largura.viewport + 1);
}

async function jsonLd(page: Page) {
  const blocos = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocos.flatMap((bloco) => {
    const dado = JSON.parse(bloco) as unknown;
    return Array.isArray(dado) ? dado : [dado];
  }) as { "@type": string | string[] }[];
}

function tipos(dados: { "@type": string | string[] }[]) {
  return dados.flatMap((dado) => (Array.isArray(dado["@type"]) ? dado["@type"] : [dado["@type"]]));
}

/** Leva um link absoluto do site para o servidor do teste (o build publica a origem de `NEXT_PUBLIC_SITE_URL`). */
function noServidorDoTeste(url: string, baseURL: string | undefined) {
  const alvo = new URL(url);
  return new URL(`${alvo.pathname}${alvo.search}`, baseURL).toString();
}

async function avisoDeMedicao(page: Page) {
  return page.getByRole("region", { name: "Medição de uso do site" });
}

/** Com o aviso na tela, decide a medição; sem destino configurado, pula o teste. */
async function exigirMedicao(page: Page) {
  const aviso = await avisoDeMedicao(page);
  const presente = await aviso
    .waitFor({ state: "visible", timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!presente) {
    expect(process.env.E2E_EXIGE_MEDICAO, "a validação final precisa de destinos de medição configurados").not.toBe("1");
    test.skip(true, "sem destinos de medição configurados neste banco");
  }
  return aviso;
}

async function eventosDoGoogle(page: Page) {
  return page.evaluate(() =>
    ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? []).map((item) => Array.from(item)),
  ) as Promise<unknown[][]>;
}

async function eventosDaMeta(page: Page) {
  return page.evaluate(() => {
    const fbq = (window as unknown as { fbq?: { queue?: IArguments[] } }).fbq;
    return (fbq?.queue ?? []).map((item) => Array.from(item));
  }) as Promise<unknown[][]>;
}

const pageViews = (eventos: unknown[][]) => eventos.filter((e) => e[0] === "event" && e[1] === "page_view");

/* ============================================================== jornada */

test.describe("JB assistência — jornada pública atual", () => {
  /* Quem já decidiu sobre a medição: o aviso não cobre a página nos testes de
     jornada. Os testes de consentimento, mais abaixo, começam sem decisão. */
  test.beforeEach(async ({ context }) => {
    await isolarTerceiros(context);
    await context.addInitScript((chave) => {
      try {
        window.localStorage.setItem(chave, "recusado");
      } catch {
        /* navegador sem armazenamento: o aviso aparece e o teste segue */
      }
    }, CHAVE_CONSENTIMENTO);
  });

  test("home comunica o problema, a confiança e os dois atendentes", async ({ page }) => {
    const erros = errosDeConsole(page);
    const resposta = await page.goto("/");

    expect(resposta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Equipamento parou\?\s*A JB assume daqui\./);
    await expect(page.locator("h1")).toHaveCount(1);

    const provas = page.locator(".jb-hero-provas");
    await expect(provas.getByText("Todas as marcas", { exact: true })).toBeVisible();
    await expect(provas.getByText("Orçamento antes da troca", { exact: true })).toBeVisible();

    const jeferson = page.locator('a[data-whatsapp="abertura"]');
    const jackson = page.locator('a[data-whatsapp="abertura-segundo"]');
    await expect(jeferson).toBeVisible();
    await expect(jackson).toBeVisible();
    await expect(jeferson).toContainText("Jeferson");
    await expect(jackson).toContainText("Jackson");
    await expect(jeferson).toHaveAttribute("href", new RegExp(`wa\\.me/${JEFERSON}\\?text=`));
    await expect(jackson).toHaveAttribute("href", new RegExp(`wa\\.me/${JACKSON}\\?text=`));

    /* Telefone fixo e os dois WhatsApps no rodapé, com os números da JB. */
    await expect(page.locator(`footer a[href="${TELEFONE_FIXO}"]`)).toHaveCount(1);
    await expect(page.locator(`footer a[href*="wa.me/${JEFERSON}"]`)).toHaveCount(1);
    await expect(page.locator(`footer a[href*="wa.me/${JACKSON}"]`)).toHaveCount(1);
    await expect(page.locator("footer")).toContainText("(11) 3715-6362");

    /* Nenhum resto de loja na página pública. */
    const texto = (await page.locator("body").innerText()).toLowerCase();
    for (const termo of ["carrinho", "checkout", "frete", "adicionar ao carrinho", "comprar agora"]) {
      expect(texto, termo).not.toContain(termo);
    }

    await semVazamentoHorizontal(page);
    expect(erros).toEqual([]);
  });

  test("primeira dobra do celular responde quem é, o problema e com quem falar", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "primeira dobra de celular");
    await page.goto("/");

    const altura = page.viewportSize()?.height ?? 0;
    const titulo = await page.getByRole("heading", { level: 1 }).boundingBox();
    const principal = await page.locator('a[data-whatsapp="abertura"]').boundingBox();
    const segundo = await page.locator('a[data-whatsapp="abertura-segundo"]').boundingBox();

    expect(titulo).not.toBeNull();
    expect((titulo?.y ?? 0) + (titulo?.height ?? 0)).toBeLessThanOrEqual(altura);
    /* Jeferson e Jackson inteiros na primeira tela, sem rolar. */
    expect((principal?.y ?? 0) + (principal?.height ?? 0)).toBeLessThanOrEqual(altura);
    expect((segundo?.y ?? 0) + (segundo?.height ?? 0)).toBeLessThanOrEqual(altura);
    expect(principal?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(segundo?.height ?? 0).toBeGreaterThanOrEqual(44);

    await expect(page.locator(".jb-cabecalho")).toContainText(/Jeferson|Jackson/);
  });

  test("home e landing publicam canonical, Open Graph e JSON-LD próprios", async ({ page, baseURL }) => {
    await page.goto("/");
    const canonicoHome = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonicoHome ?? "").pathname).toBe("/");
    const ogHome = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogHome).toMatch(/\/opengraph-image/);
    expect(tipos(await jsonLd(page))).toEqual(expect.arrayContaining(["Organization", "FAQPage"]));

    const imagem = await page.request.get(noServidorDoTeste(ogHome ?? "", baseURL));
    expect(imagem.status()).toBe(200);
    expect(imagem.headers()["content-type"]).toContain("image/png");

    await page.goto("/autoclave");
    const canonico = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonico ?? "").pathname).toBe("/autoclave");
    expect(new URL(canonico ?? "").origin).toBe(new URL(canonicoHome ?? "").origin);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/autoclave\/opengraph-image/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /autoclave/i);
  });

  test("diagnóstico fecha os 3 toques e leva contexto para o WhatsApp", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Autoclave", exact: true }).click();
    await page.getByRole("button", { name: "Não pressuriza", exact: true }).click();
    await page.getByRole("button", { name: "Parado, não consigo atender", exact: true }).click();
    await page.getByLabel(/Cidade da clínica/i).fill("Osasco");

    const principal = page.locator('a[data-whatsapp="diagnostico"]');
    const segundo = page.locator('a[data-whatsapp="diagnostico-segundo"]');
    await expect(principal).toBeVisible();
    await expect(segundo).toBeVisible();
    await expect(principal).toHaveAttribute("data-equipamento", "autoclave");

    for (const [link, nome, numero] of [
      [principal, "Jeferson", JEFERSON],
      [segundo, "Jackson", JACKSON],
    ] as const) {
      const href = decodeURIComponent((await link.getAttribute("href")) ?? "");
      expect(href).toContain(`wa.me/${numero}`);
      expect(href).toContain(`Olá, ${nome}!`);
      expect(href).toContain("*Equipamento:* Autoclave");
      expect(href).toContain("*Problema:* Não pressuriza");
      expect(href).toContain("parado e não consigo atender");
      expect(href).toContain("*Cidade:* Osasco");
    }

    /* A triagem organiza; quem envia é a pessoa, dentro do WhatsApp. */
    await expect(page.locator("#diagnostico").getByText(/Você revisa antes de enviar/i)).toBeVisible();
  });

  for (const landing of LANDINGS) {
    test(`${landing.rota} é uma landing de anúncio completa`, async ({ page, baseURL }) => {
      const erros = errosDeConsole(page);
      const resposta = await page.goto(landing.rota);

      expect(resposta?.status()).toBe(200);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toContainText(landing.nome);
      await expect(h1).toContainText(/parou\?/i);
      await expect(page.locator("h1")).toHaveCount(1);

      /* Os dois atendentes na abertura e no cabeçalho, já com o equipamento. */
      for (const posicao of ["abertura", "abertura-segundo", "cabecalho", "cabecalho-segundo"]) {
        await expect(page.locator(`a[data-whatsapp="${posicao}"]`)).toBeVisible();
      }
      const abertura = decodeURIComponent(
        (await page.locator('a[data-whatsapp="abertura"]').getAttribute("href")) ?? "",
      );
      expect(abertura).toMatch(new RegExp(`\\*Equipamento:\\* ${landing.nome}`, "i"));

      /* Metadados próprios. */
      await expect(page).toHaveTitle(landing.chave);
      const descricao = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      expect(descricao).toMatch(landing.chave);
      expect(descricao.length).toBeLessThanOrEqual(160);
      const canonico = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonico ?? "").pathname).toBe(landing.rota);
      const og = (await page.locator('meta[property="og:image"]').getAttribute("content")) ?? "";
      expect(og).toContain(`${landing.rota}/opengraph-image`);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", landing.chave);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      expect(tipos(await jsonLd(page))).toEqual(expect.arrayContaining(["Service", "BreadcrumbList", "FAQPage"]));

      const imagem = await page.request.get(noServidorDoTeste(og, baseURL));
      expect(imagem.status()).toBe(200);
      expect(imagem.headers()["content-type"]).toContain("image/png");

      /* Cuidados de segurança, sem tutorial de conserto. */
      const cuidados = (await page.locator('section[aria-labelledby="enquanto-titulo"]').innerText()).toLowerCase();
      for (const proibido of ["desmonte o", "abra a carcaça e", "jumper", "bypass", "multímetro", "libere a pressão"]) {
        expect(cuidados, proibido).not.toContain(proibido);
      }

      await semVazamentoHorizontal(page);
      expect(erros).toEqual([]);
    });
  }

  test("landing leva defeito, situação e cidade para os dois atendentes", async ({ page }) => {
    await page.goto("/autoclave");

    await page.getByRole("button", { name: "Não pressuriza", exact: true }).click();
    await page.getByRole("button", { name: "Parado, não consigo atender", exact: true }).click();
    await page.getByLabel(/Cidade da clínica/i).fill("Barueri");

    for (const [posicao, nome] of [
      ["abertura", "Jeferson"],
      ["abertura-segundo", "Jackson"],
    ] as const) {
      const href = decodeURIComponent(
        (await page.locator(`a[data-whatsapp="${posicao}"]`).getAttribute("href")) ?? "",
      );
      expect(href).toContain(`Olá, ${nome}!`);
      expect(href).toContain("*Problema:* Não pressuriza");
      expect(href).toContain("parado e não consigo atender");
      expect(href).toContain("*Cidade:* Barueri");
    }
  });

  test("320px mantém os dois atendentes na mesma linha sem colisão", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-compact", "extremo específico de 320px");
    await page.goto("/");

    const principal = page.locator('a[data-whatsapp="abertura"]');
    const segundo = page.locator('a[data-whatsapp="abertura-segundo"]');
    const [a, b] = await Promise.all([principal.boundingBox(), segundo.boundingBox()]);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(Math.abs((a?.y ?? 0) - (b?.y ?? 0))).toBeLessThan(4);
    expect((a?.x ?? 0) + (a?.width ?? 0)).toBeLessThanOrEqual((b?.x ?? 0) + 2);
    await semVazamentoHorizontal(page);
  });

  test("desktop usa composição própria, sem virar o celular esticado", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("desktop"), "composição de desktop");
    await page.goto("/");

    const largura = page.viewportSize()?.width ?? 0;
    const copy = await page.locator(".jb-hero-copy").boundingBox();
    const diagnostico = await page.locator(".jb-diagnostico-stage").boundingBox();

    expect(copy).not.toBeNull();
    expect(diagnostico).not.toBeNull();
    /* Duas colunas lado a lado, com a triagem à direita e visível sem rolar. */
    expect(diagnostico?.x ?? 0).toBeGreaterThan((copy?.x ?? 0) + (copy?.width ?? 0) * 0.72);
    expect(diagnostico?.width ?? 0).toBeGreaterThan(480);
    expect(diagnostico?.y ?? 0).toBeLessThan(page.viewportSize()?.height ?? 0);
    /* Linha de leitura controlada: o texto não se espalha pela tela larga. */
    expect(copy?.width ?? 0).toBeLessThan(largura * 0.55);

    /* O cabeçalho oferece navegação da página e os dois WhatsApps. */
    await expect(page.getByRole("navigation", { name: "Nesta página" })).toBeVisible();
    await semVazamentoHorizontal(page);
  });

  test("barra do celular só aparece longe dos CTAs e preserva a triagem completa", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "comportamento específico de tela pequena");
    await page.goto("/");

    const barra = page.locator(".jb-barra-movel-premium");
    /* Com os botões da abertura na tela, a barra não duplica a ação. */
    await expect(barra).toHaveAttribute("data-visivel", "false");

    await page.getByRole("button", { name: "Autoclave", exact: true }).click();
    await page.getByRole("button", { name: "Não pressuriza", exact: true }).click();
    await page.getByRole("button", { name: "Parado, não consigo atender", exact: true }).click();
    await page.getByLabel(/Cidade da clínica/i).fill("Osasco");

    await page.locator("#equipamentos").scrollIntoViewIfNeeded();
    await expect(barra).toHaveAttribute("data-visivel", "true");
    await expect(barra.getByText(/Triagem: Autoclave/i)).toBeVisible();

    const principal = barra.locator('a[data-whatsapp="barra-movel"]');
    const segundo = barra.locator('a[data-whatsapp="barra-movel-segundo"]');
    await expect(principal).toBeVisible();
    await expect(segundo).toBeVisible();
    await expect(principal).toHaveAttribute("data-equipamento", "autoclave");

    const href = decodeURIComponent((await principal.getAttribute("href")) ?? "");
    expect(href).toContain("Autoclave");
    expect(href).toContain("Não pressuriza");
    expect(href).toContain("parado e não consigo atender");
    expect(href).toContain("Osasco");

    /* Respeita a área segura: o padding de baixo usa `safe-area-inset-bottom`. */
    const estilo = await barra.getAttribute("style");
    expect(estilo).toContain("safe-area-inset-bottom");

    /* No fechamento, com os botões grandes de novo na tela, a barra recolhe. */
    await page.locator('a[data-whatsapp="fechamento"]').scrollIntoViewIfNeeded();
    await expect(barra).toHaveAttribute("data-visivel", "false");
  });

  test("barra da landing carrega defeito e cidade escolhidos na abertura", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "comportamento específico de tela pequena");
    await page.goto("/compressor");

    await page.getByRole("button", { name: "Não liga", exact: true }).click();
    await page.getByRole("button", { name: "Funciona, mas com falha", exact: true }).click();
    await page.getByLabel(/Cidade da clínica/i).fill("Guarulhos");

    await page.locator("#como-funciona").scrollIntoViewIfNeeded();
    const barra = page.locator(".jb-barra-movel-premium");
    await expect(barra).toHaveAttribute("data-visivel", "true");
    const href = decodeURIComponent(
      (await barra.locator('a[data-whatsapp="barra-movel"]').getAttribute("href")) ?? "",
    );
    expect(href).toContain("*Equipamento:* Compressor");
    expect(href).toContain("*Problema:* Não liga");
    expect(href).toContain("ainda funciona, mas com falha");
    expect(href).toContain("*Cidade:* Guarulhos");
  });

  test("páginas legais não recebem a barra fixa de conversão", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "comportamento específico de tela pequena");

    for (const rota of ["/privacidade", "/termos"]) {
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBe(200);
      await expect(page.locator(".jb-barra-movel")).toHaveCount(0);
      await page.mouse.wheel(0, 2000);
      await expect(page.locator(".jb-barra-movel")).toHaveCount(0);
    }
  });

  test("sitemap e robots descrevem só o site de assistência", async ({ page }) => {
    const sitemap = await page.request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    for (const landing of LANDINGS) expect(xml).toContain(`${landing.rota}</loc>`);
    for (const rota of REMOVIDAS) expect(xml).not.toContain(`${rota}</loc>`);
    /* Rota fixa não ganha data inventada: só o que vem de publicação real. */
    expect(xml).not.toMatch(/<loc>[^<]*\/autoclave<\/loc>\s*<lastmod>/);

    /* Fora de produção o robots fecha tudo, e o cabeçalho reforça o noindex. */
    const robots = await page.request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Disallow: \//);
    const home = await page.request.get("/");
    expect(home.headers()["x-robots-tag"] ?? "").toContain("noindex");
  });

  for (const rota of REMOVIDAS) {
    test(`${rota} informa remoção definitiva com HTTP 410`, async ({ page, request }) => {
      const resposta = await page.goto(rota);
      expect(resposta?.status()).toBe(410);
      expect(resposta?.headers()["x-robots-tag"] ?? "").toContain("noindex");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/A loja saiu/i);
      const assistencia = page.getByRole("link", { name: /Ir para a assistência técnica/i });
      await expect(assistencia).toBeVisible();
      await expect(assistencia).toHaveAttribute("href", "/");

      /* Não é redirecionamento disfarçado: a resposta crua já é 410. */
      const crua = await request.get(rota, { maxRedirects: 0 });
      expect(crua.status()).toBe(410);
    });
  }

  test("admin sem sessão nunca expõe a área privada", async ({ page, request }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar/);

    const crua = await request.get("/admin/assistencia", { maxRedirects: 0 });
    expect([307, 308]).toContain(crua.status());
    const entrar = await request.get("/admin/entrar");
    expect(entrar.headers()["x-robots-tag"] ?? "").toContain("noindex");
    expect(entrar.headers()["cache-control"] ?? "").toContain("no-store");
  });
});

/* ======================================================== consentimento */

test.describe("JB assistência — consentimento e medição", () => {
  /* Um projeto basta para a lógica de medição; o comportamento em celular tem
     teste próprio abaixo. */
  test("nenhum script de terceiro carrega antes do sim", async ({ page, context }) => {
    const pedidos = await isolarTerceiros(context);
    await page.goto("/autoclave?utm_source=google&gclid=Cj0teste");
    const aviso = await exigirMedicao(page);

    await expect(aviso.getByRole("button", { name: "Pode medir" })).toBeVisible();
    await expect(aviso.getByRole("button", { name: "Não medir" })).toBeVisible();
    await page.waitForTimeout(1200);
    expect(pedidos).toEqual([]);
    expect(await page.evaluate(() => "dataLayer" in window || "fbq" in window)).toBe(false);

    /* Recusar também não carrega nada. */
    await aviso.getByRole("button", { name: "Não medir" }).click();
    await expect(aviso).toHaveCount(0);
    await page.waitForTimeout(800);
    expect(pedidos).toEqual([]);
  });

  test("aceite mede PageView na chegada e em cada navegação, sem duplicar nem vazar query", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "lógica de medição, um projeto basta");
    await isolarTerceiros(context);
    await page.goto(
      "/autoclave?utm_source=Google&utm_medium=cpc&utm_campaign=Autoclave%20SP&gclid=Cj0teste_1&email=ana%40clinica.com&telefone=11999990000",
    );
    const aviso = await exigirMedicao(page);
    await aviso.getByRole("button", { name: "Pode medir" }).click();

    await expect.poll(async () => pageViews(await eventosDoGoogle(page)).length).toBe(1);
    const [primeira] = pageViews(await eventosDoGoogle(page));
    const localizacao = new URL((primeira[2] as { page_location: string }).page_location);
    expect(localizacao.pathname).toBe("/autoclave");
    expect(Object.fromEntries(localizacao.searchParams)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "autoclave-sp",
      gclid: "Cj0teste_1",
    });
    await expect
      .poll(async () => (await eventosDaMeta(page)).filter((e) => e[0] === "track" && e[1] === "PageView").length)
      .toBe(1);

    /* Navegação interna do App Router: um PageView novo, sem a campanha. */
    await page.locator('a[href="/compressor"]').first().click();
    await expect(page).toHaveURL(/\/compressor$/);
    await expect.poll(async () => pageViews(await eventosDoGoogle(page)).length).toBe(2);
    const segunda = pageViews(await eventosDoGoogle(page))[1];
    expect((segunda[2] as { page_location: string }).page_location).toMatch(/\/compressor$/);
    await expect
      .poll(async () => (await eventosDaMeta(page)).filter((e) => e[0] === "track" && e[1] === "PageView").length)
      .toBe(2);

    /* Voltar conta de novo, uma vez. */
    await page.goBack();
    await expect(page).toHaveURL(/\/autoclave/);
    await expect.poll(async () => pageViews(await eventosDoGoogle(page)).length).toBe(3);
    await page.waitForTimeout(600);
    expect(pageViews(await eventosDoGoogle(page))).toHaveLength(3);

    const tudo = JSON.stringify(await eventosDoGoogle(page)) + JSON.stringify(await eventosDaMeta(page));
    expect(tudo).not.toContain("ana@clinica");
    expect(tudo).not.toContain("11999990000");
  });

  test("clique no WhatsApp é intenção de contato, com campos controlados", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "lógica de medição, um projeto basta");
    await isolarTerceiros(context);
    await page.goto("/autoclave");
    const aviso = await exigirMedicao(page);
    await aviso.getByRole("button", { name: "Pode medir" }).click();
    await expect.poll(async () => pageViews(await eventosDoGoogle(page)).length).toBe(1);

    await page.getByRole("button", { name: "Não pressuriza", exact: true }).click();
    await page.getByRole("button", { name: "Parado, não consigo atender", exact: true }).click();
    await page.getByLabel(/Cidade da clínica/i).fill("Osasco");

    const aba = context.waitForEvent("page");
    await page.locator('a[data-whatsapp="abertura"]').click();
    await (await aba).close();

    await expect
      .poll(async () => (await eventosDoGoogle(page)).some((e) => e[0] === "event" && e[1] === "conversion"))
      .toBe(true);
    const google = await eventosDoGoogle(page);
    const conversao = google.find((e) => e[0] === "event" && e[1] === "conversion");
    expect((conversao?.[2] as { send_to?: string })?.send_to).toMatch(/^AW-\d+\/[A-Za-z0-9_-]+$/);
    const clique = google.find((e) => e[0] === "event" && e[1] === "whatsapp_click");
    expect(clique?.[2]).toMatchObject({ etapa: "abertura", categoria: "autoclave", rota: "/autoclave" });

    const meta = await eventosDaMeta(page);
    expect(meta).toContainEqual(["track", "Contact", { content_name: "whatsapp:abertura", content_category: "autoclave" }]);

    /* Nada do que a pessoa escreveu, nem a mensagem, vai para Google ou Meta. */
    const tudo = JSON.stringify(google) + JSON.stringify(meta);
    for (const livre of ["Osasco", "Vim pelo site", "Olá", "wa.me"]) expect(tudo, livre).not.toContain(livre);
  });

  test("revogar para a medição na hora", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "lógica de medição, um projeto basta");
    await isolarTerceiros(context);
    await page.goto("/");
    let aviso = await exigirMedicao(page);
    await aviso.getByRole("button", { name: "Pode medir" }).click();
    await expect.poll(async () => pageViews(await eventosDoGoogle(page)).length).toBe(1);

    await page.getByRole("button", { name: "Cookies e medição" }).click();
    aviso = await avisoDeMedicao(page);
    await aviso.getByRole("button", { name: "Não medir" }).click();

    await expect
      .poll(async () =>
        (await eventosDoGoogle(page)).some(
          (e) => e[0] === "consent" && e[1] === "update" && (e[2] as { analytics_storage?: string }).analytics_storage === "denied",
        ),
      )
      .toBe(true);
    expect(await eventosDaMeta(page)).toContainEqual(["consent", "revoke"]);
  });

  test("no celular, o aviso tem prioridade e não cobre a barra do WhatsApp", async ({ page, context }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith("mobile"), "comportamento específico de tela pequena");
    await isolarTerceiros(context);
    await page.goto("/");
    const aviso = await exigirMedicao(page);

    const pode = aviso.getByRole("button", { name: "Pode medir" });
    const nao = aviso.getByRole("button", { name: "Não medir" });
    const [a, b] = await Promise.all([pode.boundingBox(), nao.boundingBox()]);
    /* Aceitar e recusar com o mesmo peso e alvo de toque confortável. */
    expect(a?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(b?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(Math.abs((a?.width ?? 0) - (b?.width ?? 0))).toBeLessThan(4);

    await page.locator("#equipamentos").scrollIntoViewIfNeeded();
    const barra = page.locator(".jb-barra-movel-premium");
    await expect(barra).toHaveAttribute("data-visivel", "true");
    /* A barra existe, mas fica recolhida enquanto o aviso está aberto. */
    await expect(barra).not.toBeInViewport();

    await nao.click();
    await expect(aviso).toHaveCount(0);
    await expect(barra).toBeInViewport();
    await expect(barra.locator('a[data-whatsapp="barra-movel"]')).toBeVisible();
  });
});
