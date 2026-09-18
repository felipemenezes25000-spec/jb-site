import { expect, test, type Page } from "@playwright/test";

import { vigiarConsole } from "./apoio";
import { fixtures } from "./fixtures";

/**
 * Invariantes do Motion System global (`motion-system.tsx` + `motion*.css`).
 *
 * Cada teste aqui prende um defeito que chegou a existir:
 *  · atributos de reveal gravados em seção ainda não hidratada reprovavam a
 *    hidratação da ficha do produto;
 *  · o estado de espera deixava blocos fora da tela deslocados, girados e
 *    encolhidos — página mais larga que a janela e botão de 44px medindo 43;
 *  · `fill: "both"` no `<main>` prendia um transform que arrastava a barra fixa
 *    de compra para o fim da página;
 *  · a cena era gravada depois da pintura, e toda entrada de cena piscava.
 */

/** Animações criadas pelo motor (Web Animations), não por CSS. */
async function reveals(page: Page) {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (animacao) =>
            !(animacao instanceof CSSAnimation) &&
            !(animacao instanceof CSSTransition) &&
            animacao.playState === "running" &&
            animacao.effect instanceof KeyframeEffect &&
            animacao.effect.target instanceof Element &&
            animacao.effect.target.closest("main") !== null,
        ).length,
  );
}

/**
 * Espera o React hidratar os nós medidos e os efeitos rodarem. O React pendura
 * a fibra no nó ao hidratar; sem esperar isso, um teste de layout mede o HTML
 * do servidor e aprova qualquer motor que só age depois.
 */
async function esperarHidratacao(page: Page, seletor: string) {
  await expect
    .poll(() =>
      page.evaluate(
        (alvo) =>
          [...document.querySelectorAll(alvo)].every((no) =>
            Object.keys(no).some((chave) => chave.startsWith("__reactFiber")),
          ),
        seletor,
      ),
    )
    .toBe(true);
  await page.evaluate(
    () => new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto))),
  );
}

test.describe("Motion System — base", () => {
  test("grava a cena antes do corpo existir e hidrata a ficha sem divergência", async ({ page }) => {
    const { produto } = fixtures();
    const vigia = vigiarConsole(page);
    await page.addInitScript(() => {
      const registro = window as unknown as { cenaAntesDoCorpo?: { cena: string | null; corpo: boolean } };
      new MutationObserver(() => {
        if (registro.cenaAntesDoCorpo) return;
        registro.cenaAntesDoCorpo = {
          cena: document.documentElement.getAttribute("data-motion-scene"),
          corpo: document.body !== null,
        };
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-motion-scene"] });
    });

    await page.goto(`/loja/${produto.slug}`);
    expect(
      await page.evaluate(() => (window as unknown as { cenaAntesDoCorpo?: unknown }).cenaAntesDoCorpo),
    ).toEqual({ cena: "produto", corpo: false });

    // O clique só troca o estado depois da hidratação: é a prova de que ela terminou.
    await page.getByText("Mais opções da compra", { exact: true }).click();
    const comparar = page.getByRole("button", { name: "Comparar", exact: true });
    await comparar.click();
    await expect(page.getByRole("button", { name: "Na comparação", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const atributosDoMotor = await page.evaluate(
      () =>
        [...document.querySelectorAll("main *")].filter(
          (elemento) =>
            [...elemento.attributes].some((atributo) => atributo.name.startsWith("data-jb-motion")) ||
            (elemento as HTMLElement).style?.getPropertyValue("--jb-motion-delay") !== "",
        ).length,
    );
    expect(atributosDoMotor).toBe(0);
    expect(vigia.erros, "erros de console: " + vigia.erros.join(" | ")).toEqual([]);
  });

  test("bloco fora da tela está no layout final: sem deslocar, girar ou encolher", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("[data-jb-home='true']")).toBeVisible();
    await esperarHidratacao(page, "main [data-motion-chapter]");

    const medida = await page.evaluate(() => {
      const limite = window.innerHeight * 1.4;
      /* Largura desenhada contra a largura de layout. Com `box-sizing:
         border-box` o `width` computado é a caixa inteira antes de qualquer
         transform; escala ou giro de um antepassado aparece como diferença. */
      const encolhidos = [...document.querySelectorAll<HTMLElement>("main button, main a")]
        .filter((elemento) => {
          const estilo = getComputedStyle(elemento);
          return (
            estilo.display !== "inline" &&
            estilo.display !== "none" &&
            elemento.getBoundingClientRect().top > limite
          );
        })
        .filter((elemento) => {
          const largura = Number.parseFloat(getComputedStyle(elemento).width);
          return Math.abs(elemento.getBoundingClientRect().width - largura) > 0.05;
        })
        .map((elemento) => elemento.getAttribute("aria-label") ?? elemento.textContent?.trim().slice(0, 40));
      return {
        encolhidos,
        largura: document.documentElement.scrollWidth,
      };
    });

    expect(medida.encolhidos).toEqual([]);
    expect(medida.largura).toBeLessThanOrEqual(1440);
  });

  test("revela capítulos ao rolar e não deixa estilo preso depois", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("[data-jb-home='true']")).toBeVisible();

    let maiorReveal = 0;
    const altura = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let rolado = 0; rolado < altura; rolado += 450) {
      await page.mouse.wheel(0, 450);
      maiorReveal = Math.max(maiorReveal, await reveals(page));
    }
    expect(maiorReveal, "nenhum capítulo foi revelado durante a rolagem").toBeGreaterThan(0);

    await expect.poll(() => reveals(page)).toBe(0);
    const presos = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main [data-motion-chapter]")]
        .filter((capitulo) => {
          const estilo = getComputedStyle(capitulo);
          return estilo.opacity !== "1" || estilo.translate !== "none" || estilo.transform !== "none";
        })
        .map((capitulo) => capitulo.dataset.motionChapter),
    );
    expect(presos).toEqual([]);
  });

  test("navegação no cliente atualiza a cena e não deixa transform no <main>", async ({ page }) => {
    const { produto } = fixtures();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/busca?q=${encodeURIComponent(produto.nome)}`);
    await expect(page.locator("html")).toHaveAttribute("data-motion-scene", "institucional");

    await page.locator(`main a[href="/loja/${produto.slug}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/loja/${produto.slug}$`));
    await expect(page.locator("html")).toHaveAttribute("data-motion-scene", "produto");

    const principal = page.locator("main");
    await expect.poll(() => principal.evaluate((elemento) => elemento.getAnimations().length)).toBe(0);
    expect(await principal.evaluate((elemento) => getComputedStyle(elemento).transform)).toBe("none");

    // A barra fixa de compra mede a partir da tela, não do topo do <main>.
    await page.locator("#ficha-tecnica, #preparo").first().scrollIntoViewIfNeeded();
    const barra = page.getByRole("link", { name: "Comprar", exact: true });
    await expect(barra).toBeVisible();
    const caixa = await barra.boundingBox();
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(844);
  });

  test("o giro do cartão segue o ponteiro, some quando ele sai e não atrapalha o clique", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/loja");

    const cartao = page.locator("[data-cartao-produto]").first();
    await expect(cartao).toBeVisible();
    await expect.poll(() => cartao.evaluate((elemento) => elemento.closest("li")?.getAnimations().length ?? 0)).toBe(0);

    const caixa = (await cartao.boundingBox())!;
    await page.mouse.move(caixa.x + caixa.width * 0.8, caixa.y + caixa.height * 0.25);
    await page.mouse.move(caixa.x + caixa.width * 0.85, caixa.y + caixa.height * 0.2, { steps: 4 });
    await expect.poll(() => cartao.evaluate((elemento) => getComputedStyle(elemento).transform)).not.toBe("none");
    expect(await cartao.evaluate((elemento) => elemento.getAttributeNames().filter((nome) => nome.startsWith("data-jb")))).toEqual([]);

    await page.mouse.move(2, 2);
    await expect.poll(() => cartao.evaluate((elemento) => getComputedStyle(elemento).transform)).toBe("none");

    const link = cartao.locator("h2 a, h3 a").first();
    const destino = await link.getAttribute("href");
    await link.click();
    await expect(page).toHaveURL((url) => url.pathname === destino);
  });
});

test.describe("Motion System — movimento reduzido", () => {
  test("não cria reveal, aura, feixe nem palco, e todo capítulo fica visível", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion-reduced", "true");

    const altura = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let rolado = 0; rolado < altura; rolado += 600) {
      await page.mouse.wheel(0, 600);
      expect(await reveals(page)).toBe(0);
    }
    await page.mouse.move(700, 450);

    const ambiente = await page.evaluate(() =>
      [".jb-motion-aura", ".jb-motion-progress", ".jb-motion-route-beam", ".jb-home-stage"].map(
        (seletor) => {
          const elemento = document.querySelector(seletor);
          return elemento ? getComputedStyle(elemento).display : "none";
        },
      ),
    );
    expect(ambiente).toEqual(["none", "none", "none", "none"]);

    const invisiveis = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main [data-motion-chapter], main section")]
        .filter((elemento) => getComputedStyle(elemento).opacity !== "1")
        .map((elemento) => elemento.dataset.motionChapter ?? elemento.id ?? elemento.tagName),
    );
    expect(invisiveis).toEqual([]);
  });
});
