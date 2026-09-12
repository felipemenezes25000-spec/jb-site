# Design system — JB Soluções Odontológicas

Referência da linguagem visual da plataforma. O que está aqui foi lido do
código, não de memória: a fonte da verdade é `src/app/globals.css`, e cada
número abaixo sai de lá ou de medição no navegador.

Estado: 11/09/2026, branch `plataforma`.

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
> porque vivia num `::after`. Saiu o bloco, três regras de media query que o
> reativavam e a reserva de largura que existia só para caber o texto. O teste
> `13-cabecalho-pdp` **cobrava** a assinatura; a asserção foi invertida.

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
| `jb-600` | `#c40e15` | hover do CTA |
| `jb-700` | `#a5090c` | link sobre branco, sobretítulo |

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

Os dois erros que essa tabela evita, e que já aconteceram neste projeto:

- **`graf-400` como texto.** Dá 2,6:1. Aconteceu no `<kbd>` do atalho de busca
  da Área da Clínica.
- **`graf-300`/`graf-400` como borda de campo.** Reprovam 1.4.11. `graf-450`
  existe exatamente para isso e continua leve o bastante para não pesar o
  formulário.

### A regra do texto preto na loja pública

`globals.css:698`. Nas cascas marcadas com `data-jb-publico="true"` — `(vitrine)`,
`(loja)`, `(acesso)` e `(checkout)` — o texto secundário **não usa cinza**:

```css
[data-jb-publico="true"] :where(.text-graf-500, .text-graf-600, .text-graf-700) {
  color: var(--color-graf-950);
}
```

A regra alcança também `.texto-suave` e `.prose-jb`, e recua o preço anterior
(`.line-through`) para `graf-700`.

**Ela não alcança CSS Module.** Um módulo que declara
`color: var(--color-graf-500)` passa por baixo da regra e devolve o cinza. Foi
exatamente assim que a home ficou sendo a única página da loja com um cinza que
nenhuma outra usava — 20 nós, todos em `hero-vitrine.module.css`. **Ao escrever
CSS Module para uma página pública, use `--color-graf-950` no texto.**

> Tensão conhecida do sistema: existe uma rampa de cinza com contraste
> calculado **e** um override global que a anula na loja pública. As duas
> decisões são defensáveis; juntas, brigam. Fora da loja — painel e Área da
> Clínica — a rampa vale integralmente.

### Estados

`ok` (verde), `warn` (âmbar), `info` (azul), cada um com `-50`, `-500`, `-700`.

Regra prática: **`-500` é grafismo, `-700` é texto.** Branco sobre `ok-500` dá
2,54:1 e reprova a 1.4.11 quando o grafismo comunica estado; sobre `ok-700` dá
5,48:1.

---

## 3. Tipografia

### Famílias

| Token | Fonte | Uso |
|---|---|---|
| `--font-sans` | Manrope | corpo, rótulo, número — tudo que não é título |
| `--font-display` | **Bricolage Grotesque** | `h1`, `h2` e `h3`, por `@layer base` |
| `--font-mono` | JetBrains Mono | SKU, código de pedido, nº de série (`label-mono`) |

O título ganhou desenho próprio em 11/09/2026. Até então título e corpo eram a
mesma Manrope, e a hierarquia se apoiava só em tamanho e peso. **`h4` para baixo
continua em Manrope**: são rótulos de bloco dentro de cartão, e ali a fonte de
display vira ruído. Texto corrido também — a JB tem ficha técnica para ler.

### A escala

Cinco degraus grandes, cada um com entrelinha, espaçamento e peso embutidos —
pedir `text-hero` entrega o título afinado. A redução no celular é
proporcional, nunca "encolhe para caber".

| Token | Celular (360px) | Desktop | Peso | Papel |
|---|---|---|---|---|
| `text-hero` | 40px | 68px (≥1280) | 800 | manchete da home |
| `text-display` | 32px | 48px (≥1440) | 800 | abertura de página |
| `text-section` | **31px** | 44px (≥1440) | **800** | título de faixa |
| `text-title` | 22px | 30px (≥1440) | **800** | `h1` de ficha de produto |
| `text-bloco` | 18px | 22px | 700 | `h2` de seção **dentro** de uma página |

O piso de `text-section` subiu de 1,75 para 1,9375rem e o peso de 700 para 800
quando a Bricolage entrou: num título de seção ela pede mais corpo que a Manrope
para ter a mesma presença.

`text-bloco` é o degrau que faltava. Sem ele a ficha de produto inventava um
tamanho por seção e terminava com sete `h2` em cinco tamanhos.

### Os dois degraus abaixo de `text-base`

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

### A armadilha do `tailwind-merge` — leia antes de criar um degrau

`tailwind-merge` **não conhece tamanhos customizados**. Ele os classifica como
cor e os descarta quando a classe também traz `text-<cor>`:

```tsx
cn("text-bloco", "text-graf-950")   // sem registro: text-bloco é jogado fora
```

Todo degrau novo precisa entrar em `src/lib/utils.ts`:

```ts
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [
    { text: ["hero", "display", "section", "title", "bloco", "apoio", "corpo"] },
  ] } },
});
```

A lista parou em `title` uma vez, e `bloco` ficou meses sendo descartado em
silêncio. O sintoma é sutil: o texto cai para os 16px herdados e ninguém vê.

### Utilidades de papel

| Utilidade | O que é |
|---|---|
| `manchete` | peso 800, entrelinha 1.08, `-0.03em`. Sem caixa alta |
| `micro` | 12px, 700, caixa alta, `0.08em`. Entrelinha **1.3, nunca 1** — em caixa alta o acento sobe acima da caixa do em e qualquer ancestral com rolagem horizontal o decepa |
| `sobretitulo` | 13px, 700, caixa alta, `jb-600` |
| `numero` | 800, `tabular-nums`, `-0.02em`. Preço, parcela, contagem |
| `label-mono` | mono 12px, `0.04em`, tabular |
| `texto-guia` | parágrafo de abertura, 17→19px, entrelinha 1.65 |
| `texto-apoio` | 13px + entrelinha 1.55 |
| `texto-suave` / `texto-forte` | cor secundária / forte, com inversão automática em `.on-dark` |
| `tabular` | só `tabular-nums` |
| `line-2` / `line-3` | corte em N linhas |

---

## 4. Layout

### Containers

| Classe | Largura máxima |
|---|---|
| `container-jb` | **90rem** = 1440px — **conteúdo**: institucional, formulário, texto |
| `container-jb max-w-[100rem]` | **1600px** — **catálogo**: a grade precisa de área |
| `container-estreito` | **56rem** = 896px — texto corrido não passa de ~75 caracteres por linha |

Respiro lateral: 16px → 20px (≥400) → 28px (≥640) → **40px** (≥1024).

**São duas larguras de conteúdo, e a diferença é de papel, não de acidente.**
Página de texto a 1600px daria linha longa demais; grade de produto a 1440px
perde uma coluna. O cabeçalho é a única exceção: `max-w-[112rem]` (1792px) nos
layouts de `(vitrine)` e `(loja)`, porque moldura pode ser mais larga que miolo.

> **O que já foi um problema, e como foi resolvido.** Em 10/09/2026 a medição a
> 1920px mostrava conteúdo em **x=280, x=200 e x=104** — degraus de 80 e 96px
> sem cartão nem coluna que os justificasse. O diagnóstico inicial foi "três
> larguras arbitrárias, unificar em uma", e estava **errado**: eram duas rotas
> no balde errado. A faixa de marcas usava 1792px no meio de uma home a 1600, e
> a busca usava 1440px para mostrar grade de produto, vinda de um catálogo a
> 1600. Corrigida a classificação, `/`, `/loja` e `/busca` começam todas em
> **x=160**.
>
> Abaixo de ~1600px as larguras batem na borda da viewport e coincidem — por
> isso um desalinho desses só aparece em monitor grande, e passa despercebido
> em notebook. **Ao criar seção nova, a pergunta não é "que largura fica
> bonita": é se aquilo é conteúdo ou catálogo.**

### Sangria até a borda

Peça que se estica de borda a borda dentro de uma página com respiro — faixa em
destaque, barra fixa de salvar — usa recuo negativo mais o respiro de volta:

```tsx
"-mx-4 px-4 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 xl:-mx-7 xl:px-7 2xl:-mx-8 2xl:px-8"
```

**O recuo não tem valor próprio: é o negativo do respiro da página**, e por isso
vai escrito degrau a degrau ao lado dele, nunca resumido. No painel o respiro é
`px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8`, em `src/components/admin/casca.tsx`.

> Em 11/09/2026 duas peças traziam `-mx-4 sm:-mx-6` — certo quando a página
> tinha dois degraus, errado desde que ela ganhou cinco. O efeito eram 4px de
> página fora da tela em toda largura de tablet para cima, com rolagem
> horizontal em `/admin` e `/admin/configuracoes`. Sangria maior que o respiro
> não quebra nada e não avisa: simplesmente transborda.

### Ritmo vertical da home

**Lista é densa, narrativa respira.** As sete seções tinham exatamente 64px em
cima e embaixo — um metrônomo, em que nada sinaliza qual pesa mais.

| Tipo de seção | Respiro |
|---|---|
| Grade de produto ou categoria | `py-12 lg:py-14` — 56px |
| Argumento e fechamento | `py-14 lg:py-20` — 80px |

A grade já carrega a informação no próprio desenho e não precisa de tanto ar;
assistência e fechamento são argumento, não vitrine. A página total não mudou de
altura: o que a lista economizou foi gasto onde o texto precisa respirar.

### Altura do topo

O cabeçalho é `sticky top-0`. Duas peças precisam saber quanto ele ocupa e
nenhuma consegue medir sozinha — a barra de seções da ficha, que gruda logo
abaixo dele, e o `scroll-mt` de cada âncora:

```css
--jb-topo: 60px;          /* ≥1024px: 108px */
--jb-topo-secoes: 110px;  /* ≥1024px: 160px */
```

### O grid da ficha de produto

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

---

## 5. Superfície, canto e sombra

| Token | Valor |
|---|---|
| `--radius-xs … 2xl` | 4 · 6 · 8 · 12 · 16 · 22px |
| `--shadow-card` | elevação de cartão em repouso |
| `--shadow-raised` | menu, popover |
| `--shadow-pop` | diálogo |

Os três usam **desfoque largo com espalhamento negativo**, não sombra curta e
dura. A peça continua presa ao papel; o que some é a borda visível da sombra,
que fazia o cartão parecer recortado e colado.

Há um quarto uso, que não é elevação: o cartão de destaque do hero desenha uma
**lâmina de `jb-50` deslocada 10px** com `box-shadow` de desfoque zero. Um
`::before` com `z-index: -1` cairia atrás do fundo do próprio cartão e não
apareceria — testado.
| `--color-surface` | `#ffffff` |
| `--color-surface-muted` | `#fafafa` |
| `--color-surface-sunken` | `#f4f4f5` |
| `--color-hairline` | `#dcdde1` — filete entre cartões |
| `--color-chrome` | `#121315` — faixa preta pontual, **nunca a moldura do site** |

`@utility placa` monta a superfície de catálogo pronta: branca, borda
`graf-200`, canto `lg`, `shadow-card`.

**Canto reto, tipografia condensada e pele preta foram testados e cortados** —
viraram três famílias de fonte disputando a mesma página e um desenho anguloso
que não é o da JB. Referência externa serve para estrutura, não para
identidade.

### O que evitar

Do briefing, e confirmado na prática: sem gradiente, sem glow, sem caixa dentro
de caixa dentro de caixa, sem excesso de etiqueta, sem texto miúdo. As
"Principais características" da ficha já foram quatro cartões com borda e fundo
próprios, dentro da coluna de resumo, ao lado da caixa de compra, dentro da
seção. Hoje são filetes: a mesma informação, sem a moldura.

---

## 6. Componentes

### Botão — `src/components/ui/button.tsx`

Variantes: `primario`, `secundario`, `texto`, `perigo`.

| Tamanho | Altura mínima |
|---|---|
| `sm` | `min-h-10` (40px), **`pointer-coarse:min-h-11`** (44px no toque) |
| `md` | `min-h-11` = 44px |
| `lg` | `min-h-13` = 52px |

O `pointer-coarse` do `sm` é o padrão a copiar: 40px com mouse, 44px com dedo.

### Alvo de toque

**44px é o piso da plataforma**, medido a 320px em contexto móvel pela suíte.
Dois erros recorrentes:

- **Controle com `size-9`.** O coração do cartão nasceu com 36px em tudo e
  virou 16 alvos pequenos por página de catálogo. A correção não é engordar o
  desenho: o círculo de 36px desceu para um `<span>` e o botão cresceu em
  volta. **A regra fala do alvo, não da tinta.**
- **Chip com `min-h-10`.** 40px reprova. Use `min-h-11`.

### Foco

O `:focus-visible` global já entrega anel `jb-500` de 2px com `offset: 2px`, e
vira branco dentro de `.on-dark`. `@utility foco-jb` existe para quem monta um
controle do zero.

### Conteúdo do editor — `.prose-jb`

Corpo 16→17px, entrelinha 1.7, marcador de lista desenhado em `jb-500`, link
`jb-700` sublinhado com `underline-offset: 3px`, `<code>` em mono com fundo
`graf-100`.

---

## 7. Movimento

Três utilidades, todas em CSS puro — **sem biblioteca, sem hidratação, sem
observador de rolagem**:

| Utilidade | O que faz |
|---|---|
| `entrada` | abertura da primeira dobra, 620ms, deslocamento de 12px só no eixo Y |
| `revelar` | revelação guiada pela posição na tela (`animation-timeline: view()`), dentro de `@supports` |
| `esqueleto` | bloco de carregamento com brilho que atravessa uma vez por ciclo |

O princípio que decide todas: **falha degrada para "sem efeito", nunca para
"conteúdo invisível"**. Por isso `revelar` vive inteira dentro de `@supports` —
navegador sem suporte simplesmente pinta a seção.

Três guardas obrigatórias em qualquer animação nova:

1. `@media (prefers-reduced-motion: reduce) { animation: none }` — o bloco
   global corta a **duração**, mas não o **atraso**: sem isto, quem pediu menos
   movimento espera o escalonamento inteiro olhando para espaço vazio.
2. `@media print { animation: none }` — `both` segura o estado inicial, e a
   página impressa sairia transparente.
3. Deslocamento curto e num eixo só. Nada de escala nem desfoque — é o que faz
   abertura animada parecer apresentação de slides.

---

## 8. Acessibilidade

Não é uma camada revisada no fim; é parte do sistema, e a suíte mede.

- **Contraste**: 4,5:1 em texto. A tabela de cinzas da seção 2 existe para
  isso.
- **1.4.11**: 3:1 no contorno que identifica um componente e no grafismo que
  comunica estado. Daí `graf-450` para borda de campo e `ok-700` para o
  círculo de etapa concluída.
- **Alvo de toque**: 44px, medido a 320px.
- **Foco**: visível em todo controle, e invertido em fundo escuro.
- **Rolagem horizontal**: `overflow-wrap: break-word` no `body` é a rede da
  plataforma inteira. Boa parte do que a tela mostra é texto digitado por gente
  — um e-mail longo numa ficha de 240px vira largura mínima intransponível a
  360px.
- **Região que rola precisa ser focável.** Uma faixa com `overflow-x: auto` sem
  `tabIndex={0}` reprova no axe (`scrollable-region-focusable`) — quem navega
  por teclado não consegue rolá-la.
- **`role="progressbar"` precisa de nome próprio** (`aria-label`).
  `aria-valuetext` diz o valor, não o nome.
- **`<dl>` não aceita `<span>` entre `<dt>` e `<dd>`.** Ícone vai *dentro* do
  `<dd>`.

---

## 9. Como isto é verificado

| Portão | O que cobre |
|---|---|
| `npx tsc --noEmit` | tipos |
| `npx vitest run` | 621 testes unitários |
| `npx eslint .` | 0 erros (51 avisos conhecidos) |
| `npx playwright test` | **99 cenários de ponta a ponta** |
| `tests/e2e/15-legibilidade-alinhamento.spec.ts` | cinza, tamanho mínimo, alvo de toque, alinhamento |
| `pnpm a11y` (axe, WCAG 2.0/2.1 A+AA) | **47 rotas × 2 larguras = 94 medições** |
| `pnpm responsivo` | **42 rotas × 7 larguras = 294 medições** |

Em 11/09/2026 os quatro fecharam verdes na mesma rodada pela primeira vez:
99/99, 621 unitários, **0 problemas** de acessibilidade e **0** de
responsividade.

> Os dois últimos precisam do Postgres de pé. Sem banco, o trecho do painel
> imprime `pulando: não foi possível entrar` e termina com **zero medição e
> código de saída 0** — lê como verde sem ter medido nada.

**Cuidado ao escrever teste visual.** Quatro dos testes desta suíte já falharam
por medir antes de a página existir — conteúdo por streaming, foco no primeiro
`Tab`, hidratação, animação de gaveta. A guarda certa **espera o resultado**,
não um tempo:

```ts
// errado: mede uma vez, logo após o goto
const n = await contar();
expect(n).toBeGreaterThan(0);

// certo: espera a página entregar o que promete
await expect.poll(async () => (await contar()).length).toBeGreaterThan(0);
```

E uma guarda contra passar à toa: **amostra vazia não é aprovação.** Um seletor
que casa zero elementos faz o teste passar dizendo nada.

---

## 10. Aberto

| Item | Situação |
|---|---|
| **Quatro CSS de cabeçalho** | `header-premium` (5,1 kB), `header-product` (11,4 kB), `header-product-mobile` (2,3 kB), `header-search` (3,1 kB) repintam o cabeçalho global de fora, com `!important` — 21,9 kB ao todo. Deveria ser prop |
| **~90 valores tipográficos avulsos** | espalhados por 20 tamanhos (`text-[1.02rem]`, `text-[11px]`…). Poucos usos cada — nomear degrau que aparece três vezes é inventar escala |
| **Rampa de cinza × override público** | as duas coexistem e brigam; CSS Module escapa da segunda |
| **Bloco institucional idêntico na ficha** | "O equipamento continua dentro do ecossistema" ocupa **466px iguais** em toda página de produto. O resto do texto institucional varia com o equipamento — a medição de sobreposição de palavras deu 22%, 13% e 58%, não os "30–40% repetidos" que este documento afirmou antes. Só esse bloco é literalmente o mesmo, e é decisão editorial: âncora de marca ou repetição |
| **Sangria negativa espalhada** | o padrão está documentado em § 4, mas nada impede escrever `-mx-4 sm:-mx-6` de novo. Um teste que meça `scrollWidth` do `<main>` no painel fecharia a classe inteira |
