import { defineConfig, devices } from "@playwright/test";

/**
 * E2E do produto público atual da JB.
 *
 * A plataforma já teve catálogo, carrinho e checkout. Essas rotas foram
 * removidas de propósito e hoje respondem 410. Os cenários antigos continuam
 * no repositório como histórico, mas não podem ser o portão de uma aplicação
 * que não vende mais: esperar 15–45s por elementos de uma loja removida só
 * transforma uma decisão de produto em falso vermelho.
 *
 * Este gate cobre a jornada que existe hoje: anúncio -> landing do equipamento
 * -> diagnóstico -> Jeferson/Jackson, em desktop e mobile, além das garantias
 * de 410 para a superfície comercial que saiu.
 */

const PORTA = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORTA}`;
const HOST_RULES = process.env.HOST_RULES;
const NO_CI = !process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e-assistencia",
  outputDir: "./tests/.saida",
  fullyParallel: false,
  workers: NO_CI ? 2 : 1,
  forbidOnly: !NO_CI,
  retries: NO_CI ? 0 : 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/.relatorio" }]],
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    actionTimeout: 10_000,
    navigationTimeout: 25_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: HOST_RULES ? { args: [`--host-resolver-rules=${HOST_RULES}`] } : undefined,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
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
