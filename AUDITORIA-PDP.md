# Auditoria e redesign da PDP `/loja/[slug]` — JB Plataforma

> Documento de trabalho, **não versionado**. Pode apagar quando não servir mais.
> Estado: **redesign implementado e validado** em 10/09/2026. Sem commit, sem deploy.

---

## Parte 1 — O que estava errado (medido antes de mexer)

Duas camadas montam a página: `page.tsx` (decisão imediata) e `layout.tsx`
(comparação, avaliações, cross-sell, pós-venda).

| # | Problema | Medida |
|---|---|---|
| 1 | Container mudava de largura no meio da página | 1600px no topo, 1792px da comparação para baixo — 96px de degrau de cada lado a 1920 |
| 2 | Sete `h2` em cinco tamanhos | 22 · 17 · 17 · 17 · 22 · 28 · 30px a 1440 |
| 3 | Especificações, instalação e entrega fechadas no desktop | três gavetas de 73px empilhadas em 1440px de tela |
| 4 | Dois CTAs de mesmo peso | `Comprar agora` 302×52 e `Adicionar ao carrinho` 302×52 |
| 5 | Caixa dentro de caixa | 4 cartões no resumo; cada filho de `BlocoDecisao` com `rounded-xl border bg-white` dentro de seção que já tem `border-t` |
| 6 | Tipografia fora do token | `text-[0.6rem]`, `[0.625rem]`, `[0.6875rem]`, `[0.9375rem]`, `clamp(1.8rem,…,2.55rem)` no `h1` |
| 7 | `FaixaConfianca` descartava props | `certificado` e `temFrete` chegavam e a função nem desestruturava |
| 8 | Grid do topo 45/30/25 | galeria 571 · resumo 376 · compra 352 a 1440 |

O design system em `globals.css` já era coerente. O trabalho não era criar
design system — era **fazer a PDP obedecer ao que já existe**.

---

## Parte 2 — Pesquisa de referências (medida, não impressão)

Sem Refero (assinatura expirada). Dez fichas de produto abertas no navegador
a 1440px e medidas com o mesmo script: largura do container, proporção das
colunas, tamanho e peso do `h1` e do preço, área do CTA primário, quantidade
de CTAs na primeira dobra e forma de apresentar a ficha técnica.

| Referência | Container | Colunas do topo | `h1` | Preço | CTA primário | CTAs 1ª dobra | Ficha técnica |
|---|---|---|---|---|---|---|---|
| Tuttnauer 3870ELV-D | 1200 | hero de 1 coluna | 48px/700 | — | 274×48 | 2 (sólido + contorno) | tabela aberta + nav de seções |
| Dental Cremer | 1166 | 538 / 538 | 24px/600 | 20px/700 | 354×45 verde | **1** | 5 abas |
| Mercado Livre | 1184 | 478 / 340 / ~310 | 22px/600 | 28px/600 | 275×48 azul | 2 (sólido + **o mesmo azul a 15%**) | tabelas abertas |
| B&H Photo | 1350 | `h1` em faixa cheia de 1127, depois 2 colunas | 24px/**400** | 28px/700 | 412×56 verde | **1** | — |
| Sonos Arc Ultra | 1387 | ~900 / 427 | 40px/500 | 32px/500 | 427×59 preto, 100% da coluna | **1** | — |
| Amazon | 1425 | 446 / **630** / 275 | 24px/**400** | — | ~245×48 | 2 (amarelo + laranja) | tabelas abertas |
| Surya Dental | 1244 | 497 / **747** | 24px/500 | 16px/700 | 290×60 verde | **1** | — |
| Newegg | 1365 | 490 / 450 / ~330 | 20px/700 | 14px/700 | — | **1** | 15 tabelas, 44 linhas, em abas |
| Magazine Luiza | 1008 | ~500 / 500 | 20px/**400** | 20px/560 | — | **1** | tabela aberta |
| Apple iPad Pro | 1247 | 919 / ~300 grudada | 48px/600 | — | — | 1 + barra grudada 1425×124 | — |

### Padrões extraídos

1. **Container 1160–1390.** Mediana ~1250. Nenhuma passa de 1425 — e nenhuma
   muda de largura no meio da página.
2. **`h1` pequeno quando é descrição.** 20–24px em 7 das 10, três delas em peso
   regular (400). Só marca de produto próprio com nome curto — Sonos "Arc
   Ultra", Apple, Tuttnauer — usa 40–48px. "Autoclave vertical 18 L — Classe B"
   é descrição, não nome de marca.
3. **O preço ganha por posição e peso, não por tamanho.** Faixa 14–32px,
   mediana ~24px. Onde ele é grande (Sonos 32), o `h1` é maior ainda (40).
4. **Um CTA primário.** Seis das dez têm exatamente um botão sólido na primeira
   dobra. Quem mantém dois **nunca** usa contorno branco de mesma largura e
   altura: o Mercado Livre repete o mesmo azul a 15% de opacidade, a Amazon usa
   dois tons da mesma família.
5. **Ficha técnica nunca vem fechada no desktop — 10 de 10.** As saídas são
   tabela aberta, abas ou seção corrida. Abas não escondem, só realocam. O que
   essas páginas encurtam é a *lista longa dentro* da seção.
6. **Um tamanho só de `h2` por página.** ML 24px, Magalu 22px, Newegg 20px,
   Dental Cremer 18px — cada uma com um número, repetido na página inteira.
7. **A galeria não é a coluna dominante numa ficha técnica.** Amazon 446/630/275,
   Surya 497/747, B&H tira o título das colunas e o joga em faixa cheia.
8. **Três colunas só a partir de ~1180px.** Na faixa de 1000–1250 todas usam
   duas: Magalu 500/500 em 1008, Dental Cremer 538/538 em 1166, Surya em 1244.

---

## Parte 3 — Nova arquitetura

| Decisão | O que mudou |
|---|---|
| **Uma largura** | `layout.tsx` passou de `max-w-[112rem]` para `max-w-[100rem]`, a largura que a home e o resto da vitrine já usam. Quem alinha por 112rem é só o cabeçalho, por decisão própria. |
| **Quinto degrau na escala** | `--text-bloco` (18→22px, 700) em `globals.css`. A escala parava em `title`, feita para faixa de abertura; numa ficha o `h1` já é `title` e todo `h2` precisa vir abaixo dele. |
| **`h1` no token** | `text-title` (22→30px) no lugar do `clamp` de 40px. |
| **Nada de gaveta de seção** | `SECOES_RECOLHIVEIS` eliminado. `BlocoDecisao` tem um desenho só, aberto, em qualquer largura. |
| **Poda dentro da lista** | `FichaTecnica` mostra 12 linhas e oferece o resto sob um clique — cortando **por linha**, não por grupo (quase todo produto tem grupo único; um corte por grupo nunca dispararia). |
| **Hierarquia de CTA** | Primário vermelho sólido 52px · secundário `sutil` 44px · terciário em texto. |
| **Preço** | `text-3xl` (30px) no lugar de 37,6→40,8px. |
| **Filete, não moldura** | `CartaoFicha` e `MOLDURA` perderam borda, raio e fundo. O que separa subblocos é régua e espaço. |
| **Grid 39/33/28** | Três colunas a partir de **1280** (era 1024, onde sobravam 300px para a galeria); duas colunas de 768 a 1279. |
| **Props usadas** | `FaixaConfianca` passou a mostrar "Inspeção registrada por técnico" e "Frete calculado por CEP". |
| **Token de topo** | `--jb-topo` / `--jb-topo-secoes` em `globals.css`. A barra de seções vivia em `top: 72px`, atrás da segunda faixa do cabeçalho (108px) — **invisível no desktop inteiro**. |

---

## Parte 4 — Validação

Medido no navegador, produto `/loja/autoclave-vertical-18l-classe-b`:

| Largura | Colunas | Galeria/Resumo/Compra | Containers | `h1` | `h2` | Gavetas | Rolagem H |
|---|---|---|---|---|---|---|---|
| 360 | 1 | 328 / 328 / 328 | 360 | 22,0 | 18,0 | 0 | não |
| 390 | 1 | 358 / 358 / 358 | 390 | 22,2 | 18,1 | 0 | não |
| 430 | 1 | 390 / 390 / 390 | 430 | 22,6 | 18,2 | 0 | não |
| 768 | 2 | 362 / 328 / 328 | 768 | 25,2 | 19,2 | 0 | não |
| 1024 | 2 | 484 / 438 / 438 | 1024 | 27,2 | 19,9 | 0 | não |
| 1280 | 3 | 445 / 376 / 336 | 1280 | 29,2 | 20,7 | 0 | não |
| 1366 | 3 | 486 / 412 / 344 | 1366 | 29,9 | 20,9 | 0 | não |
| 1440 | 3 | 514 / 435 / 364 | 1440 | 30 | 21,1 | 0 | não |
| 1600 | 3 | 567 / 481 / 404 | 1600 | 30 | 21,6 | 0 | não |
| 1920 | 3 | 567 / 481 / 404 | **1600** | 30 | 22 | 0 | não |
| 2560 | 3 | 567 / 481 / 404 | **1600** | 30 | 22 | 0 | não |

Uma coluna de "Containers" com um valor só por linha é o problema 1 resolvido.

Outras verificações:

- `tsc --noEmit` limpo; `eslint` sem erros (2 avisos pré-existentes, alheios).
- 621 testes unitários passando.
- `pnpm responsivo:pdp` aprovado de 320 a 2560px.
- **axe-core (WCAG 2.0/2.1 A e AA): 0 violações** a 390px e a 1440px. A única
  que apareceu — `scrollable-region-focusable` na faixa de confiança no
  celular — foi corrigida com `tabIndex` na lista que rola.
- Variantes conferidas: unidade única (`motor-de-implante-35ncm`, que renderiza
  `UnidadeFisica`) e produto com frete (`e2e-equipamento-com-frete`, que prova
  o `temFrete` antes descartado). Ambas com um tamanho só de `h2`.
- Home conferida: continua com a escala grande (40–46px). Não foi contaminada.

---

## Parte 5 — Testes

`pnpm vitest run` — 621 passando. `next build` — passa. `pnpm responsivo:pdp` —
aprovado de 320 a 2560px. axe-core WCAG A/AA — 0 violações a 390 e 1440.

Suíte e2e, specs da PDP (`13-marketplace-produto`, `13-cabecalho-pdp`,
`16-pdp-casos-extremos`): **8 passando, 4 vermelhas**.

As quatro vermelhas **são anteriores a este trabalho** — as strings que elas
procuram não existem no código nem no `HEAD`, ou seja, a UI mudou antes e os
testes não acompanharam:

| Spec | Procura | Existe hoje |
|---|---|---|
| `13-cabecalho-pdp:61` | `header[data-jb-home-header-v2]` | não existe em lugar nenhum |
| `13-marketplace-produto:32` | "Personalize a compra" | "Mais opções da compra" |
| `13-marketplace-produto:61` | botão "Aumentar quantidade" exposto | está dentro de "Mais opções da compra" |
| `13-marketplace-produto:251` | "Não encontrou sua dúvida?" | "Ainda ficou alguma dúvida?" |

Uma quinta era minha e foi reescrita: `usa hub técnico progressivo` exigia três
`<details>` recolhidos, que é o contrato que esta revisão derrubou de propósito.
Agora se chama `mostra o miolo técnico aberto` e cobra o contrário — zero
gavetas de seção, conteúdo visível sem clique, um tamanho de `h2` e uma largura
de container.

### Uma regressão encontrada depois da primeira rodada

A tira "Você viu recentemente" usava `container-jb` puro (1440px) no meio de uma
ficha que corre a 1600px — o problema 1 de volta, com 80px de degrau de cada
lado. Ela só renderiza para quem já visitou outros dois produtos, então passou
por toda a validação em navegador limpo sem aparecer. Corrigida com
`larguraInterna`, e agora coberta pelo teste
`a tira de histórico respeita a largura do resto da ficha`, que semeia o
histórico à mão.

---

## O que ainda falta

- **Quatro testes e2e vermelhos por deriva anterior** (tabela acima). Conserto
  pequeno — três strings e um seletor —, mas fora do escopo pedido.
- **Suíte e2e completa não rodou**: só as specs da PDP. Faltam catálogo,
  carrinho, checkout, frete, imagens, legibilidade e admin.
- ~~Camada complementar sem redesign~~ — **feito em 10/09**. A tabela de
  comparação perdeu a moldura `rounded-2xl border bg-white` que a embrulhava
  dentro de uma seção que já tem `border-t`; o painel de pós-venda perdeu um
  nível inteiro de moldura (era caixa dentro de caixa dentro de seção, agora as
  quatro células dividem o fundo do painel e são separadas por filete); as
  fichas de depoimento passaram a usar `placa`, a superfície de catálogo do
  design system, no lugar de um `rounded-2xl border shadow-[…]` reescrito à mão
  com sombra em valor avulso. O cartão do depoimento **fica**: é uma unidade
  fechada com autor e data, como no Mercado Livre e na Amazon — o que saiu foi
  a reinvenção da superfície. O estado vazio virou filete.
  Continua valendo: nada disso renderizou no produto de teste, que não tem
  avaliação publicada.
- ~~A galeria não foi tocada~~ — **feito em 10/09**. Saiu a moldura
  (`rounded-2xl border border-graf-150 bg-white`): nenhuma das dez referências
  emoldura a foto, e ali era uma caixa branca com borda sobre fundo branco ao
  lado de outra caixa. O canto arredondado ficou, porque recorta o degradê que
  apoia o equipamento. O `sizes` estava em `48vw` — pedia 691px para um espaço
  de 514px a 1440 — e passou a descrever as larguras reais das três faixas do
  novo grid; o Next passou a servir 640px no lugar de 1080px. O estado sem foto
  virou `aspect-square`, para a primeira dobra não mudar de altura conforme o
  produto tenha ou não imagem. E trocar de foto passou a ser anunciado por uma
  região `aria-live`, que antes não existia: a imagem trocava sem foco e sem
  aviso nenhum para leitor de tela.
- **Três estados da caixa de compra sem ver rodando**: arquivado, sem estoque e
  só-orçamento não existem no banco local, e `16-pdp-casos-extremos` cobre só
  "produto mínimo".
- **Nenhum produto local passa de 6 especificações**, então a poda de
  `DADOS_VISIVEIS = 12` nunca dispara aqui. Verificada baixando o teto para 2 no
  navegador e restaurada.
- **Oito referências do plano não medidas**: A-dec, RS Online, McMaster-Carr,
  Dyson, Peloton, Wayfair, Adorama (não tentadas) e Grainger, Midmark,
  Home Depot, Best Buy (bloqueadas ou sem URL). As dez medidas concordaram nos
  oito padrões; parei por isso.
- Sem commit, sem push, sem deploy — como pedido.

---

# Segunda rodada — 10/09/2026, tarde

Pedido: pesquisar 15–20 fichas no **Refero MCP**, extrair padrões e redesenhar.

## Refero continua indisponível

`refero_search_screens` e `refero_search_flows` responderam
`NO_SUBSCRIPTION — Your subscription is not active or has expired`. Não é
limite de consulta nem query malformada: é a conta. Enquanto isso não for
renovado em https://refero.design/mcp/upgrade, nenhuma pesquisa no Refero sai
desta máquina.

Fallback: medir fichas reais no navegador, o mesmo método da primeira rodada.

## Referências desta rodada

26 endereços abertos a 1440px com o mesmo roteiro de medição. Seis carregaram
ficha de produto de verdade:

| Referência | Container | `h1` | Miniaturas | O que ela ensina |
|---|---|---|---|---|
| Peloton | 808 | 32/600 | 5, coluna à direita | **barra grudada 1440×72 em `top:72` com título, âncoras e `Add to cart` no mesmo trilho** |
| Herman Miller | 942 | 48/700 | 16, coluna à esquerda | barra fixa 1440×86 com título e âncoras |
| Kabum | 1024 | 20/600 | linha abaixo | **"Vendido e entregue por: KaBuM!" logo abaixo do `h1`**; caixa de compra grudada 320×240; esgotado troca o CTA por "Ver similares" + "Avise-me" |
| Steelcase | 1166 | 32/600 | 2 | ficha técnica em seção corrida |
| Samsung BR | 1440 | 40/700 | 17, coluna | galeria em coluna com 17 miniaturas |
| IKEA | 1440 | 40/700 | linha abaixo | dimensões e montagem antes do preço |

As outras vinte devolveram muro de bot (Grainger "unable to complete your
request", Home Depot "Access Denied", Best Buy `ERR_HTTP2_PROTOCOL_ERROR`,
REI, Wayfair, Zoro, Leroy BR), 404 (Thomann, Dental Speed, Dental Cremer) ou
página de categoria em vez de ficha (Crutchfield, Adorama, Thermo Fisher,
Electrolux BR, Tramontina, Madeira Madeira, Consul BR). Com as dez da primeira
rodada: **16 fichas efetivamente medidas** — abaixo das 15–20 pedidas *por
rodada*, e vale dizer em voz alta que boa parte do B2B americano só abre para
navegador com sessão.

## Padrão novo que a primeira rodada não tinha visto

**Preço e CTA não desaparecem depois da primeira dobra.** Peloton, Herman
Miller e Kabum resolvem de formas diferentes, mas nenhuma delas deixa a página
sem caminho de compra — e nenhuma abre uma *segunda* faixa grudada para isso.

## O que estava errado (medido)

| # | Problema | Medida |
|---|---|---|
| 1 | Desktop sem preço e sem CTA depois da primeira dobra | rolando a 45% da página, os únicos elementos grudados a 1366/1440/1920 eram o cabeçalho (108px) e a barra de seções (50px). ~5.400px de ficha sem botão. O celular já tinha `BarraCompraMobile`. |
| 2 | Nenhuma informação de vendedor | a palavra "JB" aparecia na primeira dobra só dentro de "Assistência técnica própria", na faixa de confiança |
| 3 | Cross-sell em duas seções de página inteira | cada uma com chip de 40px + título + subtítulo, "Seleção JB" órfão à direita e o mesmo rodapé de confiança repetido; com 1 acessório, cartão de 332×540 e ~1.000px vazios ao lado |
| 4 | Celular: tabela antes da foto | a 390px, `h1` → resumo → 4 linhas de características → gaveta de identificação → **só então a galeria**, em 700px de rolagem; preço a ~1.100px |
| 5 | `UnidadeFisica` fora da largura da página | a 1920, "Esta unidade" media 1440 enquanto topo, ficha e comparação mediam 1600 — 80px de degrau de cada lado, só nas fichas com unidade |

## O que mudou

| Decisão | Onde |
|---|---|
| **Preço + CTA dentro da barra de seções**, aparecendo quando a caixa de compra sai de vista | `navegacao-do-produto.tsx` — mesmo `IntersectionObserver` que a barra do celular já usava, agora num hook compartilhado. Zero pixel a mais de altura: a barra continua com 50px. |
| **`VendidoPelaJB`** no pé da caixa de compra | componente novo. Vendedor, assistência própria, ano e praça. Filete e texto, sem cartão. |
| **Cross-sell numa seção só** | `cross-sell-intencional.tsx` reescrito: um cabeçalho, um rodapé, e o que separa acessório de complemento é a etiqueta do item. Cartão vertical virou linha (miniatura 72px + texto), que enche a largura com 1, 2, 3 ou 6 itens. |
| **`.detalhes` como slot próprio do grid** | `topo-marketplace.tsx` + `produto-marketplace.module.css`. Celular: identidade → foto → compra → detalhes. Desktop: volta para baixo do resumo, na coluna do meio. |
| **`grid-template-rows` com faixa flexível no fim** | galeria e caixa atravessam duas faixas; com `auto` em todas, o navegador distribuía a altura delas na faixa do resumo e abria 215px de vão antes das características. Com `minmax(0, 1fr)` na última, a sobra cai toda lá. |
| **`UnidadeFisica` a 100rem** | `classNameInterno="max-w-[100rem]"` |

## Validação

Varredura de **5 fichas × 6 larguras** (320, 390, 768, 1024, 1440, 1920) —
autoclave, motor de implante (unidade única), autoclave 12 L revisada
(seminovo), equipamento de teste com frete (sem foto) e demo com adicionais:

- uma largura de container por página, em todas as 30 combinações;
- um tamanho de `h2` por página, em todas as 30;
- zero rolagem horizontal; zero erro de JavaScript;
- "Vendido e entregue por" presente em todas;
- foto antes da caixa de compra em todas as larguras de celular.

QA funcional, **21 de 21**: barra escondida no topo e visível ao rolar, altura
de 50px mantida, CTA leva à caixa, galeria avança, miniatura seleciona, zoom
abre e ESC fecha, CEP responde (`sob consulta` na autoclave, `R$ 89,90 · 5
dias` no produto com frete), adiciona ao carrinho, âncora não some atrás do
cabeçalho, foco visível, console limpo, sem requisição 4xx; no celular a ordem
`h1 → galeria → compra → detalhes`, foto a 314px, barra inferior só depois da
caixa, folga de 69px no corpo, alvo de 48px e swipe trocando a foto.

- `tsc --noEmit` limpo; `eslint` 0 erros (2 avisos pré-existentes no escopo da
  PDP: `<img>` no `opengraph-image` e `setState` em efeito no `entrega-por-cep`).
- 621 testes unitários passando.
- `pnpm responsivo:pdp` aprovado de 320 a 2560px.
- **axe-core (WCAG 2.0/2.1 A e AA): 0 violações** a 390px e a 1440px.
- Estados conferidos rodando pela primeira vez: **sem estoque** (CTA vira
  "Solicitar orçamento", bloco "Ver alternativas"), **só orçamento** e
  **arquivado** ("Este produto saiu de linha"). Em todos, `VendidoPelaJB`
  continua visível — é onde o cliente mais precisa saber com quem falar.
- Altura da ficha a 1440: **6.289px → 5.471px** (−13%), mesma informação.

## Dados de ensaio no banco LOCAL

Todo produto do banco local tem **1 foto e 0 relações**, então galeria com
miniaturas e cross-sell nunca apareciam. Para ver esses caminhos rodando,
`scripts/_ensaio.mts` pendurou 3 fotos extras e 4 relações na autoclave —
**só em `localhost:5433`, nunca em preview ou produção**.

    npx tsx scripts/_ensaio.mts --limpar   # desfaz

As fotos extras são de outros produtos do catálogo demo: servem para provar o
componente, não para publicar.

## Ferramentas deixadas para trás (podem apagar)

`scripts/_ensaio.mts`, `_estados.mts`, `_qa-pdp.mjs`, `_varredura.mjs`,
`_axe-pdp.mjs`. Prefixo `_` para não se confundirem com os scripts de verdade.

## O que ficou de fora

- **1024–1279px**: a coluna da galeria termina em ~640px enquanto a coluna de
  texto vai a ~1.140px, deixando ~500px de branco à esquerda. Já era assim
  antes; para consertar seria preciso que as duas colunas fluíssem
  independentemente, que é masonry, não grid.
- **Container de 1600px**: nenhuma das 16 referências passa de 1440. A ficha
  usa 1600 porque a home e o resto da vitrine usam — mudar só a ficha
  recriaria o degrau que a primeira rodada consertou. É decisão de vitrine
  inteira, não de PDP.
- Sem commit, sem push, sem deploy — como pedido.

## Aviso: a árvore de trabalho estava sendo editada por outra sessão

Durante esta rodada, arquivos que **não** foram tocados aqui mudaram sozinhos:
`galeria-produto.tsx` (13:00), `comparacao-rapida.tsx` (12:59), o `layout.tsx`
da ficha (12:59) e `tests/e2e/13-marketplace-produto.spec.ts` (12:43) — outra
sessão do Claude trabalha no mesmo diretório.

Consequências práticas:

- A galeria perdeu a moldura branca e ganhou `sizes` corrigido **por essa outra
  sessão**, não por esta. As capturas feitas depois das 13:00 já mostram esse
  desenho.
- As medições e os portões desta rodada rodaram todos depois das 13:08, então
  descrevem o **estado combinado** das duas sessões — não só o desta.
- As mudanças desta sessão foram conferidas uma a uma e continuam íntegras.

## e2e: 4 falhas, todas anteriores a esta rodada

`13-cabecalho-pdp` + `13-marketplace-produto` + `16-pdp-casos-extremos` +
`14-imagens-produto`: **25 de 29 passaram**. As quatro que falham cobram
textos que **já não existiam no `HEAD`**, antes de qualquer trabalho de hoje:

| Spec | Cobra | Está no código |
|---|---|---|
| `13-marketplace-produto:32` e `:61` | `Personalize a compra` | `Mais opções da compra` (assim já no `HEAD`) |
| `13-marketplace-produto:251` | `Não encontrou sua dúvida?` | `Ainda ficou alguma dúvida?` (assim já no `HEAD`) |
| `13-cabecalho-pdp:61` | `#busca-home-flagship` na Home | não existe no `HEAD` |

Prova: `git show HEAD:src/components/loja/caixa-compra.tsx` já dizia "Mais
opções da compra"; `git show HEAD:src/components/loja/produto/perguntar.tsx` já
dizia "Ainda ficou alguma dúvida?"; `git grep busca-home-flagship HEAD` não
retorna nada. Não foram corrigidas aqui de propósito: mexer em asserção de
teste para casar com o código pode esconder regressão, e a decisão é de quem
sabe qual dos dois textos é o certo.

---

# Terceira rodada — pedidos avulsos, 10/09/2026

## 1. Ticker das marcas de volta

`MarcasCarousel` tinha virado grade estática no commit `62b1fea` (10/09 10:19)
— o componente continuava com nome de carrossel e não rolava mais. Restaurado
com `git restore --source=62b1fea^`, sem reescrita.

Conferido rodando: trilho de 5.514px, `jb-marcas-ticker` de 60s em `running`,
transform andando de −83px para −153px em 1,5s, 20 cartões, pausa no hover e
`animation: none` sob `prefers-reduced-motion`.

**Correção de uma leitura minha:** cheguei a medir os dois tickers como
"parados". Era o painel do navegador com o rAF congelado — a home ficava em
717px de altura, com um ancestral em `display:none`. Medido por Playwright, com
a home nos 6.975px reais, os dois andam.

## 2. Faixa do cabeçalho: um recado, parado

A faixa vermelha do topo voltou a ser cinco recados em rolagem no commit
`3b8d963` (10/09 11:32). O trilho corre por baixo dos dois blocos fixos das
pontas — horário à esquerda, telefone e WhatsApp à direita — e o texto entra e
sai **cortado no meio da palavra**: a 1600px lê-se "…mentos, assistência e
pós-venda no mesmo relacionamento." de um lado e "Assistência técnica p…" do
outro. É exatamente o defeito que a auditoria de 08/09 tinha descrito ao
remover a rolagem na primeira vez.

Consertado no lugar, sem reverter as 799 linhas do commit: a faixa mostra uma
frase inteira, centralizada, e as outras continuam no `sr-only`. Máscara de
fade foi descartada — troca corte seco por corte esmaecido e continua ilegível
na borda.

Efeito colateral medido: no celular a faixa ocupa 36px, então a caixa de compra
desceu de 768 para 804px — fora de uma janela de 780. A barra inferior de
compra passa a aparecer já no topo, que é o comportamento certo (preço e CTA
sempre alcançáveis). Quem estava errado era a asserção do QA, que amarrava na
posição; agora ela rola a caixa para dentro da janela e cobra que a barra suma.

## 3. Imagens do site antigo removidas

**90 arquivos, 8,69 MB.**

| O quê | Arquivos | Peso |
|---|---|---|
| `public/images/online` — fotos de amostra do Windows (Koala, Penguins, Jellyfish, Tulips, Lighthouse, Desert, Chrysanthemum, Hydrangeas), sem vínculo | 16 | 5,64 MB |
| `public/images/prettyPhoto/**` — assets do lightbox jQuery do site antigo | 38 | 0,07 MB |
| `public/images/*` — chrome do site antigo (bg_topo, bg_planta, ícones de Facebook/Twitter/Skype/Google+/Pinterest, Thumbs.db) | 17 | 0,46 MB |
| `public/images/catalogo-ficticio` — fotos de produto fictício | 6 | 0,06 MB |
| `public/images/next-step` | 1 | 0,01 MB |
| `public/images/online` — as 12 vinculadas (Torre Eiffel, prédios de banco de imagem, "contact_us_final", "fanpage") | 12 | 2,45 MB |

Os 78 primeiros não eram citados por nenhum arquivo de `src`, `prisma`,
`scripts`, `tests` ou `next.config.ts` — conferido um a um antes de apagar, e
todos rastreados pelo git, então a remoção é reversível.

Os 12 últimos estavam pendurados em conteúdo, e os registros foram junto para
não sobrar imagem quebrada: **5 slides** (3 em rascunho, 2 publicados), **3
seções da home** do tipo `chamada_legado` (todas em rascunho), **2 imagens** e
**1 capa** da página `/empresa`.

Conferido depois: `/`, `/empresa`, `/loja`, `/sobre`, `/estrutura`,
`/contato`, `/seminovos` e a ficha de produto respondem 200, com **zero imagem
quebrada, zero requisição 4xx e zero erro de JavaScript**.

> **Isso foi só no banco LOCAL.** Preview e produção têm bancos próprios (Neon)
> e continuam com as mesmas 12 mídias e o mesmo conteúdo legado apontando para
> elas. Os arquivos apagados de `public/` vão junto no próximo deploy; as
> linhas de banco, não — precisam do mesmo procedimento lá.

## Portões depois de tudo

- `tsc --noEmit` limpo · 621 testes unitários passando
- QA funcional da PDP: **21/21**
- Varredura 5 fichas × 6 larguras: **limpa**
- `responsivo:pdp`: aprovado de 320 a 2560px
- axe-core WCAG 2.0/2.1 A e AA: **0 violações** a 390 e 1440
- 8 rotas públicas: 200, sem imagem quebrada, sem 4xx, sem erro de JS
- Sem commit, sem push, sem deploy.
