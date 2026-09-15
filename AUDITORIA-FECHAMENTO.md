# Fechamento — Área da Clínica, favoritos, pagamento, design system e e2e

> Documento de trabalho, **não versionado**. Estado: implementado e validado em
> 10/09/2026. Sem commit, sem deploy.
> Rodadas anteriores: `AUDITORIA-PDP.md`, `AUDITORIA-CATALOGO.md`,
> `AUDITORIA-CHECKOUT.md`, `AUDITORIA-RESTANTE.md`.

---

## 1. Área da Clínica — já era SaaS; faltava passar pelo axe

O painel **não precisava de redesenho**. Ele já tem o que o briefing descreve:
sidebar com contador por seção, "Precisa da sua atenção" com o orçamento
esperando decisão e o pedido aguardando pagamento, quatro cartões de KPI,
disponibilidade do parque, próximo compromisso com data, e blocos de pedidos
recentes, chamados em aberto, orçamentos aguardando e equipamentos que pedem
atenção. Não parece "Minha Conta".

O que faltava era acessibilidade: **as 10 rotas falhavam**, todas por
contraste, com 1 a 10 nós cada. Três causas raiz, todas em componente
compartilhado:

| Causa | Medida | Correção |
|---|---|---|
| `.shell :global(main th)` com hex cravado à mão | `#6f7680` sobre `#f8f9fb` = **4,35:1** (exigido 4,5) | `var(--color-graf-500)` = **4,97:1** |
| `<kbd>` do atalho de busca em `text-graf-400` | `#9ba1a8` sobre branco = **2,6:1** | `text-graf-500` = 5,23:1 |
| `<dl>` com `<span>` entre `<dt>` e `<dd>` | axe `definition-list`, grave | ícone passou para dentro do `<dd>` |

O próprio `globals.css` já avisava, no comentário da paleta: *"graf-400 é só
borda, ícone decorativo e divisor: nunca texto"*.

**Resultado: 10 de 10 rotas limpas**, a 390 e 1440px.

---

## 2. Favoritar no cartão do catálogo

O briefing pede "favoritar/comparar" no cartão; comparar já estava lá,
favoritar não — embora a ação (`alternarFavorito`), a página
(`/minha-jb/favoritos`) e o botão da ficha de produto já existissem.

O cuidado que valeu: buscar por cartão seriam **24 consultas** numa página de
catálogo. O conjunto dos ids favoritados vem de uma vez, em `Resultados`.

Conferido rodando: logado, o coração alterna `aria-pressed` de `false` para
`true` sem sair de `/loja`; visitante vai para `/entrar?voltar=%2Floja`.

Custo: `id` precisou entrar em `ProdutoCard` e `ProdutoMarketplaceCard` — o
cartão só carregava `slug`, e o formulário precisa da chave.

---

## 3. Pagamento: recusado, em análise e aprovado — provados

Ficou pendente nas rodadas anteriores porque "o mock sempre aprova". Não é
verdade: `src/lib/pagamento/mock.ts` decide pelo **valor** — centavos
terminando em 01 recusam, 02 ficam em análise, o resto aprova.

Com o preço do produto de teste ajustado para cada final, os três desfechos
foram percorridos de ponta a ponta:

| Final | Pedido | O que a tela mostra |
|---|---|---|
| `,01` | JB-000550 | **"Pagamento recusado"** com o motivo do emissor, o meio usado (cartão · visa ····4321), o valor, e três saídas para tentar de novo: Pix, Cartão, **"Gerar nova cobrança"** |
| `,02` | JB-000551 | pagamento **em análise**, pedido registrado e reservado |
| `,00` | JB-000552 | **"Pagamento aprovado"** + **"O equipamento entrou no prontuário"**, com link para a Área da Clínica |

Nenhuma cobrança real (`PAYMENT_PROVIDER` ausente → `mock`). Os três clientes e
pedidos de teste foram removidos do banco local depois, e o preço restaurado.

O estado aprovado fecha o laço que o briefing inteiro persegue: a compra vira
equipamento acompanhado.

---

## 4. Design system — os 473 valores avulsos viraram token

O achado da rodada anterior, agora resolvido:

| Valor | Vezes | Virou |
|---|---|---|
| `text-[0.8125rem]` | 325 | `text-apoio` |
| `text-[0.9375rem]` | 148 | `text-corpo` |

**Por que era inseguro antes e deixou de ser.** A utilidade `texto-apoio` já
existia com o mesmo tamanho, mas ela **também** fixa `line-height: 1.55` — e a
maioria dos 325 usos traz um `leading-*` próprio. Trocar por ela mudaria
entrelinha em centenas de pontos. A saída foi criar `--text-apoio` e
`--text-corpo` como tokens de **tamanho puro**: o CSS gerado é idêntico ao do
valor avulso, e a troca virou renomeação.

**A prova.** Uma assinatura tipográfica — quantos elementos visíveis em cada
tamanho de fonte — foi tirada de 11 rotas × 2 larguras antes e depois:
**22 de 22 idênticas**.

**O bug que a renomeação revelou.** A primeira medição acusou 7 elementos
saindo de 13px para 16. Causa: `tailwind-merge` não conhece tamanhos
customizados e os classifica como cor, descartando-os quando a classe traz
`text-<cor>`. O `src/lib/utils.ts` já documentava a armadilha e registrava
`hero, display, section, title` — mas **`bloco` nunca foi registrado**. Ou
seja: o token que a rodada da PDP criou para o `h2` de seção era silenciosamente
descartado em qualquer `cn("text-bloco", "text-graf-950")`. Corrigido junto,
com `apoio` e `corpo`.

Fica em aberto: ~90 outras ocorrências avulsas espalhadas por 20 valores
distintos (`text-[0.72rem]`, `text-[1.02rem]`, `text-[11px]`…). São poucos usos
cada, e nomear degrau que aparece três vezes é inventar escala, não organizá-la.

---

## 5. e2e: 19 falhas, e nenhuma era pergunta de design

A suíte inteira rodou: **80 passaram, 19 falharam**. Isso corrige o que este
documento dizia antes — que sobravam 3 e que as 3 eram uma decisão de design
sua. Não eram. Medi, e nenhuma das 19 exigia decisão.

### 16 eram a mesma deriva de copy dos outros 15, nos arquivos que faltavam

Na rodada anterior consertei os specs da loja pública. Os **transacionais**
— carrinho, checkout, conta, painel, frete — ficaram de fora, e é lá que
estavam. Três causas, todas de commit anterior a esta sessão:

| Causa | Origem | Testes derrubados |
|---|---|---|
| `h1` do checkout: teste pede `Fechar pedido`, a tela diz **`Finalizar compra`** | commit `e71e734` | **11**, em 6 arquivos |
| CTA do carrinho vazio: teste pede `Ver equipamentos`, a tela diz **`Ver catálogo`** | commit `d584fa1` | 1 |
| Seletor de quantidade dentro da gaveta `Mais opções da compra`, que nasce fechada | — | 2 |

A primeira valia 11 testes por uma linha: `tests/e2e/apoio.ts:168` é o portão
de entrada de `fecharPedidoComPix`, e todo arquivo que fecha um pedido passa
por ele.

A terceira é a mais instrutiva. O botão `Aumentar quantidade` **existe no DOM**
desde o primeiro render — só não fica clicável enquanto o `<details>` estiver
fechado. O helper clicava direto e esperava os 20 segundos inteiros por algo
que nunca ia aparecer. Um teste que pede quantidade 1 passava; quantidade 2
falhava. O helper agora abre a gaveta antes, e só quando precisa.

### As 3 de legibilidade: a regra está viva, o CSS Module é que escapava

Eu havia escrito aqui que a regra podia estar aposentada. Está em vigor, em
`src/app/globals.css:698`, com a justificativa escrita ao lado:

> *A loja pública prioriza leitura direta: textos informativos não usam cinza
> claro.*

```css
[data-jb-publico="true"] :where(.text-graf-500, .text-graf-600, .text-graf-700) {
  color: var(--color-graf-950);
}
```

A regra alcança classe utilitária, `.texto-suave` e `.prose-jb`. **Não alcança
CSS Module** — que declara `color: var(--color-graf-500)` direto e passa por
baixo. Medido nas 4 rotas do teste, em 320 e 1440px:

| O que o teste acusava | Onde estava, de fato |
|---|---|
| texto cinza | **20 nós**, todos em `hero-vitrine.module.css`, só na home |
| texto abaixo de 12px | **6 nós**, todos a 11,52px (`0.72rem`), no mesmo arquivo |

Os números que este documento trazia antes — 62 cinzas e 32 miúdos — eram de
uma medição velha e não se sustentaram na medição de agora.

Corrigido no próprio módulo: as 6 declarações que pintam **texto** passaram a
`graf-950` (ícone, *placeholder* e moldura ficaram como estavam, porque nenhum
deles é texto), e os 4 tamanhos `0.72rem` viraram `0.75rem` — os mesmos 12px do
degrau `micro`. É diferença de meio pixel; o que ela resolve é a home ser a
única página da loja com um cinza que nenhuma outra usa.

Depois disso, as 8 rotas do teste: **147, 216, 121, 95, 82, 122, 158 e 105
amostras — todas em `rgb(26, 28, 30)`**.

### A terceira não era cinza nenhum: era medir cedo demais

`textos secundários usam preto` não reprovava por cor. Reprovava na **guarda
contra amostra vazia** — `sem amostra de texto em /busca?q=autoclave`, zero
elementos. E a mesma rota, medida por fora, oferecia **95 amostras**.

A diferença é o streaming. Catálogo e busca chegam por `<Suspense>`: quando o
`goto` resolve, a casca pública já existe — por isso o `toHaveCount(1)` logo
antes passava — mas o miolo ainda pode ser o esqueleto, e ali não há texto
nenhum para medir. Com a rota fria, a leitura caía nessa janela.

Uma guarda que existe para o teste não passar à toa não pode, ela própria,
depender do relógio. Virou `expect.poll`: espera a primeira amostra aparecer e
só então julga as cores. A asserção é a mesma; o que mudou é que ela agora
espera o que a página promete entregar.

### E uma regressão minha, que só apareceu por causa disso

Levantar a lista de cascas públicas mostrou que existem três — `(vitrine)`,
`(loja)` e `(acesso)` — e que a quarta, a que **eu criei nesta sessão**, não
estava marcada:

```
src/app/(checkout)/layout.tsx:31   data-jb-checkout="true"      ← e só
```

Enquanto o checkout morava dentro de `(vitrine)`, herdava `data-jb-publico` e
com ele a regra do texto preto. Ao ganhar casca própria, perdeu — em silêncio,
sem teste que cobrisse, porque a rota exige carrinho cheio e nenhuma varredura
chega lá. A casca mudou; a loja é a mesma. O atributo voltou.

## 6. A gaveta do celular que abria e fechava sozinha

Fechadas as 19, a suíte foi de novo: **97 de 99**. As duas que sobraram valem
a pena, porque nenhuma era do tipo que já tinha aparecido.

A primeira era mais uma copy velha, mas **escondida atrás da anterior**: o
teste do frete só chega na linha do resumo depois de passar pelo `h1` do
checkout, e enquanto o `h1` reprovava, ninguém via que o resumo também tinha
mudado — `a combinar — a JB envia o valor antes de despachar` virou, no
`<dd>`, só `a combinar`. Consertar uma revelou a outra.

A segunda foi a que rendeu. `no celular, a gaveta leva ao catálogo` caía com
`element is not stable` e, no fim, `element was detached from the DOM`. Rodada
sozinha, passava 6 de 6 — o retrato clássico de "flake, ignore". Não era.

Medindo a posição da gaveta quadro a quadro, em 10 aberturas seguidas:

```
volta 3 ok            1:187 1:33 1:24 1:23 1:23 1:23 …
volta 4 GAVETA SUMIU  1:77  1:112 1:342 1:387 1:390 0:null 0:null …
```

Ela **entra deslizando e volta sozinha**, sem toque nenhum. O Playwright não
estava impaciente: estava tentando clicar num link que ia embora.

Duas causas, e as duas só aparecem quando o toque chega durante a hidratação:

**1. Um efeito de troca de rota que também roda na montagem.**
`src/components/loja/cabecalho.tsx` fechava menu, mega e busca sempre que
`pathname` mudasse — e o efeito roda uma vez ao montar. Se o toque foi
processado entre o render e a descarga dos efeitos, o efeito de montagem fecha
a gaveta que o toque acabou de abrir. Na montagem os três estados já nascem
fechados, então pular a primeira passagem não perde nada. Isso vale em
produção também, e é o conserto que ficou.

**2. Strict Mode, e este é só de desenvolvimento.** O Next liga
`reactStrictMode` por padrão: o React monta, desmonta e remonta. O remonte
zera o estado, e a gaveta aberta no meio disso se perde. Não existe em
produção — mas existe no `next dev`, que é contra quem a suíte roda.

Por isso o teste passou a abrir e **conferir que continua aberta**, tocando de
novo se sumir — que é o que uma pessoa faria. De quebra, quando a espera
termina a animação de 0,24s já acabou, e o clique seguinte cai em algo parado.
De 8 execuções com 2 falhas, foi para **10 de 10**.

### O que isso diz sobre "flake"

Três das falhas desta rodada eram testes medindo antes de a página existir
(streaming, foco, hidratação). Duas delas eu teria classificado como ruído se
não tivesse medido: a do foco falhava 1 vez em 3 e nem apareceu na primeira
execução completa — passou por sorte. A da gaveta parecia ruído e era defeito.
A diferença entre as duas coisas não está no padrão da falha; está em ir olhar.

## Portões, ao fim de tudo

- **e2e: 99 de 99**, sem retry (a configuração local usa `retries: 0` — cada
  instabilidade aparece como falha, não some no reteste). Começou a rodada em
  80 de 99.
- `tsc --noEmit` limpo · **621 testes unitários** · `eslint` **0 erros** (52
  avisos, o mesmo número do início da sessão)
- **Varredura pública: 28 rotas × 2 larguras, limpa** (axe, rolagem
  horizontal, erros de JS)
- **Área da Clínica: 10 rotas × 2 larguras, limpa**
- QA da ficha **21/21** · do catálogo **18/18** · do cabeçalho **12/12**
- Varredura de 5 fichas × 6 larguras: limpa
- `responsivo:pdp` aprovado de 320 a 2560px
- Assinatura tipográfica: **22/22 idênticas** antes e depois da renomeação
- Peso: imagens da home **2.671 kB → 100 kB**
- Sem commit, sem push, sem deploy.

## O que mudou no produto nesta última rodada

Separado de propósito do que mudou em teste — são coisas diferentes:

| Arquivo | Mudança |
|---|---|
| `src/components/loja/cabecalho.tsx` | efeito de troca de rota deixa de rodar na montagem: a gaveta aberta por um toque durante a hidratação não é mais fechada por ele |
| `src/app/(checkout)/layout.tsx` | volta a declarar `data-jb-publico`, perdido quando o checkout ganhou casca própria |
| `src/components/loja/home/hero-vitrine.module.css` | 6 declarações de texto de cinza para `graf-950`; 4 tamanhos de 11,52px para 12px |

## Continua em aberto

- **Imagens legadas em preview e produção.** Os arquivos já saíram do
  repositório; o banco de cada ambiente precisa do mesmo procedimento.
  `scripts/_legado-imagens.mts` faz isso, roda em modo de conferência por
  padrão e aceita `DATABASE_URL` de qualquer ambiente. Não foi executado lá
  porque as credenciais não estão nesta máquina.
- **~90 valores tipográficos avulsos** de baixa frequência, espalhados por 20
  tamanhos distintos. Nomear degrau que aparece três vezes é inventar escala,
  não organizá-la — ficam como estão até virarem padrão.
- **Os scripts `scripts/_*.{mjs,mts}`** são instrumentos desta sessão, não
  ferramenta do projeto. Todos começam com `_` justamente para serem fáceis de
  apagar em bloco.
