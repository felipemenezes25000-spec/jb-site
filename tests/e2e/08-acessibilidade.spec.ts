import { expect, test, type Page } from "@playwright/test";

import { adicionarAoCarrinho, CPF_DE_TESTE, sufixo, TELEFONE_DE_TESTE } from "./apoio";

/* ==========================================================================
   Acessibilidade do caminho que mais importa: o checkout.

   O critério aqui não é "tem um atributo ARIA". É o comportamento:

     · dá para percorrer e enviar o formulário só com o teclado, usando Enter
       nos botões, como qualquer botão do sistema operacional;
     · o foco é perceptível — o navegador desenha alguma coisa diferente no
       elemento focado, e isso é medido comparando o estilo com foco e sem;
     · todo campo tem nome acessível de verdade (label associada, aria-label
       ou aria-labelledby), não só um placeholder;
     · o erro chega a quem usa leitor de tela, por região viva;
     · o alvo de toque dos botões de navegação tem pelo menos 44px.
   ========================================================================== */

type Focado = {
  tag: string;
  tipo: string;
  nome: string;
  texto: string;
  outline: string;
  sombra: string;
};

/** Descreve o elemento que está com o foco, com o estilo que o desenha. */
async function focado(page: Page): Promise<Focado | null> {
  return page.evaluate(() => {
    const elemento = document.activeElement as HTMLElement | null;
    if (!elemento || elemento === document.body) return null;
    const estilo = getComputedStyle(elemento);
    return {
      tag: elemento.tagName.toLowerCase(),
      tipo: elemento.getAttribute("type") ?? "",
      nome: elemento.getAttribute("name") ?? "",
      texto: (elemento.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
      outline: `${estilo.outlineStyle}|${estilo.outlineWidth}|${estilo.outlineColor}`,
      sombra: estilo.boxShadow,
    };
  });
}

/**
 * Tab até chegar no elemento procurado. Devolve quantos Tabs foram precisos —
 * o limite existe para o teste falhar em vez de girar para sempre quando o
 * elemento nunca recebe foco (armadilha de foco, tabindex -1 indevido…).
 */
async function tabAte(
  page: Page,
  encontrou: (atual: Focado) => boolean,
  limite = 60,
): Promise<Focado> {
  for (let i = 0; i < limite; i++) {
    await page.keyboard.press("Tab");
    const atual = await focado(page);
    if (atual && encontrou(atual)) return atual;
  }
  throw new Error(`Não cheguei ao elemento em ${limite} tabulações.`);
}

/**
 * O foco precisa mudar a aparência do elemento. Comparamos o estilo focado com
 * o mesmo elemento sem foco: se nada muda, quem navega por teclado não sabe
 * onde está.
 */
async function focoDesenhaAlgo(page: Page): Promise<boolean> {
  const comFoco = await focado(page);
  if (!comFoco) return false;

  const semFoco = await page.evaluate(() => {
    const elemento = document.activeElement as HTMLElement | null;
    if (!elemento) return null;
    elemento.blur();
    const estilo = getComputedStyle(elemento);
    return {
      outline: `${estilo.outlineStyle}|${estilo.outlineWidth}|${estilo.outlineColor}`,
      sombra: estilo.boxShadow,
    };
  });
  if (!semFoco) return false;

  return comFoco.outline !== semFoco.outline || comFoco.sombra !== semFoco.sombra;
}

/** Campos visíveis sem nome acessível. Lista vazia é o resultado esperado. */
async function camposSemNome(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problemas: string[] = [];
    const campos = document.querySelectorAll<HTMLElement>("input, select, textarea");

    for (const campo of campos) {
      const invisivel = campo.offsetParent === null && getComputedStyle(campo).position !== "fixed";
      if (invisivel) continue;
      if (campo instanceof HTMLInputElement && campo.type === "hidden") continue;

      const temAria =
        Boolean(campo.getAttribute("aria-label")?.trim()) ||
        Boolean(campo.getAttribute("aria-labelledby")?.trim());
      const rotuloPorId = campo.id
        ? document.querySelector(`label[for="${CSS.escape(campo.id)}"]`)
        : null;
      const rotuloEnvolvente = campo.closest("label");

      if (!temAria && !rotuloPorId && !rotuloEnvolvente) {
        problemas.push(
          `${campo.tagName.toLowerCase()}[name=${campo.getAttribute("name") ?? "?"}]`,
        );
      }
    }
    return problemas;
  });
}

test.describe("Acessibilidade do checkout", () => {
  test("dá para percorrer e enviar o pedido só com o teclado", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Fechar pedido", level: 1 })).toBeVisible();

    /* ------------------------------------------ etapa 0: identificação */
    const email = await tabAte(page, (atual) => atual.nome === "email");
    expect(email.tag).toBe("input");
    expect(await focoDesenhaAlgo(page), "o campo focado precisa se destacar").toBe(true);

    // o blur da conferência tirou o foco; volta para o campo pelo teclado
    await tabAte(page, (atual) => atual.nome === "email");
    await page.keyboard.type(`teclado.${sufixo()}@jbteste.local`);

    const continuar = await tabAte(page, (atual) => atual.texto.startsWith("Continuar"));
    expect(continuar.tag).toBe("button");
    expect(await focoDesenhaAlgo(page), "o botão focado precisa se destacar").toBe(true);

    await tabAte(page, (atual) => atual.texto.startsWith("Continuar"));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Dados do comprador" })).toBeVisible();

    /* --------------------------------------------- etapa 1: comprador */
    await tabAte(page, (atual) => atual.nome === "nome");
    await page.keyboard.type("Pessoa que Usa Teclado");
    await tabAte(page, (atual) => atual.nome === "telefone");
    await page.keyboard.type(TELEFONE_DE_TESTE);
    await tabAte(page, (atual) => atual.nome === "documento");
    await page.keyboard.type(CPF_DE_TESTE);

    await tabAte(page, (atual) => atual.texto.startsWith("Continuar"));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Entrega" })).toBeVisible();

    /* ----------------------------------------------- etapa 2: entrega */
    // retirada é a opção marcada por padrão; seguir sem mexer é o caminho
    await tabAte(page, (atual) => atual.texto.startsWith("Continuar"));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Pagamento" })).toBeVisible();

    /* --------------------------------------------- etapa 3: pagamento */
    await tabAte(page, (atual) => atual.texto.startsWith("Continuar"));
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Revisão" })).toBeVisible();

    /* ----------------------------------------------- etapa 4: revisão */
    const finalizar = await tabAte(page, (atual) => atual.texto.startsWith("Finalizar"));
    expect(finalizar.tipo).toBe("submit");
    expect(await focoDesenhaAlgo(page), "o botão de enviar precisa se destacar").toBe(true);

    await tabAte(page, (atual) => atual.texto.startsWith("Finalizar"));
    await page.keyboard.press("Enter");

    await page.waitForURL(/\/pedido\/[A-Z0-9-]+$/i, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("todo campo do checkout tem nome acessível", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    const etapas = ["Identificação", "Dados do comprador", "Entrega", "Pagamento", "Revisão"];

    for (const [indice, etapa] of etapas.entries()) {
      await expect(page.getByRole("heading", { name: etapa })).toBeVisible();
      expect(await camposSemNome(page), `campos sem rótulo na etapa "${etapa}"`).toEqual([]);

      if (indice === 0) {
        await page.getByLabel("E-mail").fill(`rotulos.${sufixo()}@jbteste.local`);
      }
      if (indice === 1) {
        await page.getByLabel("Nome completo").fill("Pessoa com Rótulo");
        await page.getByLabel("Telefone").fill(TELEFONE_DE_TESTE);
        await page.getByRole("textbox", { name: "CPF" }).fill(CPF_DE_TESTE);
      }
      if (indice < etapas.length - 1) {
        await page.getByRole("button", { name: "Continuar" }).click();
      }
    }
  });

  test("o erro de etapa é anunciado por região viva", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Continuar" }).click();

    const aviso = page.getByText("Confira antes de continuar");
    await expect(aviso).toBeVisible();

    // a mensagem precisa estar dentro de algo que o leitor de tela anuncie
    const anunciado = await aviso.evaluate((elemento) =>
      Boolean(elemento.closest("[aria-live], [role=alert], [role=status]")),
    );
    expect(anunciado, "o aviso precisa viver numa região viva").toBe(true);
  });

  test("os botões de navegação têm alvo de toque de pelo menos 44px", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    await page.goto("/checkout");

    const continuar = page.getByRole("button", { name: "Continuar" });
    const caixa = await continuar.boundingBox();
    expect(caixa, "o botão precisa estar na tela").not.toBeNull();
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
  });

  test("a loja oferece atalho para o conteúdo e marcos de navegação", async ({ page }) => {
    await page.goto("/");

    // o primeiro Tab precisa cair no atalho para o conteúdo
    await page.keyboard.press("Tab");
    const primeiro = await focado(page);
    expect(primeiro?.tag).toBe("a");
    expect(primeiro?.texto.toLowerCase()).toContain("conteúdo");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
});
