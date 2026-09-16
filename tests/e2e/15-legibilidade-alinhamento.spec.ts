import { expect, test, type Page } from "@playwright/test";

const PRETO_JB = "rgb(26, 28, 30)";

/**
 * Uma categoria e um produto que existem NESTE banco.
 *
 * O spec fixava `/categoria/biosseguranca` e `/loja/motor-de-implante-35ncm`.
 * Os dois existem no banco de desenvolvimento e **nenhum** existe na CI, que
 * semeia `db:seed` + `db:demo` sem `db:vitrine`: lá a categoria de
 * biossegurança tem o slug `bioseguranca`, com um "s" só — é a duplicata de
 * cadastro que o README descreve, herdada da carga do site em PHP — e o motor
 * de implante simplesmente não foi semeado.
 *
 * Com rota inexistente a página responde "não encontrado", e aí o teste ou
 * mede o nada ou espera 20s por um controle que aquela tela não tem motivo
 * para desenhar. Foi o que reprovou três testes só na CI.
 *
 * Descobrir os dois a partir do próprio catálogo custa uma navegação por
 * arquivo e vale em qualquer banco semeado.
 */
let rotasDescobertas: { categoria: string; produto: string } | null = null;

async function rotasQueExistem(page: Page) {
  if (rotasDescobertas) return rotasDescobertas;

  await page.goto("/loja");
  const categoria = await page
    .locator('a[href^="/categoria/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);
  const produto = await page
    .locator('a[href^="/loja/"]')
    .first()
    .getAttribute("href")
    .catch(() => null);

  rotasDescobertas = {
    categoria: categoria ?? "/loja",
    produto: produto ?? "/loja",
  };
  return rotasDescobertas;
}

/**
 * A casca pública VISÍVEL.
 *
 * Durante uma navegação o Next mantém a árvore da rota anterior no documento
 * para o voltar instantâneo, e por um instante existem DUAS cascas com
 * `data-jb-publico`. O modo estrito do Playwright recusa o localizador ambíguo
 * — e só na CI, que é mais lenta e segura a árvore antiga por mais tempo:
 * aqui passava 7/7 e lá reprovava três testes com
 * `resolved to 2 elements`.
 *
 * Filtrar por visibilidade escolhe a casca que a pessoa está vendo, que é a
 * que se quer medir.
 */
function cascaPublica(page: Page) {
  return page.locator('[data-jb-publico="true"]').filter({ visible: true });
}

test.describe("Legibilidade e alinhamento da loja pública", () => {
  test("textos secundários usam preto nas principais jornadas", async ({ page }) => {
    const { categoria, produto } = await rotasQueExistem(page);

    for (const caminho of [
      "/",
      "/loja",
      categoria,
      "/busca?q=autoclave",
      "/marcas",
      "/seminovos",
      produto,
      "/assistencia-tecnica",
    ]) {
      await page.goto(caminho);

      const casca = cascaPublica(page).first();
      await expect(casca, `casca pública ausente em ${caminho}`).toHaveCount(1);

      const amostrar = () =>
        casca.evaluate((raiz) => {
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

      /* A guarda contra amostra vazia precisa de espera, não de uma leitura
         só. Catálogo e busca chegam por streaming: quando `goto` resolve, a
         casca já existe mas o miolo ainda pode ser o esqueleto — e ali não há
         texto nenhum para medir. Com a rota fria isso rendia "sem amostra de
         texto em /busca?q=autoclave" enquanto a mesma página, medida um
         segundo depois, oferecia 95 amostras. */
      await expect
        .poll(async () => (await amostrar()).length, {
          message: `sem amostra de texto em ${caminho}`,
        })
        .toBeGreaterThan(0);

      const cores = await amostrar();
      expect(new Set(cores), `texto cinza encontrado em ${caminho}`).toEqual(
        new Set([PRETO_JB]),
      );
    }
  });

  test("módulos visuais não recuperam texto cinza", async ({ page }) => {
    const { categoria, produto } = await rotasQueExistem(page);

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
        categoria,
        produto,
      ]) {
        await page.goto(caminho);

        const cinzas = await cascaPublica(page).first().evaluate(
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

  /* Este teste cobria o menu desktop antigo, onde cada item era um link e um
     botão irmão de MESMO NOME, lado a lado: a queixa original era não saber
     onde clicar para ir ao catálogo e onde clicar para abrir as opções.

     Essa linha saiu do cabeçalho em 12/09/2026 e o lugar da navegação de
     desktop passou a ser a faixa vermelha, onde não há botão nenhum — só
     links. A pergunta de fundo continua valendo e é a mesma: dois alvos
     vizinhos não podem dividir a mesma área de clique. Então o teste mudou de
     alvo, não de assunto. */
  test("os destinos da faixa de catálogo não dividem área de clique", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/loja");

    const faixa = page.getByRole("navigation", { name: "Catálogo" });
    await expect(faixa).toBeVisible();

    const caixas = await faixa.getByRole("link").evaluateAll((elementos) =>
      elementos.map((elemento) => {
        const caixa = elemento.getBoundingClientRect();
        return { texto: elemento.textContent?.trim() ?? "", x: caixa.x, direita: caixa.right };
      }),
    );

    expect(caixas.length).toBeGreaterThan(2);
    const sobrepostos = caixas.filter(
      (caixa, i) => i > 0 && caixa.x < caixas[i - 1]!.direita - 1,
    );
    expect(sobrepostos, "links da faixa não podem se sobrepor").toEqual([]);
  });

  test("ordenação continua legível na largura mínima suportada", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });

    /* `/loja`, e não uma categoria: a CI semeia `db:seed` + `db:demo`, sem
       `db:vitrine`, e uma categoria específica pode não ter produto nenhum lá.
       Sem resultado os controles da coleção não renderizam, e o teste reprovava
       esperando 20s por um botão que a página não tinha motivo para desenhar.
       O que se mede aqui é a legibilidade do par filtro/ordenação a 320px —
       qualquer listagem com resultado serve, e o catálogo inteiro é a única
       que tem resultado em qualquer banco semeado. */
    await page.goto("/loja");

    const filtros = page.getByRole("button", { name: "Abrir filtros" });
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

    /* Compara os ITENS do trilho, não os `span` dentro deles: cada cartão de
       marca tem três (logo, nome e legenda), empilhados — comparar span a span
       acusava "sobreposição" onde só há empilhamento vertical dentro do mesmo
       cartão. O que precisa não se sobrepor é um cartão sobre o outro. */
    const textos = page
      .getByRole("region", { name: "Marcas no catálogo" })
      .locator('ul:not([aria-hidden="true"]) > li');
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

      const pequenos = await cascaPublica(page).first().evaluate((raiz) =>
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

      /* Espera o estilo estar aplicado antes de medir.

         No `next dev` o CSS de uma rota chega depois do HTML na primeira
         compilação dela. Medido nessa janela, TODO controle da página aparece
         menor que 44px: num servidor recém-subido este teste acusou 137 alvos
         pequenos em /loja — praticamente cada link da página — e passou
         sozinho, com a rota já quente.

         O botão do menu é `size-11`, 44px por desenho. Esperar que ele MEÇA
         44px é esperar o estilo, e não um tempo arbitrário. */
      await expect
        .poll(
          async () => {
            const caixa = await page
              .getByRole("button", { name: /^Abrir o menu$/ })
              .first()
              .boundingBox();
            return caixa ? Math.round(caixa.height) : 0;
          },
          { message: `o estilo de ${caminho} precisa estar aplicado antes de medir alvos` },
        )
        .toBeGreaterThanOrEqual(44);

      /* E espera a animação de entrada terminar.
         `jb-surge` anima `scale(0.985) → 1`, e `getBoundingClientRect()`
         devolve a caixa JÁ transformada: um alvo de 44px medido no meio do
         quadro dá 43. O botão do menu da guarda acima não é animado, então o
         estilo estar aplicado não quer dizer que a página parou de se mexer.
         Só as animações finitas entram — o selo girando e a faixa correndo
         nunca terminam. */
      await Promise.race([
        page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter((animacao) => animacao.effect?.getComputedTiming().iterations !== Infinity)
              .map((animacao) => animacao.finished.catch(() => {})),
          ),
        ),
        page.waitForTimeout(3000),
      ]);

      const pequenos = await cascaPublica(page).first().evaluate((raiz) => {
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
