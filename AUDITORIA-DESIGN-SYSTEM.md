# Auditoria do front, do back e do banco — e o que foi feito no front

> Documento de trabalho, **não versionado**. 12/09/2026.
> Rodadas anteriores: `AUDITORIA-PDP.md`, `AUDITORIA-CATALOGO.md`,
> `AUDITORIA-CHECKOUT.md`, `AUDITORIA-RESTANTE.md`, `AUDITORIA-FECHAMENTO.md`.
> Sem commit, sem push, sem deploy.

---

## O diagnóstico em uma frase

A JB tem um design system bom e bem documentado em `src/app/globals.css` — e a
loja não estava usando ele. O que existia era **um sistema e três dialetos**:
as utilidades do `globals.css`, valores avulsos escritos direto na classe, e
folhas de estilo de remendo aplicadas por grupo de rota. Quase tudo que parecia
"quase certo" na tela vinha daí.

Isto é mensurável, e foi medido antes e depois.

| Medida | Antes | Depois |
|---|---|---|
| Tamanhos de fonte distintos (11 rotas públicas × 390 e 1440px) | **45** | **32** |
| Nós de texto abaixo de 12px (piso do próprio projeto) | **50** | **0** |
| Borda esquerda da página a 1920px (logo · categorias · conteúdo · rodapé) | **56 · 280 · 200 · 79** | **200 · 200 · 200 · 199** |
| Faixas da home a 1600px: onde o título começa | **40px e 120px, alternando** | **40px em todas** |
| Altura da home no celular (390px) | **18.831px** | **15.749px** |
| CSS de remendo sem alvo na marcação | **215 linhas** | removido |
| `border-graf-150` — token que não existe na paleta | **28 usos** | 0 |

---

## 1. Três dialetos para a mesma decisão

### 1.1 Duas folhas de estilo que não pintavam nada

`(loja)/catalogo-premium.css` (151 linhas) e `(vitrine)/vitrine.css` (64 linhas)
eram importadas em produção. Medindo seletor por seletor contra a marcação real
de sete rotas:

- `catalogo-premium.css`: **15 de 15 regras sem nenhum elemento correspondente.**
  A classe `.catalogo-premium` não existe em nenhum `.tsx` do projeto.
- `vitrine.css`: **10 de 13 sem alvo**; as três restantes só declaravam uma
  variável que ninguém lia. Medido: o painel de filtros tinha `border-radius: 0`,
  e não os 4px que o arquivo mandava.

As duas foram escritas quando a marcação era outra. As duas foram removidas, e
com elas o `<div className="vitrine">` de oito páginas — que também não fazia
nada. O acabamento medido em `/loja`, `/novos`, `/seminovos` e
`/categoria/[slug]` é idêntico antes e depois.

Detalhe que importa para a identidade: o que `vitrine.css` ainda tentava impor
era **canto de 4px e rótulo em monoespaçada de 11px** — a pele que você recusou
em 08/09 ("tá muito quadrado"). Ela não estava na tela porque os seletores
tinham envelhecido, não porque alguém a tinha tirado.

### 1.2 Um token que não existe

`border-graf-150` aparecia 28 vezes — no checkout, no carrinho, na caixa de
compra da ficha e na busca. **`graf-150` não está na paleta.** O Tailwind não
gera regra nenhuma para ele, e a borda caía na regra base (`graf-200`) sem
ninguém perceber. Provado no navegador: nenhuma regra de CSS na página contém
`graf-150`, e o elemento renderizava `rgb(221,223,226)`.

Trocado por `border-hairline` — o token que o design system já documenta como
"filete claro de 1px, o divisor entre cartões". A cor renderizada muda em um
ponto por canal; o que muda de verdade é que a classe passa a dizer a verdade.

### 1.3 A tipografia

206 tamanhos de fonte escritos como valor avulso. Os mais frequentes eram
`text-[0.75rem]` e `text-[0.875rem]` — que são exatamente `text-xs` e `text-sm`.
E havia **13 grafias diferentes do mesmo rótulo em caixa alta a 11px**, entre
`text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700` e
mais doze variantes.

Dois lugares concentravam o ruído:

- **O rodapé** — presente em toda página — usava **11 tamanhos avulsos**:
  0.78, 0.8, 0.85, 0.86, 0.9, 0.95, 0.97, 1, 1.02, 1.06 e 1.3rem. Seis deles
  estão a 1 ou 2% um do outro: ninguém enxerga a diferença, e cada um é um
  degrau a mais na assinatura da página. Havia ainda um
  `font-size: 1.06rem !important` em `footer-alignment.css` que valia só acima
  de 1800px — um degrau tipográfico que existia em uma largura de tela e em
  nenhuma outra.
- **A faixa de marcas** usava sete: 0.63, 0.66, 0.7, 0.72, 0.82, 1.02 e 1.6rem,
  quatro deles abaixo do piso de 12px.

Tudo convergido para a escala do sistema (`micro`, `sobretitulo`, `text-xs`,
`text-apoio`, `text-corpo`, `text-sm`, `text-base`…). Os degraus fracionários
que sobraram — 16,07 · 17,1 · 22,28 · 31,8 · 45,6 — são saída de `clamp()`, ou
seja, a escala fluida funcionando, não desvio.

---

## 2. A borda esquerda da página descia em degraus

O achado mais visível, e o mais fácil de não ver: **abaixo de 1440px os quatro
valores coincidem.** Só aparece em monitor grande — que é onde o dono de uma
clínica costuma abrir um site de equipamento.

Havia quatro caixas de conteúdo empilhadas verticalmente:

| Peça | Caixa | Origem |
|---|---|---|
| Cabeçalho | 1888px | `max-width: 118rem !important` em `header-search.css` |
| Barra de categorias | 1440px | `container-jb` |
| Conteúdo | 1600px | `container-jb max-w-[100rem]`, repetido 25 vezes |
| Rodapé | 1840px | `container-jb max-w-[115rem]` |

E, dentro da própria home, sete faixas a 1600 e quatro a 1440 — abertura,
manifesto, bancada e a chamada do comparador tinham esquecido o acréscimo. A
1600px o título de uma faixa começava em 40px e o da seguinte em 120px,
alternando ao rolar.

Duas notas do próprio time já descreviam este defeito localmente, em
`vitrine.tsx` e em `unidade-fisica.tsx` — cada uma com o remendo
`max-w-[100rem]` na sua faixa. O que faltava era nomear a decisão.

**Agora existe `container-loja`** (100rem), documentado em `globals.css` ao lado
de `container-jb` (1440px, para formulário, política, checkout e painel) e
`container-estreito`. Cabeçalho, barra de categorias, conteúdo e rodapé usam a
mesma caixa. Medido a 1280, 1440, 1600 e 1920px: uma linha só.

Consequência boa: o rodapé tinha um quarto degrau de layout, `min-[1840px]`,
que punha assinatura + provas + políticas numa linha. Com a caixa em 1600 ele
nunca mais cabia — a 1920px "Suporte técnico especializado" passava por cima
de "Entrega e retirada". O degrau saiu.

---

## 3. O vermelho voltou a ser sinal

O cartão do catálogo já tinha resolvido isto, e o motivo está escrito lá:

> *"era um retângulo vermelho de largura inteira, dezesseis por tela, e o
> vermelho da JB é sinal de ação — repetido dezesseis vezes deixa de apontar
> para coisa nenhuma"*

O cartão da **home** continuava com o retângulo vermelho de largura inteira —
nove por página. Dois cartões mostrando o mesmo produto discordavam sobre isso.

O cartão da vitrine passou para a mesma gramática: convite em contorno, o
vermelho só no ícone do carrinho (44px), e o comparador ao lado. De quebra, o
cartão da home ganhou **adicionar ao carrinho**, que só o do catálogo tinha.

---

## 4. Coisas que o sistema já tinha e ninguém usava

- **`TrilhoOuGrade`** (`ui/grade.tsx`): 60 linhas escritas e documentadas para
  transformar a fileira de quatro cartões em trilho horizontal no celular —
  e **nenhuma tela a usava**. A home tinha 18.831px de rolagem no celular.
  Com o trilho, 15.749px: três telas e meia a menos, sem espremer a fotografia.
- **`Secao` e `TituloSecao`** (`ui/secao.tsx`, `ui/data.tsx`): o envelope de
  faixa e o degrau sobretítulo → título → apoio. As faixas da home escreviam
  os dois à mão, com respiro próprio e o rótulo a 11px. Convertidas.
- **Grade de coleção curta**: `colunasAte` fecha a fileira quando há menos itens
  que colunas — mas fechar em UMA coluna fazia o cartão ocupar 1600px, com a
  foto no meio de um retângulo de tela inteira. Era o que a home mostrava no
  dia em que havia um seminovo publicado. Agora o teto por célula devolve a
  proporção de cartão.

---

## 5. O e2e estava vermelho antes desta rodada

Rodando a suíte inteira no HEAD: **4 de 99 falhando**. Ao fim desta rodada: **99 de 99**. Três delas nada têm a ver com
esta rodada — vêm dos dois últimos commits (`25405d0` e `37aa9f6`, 12/09 às
04:02 e 04:08), que transformaram as cinco seções da ficha em sanfona fechada.
O `13-marketplace-produto.spec.ts` não foi tocado desde 11/09 e ainda registra
o contrato oposto, medido na época contra dez fichas de produto de referência:

> *"Nenhuma das dez fichas de produto medidas como referência recolhe a ficha
> técnica no desktop."*

O que as falhas revelaram, além do desacordo:

1. **A ficha perdeu os cinco cabeçalhos de seção.** Ao virar sanfona, o título
   de cada bloco passou de `h2` para `<span>`. Quem navega por títulos deixou
   de encontrar "Especificações técnicas" e "Antes de comprar", e a barra
   "Seções deste equipamento" apontava para âncoras sem cabeçalho. Corrigido:
   `h2` dentro do `summary`, que é marcação válida.
2. **O rótulo "Fechar" saía em `graf-600`** — cinza que a loja pública não usa
   em texto, e que o próprio `15-legibilidade-alinhamento.spec.ts` proíbe. Não
   aparecia porque nenhuma seção nascia aberta. Corrigido.
3. **Ficha técnica e "Antes de comprar" voltaram a nascer abertas.** As outras
   três — "Sobre o produto", "Entrega, garantia e suporte" e "Dúvidas" —
   continuam gaveta, que é onde a divulgação progressiva ajuda de verdade.
   **Se a intenção era mesmo fechar as cinco, isto se desfaz tirando duas
   linhas `aberto`** em `(vitrine)/loja/[slug]/page.tsx` — mas aí o
   `13-marketplace-produto.spec.ts` precisa ser reescrito, e vale dizer por
   quê, porque ele foi escrito com medição.

A quarta falha foi minha, e o teste é que estava certo pelo motivo errado: ele
media `main .container-jb` e exigia uma largura só. Com a loja usando
`container-loja`, a lista voltava **vazia** — e lista vazia passa em
`toHaveLength(0)`… mas ele pedia 1, então falhou de forma honesta. Agora mede
as duas classes: se alguém misturar as caixas na mesma página, aparecem duas
larguras.

---

## 6. Ficha de produto

As cinco seções de decisão nasciam todas fechadas. A metade de baixo da ficha
virava quatro gavetas iguais, cada uma com um resumo de uma linha e um botão
"Ver detalhes".

- **Especificações técnicas nasce aberta.** Num equipamento de clínica a tabela
  — voltagem, capacidade, ciclo, medida de bancada — é o que decide a compra.
- **Cada gaveta fechada diz quanto tem dentro**: "6 especificações",
  "3 perguntas respondidas". Fechado, o cartão dizia o que tem lá dentro mas
  não quanto, e quatro deles enfileirados eram indistinguíveis.

---

## 7. A varredura de acessibilidade estava medindo o quadro errado

A home reprovava contraste em 3 a 5 nós, variando a cada rodada. Investigado:
no instante em que o axe media, o container da abertura estava com
`opacity: 0` — a animação `surge` ainda não tinha terminado —, e o axe
calculava a cor misturada com o fundo (`#7d7e7f` em vez de `#1a1c1e`).
Dois segundos depois o mesmo elemento renderiza `rgb(26,28,30)`, que dá 15,9:1.

**Não era defeito de produto: era a medição chegando cedo.** `networkidle` não
é o fim da pintura. `_varredura-publica.mjs` agora espera as animações
*finitas* terminarem, com teto de 2s — animação guiada por rolagem tem contagem
finita mas só "termina" quando a seção sai da tela.

Com a espera: **28 rotas × 2 larguras, limpa.**

---

## 8. Back e banco — o que foi olhado

Não foi pedido mexer, e não foi mexido. O que a leitura mostrou:

**Está sólido.**

- Autorização é do servidor em todas as ações de escrita do painel. Contado
  arquivo a arquivo: todos os `admin-*.ts` têm mais chamadas de guarda
  (`exigirEdicao`, `exigirLeitura`…) do que funções exportadas.
- Camada de dados sem fartura: `select` explícito, `Promise.all`, `use cache`
  com `cacheTag`/`cacheLife`. `dadosDaHome` faz oito consultas em paralelo e
  puxa de propósito mais do que mostra, para a curadoria não deixar fileira
  pela metade.
- 77 modelos, 128 índices declarados, 14 migrações. Nenhum `include` profundo
  no caminho público.
- 625 testes unitários e 99 de ponta a ponta.

**O que eu apontaria, em ordem:**

1. **56 das 119 chaves estrangeiras não têm índice que comece por elas.**
   No Postgres isso pesa em `join` e, principalmente, em exclusão em cascata.
   Com 20MB de banco não dói hoje; as que valem a pena já são
   `OrderItem.productId`, `CartItem.productId`, `ProductMedia.mediaId` e
   `ProductRelation.targetId`.
2. **O banco local ainda tem as duplicatas** que o preview já unificou:
   categoria "Biossegurança" duas vezes, e os produtos "Aspirador cirúrgico
   móvel" e "Ultrassom com jato de bicarbonato". `pnpm duplicatas:unificar`
   resolve; os seeds recriam.
3. **`/cadastro` emite aviso de prerender do Next 16** a cada carga:
   `getSettings` acessa o banco fora de `<Suspense>` em
   `MolduraAutenticacao`. Não quebra nada, mas tira a rota da renderização
   instantânea.

---

## 9. O que ficou em aberto no front

**A camada de CSS de remendo do cabeçalho foi resolvida na segunda rodada —
ver seção 10.**

Sobram, todas medidas:

- **Valores fora da escala no cabeçalho da ficha**: raio de 0,78rem e 0,82rem,
  peso 560, corpo de 0,84rem. Preservados de propósito na consolidação, para
  não esconder um restyle dentro de uma refatoração. É uma decisão de desenho
  de dez minutos, separada.
- A caixa de benefícios da faixa de marcas é deslocada de propósito
  (`ml-[16%] max-w-[70%]`) e destoa do alinhamento novo. É escolha de
  composição, não defeito.
- A manchete da abertura tem **duas** linhas em vermelho: a palavra do rodízio
  (que é a variável, e faz sentido) e "pelos próximos anos." (que é ênfase).
  Com as duas, o vermelho deixa de marcar o que muda.
- `min-[1800px]` sobrevive em cinco lugares do rodapé como ajuste fino de
  respiro. Não quebram nada com a caixa nova, mas também não fazem mais muito
  sentido.

## 10. Segunda rodada — o CSS de remendo do cabeçalho

Era o item que tinha ficado em aberto. Quatro folhas —
`header-premium.css`, `header-search.css`, `header-product.css`,
`header-product-mobile.css` — com **117 `!important`** e seletores que contavam
filhos. Agora é uma: `src/app/cabecalho.css`, com **3 `!important`**.

### Como a troca foi provada

Refatorar acabamento sem mexer no desenho só vale se der para provar. O método
foi medir a **assinatura computada** do cabeçalho e do rodapé — 23 propriedades
de cada elemento, em 4 rotas × 4 larguras — antes e depois:
**137.904 propriedades comparadas, 63 diferentes (0,046%)**, e todas as 63 são
a única mudança de desenho pretendida (a caixa da ficha). Home, catálogo e
carrinho ficaram **idênticos em todas as larguras**.

A primeira tentativa não passou nesse teste, e foi ele que pegou:

- a busca do topo perdia raio, sombra e peso de fonte **abaixo de 1024px**;
- o botão de enviar a busca deixava de virar só a lupa abaixo de 1200px;
- a logo da ficha voltava de 28px para 38px no celular.

### O que a medição revelou de graça

**Duas das quatro folhas brigavam, e a mais nova perdia em silêncio.**
`header-search.css` declarava raio de 1rem, sombra própria e `font-weight: 500`
para o campo de busca — e nada disso chegava à tela, porque
`header-premium.css`, importado depois e com seletor mais específico, mandava
raio de 0,75rem, outra sombra e peso 550. `!important` dos dois lados. O
arquivo consolidado escreve o que a tela mostrava.

**Os três `!important` que sobraram são necessários**: `next/image` escreve
`style="height:38px"` no próprio elemento da logo, e estilo em linha ganha de
qualquer seletor.

**O que NÃO mudou:** raio de 0,78rem e 0,82rem, peso 560, corpo de 0,84rem —
valores fora da escala do sistema. Trocá-los de carona numa mudança de
mecanismo seria esconder um restyle dentro de uma refatoração. Ficam anotados
como dívida de desenho, separada.

### A caixa da ficha

Único desenho que mudou, e porque era defeito: o cabeçalho da ficha corria a
**1792px** enquanto o conteúdo da mesma página corria a 1600. A 1920px o logo
começava em 64px e o título do produto em 200 — o mesmo degrau que a rodada
anterior tinha tirado do resto da loja. Agora a ficha usa `container-loja` como
todo mundo, e a busca continua larga por ser elástica, não por a caixa ser
maior.

---

## 11. Dois defeitos achados no caminho

### 11.1 Entre 1024 e 1279px não havia navegação de catálogo

A faixa vermelha de categorias entra em `xl` (1280px). O botão do menu sumia em
`lg` (1024px). **No meio, 256px de largura sem nenhuma das duas** — nem faixa,
nem gaveta. É a janela do iPad Pro deitado (1024, 1112, 1194px) e de qualquer
navegador em janela: ali a pessoa só tinha o campo de busca.

Medido de 1023 a 1280px, um a um. O botão do menu agora vai até `xl`, e o
atalho "Solicitar assistência" cede o lugar nessa faixa — sem isso a linha
estourava 14px para fora da tela a 1024px. É a mesma escolha que a ficha de
produto já fazia no mesmo intervalo.

O roteiro `responsivo-pdp.mjs` vinha apontando para este problema e ninguém
lia: ele reprovava "navegação principal não está visível" em **todas** as
larguras de desktop, porque procurava a navegação dentro do `<header>`, onde
ela não mora desde 12/09. Reprovando sempre, não reprovava nada. Agora ele
cobra o contrato certo — em toda largura tem de haver faixa **ou** gaveta, e
nunca as duas.

### 11.2 "BUSCAR" saía cortado de 640 a 1199px

Uma regra encolhia o botão de enviar a busca para 2,9rem abaixo de 1200px,
para ele virar só a lupa. Ela nasceu quando a palavra "Buscar" era injetada
por `content:` no CSS — bastava esconder o pseudo-elemento. Em 12/09 a palavra
virou texto de verdade no JSX, e a mesma regra passou a cortar a palavra na
borda arredondada do campo.

O componente já resolve isso sozinho e melhor: lupa abaixo de `sm`, palavra de
`sm` para cima. A regra saiu. **É a terceira vez que uma suposição da era do
`content:` cobra o seu preço neste cabeçalho** — as duas anteriores foram a
assinatura "MARKETPLACE ODONTOLÓGICO" e o "BUSCAR Buscar" duplicado.

### 11.3 A logo do rodapé encostava no topo

Esta foi minha. `footer-alignment.css` subia a coluna da esquerda em
`translateY(-3.375rem)` acima de 1800px, calibrado para o rodapé quando ele
tinha caixa própria de 1840px. Com o rodapé na caixa de 1600, os mesmos 54px
passavam do respiro: **medido, −1px acima de 1800px, contra 29px em 1600** — a
logo encostada na borda superior. O deslocamento saiu; o respiro ficou em 37px.

---

## Portões

| Portão | Resultado |
|---|---|
| `tsc --noEmit` | limpo |
| `eslint .` | **0 erros**, 51 avisos (eram 51 antes) |
| `vitest run` | **625 de 625** |
| Varredura pública (axe + rolagem-H + console) | **28 rotas × 2 larguras, limpa** |
| `responsivo --so=publico` | **168 medições, 0 problema** (320 a 2560px) |
| Playwright e2e | **99 de 99** (estava 95/99 no HEAD, antes desta rodada) |
| Assinatura computada do cabeçalho e do rodapé | **137.904 propriedades, 63 diferenças**, todas intencionais |
| `responsivo-pdp` | **cabeçalho da ficha aprovado de 320 a 2560px** |
