# Design system — JB Soluções Odontológicas

Referência da linguagem visual da plataforma. O que está aqui foi lido do
código, não de memória: a fonte da verdade é `src/app/globals.css`, e cada
número abaixo sai de lá, de `grep` sobre `src/` ou de medição no navegador.

Estado: **15/09/2026**, branch `plataforma`, commit `eb8bed2`.

`globals.css` tem 1.164 linhas (35,9 kB) e divide o escopo global com
`cabecalho.css` (16,9 kB) e `footer-alignment.css` (1,6 kB) — três folhas, onde
já foram oito.

> **O que mudou desde a revisão de 11/09.** Oitenta commits, e quatro deles
> mexeram no sistema: a camada de identidade Lumina entrou (§ 3.6 e § 7), as
> quatro folhas de remendo do cabeçalho viraram uma (§ 10), a loja ganhou caixa
> própria com `container-loja` (§ 4.1) e a ficha de produto voltou para a escala
> única de `h2`. Este documento estava descrevendo o sistema de antes disso em
> cinco pontos; os cinco estão corrigidos abaixo.

---

## 1. O que a plataforma é

Uma loja de equipamento odontológico **com um vendedor só** — a JB — mais a
assistência técnica da mesma empresa. Não é um marketplace: não há vendedores
concorrentes, reputação de terceiro nem disputa. Isso muda a régua: o que
diferencia a plataforma não é sortimento, é o laço entre a compra e o
pós-venda. A ficha de produto termina no prontuário da Área da Clínica, e é
esse laço que o desenho precisa deixar visível.

> **Resolvido em 11/09/2026.** `header-product.css` injetava
> `content: "MARKETPLACE\A ODONTOLÓGICO"` ao lado da logo em toda página de
> produto larga — errado de fato, e invisível para leitor de tela e para busca
> porque vivia num `::after`. O arquivo inteiro deixou de existir em 12/09
> (§ 10).

---

## 2. Cor

### A paleta nasce da logo, amostrada pixel a pixel

Vermelho vivo `#D80008`–`#E80810`, vermelho profundo `#B80000`, grafite
`#606870`, prata `#808890`, branco `#F8F8F8`.

**Qualquer briefing que peça "verde JB" está errado.** A marca é vermelha:
`--color-jb-500: #e0141b`.

### A regra do vermelho

Interface predominantemente clara. **Vermelho é sinal — CTA, estado ativo,
marca — nunca preenchimento de fundo em área grande.** Uma faixa vermelha
inteira transforma sinal em papel de parede e apaga o próprio CTA.

| Degrau | Valor | Papel |
|---|---|---|
| `jb-50` | `#fff1f1` | fundo de estado selecionado, muito leve |
| `jb-500` | `#e0141b` | **a marca**; CTA primário, item ativo, foco |
| `jb-600` | `#c40e15` | hover do CTA, `sobretitulo` |
| `jb-700` | `#a5090c` | link sobre branco, ênfase dentro do título |

A rampa completa vai de `jb-50` a `jb-950`. Os quatro degraus acima são os que o
sistema usa por decisão; os outros existem para composição pontual.

> Este é o erro que já custou uma refação inteira: o cartão da vitrine era um
> retângulo vermelho de largura cheia, nove por página na home e dezesseis por
> tela no catálogo. **Vermelho repetido dezesseis vezes deixa de apontar para
> coisa nenhuma.** Hoje o convite é contorno, e o vermelho fica no ícone do
> carrinho.

### Grafite: onde cada degrau pode e não pode ser usado

Esta é a parte do sistema com mais armadilha, e cada degrau carrega a razão
escrita ao lado no CSS.

| Degrau | Valor | Contraste | Uso |
|---|---|---|---|
| `graf-200` | `#dddfe2` | — | divisor, moldura decorativa. É a cor de borda padrão de **todo** elemento (`@layer base { * { border-color } }`) |
| `graf-300` | `#c2c6cb` | 1,72:1 | divisor; **nunca texto, nunca borda de controle** |
| `graf-400` | `#9ba1a8` | 2,61:1 | ícone decorativo; **nunca texto, nunca borda de controle** |
| `graf-450` | `#868c94` | **3,39:1** sobre branco | **borda de campo, seletor, área de texto, marcador, opção** — a WCAG 1.4.11 pede 3:1 para o contorno que identifica um componente |
| `graf-500` | `#666d76` | **4,97:1** | o cinza do texto secundário; cumpre AA sobre branco, `graf-50` e `graf-100` |
| `graf-950` | `#1a1c1e` | — | título e texto forte |

Os três erros que essa tabela evita, e que já aconteceram neste projeto:

- **`graf-400` como texto.** Dá 2,6:1. Aconteceu no `<kbd>` do atalho de busca
  da Área da Clínica.
- **`graf-300`/`graf-400` como borda de campo.** Reprovam 1.4.11. `graf-450`
  existe exatamente para isso e continua leve o bastante para não pesar o
  formulário.
- **`graf-150`, que nunca existiu.** `border-graf-150` apareceu **28 vezes** —
  checkout, carrinho, caixa de compra, busca. O Tailwind não gera regra para
  token inexistente: a borda caía silenciosamente na regra base (`graf-200`) e
  ninguém via. Trocado por `border-hairline`, que é o token real para filete.
  **Classe que nomeia token fora da paleta não avisa; ela só não pinta.**

### A regra do texto preto na loja pública

Nas cascas marcadas com `data-jb-publico="true"` — `(vitrine)`, `(loja)`,
`(acesso)` e `(checkout)` — o texto secundário **não usa cinza**:

```css
[data-jb-publico="true"] :where(.text-graf-500, .text-graf-600, .text-graf-700) {
  color: var(--color-graf-950);
}
```

A regra alcança também `.texto-suave`, `.prose-jb` e `.etiqueta`, e recua o
preço anterior (`.line-through`) para `graf-700`.

**Ela não alcança CSS Module nem utilidade que pinta por conta própria.** A
lista de utilidades dentro do seletor é escrita à mão, e já foi esquecida três
vezes — duas com CSS Module e uma com `.etiqueta`, que era o único cinza da loja
pública, 26 nós na home. **Utilidade nova que pinta texto na loja pública
precisa entrar nessa lista.**

> Tensão conhecida do sistema: existe uma rampa de cinza com contraste
> calculado **e** um override global que a anula na loja pública. As duas
> decisões são defensáveis; juntas, brigam. Fora da loja — painel e Área da
> Clínica — a rampa vale integralmente.

Sobram cinco CSS Module no projeto, e neles o cinza que restou é legítimo: em
`hero-vitrine.module.css` está num `svg` decorativo e num `::placeholder`, e em
`area-clinica.module.css` e `casca.module.css` a rampa vale por inteiro porque
não são loja pública.

### Estados

| Família | `-50` | `-500` | `-700` |
|---|---|---|---|
| `ok` | `#ecfdf5` | `#10b981` | `#047857` |
| `warn` | `#fffbeb` | `#f59e0b` | `#b45309` |
| `info` | `#eff6ff` | `#3b82f6` | `#1d4ed8` |

Regra prática: **`-500` é grafismo, `-700` é texto.** Branco sobre `ok-500` dá
2,54:1 e reprova a 1.4.11 quando o grafismo comunica estado; sobre `ok-700` dá
5,48:1.

### Dois tons escuros que não são grafite

| Token | Valor | Uso |
|---|---|---|
| `--color-chrome` | `#121315` | faixa preta pontual, **nunca a moldura do site** |
| `--color-hairline` | `#dcdde1` | filete claro de 1px: o divisor entre cartões da vitrine |

---

## 3. Tipografia

### 3.1 Famílias

| Token | Fonte | Uso |
|---|---|---|
| `--font-sans` | Manrope | corpo, rótulo, número — tudo que não é título |
| `--font-display` | **Bricolage Grotesque** | `h1`, `h2` e `h3`, por `@layer base` |
| `--font-mono` | JetBrains Mono | SKU, código de pedido, nº de série, `etiqueta` |

O título ganhou desenho próprio em 11/09/2026. Até então título e corpo eram a
mesma Manrope, e a hierarquia se apoiava só em tamanho e peso. **`h4` para baixo
continua em Manrope**: são rótulos de bloco dentro de cartão, e ali a fonte de
display vira ruído. Texto corrido também — a JB tem ficha técnica para ler.

A base aplica nos três primeiros níveis: `font-family: var(--font-display)`,
peso 800, `letter-spacing: -0.032em`, `text-wrap: balance`, cor `graf-950`.

### 3.2 A escala

Cinco degraus grandes, cada um com entrelinha, espaçamento e peso embutidos —
pedir `text-hero` entrega o título afinado. A redução no celular é
proporcional, nunca "encolhe para caber".

| Token | Celular (360px) | Desktop | Peso | Papel | Em uso |
|---|---|---|---|---|---|
| `text-hero` | 40px | 68px (≥1280) | 800 | manchete de abertura | **2** |
| `text-display` | 32px | 48px (≥1440) | 800 | abertura de página | 21 |
| `text-section` | 31px | 44px (≥1440) | 800 | título de faixa | **4** |
| `text-title` | 22px | 30px (≥1440) | 800 | `h1` de ficha de produto | 43 |
| `text-bloco` | 18px | 22px | 700 | `h2` de seção **dentro** de uma página | 7 |

O piso de `text-section` subiu de 1,75 para 1,9375rem e o peso de 700 para 800
quando a Bricolage entrou: num título de seção ela pede mais corpo que a Manrope
para ter a mesma presença.

`text-bloco` é o degrau que faltava. Sem ele a ficha de produto inventava um
tamanho por seção e terminava com sete `h2` em cinco tamanhos.

> **O topo da escala está perdendo para valor avulso, e isto é medido.**
> `text-hero` tem **2 usos** e `text-section` **4**, contra **17
> `text-[clamp(...)]` escritos à mão em 14 grafias distintas**, cobrindo
> exatamente a mesma faixa — de `clamp(1.5rem,1.2rem+1.1vw,2rem)` a
> `clamp(2.4rem,6.2vw,5rem)`. A manchete da home é um deles: usa
> `fonte-display` + clamp até **80px**, acima do teto de 68px do próprio
> `text-hero`. A rodada de 12/09 convergiu o texto pequeno para a escala; o
> texto grande andou na direção oposta, e ninguém mediu. Ver § 10.

### 3.3 Os dois degraus abaixo de `text-base`

São os tamanhos **mais usados do projeto inteiro** e não tinham nome. A escala
nativa do Tailwind pula de 14px (`text-sm`) para 16px (`text-base`), e é entre
eles que o texto de apoio da JB vive.

| Token | Valor | Ocorrências quando foi nomeado |
|---|---|---|
| `text-apoio` | `0.8125rem` = 13px | 325 |
| `text-corpo` | `0.9375rem` = 15px | 148 |

São tokens de **tamanho puro**, de propósito. Existe `@utility texto-apoio`,
que traz o par tamanho + `line-height: 1.55` — trocar os 325 usos por ela
mudaria a entrelinha em todo lugar que já traz um `leading-*` próprio, que é a
maioria.

### 3.4 A armadilha do `tailwind-merge` — leia antes de criar um degrau

`tailwind-merge` **não conhece tamanhos customizados**. Ele os classifica como
cor e os descarta quando a classe também traz `text-<cor>`:

```tsx
cn("text-bloco", "text-graf-950")   // sem registro: text-bloco é jogado fora
```

Todo degrau novo precisa entrar em `src/lib/utils.ts`, onde a lista hoje está
completa:

```ts
{ text: ["hero", "display", "section", "title", "bloco", "apoio", "corpo"] }
```

A lista parou em `title` uma vez, e `bloco` ficou meses sendo descartado em
silêncio. O sintoma é sutil: o texto cai para os 16px herdados e ninguém vê.

### 3.5 Utilidades de papel

| Utilidade | O que é | Em uso |
|---|---|---|
| `fonte-display` | a fonte de título com peso 800, `-0.035em`, entrelinha 1.02 — para quem **não** é `h1`–`h3` | 17 |
| `manchete` | peso 800, entrelinha 1.08, `-0.03em`. Sem caixa alta | 5 |
| `numero` | 800, `tabular-nums`, `-0.02em`. Preço, parcela, contagem | 3 |
| `texto-guia` | parágrafo de abertura, 17→19px, entrelinha 1.65 | 14 |
| `texto-apoio` | 13px + entrelinha 1.55 | 42 |
| `texto-suave` / `texto-forte` | cor secundária / forte, com inversão automática em `.on-dark` | 16 / 55 |
| `tabular` | só `tabular-nums` | 263 |
| `line-2` / `line-3` | corte em N linhas | 18 / 5 |
| `label-mono` | mono 12px, `0.04em`, tabular | 72 |

### 3.6 Três rótulos em caixa alta, e quando usar cada um

A camada Lumina trouxe o terceiro. Os três coexistem e **não** são
intercambiáveis:

| Utilidade | Família | Tamanho | Peso | Tracking | Cor | Em uso |
|---|---|---|---|---|---|---|
| `micro` | sans | 12px | 700 | `0.08em` | herda | 77 |
| `sobretitulo` | sans | 13px | 700 | `0.08em` | `jb-600` | 14 |
| `etiqueta` | **mono** | 12px | — | `0.14em` | `graf-500` | 7 |

- `sobretitulo` é o degrau **acima do título** de uma faixa, e por isso carrega
  a cor da marca.
- `micro` é rótulo dentro de cartão, sem cor própria.
- `etiqueta` é o tique tipográfico do desenho Lumina: mono espaçada em
  "EM DESTAQUE", "A PARTIR DE", contagem de itens do cartão de categoria.

Duas notas que evitam retrabalho:

1. **`etiqueta` mede 12px aqui e 11px no protótipo.** Esta plataforma tem
   portão que reprova texto informativo abaixo de 12px, e rótulo em caixa alta
   é texto informativo. Não baixe.
2. **Entrelinha de caixa alta nunca é 1.** Em `micro` ela é 1.3 de propósito: o
   acento da maiúscula sobe acima da caixa do em, e qualquer ancestral que role
   na horizontal o decepa.

Há ainda um `.sobretitulo` em `hero-vitrine.module.css` com **outros valores**
(12px, peso 800, `0.11em`, `jb-700`). Ele não chega à tela — ver § 10.

### 3.7 `manchete` desliga a fonte de título

`@utility manchete` declara `font-family: var(--font-sans)`, e utilidade vence
`@layer base` na ordem de camadas do Tailwind. Nos **cinco** lugares onde um
`h1`/`h2` usa `manchete` — checkout, escolher entrega, carrinho, nome do produto
na ficha e a faixa de marcas — **a Bricolage não chega à tela**: aquele título
sai em Manrope enquanto todo outro título da mesma página sai em Bricolage.

`manchete` é anterior à Bricolage e sobreviveu à entrada dela sem ser revista.
É decisão de desenho, não defeito de código: ou ela deixa de fixar família e
passa a ser só peso e métrica, ou esses cinco títulos são de outra família de
propósito. Hoje são o segundo sem ninguém ter escolhido.

---

## 4. Layout

### 4.1 Containers

| Classe | Largura máxima | Papel | Em uso |
|---|---|---|---|
| `container-loja` | **100rem** = 1600px | **catálogo e loja pública**: a grade precisa de área | 23 |
| `container-jb` | **90rem** = 1440px | **conteúdo**: institucional, formulário, política, checkout, painel | 34 |
| `container-estreito` | **56rem** = 896px | texto corrido não passa de ~75 caracteres por linha | 2 |

Respiro lateral, idêntico nos três: 16px → 20px (≥400) → 28px (≥640) →
**40px** (≥1024).

**São duas larguras de conteúdo, e a diferença é de papel, não de acidente.**
Página de texto a 1600px daria linha longa demais; grade de produto a 1440px
perde uma coluna. **Ao criar seção nova, a pergunta não é "que largura fica
bonita": é se aquilo é conteúdo ou catálogo.**

> **O que já foi um problema, e como foi resolvido.** Em 10/09 a medição a
> 1920px mostrava a borda esquerda da página em quatro valores empilhados —
> cabeçalho a 1888px (`max-width: 118rem !important`), barra de categorias a
> 1440, conteúdo a 1600 (`container-jb max-w-[100rem]`, repetido **25 vezes**) e
> rodapé a 1840. Dentro da própria home, sete faixas a 1600 e quatro a 1440: a
> 1600px um título começava em 40px e o seguinte em 120px, alternando ao rolar.
>
> `container-loja` nasceu dessa medição, e cabeçalho, barra de categorias,
> conteúdo e rodapé passaram a usar a mesma caixa: medido a 1280, 1440, 1600 e
> 1920px, **uma linha só**. Sobrou **1** `max-w-[100rem]` avulso e **zero**
> `max-w-[112rem]` — o cabeçalho não tem mais caixa própria.
>
> Abaixo de ~1600px as larguras batem na borda da viewport e coincidem — por
> isso um desalinho desses só aparece em monitor grande, e passa despercebido em
> notebook.

### 4.2 Sangria até a borda

Peça que se estica de borda a borda dentro de uma página com respiro — faixa em
destaque, barra fixa de salvar — usa recuo negativo mais o respiro de volta:

```tsx
"-mx-4 px-4 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 xl:-mx-7 xl:px-7 2xl:-mx-8 2xl:px-8"
```

**O recuo não tem valor próprio: é o negativo do respiro da página**, e por isso
vai escrito degrau a degrau ao lado dele, nunca resumido. No painel o respiro é
`px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8`, em `src/components/admin/casca.tsx`.

> Em 11/09 duas peças traziam `-mx-4 sm:-mx-6` — certo quando a página tinha
> dois degraus, errado desde que ela ganhou cinco. O efeito eram 4px de página
> fora da tela em toda largura de tablet para cima. **Sangria maior que o
> respiro não quebra nada e não avisa: simplesmente transborda.**

### 4.3 Ritmo vertical da home

**Lista é densa, narrativa respira.** As sete seções tinham exatamente 64px em
cima e embaixo — um metrônomo, em que nada sinaliza qual pesa mais.

| Tipo de seção | Respiro |
|---|---|
| Grade de produto ou categoria | `py-12 lg:py-14` — 56px |
| Argumento e fechamento | `py-14 lg:py-20` — 80px |

A altura total da home no celular caiu de **18.831px para 15.749px** quando a
fileira de quatro cartões passou a virar trilho horizontal (`TrilhoOuGrade`, que
existia escrito e documentado e nenhuma tela usava). Três telas e meia a menos,
sem espremer a fotografia.

### 4.4 Altura do topo

O cabeçalho é `sticky top-0`. Duas peças precisam saber quanto ele ocupa e
nenhuma consegue medir sozinha — a barra de seções da ficha, que gruda logo
abaixo dele, e o `scroll-mt` de cada âncora:

```css
--jb-topo: 60px;          /* ≥1024px: 108px */
--jb-topo-secoes: 110px;  /* ≥1024px: 160px */
```

### 4.5 O grid da ficha de produto

Quatro áreas — `galeria`, `resumo`, `compra`, `detalhes` — e três arranjos:

- **Celular:** identidade → **foto** → compra → detalhes. A ordem antiga punha
  a tabela antes da foto e empurrava o equipamento para 700px de rolagem e o
  preço para ~1.100px. Nenhuma ficha usada como referência coloca tabela antes
  da foto.
- **768–1279px:** duas colunas. Três colunas aqui davam 300px de galeria — a
  foto mais estreita que a caixa de compra ao lado.
- **≥1280px:** três colunas, **39 / 33 / 28**. Era 45/30/25, o que dava 571px
  de galeria contra 376px de resumo a 1440. Numa ficha de equipamento a coluna
  que decide a compra é o texto, não a foto.

Detalhe de grid que custou caro: use `min-content` nas faixas de cima e
`minmax(0, 1fr)` na última. Um item que atravessa faixas distribui a altura
apenas entre as **flexíveis** — com `auto` em todas, a foto esticava a faixa do
resumo e abria um vão.

Entre 1024 e 1279px **não havia navegação de catálogo**: a faixa vermelha de
categorias entra em `xl` (1280) e o botão do menu saía em `lg` (1024) — 256px de
largura sem nenhuma das duas, que é a janela do iPad Pro deitado. O botão agora
vai até `xl`, e o atalho "Solicitar assistência" cede o lugar nessa faixa.

---

## 5. Superfície, canto e sombra

| Token | Valor |
|---|---|
| `--radius-xs … 2xl` | 4 · 6 · 8 · 12 · 16 · 22px |
| `--shadow-card` | elevação de cartão em repouso |
| `--shadow-raised` | menu, popover |
| `--shadow-pop` | diálogo |
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` — a curva de todo movimento |

Os três de sombra usam **desfoque largo com espalhamento negativo**, não sombra
curta e dura. A peça continua presa ao papel; o que some é a borda visível da
sombra, que fazia o cartão parecer recortado e colado.

Há um quarto uso, que não é elevação: o cartão de destaque do hero desenha uma
**lâmina de `jb-50` deslocada 10px** com `box-shadow` de desfoque zero. Um
`::before` com `z-index: -1` cairia atrás do fundo do próprio cartão e não
apareceria — testado.

| Superfície | Valor |
|---|---|
| `--color-surface` | `#ffffff` |
| `--color-surface-muted` | `#fafafa` |
| `--color-surface-sunken` | `#f4f4f5` |

### Utilidades de superfície

| Utilidade | O que monta | Em uso |
|---|---|---|
| `placa` | superfície de catálogo: branca, borda `graf-200`, canto `lg`, `shadow-card` | 3 |
| `papel` | superfície de bloco: canto `2xl`, brilho interno de 1px e sombra funda | 2 |
| `levanta` | hover que sobe 6px, adensa a sombra e escurece a borda | 1 |
| `filete` | só a linha de cima, em `hairline` | 1 |
| `malha` | grade de 56px a 4,5% — fundo de bloco grande | 1 |
| `field-orbit` | malha radial de 28px, eco do símbolo circular da marca | 4 |

As duas últimas **aparecem só em faixa grande, nunca como papel de parede.**

**Canto reto, tipografia condensada e pele preta foram testados e cortados** —
viraram três famílias de fonte disputando a mesma página e um desenho anguloso
que não é o da JB. Referência externa serve para estrutura, não para
identidade. O que sobreviveu do protótipo foi a hierarquia, que era o ganho.

### O que evitar

Do briefing, e confirmado na prática: sem gradiente, sem glow, sem caixa dentro
de caixa dentro de caixa, sem excesso de etiqueta, sem texto miúdo. As
"Principais características" da ficha já foram quatro cartões com borda e fundo
próprios, dentro da coluna de resumo, ao lado da caixa de compra, dentro da
seção. Hoje são filetes: a mesma informação, sem a moldura.

---

## 6. Componentes

### 6.1 Botão — `src/components/ui/button.tsx`

Sete variantes, não quatro:

| Variante | Repouso | Hover / ativo |
|---|---|---|
| `primario` | `bg-jb-500`, texto branco | `jb-600` → `jb-700`; desabilitado em `jb-300` |
| `secundario` | branco, texto `graf-800`, borda `graf-300` | borda `graf-400`, fundo `graf-50` → `graf-100` |
| `sutil` | `bg-graf-100`, texto `graf-800` | `graf-200` → `graf-300` |
| `texto` | só texto `graf-700` | texto `jb-700`, fundo `graf-50` |
| `perigo` | branco, texto `jb-700`, borda `jb-200` | fundo `jb-50`, borda `jb-300` |
| `claro` | branco, texto `graf-900` | `graf-100` → `graf-200` |
| `contorno-claro` | contorno para fundo escuro | — |

**Destrutivo e marca usam o mesmo vermelho.** `perigo` é branco com texto e
borda da rampa `jb`, não uma cor de erro própria — a plataforma não tem uma. É
coerente com "vermelho é sinal", mas quem desenhar um diálogo de exclusão
precisa separar as duas coisas por hierarquia e texto, não por cor.

| Tamanho | Altura mínima |
|---|---|
| `sm` | `min-h-10` (40px), **`pointer-coarse:min-h-11`** (44px no toque) |
| `md` | `min-h-11` = 44px |
| `lg` | `min-h-13` = 52px |

O `pointer-coarse` do `sm` é o padrão a copiar: 40px com mouse, 44px com dedo.

> **Tensão com a própria § 2:** `secundario` desenha a borda em `graf-300` e
> `perigo` em `jb-200` — a tabela de cinzas diz que `graf-300` **nunca** é borda
> de controle, porque dá 1,72:1. Num botão o contorno não é o único sinal de que
> ali se clica (há rótulo, fundo e sombra), então não é a mesma falha que num
> campo de texto vazio — mas a regra, como está escrita, condena o próprio
> botão do sistema. Uma das duas precisa ceder, e hoje nenhuma cedeu.

### 6.2 Os dois botões do desenho Lumina

| Utilidade | O que é | Em uso |
|---|---|---|
| `botao-jb` | fundo `jb-500`; no hover o `jb-700` **sobe de baixo** em 420ms | 6 |
| `botao-osso` | contorno `graf-950`; o preenchimento sobe igual e o rótulo vira branco | 3 |

Os dois usam `::before` com `z-index: -1` e `isolation: isolate` — o rótulo fica
por cima sem precisar de `position` próprio. **O preenchimento sobe, não troca
de cor:** troca de cor no hover é o gesto genérico; este é o que dá assinatura.

### 6.3 `select-jb`

A seta do `<select>` desenhada em `data:` URI, para o campo fechado combinar com
os outros controles. **A lista aberta continua sendo a nativa, de propósito**:
um menu à mão precisa refazer teclado, leitura de tela e o seletor de rolagem do
celular, e quase sempre refaz pior. O que dava ao campo o ar de "formulário de
sistema" era a seta do sistema operacional — é a parte que dá para trocar sem
perder nada.

### 6.4 Alvo de toque

**44px é o piso da plataforma**, medido a 320px em contexto móvel pela suíte.
Três erros recorrentes, todos já cometidos:

- **Controle com `size-9`.** O coração do cartão nasceu com 36px em tudo e virou
  16 alvos pequenos por página de catálogo. A correção não é engordar o desenho:
  o círculo de 36px desceu para um `<span>` e o botão cresceu em volta. **A
  regra fala do alvo, não da tinta.**
- **Chip com `min-h-10`.** 40px reprova. Use `min-h-11`.
- **Faltar por menos de 1px.** A pílula "WhatsApp" do rodapé ficava a
  **10,88px** de altura; o link "Ver o site", 4px abaixo do piso; a assinatura
  do topo, 0,8px. Nenhum dos três é visível a olho — os três reprovam.

### 6.5 Foco

O `:focus-visible` global já entrega anel `jb-500` de 2px com `offset: 2px`,
canto `xs`, e vira branco dentro de `.on-dark`. `@utility foco-jb` existe para
quem monta um controle do zero — 123 usos.

### 6.6 Conteúdo do editor — `.prose-jb`

Corpo 16→17px, entrelinha 1.7, marcador de lista desenhado em `jb-500`, link
`jb-700` sublinhado com `underline-offset: 3px`, `<code>` em mono com fundo
`graf-100`.

---

## 7. Movimento

Tudo em CSS puro — **sem biblioteca, sem hidratação, sem observador de
rolagem**. O princípio que decide todas: **falha degrada para "sem efeito",
nunca para "conteúdo invisível"**.

| Utilidade | O que faz | Em uso |
|---|---|---|
| `surge` | entrada de 900ms: o elemento chega de baixo, desfocado. Escalonada com `animationDelay` nas linhas da manchete | 11 |
| `acorda` | a mesma entrada, amarrada à rolagem (`animation-timeline: view()`) | 1 |
| `revelar` | revelação curta de 460ms guiada pela posição na tela | 1 |
| `levanta` | hover de cartão: sobe 6px em 460ms | 1 |
| `gira` | rotação infinita de 22s — o selo circular | 1 |
| `pulso` | anel que cresce e some por fora de um ponto | 1 |
| `marquise` | faixa correndo; **quem usa precisa duplicar a lista**, porque a animação anda exatamente 50% e é a duplicata que faz a emenda ser invisível | 1 |
| `esqueleto` | bloco de carregamento com brilho que atravessa uma vez por ciclo | via `cn()` em `ui/data.tsx` |

`acorda` e `revelar` vivem **inteiras dentro de `@supports (animation-timeline:
view())`** — em navegador sem suporte não existe animação nenhuma e a seção
aparece pintada como sempre.

### As três guardas obrigatórias em qualquer animação nova

1. `@media (prefers-reduced-motion: reduce) { animation: none }` — o bloco
   global corta a **duração**, mas não o **atraso**: sem isto, quem pediu menos
   movimento espera o escalonamento inteiro olhando para espaço vazio.
2. `@media print { animation: none }` — `both` segura o estado inicial, e a
   página impressa sairia transparente.
3. Deslocamento curto e num eixo só. Nada de escala nem desfoque exagerado — é
   o que faz abertura animada parecer apresentação de slides.

> **A guarda 1 não é teoria.** O rodízio de palavra da manchete tinha animação
> infinita; com movimento reduzido, a duração ia a 0,01ms e a repetição a 1, o
> que pula direto para o quadro final — `opacity: 0`. Quem pediu menos movimento
> lia "A clínica escolhe / — / A JB responde", com um buraco no meio. A correção
> foi explicitar `animation: none` **e** `opacity: 1` na primeira palavra.
>
> O mesmo defeito envenenou a auditoria: o axe media a home enquanto `surge`
> ainda estava em `opacity: 0` e calculava a cor misturada com o fundo
> (`#7d7e7f` no lugar de `#1a1c1e`), reprovando contraste em 3 a 5 nós, variando
> a cada rodada. **`networkidle` não é o fim da pintura.** A varredura agora
> espera as animações *finitas* terminarem, com teto de 2s — animação guiada por
> rolagem tem contagem finita mas só "termina" quando a seção sai da tela.

---

## 8. Acessibilidade

Não é uma camada revisada no fim; é parte do sistema, e a suíte mede.

- **Contraste**: 4,5:1 em texto. A tabela de cinzas da § 2 existe para isso.
- **1.4.11**: 3:1 no contorno que identifica um componente e no grafismo que
  comunica estado. Daí `graf-450` para borda de campo e `ok-700` para o círculo
  de etapa concluída.
- **Alvo de toque**: 44px, medido a 320px.
- **Foco**: visível em todo controle, e invertido em fundo escuro.
- **Rolagem horizontal**: `overflow-wrap: break-word` no `body` é a rede da
  plataforma inteira. Boa parte do que a tela mostra é texto digitado por gente
  — um e-mail longo numa ficha de 240px vira largura mínima intransponível a
  360px.
- **Região que rola precisa ser focável.** Uma faixa com `overflow-x: auto` sem
  `tabIndex={0}` reprova no axe (`scrollable-region-focusable`) — quem navega
  por teclado não consegue rolá-la.
- **Sanfona não pode comer o cabeçalho.** Quando as cinco seções da ficha
  viraram gaveta, o título de cada bloco passou de `h2` para `<span>`: quem
  navega por títulos deixou de encontrar "Especificações técnicas", e a barra
  "Seções deste equipamento" apontava para âncoras sem cabeçalho. `h2` dentro do
  `summary` é marcação válida — é assim que ficou.
- **`role="progressbar"` precisa de nome próprio** (`aria-label`).
  `aria-valuetext` diz o valor, não o nome.
- **`<dl>` não aceita `<span>` entre `<dt>` e `<dd>`.** Ícone vai *dentro* do
  `<dd>`.

---

## 9. Como isto é verificado

| Portão | O que cobre | Estado em 15/09 |
|---|---|---|
| `npx tsc --noEmit` | tipos | **limpo** (medido) |
| `npx vitest run` | unitários | **709 de 709**, 45 arquivos, 2,6s (medido) |
| `npx eslint .` | lint | 0 erros, 51 avisos conhecidos |
| `npx playwright test` | ponta a ponta | **105 blocos `test(`** em 20 specs |
| `tests/e2e/15-legibilidade-alinhamento.spec.ts` | cinza, tamanho mínimo, alvo de toque, alinhamento | 7 cenários |
| `pnpm a11y` (axe, WCAG 2.0/2.1 A+AA) | **47 rotas × 2 larguras** (1280 e 390 com dedo) = 94 medições | |
| `pnpm responsivo` | **42 rotas × 7 larguras** (320·360·390·768·1024·1280·1440) = 294 medições | |
| `pnpm responsivo:pdp` | cabeçalho da ficha, de 320 a 2560px | |

> **Os dois últimos precisam do Postgres de pé.** Sem banco, o trecho do painel
> imprime `pulando: não foi possível entrar` e termina com **zero medição e
> código de saída 0** — lê como verde sem ter medido nada.

### O método que prova refatoração de acabamento

Trocar o mecanismo de um CSS sem mexer no desenho só vale se der para provar. O
que funcionou na consolidação do cabeçalho: medir a **assinatura computada** —
23 propriedades de cada elemento, em 4 rotas × 4 larguras — antes e depois.
**137.904 propriedades comparadas, 63 diferentes (0,046%)**, e todas as 63 eram
a única mudança pretendida.

A primeira tentativa **não passou**, e foi essa medição que pegou: a busca do
topo perdia raio, sombra e peso abaixo de 1024px; o botão de enviar deixava de
virar lupa abaixo de 1200px; a logo da ficha voltava de 28 para 38px no celular.
Nenhum dos três aparece numa captura de tela da home.

### Cuidado ao escrever teste visual

Quatro testes desta suíte já falharam por medir antes de a página existir —
conteúdo por streaming, foco no primeiro `Tab`, hidratação, animação de gaveta.
A guarda certa **espera o resultado**, não um tempo:

```ts
// errado: mede uma vez, logo após o goto
const n = await contar();
expect(n).toBeGreaterThan(0);

// certo: espera a página entregar o que promete
await expect.poll(async () => (await contar()).length).toBeGreaterThan(0);
```

E duas guardas contra passar à toa:

- **Amostra vazia não é aprovação.** Um seletor que casa zero elementos faz o
  teste passar dizendo nada.
- **Portão que reprova sempre não reprova nada.** `responsivo-pdp.mjs` acusava
  "navegação principal não está visível" em **todas** as larguras de desktop
  porque procurava a navegação dentro do `<header>`, onde ela não mora desde
  12/09. Reprovando sempre, ninguém lia.

---

## 10. Aberto

| Item | Situação |
|---|---|
| **Topo da escala × `clamp()` avulso** | `text-hero` tem 2 usos e `text-section` 4, contra **17 `text-[clamp(...)]` em 14 grafias** na mesma faixa. A manchete da home chega a 80px, acima do teto de 68px do `text-hero`. É a § 3.2, e é a maior dívida tipográfica que sobrou |
| **`manchete` desliga a Bricolage** | cinco `h1`/`h2` saem em Manrope enquanto o resto da página sai em Bricolage (§ 3.7). Decisão de desenho, não bug: ou `manchete` solta a família, ou os cinco são de outra família de propósito |
| **`hero-vitrine.module.css` não é importado por ninguém** | **0 importações.** É a quarta folha sem alvo do projeto — depois de `catalogo-premium.css` (15 de 15 regras sem elemento), `vitrine.css` (10 de 13) e das quatro do cabeçalho. Ela ainda declara um `.sobretitulo` divergente e um `.titulo` de até 81,6px com peso 760, valores que não existem no sistema. Enquanto o arquivo está lá, quem ler vai acreditar nele |
| **Sete utilidades sem nenhum uso** | `entrada`, `faixa`, `sublinha`, `respira`, `rodizio`, `progresso` e `trilho` — nenhuma aparece em `className`, `cn()` ou `@apply` em `src/`. Com elas, quatro `@keyframes` mortos: `jb-respira`, `jb-progresso`, `jb-rodizio-2` e `jb-rodizio-3`. `entrada` e `rodizio` foram **substituídas** (por `surge` e pela palavra derivada de `foco`) e ninguém removeu a anterior; `trilho` tem sósia vivo em `jb-marcas-trilho`. Documentar token morto é pior que não documentar: ele volta |
| **Valores fora da escala no cabeçalho da ficha** | raio de 0,78rem e 0,82rem, peso 560, corpo de 0,84rem. **Preservados de propósito** na consolidação, para não esconder um restyle dentro de uma refatoração. É uma decisão de desenho de dez minutos, separada |
| **Rampa de cinza × override público** | as duas coexistem e brigam; a lista de utilidades dentro do seletor é escrita à mão e já foi esquecida três vezes |
| **Duas linhas em vermelho na manchete** | a palavra que gira (que é a variável, e faz sentido) e "pelos próximos anos." (que é ênfase). Com as duas, o vermelho deixa de marcar o que muda |
| **`min-[1800px]` em cinco lugares do rodapé** | ajuste fino de respiro que não quebra nada com a caixa de 1600, mas também não faz mais muito sentido |
| **Bloco institucional idêntico na ficha** | "O equipamento continua dentro do ecossistema" ocupa **466px iguais** em toda página de produto. O resto do texto institucional varia com o equipamento — a sobreposição de palavras medida deu 22%, 13% e 58%. Só esse bloco é literalmente o mesmo, e é decisão editorial: âncora de marca ou repetição |
| **Sangria negativa espalhada** | o padrão está em § 4.2, mas nada impede escrever `-mx-4 sm:-mx-6` de novo. Um teste que meça `scrollWidth` do `<main>` no painel fecharia a classe inteira |

### Resolvido desde a última revisão

- **As quatro folhas de remendo do cabeçalho.** `header-premium.css`,
  `header-search.css`, `header-product.css` e `header-product-mobile.css` —
  21,9 kB, **117 `!important`** e seletores que contavam filhos — viraram
  `src/app/cabecalho.css`, com **3 `!important`**. Os três são necessários:
  `next/image` escreve `style="height:38px"` no elemento da logo, e estilo em
  linha ganha de qualquer seletor. Duas das quatro folhas **brigavam e a mais
  nova perdia em silêncio** — `header-search.css` mandava raio de 1rem, sombra
  própria e peso 500 para a busca, e nada disso chegava à tela porque
  `header-premium.css` vinha depois com seletor mais específico.
- **A caixa do cabeçalho da ficha.** Corria a 1792px enquanto o conteúdo da
  mesma página corria a 1600. Agora usa `container-loja` como todo mundo, e a
  busca continua larga por ser elástica, não por a caixa ser maior.
- **`border-graf-150`**, 28 usos de um token que não existe → `border-hairline`.
- **"BUSCAR" cortado de 640 a 1199px.** Uma regra encolhia o botão para 2,9rem
  abaixo de 1200px, nascida quando a palavra era injetada por `content:`. Em
  12/09 ela virou texto de verdade no JSX, e a mesma regra passou a cortá-la na
  borda arredondada. **É a terceira vez que uma suposição da era do `content:`
  cobra o preço neste cabeçalho** — as duas anteriores foram a assinatura
  "MARKETPLACE ODONTOLÓGICO" e o "BUSCAR Buscar" duplicado.
- **A logo do rodapé encostando no topo.** `footer-alignment.css` subia a coluna
  da esquerda em `translateY(-3.375rem)` acima de 1800px, calibrado para o
  rodapé quando ele tinha caixa de 1840px. Com a caixa em 1600, medido: **−1px**
  de respiro acima de 1800px contra 29px em 1600. O deslocamento saiu; o respiro
  ficou em 37px.
