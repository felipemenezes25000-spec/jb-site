# CI — o que valida o quê

Workflow único: `.github/workflows/validacao.yml`. Um só, de propósito — a
política de recursos do escopo pede gates concentrados num pipeline principal,
e a suíte inteira roda em poucos minutos.

## Os quatro jobs

| Job | O que responde | Depende de |
|---|---|---|
| `estatico` | o lint passa, os tipos fecham e a regra de negócio está certa? | nada |
| `build` | a aplicação compila e prerenderiza? | `estatico` |
| `ponta-a-ponta` | o fluxo funciona, é acessível e cabe na tela? | `estatico` |
| `atomicidade` | duas pessoas ao mesmo tempo quebram? | `estatico` |

A ordem é a do custo: o que falha rápido falha primeiro. `typecheck` e
unitários não precisam de banco nem navegador e derrubam o PR em segundos, e
`lint` vem antes dos dois pelo mesmo motivo.

## Lint

`pnpm lint` reprova em **erro** e passa em **aviso**. Não é frouxidão: os 49
avisos de hoje são duas regras do compilador React, documentadas uma a uma em
`eslint.config.mjs`. Treze são `Date.now()` durante o render em páginas que
declaram `instant = false` — correto enquanto elas forem request-time, bug no
dia em que migrarem para Cache Components. Dezoito são o padrão de ler
`localStorage` num efeito de montagem.

Contadas como aviso, elas permanecem visíveis e viram a lista de tarefas
daquela migração. Como erro, travariam o portão hoje por nada; desligadas,
sumiriam da vista. Erro novo, esse sim, entra proibido.

O número de 793 que circulava antes vinha de `npx eslint .` sem configuração
nenhuma — media o projeto contra regras que ninguém escolheu, num parser que
não lê TSX. Não havia ESLint instalado no projeto até aqui.

`atomicidade` não roda em todo PR — só em push para as branches principais ou
quando o PR tem a etiqueta `dominio`. Rodar concorrência real contra o Postgres
a cada ajuste de texto gastaria minutos para provar o que ninguém tocou.

## Banco

Efêmero, criado do zero em cada job que precisa dele. **Nunca** uma variável
apontando para Neon: o seed de teste apaga e recria dados.

## Larguras e acessibilidade

O `responsivo.mjs` mede **7 larguras**: 320, 360, 390, 768, 1024, 1280 e 1440.
A de 320 entrou nesta fase — é o mínimo que a WCAG 2.2 exige suportar sem
rolagem horizontal (1.4.10), e um iPhone SE de primeira geração com fonte
ampliada cai abaixo dos 360 que a lista começava.

O `acessibilidade.mjs` passou a rodar as tags **WCAG 2.2 A e AA**, além das
2.0 e 2.1. A 2.2 acrescenta critérios que importam aqui: foco não obscurecido
por barra fixa (2.4.11), alvo de toque mínimo (2.5.8) e ajuda consistente
(3.2.6).

**Axe sozinho não comprova conformidade.** Ele pega o que dá para automatizar.
Ordem de leitura, texto alternativo que descreve o que importa e sentido do
foco continuam sendo conferência humana.

## Navegador

Só Chromium. WebKit e Firefox multiplicariam o tempo por três para cobrir o que
a suíte atual não diferencia — e o escopo é explícito em não deixar o resultado
parecer teste em iPhone real. Quando houver teste em aparelho real, ele será
registrado como tal.

## Artefatos

Relatório, traço e captura de quem falhou, guardados por 7 dias, só em falha.
Os dados são de demonstração (`@jbteste.local`), então nada real vai junto.

## Estado dos portões em 09/09/2026

O pipeline nunca fechou verde nesta branch, e desde a auditoria visual dá para
dizer **onde** ele para:

| Job | Estado | O que falta |
|---|---|---|
| `estatico` | passa | — |
| `build` | passa | — |
| `atomicidade` | passa | — |
| `ponta-a-ponta` | **reprova** | `pnpm responsivo` e `pnpm a11y` acusam `(admin)` e `/minha-jb` |

> **Atualizado em 11/09/2026.** A suíte de ponta a ponta passou de 53 para
> **99 cenários** e voltou ao verde — esteve vermelha por dias, e quase nada era
> regressão de código: 13 dos testes caíam por **uma linha** de copy
> desatualizada no helper de checkout. O histórico da rodada está em
> `validacao.md`.

Os testes de ponta a ponta em si passam (**99/99**, com `retries: 0`). O que
derruba o job são os dois portões de auditoria, e depois da rodada de 10–11/09
sobrou **uma** frente:

- **Painel e Área da Clínica** — alvos de 40×40px e rótulos entre 9,9 e
  10,4px na casca das duas áreas. Densidade escolhida no redesenho daqueles
  painéis; decisão da JB.
- ~~**Home e catálogo**, texto abaixo do piso de 12px~~ — **resolvido em
  10/09**. Eram 6 nós a 11,52px, todos em `hero-vitrine.module.css`, elevados a
  12px. Na mesma rodada saíram os chips de 40px do catálogo e o botão de
  favoritar do cartão, que media 36px.

Rodar `pnpm responsivo --so=publico` separa as duas: se ele acusa `/`, `/loja`
ou `/seminovos`, é tipografia da vitrine; se está limpo, a falha é do painel.
Detalhe por execução em `validacao.md`.

**Local roda com `retries: 0` e a CI com 1.** Uma falha intermitente aparece
numa e some na outra — e a inversa também. Três testes desta suíte já reprovaram
por medir antes de a página existir (streaming, foco, hidratação); um deles
falhava 1 vez em 3.

## O que este arquivo NÃO prova

Workflow criado não é check obrigatório ativado. A proteção de branch — exigir
que `estatico`, `build` e `ponta-a-ponta` passem antes do merge — é
configuração do GitHub e precisa de acesso de administrador ao repositório.

**Passo exato:** Settings › Branches › Add rule para `main` e `plataforma` ›
"Require status checks to pass before merging" › marcar `Lint, tipos e testes
de unidade`, `Build de produção` e `E2E, acessibilidade e responsividade`.

Registrado em `pendencias-externas.md`. Até isso ser feito, o pipeline informa
mas não impede.
