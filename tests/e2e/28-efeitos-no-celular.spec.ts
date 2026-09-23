import { expect, test, type Page } from "@playwright/test";

/* ============================================================================
   Efeitos de rolagem no celular e no computador

   O `.jb-revela` é amarrado à rolagem por `animation-timeline: view()`, que
   mede contra o contêiner de rolagem mais próximo. Uma seção com
   `overflow-hidden` vira esse contêiner, e o bloco dentro dela fica preso para
   sempre na opacidade do primeiro quadro: em 22/09/2026 um "Chamar no
   WhatsApp" ficou em 19% no celular, e a chamada final em 64%, com cara de
   botão desligado. Este teste para cada bloco no meio da tela e exige que ele
   esteja inteiro.

   No celular, a foto dos equipamentos ainda ganha movimento ligado à rolagem,
   porque ele termina quando o elemento passa pela tela. O anel pulsante
   infinito da barra de WhatsApp foi removido em dispositivos de toque: a barra
   continua entrando e o ícone pode responder à aparição, mas a GPU não fica
   redesenhando um pulso decorativo para sempre.
   ============================================================================ */

const PAGINAS = ["/", "/autoclave"];

async function blocosApagadosNoMeioDaTela(page: Page) {
  return page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const quadro = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    const apagados: string[] = [];
    for (const bloco of document.querySelectorAll<HTMLElement>(".jb-revela")) {
      const caixa = bloco.getBoundingClientRect();
      if (caixa.width === 0 || caixa.height === 0) continue;
      window.scrollTo(0, caixa.top + window.scrollY - window.innerHeight * 0.4);
      await quadro();
      await new Promise((ok) => setTimeout(ok, 60));
      const opacidade = Number(getComputedStyle(bloco).opacity);
      if (opacidade < 0.99) {
        apagados.push(`${(bloco.textContent ?? "").trim().slice(0, 40)} (${opacidade.toFixed(2)})`);
      }
    }
    return apagados;
  });
}

test.describe("no computador", () => {
  for (const caminho of PAGINAS) {
    test(`nenhum bloco fica apagado em ${caminho}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(caminho);
      expect(await blocosApagadosNoMeioDaTela(page)).toEqual([]);
    });
  }
});

test.describe("no celular", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const caminho of PAGINAS) {
    test(`nenhum bloco fica apagado em ${caminho}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(caminho);
      expect(await blocosApagadosNoMeioDaTela(page)).toEqual([]);
    });
  }

  test("a foto responde à rolagem e a barra não mantém pulso infinito", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const efeitos = await page.evaluate(() => {
      const fotos = [...document.querySelectorAll(".jb-toque-foto")];
      const pulso = document.querySelector(".jb-pulso");
      return {
        semHover: matchMedia("(hover: none)").matches,
        fotos: fotos.length,
        fotosAnimadas: fotos.filter((foto) => getComputedStyle(foto).animationName.includes("jb-toque-foto"))
          .length,
        pulso: pulso ? getComputedStyle(pulso, "::after").animationName : null,
      };
    });

    expect(efeitos.semHover).toBe(true);
    expect(efeitos.fotos).toBeGreaterThan(0);
    expect(efeitos.fotosAnimadas).toBe(efeitos.fotos);
    expect(efeitos.pulso).toBe("none");

    // a barra aparece quando nenhum botão grande de WhatsApp está na tela
    // (a abertura e o diagnóstico ficaram para trás na grade de equipamentos)
    const barra = page.locator(".jb-barra-movel");
    await expect(barra).toHaveAttribute("data-visivel", "false");
    await page.locator("#equipamentos-titulo").scrollIntoViewIfNeeded();
    await expect(barra).toHaveAttribute("data-visivel", "true");
  });

  test("com movimento reduzido nada pulsa e tudo fica visível", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const estado = await page.evaluate(() => ({
      pulso: getComputedStyle(document.querySelector(".jb-pulso")!, "::after").animationName,
      apagados: [...document.querySelectorAll(".jb-revela")].filter(
        (bloco) => Number(getComputedStyle(bloco).opacity) < 0.99,
      ).length,
    }));
    expect(estado).toEqual({ pulso: "none", apagados: 0 });
  });
});
