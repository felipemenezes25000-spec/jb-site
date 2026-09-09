import { expect, test } from "@playwright/test";

const PRETO_JB = "rgb(26, 28, 30)";

test.describe("Legibilidade e alinhamento da loja pública", () => {
  test("textos secundários usam preto nas principais jornadas", async ({ page }) => {
    for (const caminho of [
      "/",
      "/loja",
      "/categoria/cirurgia",
      "/busca?q=autoclave",
      "/marcas",
      "/seminovos",
      "/loja/motor-de-implante-35ncm",
      "/assistencia-tecnica",
    ]) {
      await page.goto(caminho);

      const casca = page.locator('[data-jb-publico="true"]');
      await expect(casca, `casca pública ausente em ${caminho}`).toHaveCount(1);

      const cores = await casca.evaluate((raiz) => {
        const seletores = [
          ".text-graf-500",
          ".text-graf-600",
          ".text-graf-700",
          '[class*="text-graf-950/"]',
        ].join(",");

        return Array.from(raiz.querySelectorAll<HTMLElement>(seletores))
          .filter(
            (elemento) =>
              elemento.textContent?.trim() &&
              !elemento.classList.contains("line-through") &&
              elemento.checkVisibility({
                opacityProperty: true,
                visibilityProperty: true,
                contentVisibilityAuto: true,
              }),
          )
          .map((elemento) => getComputedStyle(elemento).color);
      });

      expect(cores.length, `sem amostra de texto em ${caminho}`).toBeGreaterThan(0);
      expect(new Set(cores), `texto cinza encontrado em ${caminho}`).toEqual(
        new Set([PRETO_JB]),
      );
    }
  });

  test("módulos visuais não recuperam texto cinza", async ({ page }) => {
    const cinzasSecundarios = new Set([
      "rgb(102, 109, 118)",
      "rgb(99, 104, 112)",
      "rgb(81, 86, 92)",
    ]);

    for (const largura of [320, 1440]) {
      await page.setViewportSize({ width: largura, height: largura === 320 ? 844 : 900 });

      for (const caminho of [
        "/",
        "/loja",
        "/categoria/cirurgia",
        "/loja/motor-de-implante-35ncm",
      ]) {
        await page.goto(caminho);

        const cinzas = await page.locator('[data-jb-publico="true"]').evaluate(
          (raiz, cores) =>
            Array.from(raiz.querySelectorAll<HTMLElement>("*"))
              .filter((elemento) => {
                const estilo = getComputedStyle(elemento);
                const caixa = elemento.getBoundingClientRect();
                const temTextoProprio = Array.from(elemento.childNodes).some(
                  (no) =>
                    no.nodeType === Node.TEXT_NODE &&
                    (no.textContent?.trim().length ?? 0) > 3,
                );

                return (
                  temTextoProprio &&
                  cores.includes(estilo.color) &&
                  !elemento.closest("[disabled], [aria-disabled=true], .line-through") &&
                  caixa.width > 0 &&
                  caixa.height > 0 &&
                  estilo.display !== "none" &&
                  estilo.visibility !== "hidden"
                );
              })
              .map((elemento) => ({
                texto: elemento.textContent?.trim().slice(0, 60),
                cor: getComputedStyle(elemento).color,
                classe: String(elemento.className).slice(0, 100),
                pai: String(elemento.parentElement?.className ?? "").slice(0, 100),
              })),
          [...cinzasSecundarios],
        );

        expect(cinzas, `texto cinza encontrado em ${caminho} a ${largura}px`).toEqual([]);
      }
    }
  });

  test("texto e botão do menu desktop não dividem a mesma área de clique", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/loja");

    const link = page.getByRole("navigation", { name: "Principal" }).getByRole("link", {
      name: "Equipamentos",
      exact: true,
    });
    const botao = page.getByRole("button", { name: "Abrir o menu de Equipamentos" });
    const [caixaLink, caixaBotao] = await Promise.all([link.boundingBox(), botao.boundingBox()]);

    expect(caixaLink).not.toBeNull();
    expect(caixaBotao).not.toBeNull();
    expect(caixaBotao!.x).toBeGreaterThanOrEqual(caixaLink!.x + caixaLink!.width);
  });

  test("ordenação continua legível na largura mínima suportada", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/categoria/cirurgia");

    const filtros = page.getByRole("button", { name: "Todos os filtros" });
    const ordem = page.getByRole("combobox", { name: "Ordenar resultados" });
    const [caixaFiltros, caixaOrdem] = await Promise.all([
      filtros.boundingBox(),
      ordem.boundingBox(),
    ]);

    expect(caixaFiltros).not.toBeNull();
    expect(caixaOrdem).not.toBeNull();
    expect(caixaFiltros!.width).toBeLessThanOrEqual(112);
    expect(caixaOrdem!.width).toBeGreaterThanOrEqual(160);
  });

  test("ticker permanece legível quando o sistema reduz animações", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const textos = page
      .getByRole("region", { name: "Diferenciais da JB" })
      .locator('ul:not([aria-hidden="true"]) li span');
    const caixas = await textos.evaluateAll((elementos) =>
      elementos.map((elemento) => {
        const caixa = elemento.getBoundingClientRect();
        return { esquerda: caixa.left, direita: caixa.right };
      }),
    );

    for (let indice = 1; indice < caixas.length; indice += 1) {
      expect(caixas[indice].esquerda).toBeGreaterThanOrEqual(caixas[indice - 1].direita);
    }
  });

  test("textos informativos não ficam menores que 12px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });

    for (const caminho of ["/", "/loja", "/seminovos", "/busca?q=autoclave"]) {
      await page.goto(caminho);

      const pequenos = await page.locator('[data-jb-publico="true"]').evaluate((raiz) =>
        Array.from(raiz.querySelectorAll<HTMLElement>("*"))
          .filter((elemento) => {
            const caixa = elemento.getBoundingClientRect();
            const estilo = getComputedStyle(elemento);
            const temTextoProprio = Array.from(elemento.childNodes).some(
              (no) => no.nodeType === Node.TEXT_NODE && (no.textContent?.trim().length ?? 0) > 3,
            );
            const rotuloTipografico =
              estilo.textTransform === "uppercase" && parseFloat(estilo.letterSpacing) > 0.4;

            return (
              temTextoProprio &&
              !rotuloTipografico &&
              caixa.width > 0 &&
              caixa.height > 0 &&
              estilo.display !== "none" &&
              estilo.visibility !== "hidden" &&
              parseFloat(estilo.fontSize) < 12
            );
          })
          .map((elemento) => ({
            texto: elemento.textContent?.trim().slice(0, 60),
            tamanho: getComputedStyle(elemento).fontSize,
            tag: elemento.tagName.toLowerCase(),
          })),
      );

      expect(pequenos, `texto abaixo de 12px em ${caminho}`).toEqual([]);
    }
  });

  test("controles de toque mantêm alvo mínimo de 44px", async ({ browser }) => {
    const contexto = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      locale: "pt-BR",
      viewport: { width: 320, height: 844 },
    });
    const page = await contexto.newPage();

    for (const caminho of ["/", "/loja", "/seminovos", "/busca?q=autoclave"]) {
      await page.goto(caminho);

      const pequenos = await page.locator('[data-jb-publico="true"]').evaluate((raiz) => {
        const caminhoElemento = (elemento: Element) =>
          [elemento.parentElement, elemento]
            .filter(Boolean)
            .map((item) => {
              const el = item as HTMLElement;
              return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${Array.from(el.classList).slice(0, 2).join(".")}`;
            })
            .join(" > ");

        return Array.from(
          raiz.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, [role="button"], [role="tab"], [role="link"]',
          ),
        )
          .filter((elemento) => {
            const estilo = getComputedStyle(elemento);
            const caixa = elemento.getBoundingClientRect();
            const dentroDeTexto =
              elemento.tagName === "A" &&
              elemento.parentElement &&
              /^(P|LI|SPAN|TD|DD|DT|H[1-6])$/.test(elemento.parentElement.tagName);
            const esticado =
              getComputedStyle(elemento, "::after").position === "absolute" &&
              Boolean(elemento.closest("article, li, .group"));
            const recortado =
              (estilo.clipPath && estilo.clipPath !== "none") ||
              (estilo.clip && estilo.clip !== "auto");

            return (
              !elemento.hasAttribute("disabled") &&
              !dentroDeTexto &&
              !esticado &&
              !recortado &&
              estilo.display !== "none" &&
              estilo.visibility !== "hidden" &&
              estilo.pointerEvents !== "none" &&
              caixa.width > 2 &&
              caixa.height > 2 &&
              Math.min(caixa.width, caixa.height) < 44
            );
          })
          .map((elemento) => {
            const caixa = elemento.getBoundingClientRect();
            return {
              nome: elemento.getAttribute("aria-label") || elemento.textContent?.trim().slice(0, 40),
              tamanho: `${Math.round(caixa.width)}x${Math.round(caixa.height)}`,
              seletor: caminhoElemento(elemento),
            };
          });
      });

      expect(pequenos, `alvo de toque menor que 44px em ${caminho}`).toEqual([]);
    }

    await contexto.close();
  });
});
