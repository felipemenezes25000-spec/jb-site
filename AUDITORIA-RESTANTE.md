# Comparador, design system, seminovos, home, busca e transversais

> Documento de trabalho, **não versionado**. Estado: implementado e validado em
> 10/09/2026. Sem commit, sem deploy.
> Ficha em `AUDITORIA-PDP.md`, catálogo em `AUDITORIA-CATALOGO.md`, funil em
> `AUDITORIA-CHECKOUT.md`.

---

## 1. Comparador

| Problema | Medida |
|---|---|
| A resposta vinha depois do formulário que a produziu | com `?p=a&p=b&p=c`, a tabela começava em **2.359px de uma página de 3.966** — duas telas e meia de seletor antes da comparação |
| Colunas de largura desigual | a coluna do equipamento sem dimensões nem peso cadastrados encolhia para menos de um terço da vizinha |
| Nenhum recorte do que muda | dez atributos no mesmo peso; achar a diferença era trabalho de quem lê |

**O que mudou.** O seletor só abre a página quando não há o que comparar — que é
quando ele *é* a página. Com comparação montada ele desce e vira gaveta fechada
("Trocar equipamentos ou refazer as perguntas"). A tabela ganhou `table-fixed`
com colunas iguais, um contador ("9 de 10 atributos mudam entre eles") e o
recorte **"Mostrar só o que muda"**, que vive na URL como o resto do estado
desta página.

Tabela: **2.359 → 1.078px**. Página: **3.966 → 2.831px**.

> Uma correção do que eu havia afirmado antes: a página **tem** `h2` quando a
> comparação existe. Os "zero `h2`" que medi eram do `/comparar` vazio, que é
> um formulário — não uma página sem estrutura.

**O tingimento de linha foi testado e removido.** Marcar as linhas que mudam
parecia certo até a medição: 9 de 10 mudam. Pintar nove de dez não destaca —
lista. O recorte remove as que empatam, que é destaque de verdade.

---

## 2. Design system

O achado, com número:

| Valor avulso | Vezes em `src/` | Existe token? |
|---|---|---|
| `text-[0.8125rem]` | **324** | **sim** — `texto-apoio`, no `globals.css` |
| `text-[0.9375rem]` | 147 | não — degrau de 15px sem nome |
| `text-[0.875rem]` | 37 | `text-sm` |
| `text-[0.75rem]` | 36 | ~`micro` (que também define peso e caixa) |
| outros 20 valores | ~90 | — |

**A escala existe e o código passa por fora dela.** É a mesma doença que a
ficha de produto tinha, no app inteiro.

**O que foi feito:** o caso visível. A home tinha **sete `h2` em três tamanhos**
(40, 43 e 46px), todos de quatro `clamp()` avulsos diferentes. Os seis foram
trocados por `text-section`, e um peso 700 solto virou 800 como os outros.
Home agora: **um tamanho (44px a 1440, 32 a 390) e um peso**.

**O que NÃO foi feito, e por quê.** Trocar as 324 ocorrências de
`text-[0.8125rem]` por `texto-apoio` não é substituição segura: o utilitário
também define `line-height: 1.55`, e a maioria dos usos vem acompanhada de um
`leading-*` próprio. Uma troca cega mudaria entrelinha em centenas de pontos
de admin, conta e loja de uma vez, sem ninguém olhando. Isso é trabalho de uma
passada dedicada, arquivo por arquivo, com captura antes e depois.

> Também corrigi uma afirmação minha: `/seminovos` e `/busca` **não** tinham
> inconsistência de `h2`. Os títulos de 15px são os nomes dos produtos nos
> cartões — nível legítimo, não escala quebrada. O outlier era só a home.

---

## 3. Seminovos

Os sete sinais de procedência — unidade por anúncio, número de série, ano de
fabricação, uso acumulado, checklist da revisão, condição descrita, garantia —
já existiam e são gerados do que está mesmo cadastrado. Estavam **no rodapé da
página, a ~2.100px de rolagem**.

`Vitrine` ganhou um slot `faixaDeConfianca` entre o cabeçalho e os controles, e
os quatro primeiros sinais passaram a aparecer antes da grade. O bloco completo
continua embaixo, com a explicação de cada um.

---

## 4. Busca

O painel de sugestões herdava a largura do campo por `inset-x-0`. No cabeçalho
a busca é travada em ~336px a 1440, e com foto, marca, preço e modelo na mesma
linha sobravam ~145px para o nome: **todo** resultado saía cortado —
"Autoclave horizon…", "Cuba lavadora ultr…", "Autoclave vertic…".

O painel passou a poder ser mais largo que o campo (`min-w` de 30rem, limitado
pela janela, ancorado à esquerda). **336 → 478px**, e todos os nomes cabem. No
celular continua exatamente da largura do campo.

---

## 5. Componentes globais — **12/12**

O teste que o briefing pede, no cabeçalho: estado inicial limpo, hover abre,
sair com o mouse fecha, Enter no gatilho abre, ESC fecha, clique abre e clique
fora fecha, **tabular 16 vezes não prende menu**, foco visível em todo
controle, nenhum alvo abaixo de 24px, e no celular menu abre e ESC fecha.

Um defeito real corrigido: o link de e-mail do rodapé tinha **17px de altura**
fora de toque (`pointer-coarse:min-h-11` só valia no dedo) — abaixo do alvo
mínimo de 24px. Não é link no meio de uma frase; é item de lista de contato.

---

## 6. Performance

Lighthouse contra servidor de desenvolvimento não representa produção, então a
medição foi do que é real em qualquer modo: o que cada rota baixa.

| | Antes | Depois |
|---|---|---|
| Imagens da home | **2.671 kB** | **100 kB** |
| Imagens de `/loja` | 269 kB | 162 kB |
| LCP da home | ~1.140 ms | ~916 ms |
| LCP de `/loja` | ~936 ms | ~636 ms |

**Causa:** `unoptimized={imageUrl.startsWith("/")}` no hero e em dois cartões
antigos — toda imagem local era servida crua. Um WebP de 2.200px para um espaço
de 600px, um PNG de 1.024px para 326px. Sem justificativa no código, e o cartão
novo do marketplace já provava que a otimização funciona para arquivo local: é
por isso que `/loja` baixava 269 kB e a home 2.671 kB.

Junto: o **logotipo** era servido a 640px para 69px de espaço, em toda página do
site — `sizes` calculado a partir da altura pedida resolveu.

> Não medido: build de produção. Rodar `next build` aqui escreveria em `.next`,
> que é a mesma pasta do servidor de desenvolvimento em uso por outra sessão.

---

## 7. Varredura pública — **28 rotas × 2 larguras, limpa**

axe-core (WCAG 2.0/2.1 A e AA), rolagem horizontal e erros de JavaScript em
`/`, `/loja`, `/novos`, `/seminovos`, `/usados`, `/recondicionados`,
`/categoria/[slug]`, `/marcas`, `/busca`, `/comparar` (vazio e montado),
`/loja/[slug]`, `/carrinho`, `/assistencia-tecnica`, `/manutencao-preventiva`,
`/planos-de-manutencao`, `/servicos`, `/orcamento`, `/sobre`, `/estrutura`,
`/contato`, `/faq`, `/central-tecnica`, `/simulador-de-custo`,
`/pecas-e-acessorios`, `/trocas-e-devolucoes`, `/entrar` e `/cadastro`, a 390 e
1440px.

**Zero violações, zero rolagem horizontal, zero erro de JavaScript.**

A primeira passada encontrou uma violação — e era minha: a faixa que eu
acabara de pôr nos seminovos rolava na horizontal sem ser focável
(`scrollable-region-focusable`, grave, a 390px). Mesmo defeito que a faixa da
ficha de produto já tinha tido, mesma correção.

---

## 8. e2e: 16 falhas, **uma** minha

| Falha | De quem |
|---|---|
| `12-marketplace-colecoes:6` — "usa quatro colunas no desktop" | **minha, de propósito**: a lateral de filtros mudou a conta. Teste reescrito para o contrato novo — a grade nunca encolhe quando a janela cresce |
| 15 outras | anteriores a esta sessão |

A prova do "anteriores": todos os nomes acessíveis que esses testes procuram e
não encontram — `Todos os filtros`, `Abrir o menu de Equipamentos`, `Buscar no
catálogo JB`, `Diferenciais da JB`, `Navegação da home no celular` — **também
não existem em `src/` no `HEAD`**. Nada sumiu nesta sessão; foi conferido termo
a termo, comparando `git grep` no `HEAD` com o estado atual.

Cheguei a suspeitar que o ticker de marcas restaurado tivesse reintroduzido o
texto cinza que o teste 15 proíbe. Medido a 320px: **nenhum** dos textos
cinzas ou abaixo de 12px está no ticker — todos vêm de componentes da home que
não foram tocados.

---

## Portões, ao fim

- `tsc --noEmit` limpo · 621 testes unitários · `eslint` 0 erros (52 avisos, o
  mesmo número do início da sessão)
- QA da ficha **21/21** · do catálogo **18/18** · do cabeçalho **12/12**
- varredura de 5 fichas × 6 larguras: limpa
- varredura pública de 28 rotas × 2 larguras: limpa
- `responsivo:pdp` aprovado de 320 a 2560px
- Sem commit, sem push, sem deploy.

## Continua em aberto

- **Área da Clínica** — fora do pedido desta rodada.
- **Estados de pagamento recusado/expirado** — `PAYMENT_PROVIDER=mock` sempre
  aprova; os ramos de erro não têm prova.
- **15 e2e vermelhos por texto que mudou** — decisão de qual lado está certo é
  de quem escreveu a cópia.
- **Imagens legadas em preview e produção** — a limpeza das 90 foi local.
- **Favoritar no cartão** do catálogo.
- **Os 324 `text-[0.8125rem]`** e os 147 de 15px, acima.
