<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras adicionais — JB Plataforma

Antes de alterar o projeto, leia `docs/arquitetura-modular.md`, `docs/decisoes.md`,
`docs/criterios-de-escopo.md` e `design.md`.

Regras obrigatórias:

- A JB é **single seller**. Não introduza Seller, comissão, split ou payout.
- Preserve Next.js + TypeScript + Prisma/PostgreSQL; não invente nova stack.
- O monólito é modular: UI/Actions coordenam, domínio contém regras reutilizáveis.
- Não aumente `admin-servico.ts`, `admin-catalogo.ts`, `admin-vendas.ts` ou
  `admin-conteudo.ts`; extraia o novo caso de uso.
- Código novo de decisão de compra usa `@/lib/comercio/*`, não `marketplace`.
- Capacidade horizontal nova (CRM, ERP, BI, agenda, helpdesk etc.) só entra no
  core quando passar pelos critérios de `docs/criterios-de-escopo.md`; integrar
  é preferível a recriar software genérico sem diferencial da JB.
- Dinheiro é inteiro em centavos. Datas persistidas em UTC e exibidas no fuso de
  São Paulo.
- Autorização é validada no servidor; esconder botão não é controle de acesso.
- Pagamento só é confirmado por fonte confiável (webhook/reconciliação), nunca
  pela página de retorno do navegador.
- Não misture falha logística com aprovação financeira.
- Preview deve usar banco próprio. Nunca silencie configuração perigosa.
- Preserve o design system vermelho/branco/grafite e as decisões de `design.md`.
- Antes de entregar: `pnpm typecheck`, `pnpm test:unit` e
  `pnpm arquitetura:verificar`.
