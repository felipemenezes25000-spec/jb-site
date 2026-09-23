# Auditoria e redesign do catálogo `/loja` — JB Plataforma

> Documento de trabalho, **não versionado**. Pode apagar quando não servir mais.
> Estado: **implementado e validado** em 10/09/2026. Sem commit, sem deploy.
> A ficha de produto tem documento próprio em `AUDITORIA-PDP.md`.

O componente `Vitrine` serve seis rotas — `/loja`, `/novos`, `/seminovos`,
`/usados`, `/recondicionados` e `/categoria/[slug]` —, então tudo aqui vale
para as seis.

---

## Parte 1 — O que estava errado (medido antes de mexer)

| # | Problema | Medida |
|---|---|---|
| 1 | **Filtros escondidos atrás de um botão, inclusive a 1920px** | categoria, marca, preço, condição, voltagem e disponibilidade só apareciam depois de abrir uma gaveta de tela cheia |
| 2 | **O painel lateral já existia e estava órfão** | `PainelFiltros`, em `filtros-catalogo.tsx`, com `lg:sticky lg:top-24` pronto — nenhuma tela do projeto o importava |
| 3 | **Container de 1440 enquanto o resto da vitrine usa 1600** | a 1920px o catálogo saía 160px mais estreito que a home e a ficha de produto |
| 4 | **Cartão de 569×327 com onze elementos** | etiqueta de condição, comparar, foto, selo de desconto, marca, nome, tabela de 2 specs, preço antigo, preço, parcelamento, disponibilidade **e um botão vermelho sólido de largura inteira** |
| 5 | **Dezesseis retângulos vermelhos por tela** | o "Ver produto" de cada cartão era `bg-jb-500` em 100% da largura |
| 6 | **A grade encolhia quando a janela crescia** | 3 colunas de 305px a 1366 → 4 colunas de **243px** a 1440 |
| 7 | **Atalhos cortados no meio da palavra** | a fileira rola na horizontal e terminava em corte seco: "Todas as m…" |
| 8 | **Nome acessível declarado duas vezes** | o `<select>` de ordenação tinha `aria-label` *e* um `<label>` com `sr-only`, ambos "Ordenar resultados" |

O "Ver produto" era um `<span aria-hidden>` — decoração. Quem leva à ficha é o
link do título, com `after:inset-0` cobrindo o cartão inteiro. Remover não
tirou função nenhuma; foi conferido no QA clicando a 75% da altura do cartão,
bem longe do título.

---

## Parte 2 — O que mudou

| Decisão | Onde |
|---|---|
| **Duas colunas a partir de 1024px**: `PainelFiltros` à esquerda, grade à direita | `vitrine.tsx` — `lg:grid-cols-[17rem_minmax(0,1fr)]`, `xl:grid-cols-[18.5rem_…]` |
| **Botão "Filtros" e gaveta viram só-celular** | `controles-colecao.tsx` — `lg:hidden` nos dois |
| **`max-w-[100rem]`** no shell do catálogo | `vitrine.tsx` |
| **Grade conta o espaço que sobra, não a janela** | `marketplace.module.css` — `repeat(auto-fill, minmax(16.5rem, 1fr))` de 1024px em diante; abaixo disso continua fixo em 2 colunas |
| **Cartão sem CTA** | `card-produto-marketplace.tsx` |
| **`sizes` da foto corrigido** | pedia `24vw` (460px a 1920) para um espaço de 281px |
| **Lateral gruda no token, não em 96px fixos** | `top-[calc(var(--jb-topo)+1rem)]` — `top-24` deixava o título "Filtros" por baixo do cabeçalho de 108px |
| **Máscara de esmaecimento na fileira de atalhos** | corte seco vira "tem mais para o lado"; quando os atalhos cabem, a máscara cai sobre espaço vazio |
| **`aria-label` redundante removido** | o `<label>` com `sr-only` já nomeia o campo |

---

## Parte 3 — Validação

### Grade por largura, depois da mudança

| Largura | Colunas | Cartão | Container | Rolagem H |
|---|---|---|---|---|
| 360 | 1 | 328 | 360 | não |
| 390 | 2 | 173 | 390 | não |
| 430 | 2 | 189 | 430 | não |
| 768 | 2 | 350 | 768 | não |
| 1024 | 2 | 314 | 1024 | não |
| 1280 | 3 | 277 | 1280 | não |
| 1366 | 3 | 305 | 1366 | não |
| 1440 | 3 | 329 | 1440 | não |
| 1600 | 4 | 281 | 1600 | não |
| 1920 | 4 | 281 | **1600** | não |

Monotônico: nenhuma largura de janela maior produz cartão menor dentro da
mesma contagem de colunas. Era isso que quebrava entre 1366 e 1440.

### QA funcional — **18/18** em `/loja`, `/novos`, `/seminovos` e `/categoria/[slug]`; **8/8** nas coleções vazias

Painel lateral visível e botão escondido no desktop; "Filtros" não entra por
baixo do cabeçalho enquanto há curso de `sticky`; filtro da lateral reduz a
lista e entra na URL; "Limpar" devolve a lista inteira; ordenação entra na
URL; **o cartão inteiro leva à ficha** (clique a 75% da altura); nenhum bloco
vermelho grande na grade; console limpo; sem 4xx. No celular: lateral
escondida, botão visível, gaveta abre, **ESC fecha**, grade em 2 colunas, sem
rolagem horizontal.

### Resto

- `tsc --noEmit` limpo · 621 testes unitários passando
- `eslint` 0 erros (9 avisos pré-existentes: `<img>` e `setState` em efeito)
- **axe-core WCAG 2.0/2.1 A e AA: 0 violações** em `/loja` e `/seminovos`, a 390 e 1440
- 12 rotas públicas: 200, sem imagem quebrada, sem 4xx, sem erro de JS
- Altura da página a 1440: **3.928px → 3.452px** com a grade em 4 colunas
- A ficha de produto continua íntegra: QA 21/21, varredura limpa, `responsivo:pdp` de 320 a 2560

---

## Aprendizados que custaram tempo

Três "falhas" do QA eram do próprio QA, não do produto — vale registrar para
não repetir:

1. **Detector de vermelho por canal único.** `rgb(247,248,248)` — o cinza do
   placeholder "Foto em cadastro" — passava num teste que só olhava o canal
   vermelho. Agora exige verde e azul baixos.
2. **Asserção presa a número absoluto.** Rolar "até 1400px" acusava defeito em
   `/seminovos` (3 itens), onde a seção acaba antes disso. A rolagem passou a
   ser relativa ao curso real do `sticky`.
3. **`elementFromPoint` fora da janela devolve `null`.** O clique de teste no
   cartão caía abaixo da dobra e parecia que o cartão não era clicável.

E um do produto que só apareceu por causa disso: em coleção curta a lateral é
mais alta que a grade, preenche a célula do grid e **não gruda** — comportamento
correto do `sticky`, que o teste agora reconhece em vez de reprovar.

---

## O que ficou de fora

- **Favoritar no cartão.** O briefing pede "favoritar/comparar"; hoje só existe
  comparar. Favoritos existem no projeto (`/minha-jb/favoritos` está no rodapé),
  mas ligar o botão ao estado de favorito é trabalho de dado, não de layout —
  e mexe em rota autenticada.
- **`/busca` herdou a grade nova.** Sem lateral, ela agora vai a 5 colunas a
  1600px (antes 4). Conferida: 200, sem erro, sem rolagem horizontal.
- Sem commit, sem push, sem deploy — como pedido.
