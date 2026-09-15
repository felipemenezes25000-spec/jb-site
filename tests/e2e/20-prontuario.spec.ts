import { expect, test } from "@playwright/test";

import {
  adicionarAoCarrinho,
  cadastrarCliente,
  fecharPedidoComPix,
  sufixo,
} from "./apoio";
import { fixtures } from "./fixtures";

/**
 * O prontuário do cliente herda a ficha do produto — nunca copia.
 *
 * A auditoria comprou uma autoclave e abriu o prontuário dela. Encontrou
 * "Voltagem: 220", sem unidade, e "Marca e modelo: Cristófoli", sem modelo.
 * Nenhuma especificação do produto: nem capacidade, nem bandejas, nem ciclo.
 * Nenhum laudo de inspeção. Dois cliques adiante, a página pública do MESMO
 * equipamento dizia "Bivolt (110/220 V)" e listava tudo isso.
 *
 * A clínica que pagou via menos sobre o aparelho do que quem ainda não pagou.
 *
 * Estes testes fixam as duas metades da correção:
 *
 *   1. **Com produto de origem**, a ficha da PDP aparece no prontuário, pelo
 *      mesmo componente e com os mesmos números. O teste lê a PDP primeiro e
 *      exige o mesmo texto lá dentro — comparar com uma constante escrita aqui
 *      provaria só que este arquivo concorda consigo mesmo.
 *
 *   2. **Sem produto de origem**, a ficha não some: ela é montada dos campos
 *      do próprio prontuário, e "220" continua lendo "220 V". A unidade não
 *      pode depender de o equipamento ter vindo da loja.
 */

/* A unidade sai de `formatarSpec` com espaço fino (U+2009), que é o que faz
   "220 V" não quebrar no fim da linha. Um seletor com espaço comum não casa —
   e o teste falharia por causa do caractere, não do defeito. */
const TENSAO_220 = /220\s*V/;

test.describe("Prontuário do equipamento", () => {
  test("herda a ficha técnica do produto comprado, com o laudo da unidade", async ({
    page,
  }) => {
    const dados = fixtures();
    test.skip(
      !dados.equipamento,
      "O catálogo semeado não tem nenhum produto que seja equipamento E tenha especificações cadastradas — não há ficha para herdar.",
    );
    const alvo = dados.equipamento!;

    /* ------------------------------------ o que a PDP mostra, medido lá */
    await page.goto(`/loja/${alvo.slug}`);
    const ficha = page.locator("#ficha-tecnica");
    await expect(ficha).toBeVisible();

    /* Uma linha real da ficha, escolhida do próprio DOM. Se o produto semeado
       mudar, o teste continua válido: ele compara a página com a página. */
    const primeiraLinha = ficha.locator("dt").first();
    const rotuloNaPdp = (await primeiraLinha.innerText()).trim();
    const valorNaPdp = (
      await ficha.locator("dd").first().innerText()
    ).trim();
    expect(rotuloNaPdp.length).toBeGreaterThan(0);
    expect(valorNaPdp.length).toBeGreaterThan(0);

    /* ------------------------------------------------ comprar de verdade */
    const marca = sufixo();
    const cliente = {
      nome: "Clínica do Prontuário",
      email: `prontuario.${marca}@jbteste.local`,
      senha: `Senha-${marca}!`,
    };
    await cadastrarCliente(page, cliente);
    await adicionarAoCarrinho(page, { slug: alvo.slug, quantidade: 1 });
    await fecharPedidoComPix(page, { email: cliente.email, nome: cliente.nome });

    /* O prontuário nasce do PAGAMENTO, não do pedido: `Equipment` é criado em
       `aoConfirmarPagamento`. Sem aprovar o Pix simulado, a lista fica vazia e
       o teste falharia por causa do fluxo, não da herança da ficha. */
    await page.getByRole("button", { name: "Simular pagamento aprovado" }).click();
    await expect(page.getByText(/^Pagamento confirmado/).first()).toBeVisible({
      timeout: 30_000,
    });

    /* ----------------------------------------- o prontuário do aparelho */
    await page.goto("/minha-jb/equipamentos");
    const linkDoEquipamento = page
      .getByRole("link", { name: new RegExp(alvo.nome.slice(0, 24), "i") })
      .first();
    await expect(linkDoEquipamento).toBeVisible();
    await linkDoEquipamento.click();
    await page.waitForURL(/\/minha-jb\/equipamentos\/[^/]+$/);

    /* A ficha herdada existe, é a mesma, e o contador dela é derivado — não há
       "6 especificações" escrito à mão em lugar nenhum. */
    const fichaNoProntuario = page.locator("#ficha-tecnica");
    await expect(fichaNoProntuario).toBeVisible();
    await expect(
      fichaNoProntuario.getByText(rotuloNaPdp, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      fichaNoProntuario.getByText(valorNaPdp, { exact: true }).first(),
    ).toBeVisible();

    /* E o caminho de volta ao catálogo, que é o que torna a herança
       verificável por quem lê a página. */
    await expect(
      fichaNoProntuario.getByRole("link", { name: "Ver no catálogo" }),
    ).toHaveAttribute("href", `/loja/${alvo.slug}`);
  });

  test("monta a ficha de um equipamento cadastrado pela clínica, com a unidade na tensão", async ({
    page,
  }) => {
    const marca = sufixo();
    const cliente = {
      nome: "Clínica Sem Compra",
      email: `proprio.${marca}@jbteste.local`,
      senha: `Senha-${marca}!`,
    };
    await cadastrarCliente(page, cliente);

    await page.goto("/minha-jb/equipamentos/novo");
    await page.getByLabel("Nome do equipamento").fill("Autoclave da sala 2");
    await page.getByLabel("Marca").fill("Cristófoli");
    await page.getByLabel("Modelo").fill("Vitale Class 12");
    await page.getByLabel("Voltagem").selectOption("220");
    await page.getByRole("button", { name: /Cadastrar|Salvar/ }).first().click();
    await page.waitForURL(/\/minha-jb\/equipamentos\/[^/]+$/);

    /* O defeito, no seu formato exato: o cadastro guarda "220" e a tela dizia
       "220". A ficha é a mesma do catálogo, então a unidade vem junto. */
    const ficha = page.locator("#ficha-tecnica");
    await expect(ficha).toBeVisible();
    await expect(ficha.getByText(TENSAO_220).first()).toBeVisible();
    await expect(ficha.getByText("220", { exact: true })).toHaveCount(0);

    /* E o modelo não se perde no caminho: "Cristófoli" sozinho era metade da
       identificação do aparelho. */
    await expect(ficha.getByText("Vitale Class 12").first()).toBeVisible();
  });
});
