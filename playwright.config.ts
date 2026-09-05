import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta contra o Next em modo desenvolvimento.
 *
 * O que este arquivo decide:
 *
 *  · o servidor sobe sozinho (`webServer`) e é reaproveitado se já estiver de
 *    pé — rodar a suíte com `pnpm dev` aberto não derruba nada;
 *  · a semeadura acontece uma vez, em `tests/e2e/preparar.ts`, antes de
 *    qualquer teste. Ela garante o produto de teste, o cupom e o usuário da
 *    equipe com senha conhecida — sem isso metade dos fluxos dependeria de o
 *    banco estar num estado específico;
 *  · os testes rodam em série (`workers: 1`). Vários deles compram do mesmo
 *    produto, e estoque é estado global: em paralelo um roubaria a unidade do
 *    outro e a falha não diria nada sobre a aplicação.
 *
 * `HOST_RULES` é herdado do script artesanal que esta suíte substituiu: ele
 * permite apontar um domínio para um IP antes de o DNS propagar.
 *
 *   HOST_RULES="MAP www.exemplo.com.br 76.76.21.241" pnpm e2e
 */

// Porta própria de propósito: a 3000 costuma estar ocupada por outro projeto,
// e `reuseExistingServer` apontaria a suíte para o site errado sem avisar.
const PORTA = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORTA}`;
const HOST_RULES = process.env.HOST_RULES;
const NO_CI = !process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/preparar.ts",
  outputDir: "./tests/.saida",

  // estoque e sessão são estado compartilhado: paralelismo aqui produz falha
  // que não corresponde a defeito nenhum
  fullyParallel: false,
  workers: 1,

  forbidOnly: !NO_CI,
  retries: NO_CI ? 0 : 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  // A lista dá o andamento no terminal; o relatório em HTML guarda o traço e a
  // captura de quem falhou, e é aberto sob demanda com `pnpm e2e:relatorio`.
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/.relatorio" }]],

  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: HOST_RULES ? { args: [`--host-resolver-rules=${HOST_RULES}`] } : undefined,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next dev --port ${PORTA}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
