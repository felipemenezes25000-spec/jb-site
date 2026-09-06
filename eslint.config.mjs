/* ============================================================================
   ESLint

   Até aqui o projeto não tinha ESLint: nem configuração, nem dependência, nem
   script. O número de 793 erros que circulava vinha de `npx eslint .`, que
   baixa o ESLint na hora e roda sem config nenhuma — medindo o projeto contra
   regras que ninguém escolheu, num parser que não entende TSX. Não era um
   diagnóstico do código; era um diagnóstico da ausência de config.

   Esta é a configuração de verdade: flat config nativa (ESLint 10 +
   eslint-config-next 16, que já exporta array de config), com as regras que o
   próprio Next recomenda para App Router e TypeScript.

   O que está desligado, e por quê — cada linha é uma decisão, não um atalho
   para chegar a zero. Regra desligada sem motivo escrito é dívida disfarçada
   de limpeza.
   ============================================================================ */

import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    /*
     * O que o ESLint não deve nem abrir. `.next` e `node_modules` são gerados;
     * `src/generated` idem, quando existir. Relatório e captura de teste são
     * artefato de execução, não código — e o Playwright grava JS dentro deles.
     */
    ignores: [
      ".next/**",
      "node_modules/**",
      "src/generated/**",
      "tests/.relatorio/**",
      "tests/.saida/**",
      ".shots/**",
      "next-env.d.ts",
    ],
  },

  ...coreWebVitals,
  ...typescript,

  {
    rules: {
      /*
       * `_` como prefixo de "recebo e não uso" é a convenção já usada no
       * código (parâmetro de callback, captura de erro que só vira fallback).
       * Sem isto, a regra pede que se apague o parâmetro — e aí a assinatura
       * deixa de contar o que a função recebe.
       */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    /*
     * Scripts de operação e seed falam com quem está no terminal: `console.log`
     * ali não é sujeira esquecida, é a interface. E eles rodam em Node, fora do
     * bundle do Next.
     */
    files: ["scripts/**/*.{ts,mts,mjs}", "prisma/**/*.ts", "tests/**/*.{ts,mjs}"],
    rules: {
      "no-console": "off",
      "@next/next/no-img-element": "off",
    },
  },

  {
    /* ------------------------------------------------------------------
       As duas regras do compilador React: aviso, não erro — e a razão é
       específica, não comódica.

       `purity` acusa 13 chamadas a `Date.now()` durante o render. Todas as
       treze estão em Server Components que declaram `export const instant =
       false`, ou seja, são request-time por decisão explícita. Perguntar as
       horas ao renderizar uma página que roda a cada requisição é correto:
       é assim que se sabe se uma garantia ainda vale hoje. Não há bug para
       consertar.

       O que há é um estopim. No dia em que essas páginas saírem de
       `instant = false` para Cache Components — a dívida arquitetural que
       ainda está aberta — cada uma dessas chamadas passa a carimbar um
       horário dentro de conteúdo cacheado, e aí vira bug de verdade. Já
       aconteceu uma vez, com `new Date()` vindo do `jwtVerify`.

       `set-state-in-effect` acusa 18 casos do padrão de pós-hidratação: ler
       `localStorage` ou `sessionStorage` num efeito de montagem, porque no
       servidor eles não existem. É legítimo e amplamente usado; o React 19
       prefere `useSyncExternalStore`, e migrar cada um exige decidir o
       estado do servidor caso a caso.

       Erro travaria o portão hoje por 31 pontos que não quebram nada, e a
       saída fácil seria desligar as regras — perdendo a lista. Aviso mantém
       as duas contadas e visíveis: `pnpm lint` fecha em zero erro e pode ser
       gate agora, e estes 31 são a lista de tarefas da migração, com nome e
       linha. Erro novo entra proibido; estes descem sozinhos conforme a
       migração avançar.
       ------------------------------------------------------------------ */
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default config;
