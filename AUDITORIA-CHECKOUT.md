# Auditoria do funil — carrinho, entrega e checkout

> Documento de trabalho, **não versionado**. Pode apagar quando não servir mais.
> Estado: **implementado e validado** em 10/09/2026. Sem commit, sem deploy.
> Ficha de produto em `AUDITORIA-PDP.md`; catálogo em `AUDITORIA-CATALOGO.md`.

---

## O que já estava certo

Vale dizer antes de listar defeito, porque mudou o tamanho do trabalho: o
**miolo do checkout já atende o briefing**. O fluxo é exatamente o pedido —
Identificação → Dados → Entrega → Pagamento → Revisão —, com régua de cinco
passos, resumo do pedido fixo à direita, "Editar" por bloco na revisão, Pix
explicado em três linhas, aviso de ambiente de demonstração e o total
repetido onde a decisão acontece. No celular há régua compacta ("ETAPA 1 DE
5") com barra de progresso e barra inferior com total e "Resumo".

O carrinho também: produto, foto, quantidade com mais/menos, remover, cupom,
subtotal, entrega, total, parcelamento e "Finalizar compra".

Não era caso de redesenhar. Era caso de tirar o que estava em volta.

---

## Parte 1 — O que estava errado (medido, com o carrinho cheio, a 1440px)

| Tela | Cabeçalho | Rodapé | Saídas do funil | Miolo |
|---|---|---|---|---|
| `/carrinho` | 116px · 8 links | 695px · 39 links | **40** | 8 links · 10 botões |
| `/checkout` | 116px · 8 links | 695px · 39 links | **40** | 4 links · 2 botões |
| `/escolher-entrega` | 116px · 8 links | 695px · 39 links | **40** | 2 links · 2 botões |

`/checkout` e `/escolher-entrega` moravam dentro de `(vitrine)` e herdavam a
loja inteira: busca, conta, contador de carrinho, "Solicitar assistência", os
quatro mega menus e as 39 entradas do rodapé. **Quarenta portas de saída
contra quatro links do próprio checkout** — e o rodapé sozinho ocupava 695px
de uma página de 2.230, quase um terço da tela dedicado a ir embora, no exato
momento em que a pessoa digita um cartão.

O briefing é direto: *"Não use o header completo. Reduza distrações."*

Dois defeitos menores apareceram junto:

- **`role="progressbar"` sem nome acessível** na régua compacta do celular —
  `aria-progressbar-name`, gravidade **séria** no axe. Havia `aria-valuetext`
  ("Etapa 1 de 5: Identificação"), que diz o *valor*, não o *nome*: o leitor
  de tela anunciava o progresso sem dizer progresso de quê.
- **`/images/logo.png`** — o logotipo do site antigo, que renderiza um
  aglomerado de pontos vermelhos com um "J.B." apagado. Entrou por engano na
  primeira versão da casca nova e saiu na mesma sessão.

---

## Parte 2 — O que mudou

**Grupo de rota `(checkout)` com casca própria.** `/checkout` e
`/escolher-entrega` saíram de `(vitrine)`. Grupo de rota não mexe em URL:
`/checkout` continua `/checkout`.

A casca tem três coisas e nada mais:

1. a marca, que volta para `/loja` — a única saída que faz sentido ali;
2. o selo de compra segura;
3. no rodapé, o caminho para falar com a JB (WhatsApp, telefone, horário) e os
   três documentos que são obrigação: termos, privacidade, trocas e devoluções.

Conferido que a mudança era segura antes de mover: `vitrine.css` é escopado em
`.vitrine` e o checkout não usa o contexto do comparador.

**`aria-label` na barra de progresso**, herdando o mesmo rótulo do `<nav>`.
Conserta de uma vez todas as telas que usam `Passos` — inclusive a abertura de
chamado da assistência.

---

## Parte 3 — Resultado medido

| Tela | Saídas antes | Saídas depois | Cabeçalho | Rodapé | Página |
|---|---|---|---|---|---|
| `/checkout` | 40 | **4** | 116 → **65px** | 695 → **214px** | 2.230 → **1.658px** (−26%) |
| `/escolher-entrega` | 40 | **4** | 116 → **65px** | 695 → **214px** | 1.476 → **905px** (−39%) |
| `/carrinho` | 40 | 40 | inalterado | inalterado | inalterado |

As quatro saídas que sobraram: `/loja`, `/termos`, `/privacidade`,
`/trocas-e-devolucoes`.

O carrinho ficou como estava **de propósito**: ali "continuar comprando" é uma
ação legítima, e o cabeçalho completo é o caminho dela. O rodapé de 695px
nessa tela é discutível, mas é decisão de conteúdo, não de funil.

---

## Parte 4 — Validação

**O funil foi percorrido inteiro, não fotografado por partes.** Um roteiro
enche o carrinho com três equipamentos (R$ 25.660,00), abre `/checkout` e
avança pelas cinco etapas preenchendo o que cada uma pede:

```
volta 1: etapa 1 Identificação → 2 Dados        preencheu: E-mail, senha
volta 2: etapa 2 Dados         → 3 Entrega      preencheu: Nome, CPF, Telefone
volta 3: etapa 3 Entrega       → 4 Pagamento
volta 4: etapa 4 Pagamento     → 5 Revisão
```

Zero erro de console, zero requisição 4xx/5xx em todo o percurso. Numa das
corridas o roteiro foi até o fim e **fechou o pedido #JB-000549**, em
`aguardando_pagamento` — prova de que o funil conclui. O ambiente está em
`PAYMENT_PROVIDER=mock`, então nenhuma cobrança real acontece; o cliente e o
pedido de teste foram removidos do banco local depois.

Outras verificações:

- **axe-core WCAG 2.0/2.1 A e AA: 0 violações** em `/carrinho`, `/checkout` e
  `/escolher-entrega`, a 390 e 1440 — depois do conserto da barra de progresso.
- `tsc --noEmit` limpo · 621 testes unitários passando · `eslint` 0 erros
  (52 avisos, o mesmo número de antes da sessão)
- 9 rotas públicas: 200, sem imagem quebrada, sem 4xx, sem erro de JS
- Sem regressão: PDP 21/21, catálogo 18/18, varredura limpa, `responsivo:pdp`
  aprovado de 320 a 2560px
- Um único landmark `<main>` na página. Os dois que o roteiro chegou a ver
  eram transitórios: ao cruzar a fronteira entre grupos de rota, o Next mantém
  o layout antigo em árvore enquanto monta o novo.

---

## O que ficou de fora

- **Estados de pagamento recusado / expirado / tentar de novo.** O provedor
  `mock` sempre aprova, então os ramos de erro não foram vistos rodando. O
  briefing pede que sejam tratados; o código deles existe, a prova não.
- **Rodapé do carrinho** — 39 links numa tela de compra. Deixado como está por
  ser decisão de conteúdo.
- Sem commit, sem push, sem deploy — como pedido.
