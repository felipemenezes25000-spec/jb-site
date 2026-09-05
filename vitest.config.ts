import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Testes unitários da lógica pura.
 *
 * Nada aqui sobe banco nem servidor: o que toca o Postgres é testado pela
 * parte pura (`calcularTotais` recebe o objeto do carrinho pronto) ou por um
 * dublê declarado no próprio arquivo de teste.
 *
 * Dois apelidos são necessários para importar módulos escritos para o servidor
 * do Next:
 *
 *   · `server-only` — o pacote real explode fora de um Server Component;
 *     aqui ele vira um módulo vazio, porque a marcação é para o bundler do
 *     Next, não para a lógica que estamos exercitando.
 *   · `@` — o mesmo apelido do tsconfig, para os imports `@/lib/...`.
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^server-only$/,
        replacement: fileURLToPath(new URL("./tests/apoio/server-only.ts", import.meta.url)),
      },
      {
        find: /^@\//,
        replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/`,
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/unitarios/**/*.test.ts"],
    reporters: ["default"],
    clearMocks: true,
  },
});
