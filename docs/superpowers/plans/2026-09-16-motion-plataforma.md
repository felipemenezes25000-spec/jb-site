# Motion da plataforma JB — Implementation Plan

**Goal:** tornar produto, apresentação da home e processo técnico mais visuais, mantendo compra e leitura estáveis.
**Architecture:** componentes locais de apresentação, alimentados pelo cadastro e pela ficha canônica. Sem alteração de banco, regras de venda ou dependências.
**Tech Stack:** Next.js 16.3.4, React 19, TypeScript, CSS Modules/SVG e Motion já instalado.
**Spec:** direção apresentada na conversa e aprovada pelo usuário em 16/09/2026 com “faça”.

## Restrições

- Trabalhar na branch `plataforma`; não alterar `main` ou produção.
- Paleta vermelho/branco/grafite; um foco de movimento por composição.
- Valores da ficha canônica, sem inferir dimensões, conexões ou componentes internos.
- Sem vídeos ou modelos 3D inventados; usar a mídia existente.
- Movimento curto e finito, respeitando movimento reduzido e impressão.
- Toque, teclado, estado selecionado e foco visível em todos os controles.

## Execução

- [ ] Produto: criar `lib/comercio/exploracao-produto.ts`, com testes de ausência de dados e dimensões válidas; apresentar foto, desenho dimensional e instalação em `components/loja/produto/exploracao-produto.tsx` e CSS local. Integrar na galeria existente da página de produto. Manter ficha completa e preço/compra.
- [ ] Home: coreografar imagem, sombra e traço no `hero-vitrine.tsx`/CSS; pausa explícita e suspensão do rodízio fora da tela/aba oculta/movimento reduzido.
- [ ] Bancada: capítulos selecionáveis com foto existente e grafismo de processo em componente local; preservar textos reais.
- [ ] Comparador: entrada, remoção e reorganização dos itens da barra, preservando persistência e limite de três produtos.
- [ ] Verificar ausência de dados, toque, teclado, movimento reduzido, troca de capítulos e controles da galeria em testes de navegador. Inspecionar home e ficha em desktop e 390px.
- [ ] Executar `pnpm typecheck`, `pnpm test:unit`, `pnpm arquitetura:verificar`, lint dos arquivos alterados e build; atualizar `design.md` com o comportamento final.
