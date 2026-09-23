import { expect, test, type Page } from "@playwright/test";

const PAUSAR = "Pausar troca automática de equipamentos";
const RETOMAR = "Retomar troca automática de equipamentos";
const REDUZIDO = "Troca automática desativada pela preferência de movimento";

async function abrirVitrine(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Instala antes da navegação, mas deixa a hidratação acontecer com o tempo
  // correndo. Só congela depois: pausar antes pode prender timers do Next.
  await page.clock.install({ time: new Date("2026-09-16T12:00:00Z") });
  await page.goto("/");
  await expect(page.locator("[data-jb-home='true']")).toBeVisible();

  const vitrine = page.getByRole("group", { name: "Equipamentos em destaque" });
  const miniaturas = vitrine.locator("button[aria-pressed]");
  test.skip(
    (await miniaturas.count()) < 2,
    "a home precisa de ao menos dois equipamentos em destaque para testar o rodízio",
  );

  // O botão habilitado prova que a preferência do navegador foi lida durante
  // a hidratação; a marcação inicial do servidor oferece troca manual.
  await expect(vitrine.getByRole("button", { name: PAUSAR, exact: true })).toBeEnabled();
  await page.clock.pauseAt(new Date("2026-09-16T13:00:00Z"));
  await page.mouse.move(0, 0);

  const palco = vitrine.locator("[data-palco-imagem-produto]");
  await palco.scrollIntoViewIfNeeded();
  await expect(palco).toBeInViewport({ ratio: 0.35 });
  // Entrega os frames pendentes do IntersectionObserver antes de medir um ciclo.
  await page.clock.runFor(100);

  return {
    vitrine,
    miniaturas,
    palco,
    produto: vitrine.getByRole("link", { name: /^Conhecer / }),
  };
}

test.describe("Movimento da vitrine da home", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("a escolha manual mantém o equipamento e pausa a troca automática", async ({ page }) => {
    const { vitrine, miniaturas, produto } = await abrirVitrine(page);
    const indiceAtivo = (await miniaturas.evaluateAll((botoes) =>
      botoes.findIndex((botao) => botao.getAttribute("aria-pressed") === "true"),
    ));
    expect(indiceAtivo).toBeGreaterThanOrEqual(0);
    const escolhido = miniaturas.nth((indiceAtivo + 1) % await miniaturas.count());
    const antes = await produto.getAttribute("href");

    await escolhido.click();
    await expect(escolhido).toHaveAttribute("aria-pressed", "true");
    await expect(produto).not.toHaveAttribute("href", antes!);
    await expect(vitrine.getByRole("button", { name: RETOMAR, exact: true })).toBeVisible();
    const destinoEscolhido = await produto.getAttribute("href");

    // fastForward dispara cada intervalo no máximo uma vez: mesmo com três
    // produtos, um rodízio indevido não volta ao início e passa por coincidência.
    await page.clock.fastForward(20_000);
    await expect(produto).toHaveAttribute("href", destinoEscolhido!);
    await expect(escolhido).toHaveAttribute("aria-pressed", "true");
  });

  test("pausa e retoma pelo controle, e só avança enquanto o palco está na tela", async ({ page }) => {
    const { vitrine, palco, produto } = await abrirVitrine(page);
    await vitrine.getByRole("button", { name: PAUSAR, exact: true }).click();
    const pausado = await produto.getAttribute("href");
    await page.clock.fastForward(20_000);
    await expect(produto).toHaveAttribute("href", pausado!);

    await vitrine.getByRole("button", { name: RETOMAR, exact: true }).click();
    await expect(vitrine.getByRole("button", { name: PAUSAR, exact: true })).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.runFor(6100);
    await expect(produto).not.toHaveAttribute("href", pausado!);

    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    await expect(palco).not.toBeInViewport();
    await page.clock.runFor(100);
    const foraDaTela = await produto.getAttribute("href");
    await page.clock.fastForward(20_000);
    await expect(produto).toHaveAttribute("href", foraDaTela!);

    await palco.scrollIntoViewIfNeeded();
    await expect(palco).toBeInViewport({ ratio: 0.35 });
    await page.clock.runFor(100);
    await page.clock.runFor(6100);
    await expect(produto).not.toHaveAttribute("href", foraDaTela!);
  });

  test("responde à mudança de movimento reduzido sem recarregar a página", async ({ page }) => {
    const { vitrine, miniaturas, produto } = await abrirVitrine(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(vitrine.getByRole("button", { name: REDUZIDO, exact: true })).toBeDisabled();
    const semMovimento = await produto.getAttribute("href");
    await page.clock.fastForward(20_000);
    await expect(produto).toHaveAttribute("href", semMovimento!);
    expect(await vitrine.evaluate((elemento) =>
      elemento.getAnimations({ subtree: true }).filter((animacao) => animacao.playState === "running").length,
    )).toBe(0);

    // A preferência reduzida desliga o rodízio, mas conserva a escolha manual.
    const indiceAtivo = await miniaturas.evaluateAll((botoes) =>
      botoes.findIndex((botao) => botao.getAttribute("aria-pressed") === "true"),
    );
    const escolhido = miniaturas.nth((indiceAtivo + 1) % await miniaturas.count());
    await escolhido.click();
    await expect(produto).not.toHaveAttribute("href", semMovimento!);
    const escolhaManual = await produto.getAttribute("href");

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(vitrine.getByRole("button", { name: RETOMAR, exact: true })).toBeEnabled();
    await page.clock.fastForward(20_000);
    await expect(produto).toHaveAttribute("href", escolhaManual!);

    await vitrine.getByRole("button", { name: RETOMAR, exact: true }).click();
    await page.mouse.move(0, 0);
    await page.clock.runFor(6100);
    await expect(produto).not.toHaveAttribute("href", escolhaManual!);
  });
});
