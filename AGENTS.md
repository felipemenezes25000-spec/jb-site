<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Regras adicionais — JB Plataforma

Antes de alterar o projeto, leia:

- `docs/site-publico-assistencia.md` — fonte curta de verdade do frontend público atual;
- `docs/arquitetura-modular.md`;
- `docs/decisoes.md`;
- `docs/criterios-de-escopo.md`;
- `design.md`.

Regras obrigatórias:

- O **site público atual é assistência técnica, e só isso**. Não reintroduza catálogo, carrinho, checkout, comparação, frete ou compra dentro de `src/app/(site)`.
- As antigas rotas comerciais respondem `410 Gone` por decisão de produto. Não troque por redirecionamento indiscriminado para a home.
- Modelos/histórico de comércio que ainda existam no banco ou backoffice são legado operacional; a existência deles não autoriza uma nova vitrine pública.
- Se código legado de comércio continuar necessário internamente, a JB permanece **single seller**. Não introduza Seller, comissão, split ou payout.
- Preserve Next.js + TypeScript + Prisma/PostgreSQL; não invente nova stack.
- O monólito é modular: UI/Actions coordenam, domínio contém regras reutilizáveis.
- Não aumente `admin-servico.ts` nem `admin-conteudo.ts`; extraia o novo caso de uso. Os antigos `admin-catalogo.ts` e `admin-vendas.ts` já saíram com a loja.
- Não importe módulos de carrinho, pagamento, frete, catálogo ou marketplace de volta. `scripts/verificar-arquitetura.ts` trata esse retorno como violação arquitetural.
- Capacidade horizontal nova (CRM, ERP, BI, agenda, helpdesk etc.) só entra no core quando passar pelos critérios de `docs/criterios-de-escopo.md`; integrar é preferível a recriar software genérico sem diferencial da JB.
- Dinheiro é inteiro em centavos. Datas persistidas em UTC e exibidas no fuso de São Paulo.
- Autorização é validada no servidor; esconder botão não é controle de acesso.
- Pagamento legado, quando aplicável internamente, só é confirmado por fonte confiável (webhook/reconciliação), nunca pela página de retorno do navegador.
- Não misture falha logística com aprovação financeira.
- Preview deve usar banco próprio. Nunca silencie configuração perigosa.
- Preserve o design system vermelho/branco/grafite e as decisões de `design.md`.
- No site público, triagem não é diagnóstico; não invente prazo, preço, garantia, urgência, avaliação, número de clientes ou resultado.
- Não transforme conteúdo de equipamento em tutorial de reparo. Cuidados públicos ficam limitados a segurança, observação externa e orientação para avaliação técnica.
- Jeferson e Jackson permanecem opções explícitas de WhatsApp nas superfícies de conversão.
- Respeite `prefers-reduced-motion`, acessibilidade por teclado, alvos de toque e os breakpoints definidos no contrato do site público.
- Antes de uma entrega normal: `pnpm arquitetura:verificar`, `pnpm typecheck`, `pnpm test:unit` e a bateria pública de E2E/a11y/responsividade. Se uma rodada tiver instrução explícita para adiar checks, registre isso e não declare a entrega validada antes da execução final.
