import { expect, test, type Page } from "@playwright/test";

import {
  CPF_DE_TESTE,
  TELEFONE_DE_TESTE,
  adicionarAoCarrinho,
  emCentavos,
  entrarComoEquipe,
  fecharPedidoComPix,
  sufixo,
} from "./apoio";
import { fixtures } from "./fixtures";

/**
 * O painel como porta de entrada da operação.
 *
 * Os fluxos aqui nasceram todos do mesmo problema: quem liga para a JB não
 * preenche formulário na loja. Até então o cadastro do cliente, a abertura do
 * chamado e o recebimento de um sinal só existiam pela ponta do cliente — ou
 * não existiam. Cada teste deste arquivo prova uma dessas portas do lado de
 * dentro.
 *
 * Tudo é localizado por papel e por texto. Classe CSS é detalhe de estilo: um
 * teste amarrado a ela quebraria numa troca de tema sem que nada da aplicação
 * tivesse deixado de funcionar.
 */

/* ------------------------------------------------------------------ apoio */

/**
 * A URL é a ficha de um registro criado agora, e não a tela de cadastro.
 *
 * `/admin/clientes/novo` também é "um segmento depois de /admin/clientes": uma
 * expressão regular ingênua daria por boa a criação que nunca aconteceu e o
 * teste seguiria adiante lendo o formulário como se fosse a ficha.
 */
function ehFichaDe(url: URL, base: string): boolean {
  const resto = url.pathname.startsWith(`${base}/`) ? url.pathname.slice(base.length + 1) : "";
  return resto !== "" && resto !== "novo" && !resto.includes("/");
}

/**
 * Cadastra um cliente pela tela do painel e devolve o que foi digitado.
 *
 * Entra pelo botão da lista, e não por `goto` direto na URL: o caminho que a
 * pessoa percorre faz parte do que está sob teste — sem o botão, a tela de
 * cadastro existiria sem ninguém a alcançar.
 */
async function cadastrarClientePeloPainel(page: Page) {
  const marca = sufixo();
  const cliente = {
    nome: `Clinica Telefone ${marca}`,
    email: `clinica.${marca}@jbteste.local`,
  };

  await page.goto("/admin/clientes");
  await page.getByRole("link", { name: "Novo cliente" }).click();
  await page.waitForURL(/\/admin\/clientes\/novo$/);

  await expect(page.getByRole("heading", { name: "Novo cliente", level: 1 })).toBeVisible();

  // Sem `exact`: o rótulo do campo obrigatório termina com o asterisco de
  // "campo obrigatório", e os três nomes já são únicos nesta tela.
  await page.getByLabel("Nome").fill(cliente.nome);
  await page.getByLabel("E-mail").fill(cliente.email);
  await page.getByLabel("Telefone").fill(TELEFONE_DE_TESTE);
  await page.getByRole("textbox", { name: "CPF" }).fill(CPF_DE_TESTE);

  await page.getByRole("button", { name: "Cadastrar cliente" }).click();

  // criar leva para a ficha; ficar no formulário significaria erro de validação.
  // A conferência é pelo caminho inteiro: `/admin/clientes/novo` também casa
  // com "um segmento depois de clientes", e daria o teste por bom sem nada ter
  // sido gravado.
  await page.waitForURL((url) => ehFichaDe(url, "/admin/clientes"), { timeout: 60_000 });

  return cliente;
}

/** Lê o valor de uma linha da conta do pedido ("Total do pedido", "Falta receber"…). */
async function valorDaLinha(page: Page, rotulo: string): Promise<number> {
  const linha = page.getByText(rotulo, { exact: true }).locator("xpath=..");
  await expect(linha).toBeVisible();
  return emCentavos(await linha.innerText());
}

/* ------------------------------------------------------- cadastro e chamado */

test.describe("Atendimento por telefone", () => {
  test("a equipe cadastra um cliente novo e ele aparece na lista", async ({ page }) => {
    await entrarComoEquipe(page);
    const cliente = await cadastrarClientePeloPainel(page);

    // a ficha recém-criada é do cliente que acabou de ser digitado
    await expect(page.getByRole("heading", { level: 1 })).toContainText(cliente.nome);

    // e ele existe para quem procurar depois, que é o ponto do cadastro
    await page.goto(`/admin/clientes?q=${encodeURIComponent(cliente.email)}`);
    await expect(page.getByText(cliente.nome).first()).toBeVisible();
    await expect(page.getByText(cliente.email).first()).toBeVisible();
  });

  test("o mesmo e-mail duas vezes não vira dois cadastros", async ({ page }) => {
    await entrarComoEquipe(page);
    const cliente = await cadastrarClientePeloPainel(page);

    await page.goto("/admin/clientes/novo");
    await page.getByLabel("Nome").fill("Tentativa Repetida");
    await page.getByLabel("E-mail").fill(cliente.email);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();

    // segue no formulário, com o erro e o caminho para a ficha que já existe
    await expect(page.getByText("Já existe um cliente com este e-mail.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/clientes\/novo$/);
    await expect(page.getByRole("link", { name: `Abrir a ficha de ${cliente.nome}` })).toBeVisible();
  });

  test("a equipe abre um chamado por telefone e ele entra na fila", async ({ page }) => {
    const marca = sufixo();
    const contato = `Recepcao Sem Cadastro ${marca}`;

    await entrarComoEquipe(page);

    // entra pelo botão da fila — é assim que quem atende o telefone chega lá
    await page.goto("/admin/assistencia");
    await page.getByRole("link", { name: "Abrir chamado" }).click();
    await page.waitForURL(/\/admin\/assistencia\/novo/);

    /*
     * Quem está ligando ainda não é cliente: a busca não acha e a tela oferece
     * a saída de abrir mesmo assim.
     *
     * O termo não tem dígito nenhum de propósito. A busca de clientes procura
     * os dígitos do que foi digitado dentro de CPF/CNPJ e telefone, então um
     * sufixo aleatório com números acha o cadastro de demonstração por acaso.
     */
    const semResultado = "quem-nunca-ligou-para-a-jb";
    await page.getByLabel("Buscar cliente").fill(semResultado);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(`Nenhum cliente para “${semResultado}”`)).toBeVisible();

    await page.getByRole("link", { name: "Abrir sem cadastro" }).click();
    await page.waitForURL(/avulso=1/);
    await expect(
      page.getByRole("heading", { name: "Abrir chamado sem cadastro", level: 1 }),
    ).toBeVisible();

    await page.getByLabel("Marca").fill("Gnatus");
    await page.getByLabel("Modelo").fill("Syncrus G3");
    await page.getByLabel("Tipo do problema").fill("Cadeira não sobe");
    await page.getByLabel("Urgência").selectOption("alta");
    await page
      .getByLabel("Relato")
      .fill("A cadeira parou de subir hoje de manhã; faz um estalo e o pedal não responde.");

    await page.getByLabel("Nome do contato").fill(contato);
    await page.getByLabel("E-mail do contato").fill(`chamado.${marca}@jbteste.local`);
    await page.getByLabel("Telefone do contato").fill(TELEFONE_DE_TESTE);

    await page.getByRole("button", { name: "Abrir chamado" }).click();

    // abrir leva para a ficha do chamado, com número gerado pelo servidor
    await page.waitForURL((url) => ehFichaDe(url, "/admin/assistencia"), { timeout: 60_000 });
    const titulo = await page.getByRole("heading", { level: 1 }).innerText();
    const numero = titulo.replace(/^Chamado\s+/i, "").trim();
    expect(numero, "o chamado precisa ter número").not.toBe("");

    /*
     * E ele está na fila de quem trabalha.
     *
     * A fila abre ordenada por urgência e, dentro dela, do mais antigo para o
     * mais novo — é uma fila de trabalho, e quem chegou primeiro é atendido
     * primeiro. Consequência: um chamado recém-aberto é o ÚLTIMO da sua
     * urgência, e cai fora da primeira página assim que existirem 25 chamados
     * abertos com a mesma urgência. Este teste chegou a passar por acaso,
     * enquanto o banco de testes era pequeno.
     *
     * Pedir a ordenação por mais recente prova a mesma coisa — o chamado
     * entrou na fila — sem depender de quantos chamados o banco acumulou.
     */
    await page.goto("/admin/assistencia?ordem=criado&dir=desc");
    await expect(page.getByText(numero).first()).toBeVisible();

    // a busca da fila também o encontra pelo nome de quem ligou
    await page.goto(`/admin/assistencia?q=${encodeURIComponent(contato)}`);
    await expect(page.getByText(numero).first()).toBeVisible();
    await expect(page.getByText(contato).first()).toBeVisible();
  });
});

/* ------------------------------------------------------- pagamento parcial */

test.describe("Pagamento parcial no painel", () => {
  test("o sinal não quita o pedido, e completar o saldo quita", async ({ page }) => {
    await adicionarAoCarrinho(page, { quantidade: 1 });
    const { numero, totalCents } = await fecharPedidoComPix(page, {
      email: `sinal.${sufixo()}@jbteste.local`,
      nome: "Comprador do Sinal",
      acesso: { modo: "criar", senha: "senhaDeTeste123" },
    });

    expect(totalCents, "o pedido precisa ter valor para ser pago em partes").toBeGreaterThan(0);
    const sinalCents = Math.floor(totalCents / 2);
    const restoCents = totalCents - sinalCents;

    await entrarComoEquipe(page);
    await page.goto(`/admin/pedidos?q=${encodeURIComponent(numero)}`);
    await page.getByText(numero).first().click();
    await page.waitForURL((url) => ehFichaDe(url, "/admin/pedidos"));

    // a conta começa inteira em aberto: o Pix nasceu pendente e não abate nada
    expect(await valorDaLinha(page, "Total do pedido")).toBe(totalCents);
    expect(await valorDaLinha(page, "Já recebido")).toBe(0);
    expect(await valorDaLinha(page, "Falta receber")).toBe(totalCents);

    /* ------------------------------------------------------------- sinal */

    await page.getByLabel("Valor recebido agora").fill(String(sinalCents));
    await page
      .getByLabel("Observação interna")
      .fill("Sinal recebido por transferência, conferido pela suíte automatizada.");

    // o próprio botão muda de nome quando o valor não quita — é o aviso de que
    // o pedido vai continuar em aberto
    await page.getByRole("button", { name: "Registrar pagamento parcial" }).click();
    await page.getByRole("button", { name: "Registrar parcial" }).click();

    await expect(page.getByText(/Pagamento parcial de .* registrado/)).toBeVisible({
      timeout: 30_000,
    });

    // o pedido NÃO virou pago: o painel mostra o saldo e continua oferecendo
    // o registro do que falta
    await expect(page.getByText("Este pedido já consta como pago.")).toHaveCount(0);
    await expect
      .poll(() => valorDaLinha(page, "Já recebido"), { timeout: 20_000 })
      .toBe(sinalCents);
    expect(await valorDaLinha(page, "Falta receber")).toBe(restoCents);

    // e o estado é do servidor, não da tela: sobrevive ao recarregamento
    await page.reload();
    expect(await valorDaLinha(page, "Falta receber")).toBe(restoCents);
    await expect(page.getByText("Aguardando pagamento").first()).toBeVisible();

    /* ------------------------------------------------ nunca mais que o saldo */

    await page.getByLabel("Valor recebido agora").fill(String(restoCents + 100));
    await expect(page.getByText(/Passa do que falta receber/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Registrar pagamento parcial" }),
    ).toBeDisabled();

    /* ---------------------------------------------------------- quitação */

    await page.getByLabel("Valor recebido agora").fill(String(restoCents));
    await page.getByRole("button", { name: "Confirmar pagamento" }).click();
    await page.getByRole("button", { name: "Confirmar recebimento" }).click();

    /*
     * O aviso de sucesso não sobrevive à quitação: com o pedido pago, o painel
     * troca o formulário inteiro pela frase abaixo — e é ela, não o toast, que
     * prova o estado novo.
     */
    await expect(page.getByText("Este pedido já consta como pago.")).toBeVisible({
      timeout: 30_000,
    });

    await page.reload();
    await expect(page.getByText("Este pedido já consta como pago.")).toBeVisible();
    expect(await valorDaLinha(page, "Já recebido")).toBe(totalCents);
    expect(await valorDaLinha(page, "Nada em aberto")).toBe(0);
    await expect(page.getByText("Pagamento aprovado").first()).toBeVisible();
  });
});

/* --------------------------------------------------------------- navegação */

/**
 * As seis áreas nasceram órfãs: as telas existiam, mas nenhuma delas tinha
 * entrada em `AREAS`, então não apareciam no menu e só abriam por URL digitada.
 * O teste é literal — o item precisa estar no menu e o clique precisa abrir a
 * tela, não voltar com erro de permissão.
 */
const AREAS_QUE_ESTAVAM_ESCONDIDAS = [
  { menu: "Frete", href: "/admin/frete", titulo: "Frete" },
  { menu: "Pagamentos", href: "/admin/pagamentos", titulo: "Pagamentos" },
  { menu: "Cupons", href: "/admin/cupons", titulo: "Cupons" },
  { menu: "Suporte", href: "/admin/suporte", titulo: "Suporte ao cliente" },
  { menu: "Técnicos", href: "/admin/tecnicos", titulo: "Técnicos" },
  { menu: "Agenda", href: "/admin/agenda", titulo: "Agenda técnica" },
] as const;

test.describe("Menu do painel", () => {
  test("as áreas que estavam escondidas aparecem no menu e abrem", async ({ page }) => {
    await entrarComoEquipe(page);

    // A casca desenha o menu duas vezes — barra lateral e gaveta do celular.
    // O primeiro é o visível nesta largura; conferir os dois só duplicaria a
    // mesma afirmação.
    const menu = page.getByRole("navigation", { name: "Áreas do painel" }).first();
    await expect(menu).toBeVisible();

    for (const area of AREAS_QUE_ESTAVAM_ESCONDIDAS) {
      const item = menu.getByRole("link", { name: area.menu, exact: true });
      await expect(item, `${area.menu} precisa estar no menu`).toBeVisible();
      await expect(item).toHaveAttribute("href", area.href);
    }

    // e o link leva à tela de verdade: sem entrada em AREAS, a guarda mandaria
    // de volta para /admin?erro=permissao
    for (const area of AREAS_QUE_ESTAVAM_ESCONDIDAS) {
      await menu.getByRole("link", { name: area.menu, exact: true }).click();
      await page.waitForURL(new RegExp(`${area.href}(\\?|$)`));
      await expect(page.getByRole("heading", { name: area.titulo, level: 1 })).toBeVisible();
      await expect(page).not.toHaveURL(/erro=permissao/);
    }
  });
});

/* ---------------------------------------------------------- troca de senha */

test.describe("Minha conta no painel", () => {
  /**
   * Este teste muda a senha de uma pessoa de verdade, então usa uma conta só
   * dele — `staffSenha`, semeada por `preparar.ts`. Usar a conta principal
   * derrubaria todos os outros arquivos da suíte na execução seguinte.
   *
   * A senha original é devolvida no fim de qualquer forma; e, mesmo se o teste
   * morrer no meio, o preparo da próxima execução reescreve o hash.
   */
  test("a pessoa troca a própria senha e o login novo funciona", async ({ page }) => {
    const { staffSenha } = fixtures();
    const senhaNova = `nova-${sufixo()}-JB!`;

    async function entrar(senha: string) {
      await page.goto("/admin/entrar");
      await page.getByLabel("E-mail").fill(staffSenha.email);
      await page.getByLabel(/^Senha/).fill(senha);
      await page.getByRole("button", { name: "Entrar no painel" }).click();
    }

    async function trocarSenha(de: string, para: string) {
      await page.goto("/admin/conta");
      await expect(page.getByRole("heading", { name: "Minha conta", level: 1 })).toBeVisible();

      await page.getByLabel("Senha atual").fill(de);
      await page.getByLabel(/^Nova senha/).fill(para);
      await page.getByLabel("Repetir a nova senha").fill(para);
      await page.getByRole("button", { name: "Trocar a senha" }).click();

      await expect(page.getByText(/Senha alterada/)).toBeVisible({ timeout: 30_000 });
    }

    await entrar(staffSenha.senha);
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/admin\/entrar/);

    // errar a senha atual não troca nada, e diz qual campo está errado
    await page.goto("/admin/conta");
    await page.getByLabel("Senha atual").fill("essa-nao-e-a-senha");
    await page.getByLabel(/^Nova senha/).fill(senhaNova);
    await page.getByLabel("Repetir a nova senha").fill(senhaNova);
    await page.getByRole("button", { name: "Trocar a senha" }).click();
    await expect(page.getByText("A senha atual não confere.")).toBeVisible({ timeout: 30_000 });

    await trocarSenha(staffSenha.senha, senhaNova);

    /* ------------------------------------------- a senha antiga morreu aqui */

    await page.context().clearCookies();
    await entrar(staffSenha.senha);
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/entrar/);

    /* ----------------------------------------------- e a nova vale de verdade */

    await entrar(senhaNova);
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/admin\/entrar/);
    await page.goto("/admin/conta");
    await expect(page.getByText(staffSenha.email).first()).toBeVisible();

    // devolve a senha original: o teste não pode deixar rastro na conta
    await trocarSenha(senhaNova, staffSenha.senha);

    await page.context().clearCookies();
    await entrar(staffSenha.senha);
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/admin\/entrar/);
  });
});
