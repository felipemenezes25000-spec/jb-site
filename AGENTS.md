# Regras para agentes — JB Plataforma

Antes de alterar o projeto, leia `docs/arquitetura-modular.md`, `docs/decisoes.md`
e `design.md`.

Regras obrigatórias:

- A JB é **single seller**. Não introduza Seller, comissão, split ou payout.
- Preserve Next.js + TypeScript + Prisma/PostgreSQL; não invente nova stack.
- O monólito é modular: UI/Actions coordenam, domínio contém regras reutilizáveis.
- Não aumente `admin-servico.ts`, `admin-catalogo.ts`, `admin-vendas.ts` ou
  `admin-conteudo.ts`; extraia o novo caso de uso.
- Código novo de decisão de compra usa `@/lib/comercio/*`, não `marketplace`.
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
