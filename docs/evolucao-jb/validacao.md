# Validação — comandos executados e resultados reais

Regra: só entra aqui comando que foi de fato executado nesta máquina, com o
resultado que ele devolveu. Ausência de execução é registrada como ausência,
nunca como aprovação.

**Ambiente das execuções:** Windows 11, Node/pnpm do repositório
(`pnpm@10.28.2`), PostgreSQL 17 em contêiner `jb-pg` na porta 5433,
`DATABASE_URL` apontando para esse contêiner. Sem `.env.local` na árvore.

---

## Baseline — fase 0, 6 de setembro de 2026

Estado do repositório no momento: branch `plataforma`, árvore limpa, HEAD em
`fade93a`.

| Comando | Resultado | Observação |
|---|---|---|
| `git status --short` | vazio | nenhuma alteração pendente |
| `pnpm typecheck` | **exit 0** | `tsc --noEmit`, sem erro |
| `pnpm test:unit` | **exit 0** | 9 arquivos, **192 testes**, todos passando, 1,09 s |
| `pnpm build` | **exit 0** | build completo; rotas listadas sem erro |

Nenhuma falha preexistente nesses três portões.

### Checks ainda não executados na baseline

| Comando | Motivo de não ter rodado | Consequência |
|---|---|---|
| `pnpm e2e` | exige servidor de pé e banco carregado; será rodado antes do primeiro merge de fase | não há medição de regressão E2E do estado inicial |
| `pnpm a11y` | idem — depende do servidor | idem, para acessibilidade |
| `pnpm responsivo` | idem | idem, para as 6 larguras |
| `pnpm prova:atomicidade` | só se justifica quando a fase 3 tocar transação de pedido/pagamento | — |

---

## Inspeção de dados — fase 0

Consultas de leitura no banco de desenvolvimento, sem escrita.

| Consulta | Resultado |
|---|---|
| `count(*) Product` | 8 |
| `count(*) Customer` | 364 |
| `count(*) Order` | 275 |
| `count(*) Equipment` | 63 |
| `count(*) InventoryUnit` | 1 |
| `count(*) MaintenancePlan` | 3, todos com slug `demo-plano-*` |
| `count(*) Setting` | 41 |
| `count(*) Page` | 10, dos quais 3 com corpo preenchido |
| `\d "MaintenancePlan"` | sem coluna de base de cobrança |
| `Page` com corpo | `empresa` (5042 ch.), `sobre` (3697 ch.), `estrutura` (1367 ch.) |

O volume de `Customer` e `Order` vem dos seeds de demonstração — não é cadastro
real da JB.

### Varreduras de código

| Varredura | Resultado |
|---|---|
| `grep -rn "Minha JB" src/ prisma/` | **0 ocorrências** |
| `grep -rl "Área da Clínica" src/ prisma/` | 55 arquivos |
| `grep -rn "Comprar é só o começo" src/` | 0 ocorrências — ainda não implementado |
| `ls .github` | não existe — não há CI configurada |

---

## Execuções por fase

_As linhas abaixo são preenchidas conforme cada fase é validada. Fase sem linha
aqui não está validada._

### Fase 1 — narrativa, home, Sobre, Estrutura, naming

Executado em 6 de setembro de 2026, contra o banco de desenvolvimento
(`jb-pg`, porta 5433) e o servidor de desenvolvimento em `localhost:57519`.

#### Portões automáticos

| Comando | Resultado | Antes / depois |
|---|---|---|
| `pnpm typecheck` | **exit 0** | sem erro |
| `pnpm test:unit` | **exit 0** | 192 → **213 testes**, todos passando |
| `pnpm build` | **exit 0** | compilou em 2,9 s |
| `E2E_BASE_URL=… pnpm e2e` | **exit 0** | **48 testes**, 48 passaram, 3,5 min |
| `BASE_URL=… node scripts/acessibilidade.mjs --so=publico` | **exit 0** | 34 medições, **0 problemas** |
| `BASE_URL=… node scripts/responsivo.mjs --so=publico` | **exit 0** | 102 medições, **0 rotas com problema** |

Os testes novos são 21: 7 em `tests/unitarios/prova.test.ts` e 14 em
`tests/unitarios/migracao-conteudo.test.ts`.

O E2E precisou de `E2E_BASE_URL` porque o servidor de desenvolvimento já
estava de pé; sem a variável, o `webServer` do Playwright tenta subir outro e
o Next recusa. Registrado aqui porque é o modo de rodar a suíte com o
navegador de inspeção aberto.

#### Migração de conteúdo — as três garantias, verificadas uma a uma

| Garantia | Como foi verificada | Resultado |
|---|---|---|
| Prévia não escreve | `pnpm conteudo:prever` com as páginas legadas no banco | listou as duas páginas e as seis categorias sem alterar nada |
| Escrita com cópia | `pnpm conteudo:migrar` | 2 páginas gravadas; `PageRevision` ficou com 3.697 e 1.367 caracteres do texto anterior |
| Idempotência | `pnpm conteudo:migrar` uma segunda vez | `[em-dia]` nas duas páginas, `já corrigida` nas seis categorias, **0 escritas** |
| Detecção de edição humana | `UPDATE "Page" SET body = body \|\| '<p>…</p>'` em `estrutura`, depois `pnpm conteudo:migrar` | **`[editada-por-humano]`**, 0 escritas, 1 bloqueada |

O parágrafo de teste foi removido em seguida, e o estado final conferido:
`sobre` com 3.049 caracteres, `estrutura` com 1.610, cada uma com o
`systemHash` gravado.

#### Inspeção no navegador

| Tela | Largura | O que foi conferido |
|---|---|---|
| Home | 1440 e 375 | H1, chapéu, três CTAs com pesos distintos, faixa "Depois da compra" com os quatro itens, ordem das faixas |
| Home — faixa de catálogo | 1440 | as seis descrições de categoria corrigidas: "Biossegurança", "Autoclaves", "ultrassônica", "Câmera intraoral", "Bomba de vácuo", "potência", "escova de Robson" |
| Home — Área da Clínica | 375 | marcadores neutros no lugar dos "check"; a frase duplicada da renomeação corrigida |
| /sobre | 1440 | conteúdo novo renderizado; faixa de estatística com "2011 / 15 anos" e "6 marcas"; a contagem de 3 serviços não aparece |
| /estrutura | 1440 e 800 | título "Onde o equipamento é cuidado"; capa genérica removida; as nove etapas do percurso da bancada |
| /admin/conteudo/paginas/estrutura | 1308 | "Histórico de versões" com a revisão da migração, o carimbo de origem e o botão Restaurar; "Nenhuma imagem escolhida" na capa |

#### O que NÃO foi validado nesta fase

| Item | Motivo |
|---|---|
| `pnpm prova:atomicidade` | a fase não tocou transação de pedido, pagamento ou estoque |
| a11y e responsivo nos grupos `conta` e `admin` | a fase não alterou essas telas; serão medidos quando forem alteradas |
| largura de 320 px | ainda não está na lista do `responsivo.mjs`; entra na fase 7, conforme a seção 11 do prompt |
| Safari/WebKit e aparelho real | o ambiente só tem Chromium disponível |

### Fase 2 — planos e calculadora

Executado em 6 de setembro de 2026, banco de desenvolvimento, servidor em
`localhost:57762`.

#### Portões automáticos

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | **exit 0** |
| `pnpm test:unit` | **exit 0** — 213 → **249 testes** |
| `pnpm build` | **exit 0**, 8,1 s |
| `E2E_BASE_URL=… pnpm e2e` | **exit 0** — 48 testes, 4,0 min |
| `node scripts/acessibilidade.mjs --so=publico` | **exit 0** — 36 medições, 0 problemas |
| `node scripts/responsivo.mjs --so=publico` | **exit 0** — 108 medições, 0 problemas |

Testes novos: 17 em `plano.test.ts`, 19 em `parada.test.ts`.

`/manutencao-preventiva` entrou nas duas listas de auditoria. Na primeira
execução ela **reprovou**: o link do nome do plano media 37×21 px em 390 e
69×21 px em 768, abaixo do alvo mínimo de 44 px. Defeito preexistente, exposto
por incluir a rota. Corrigido com `min-h-11 min-w-11`; as duas larguras passam
depois.

#### Base de cobrança — verificação no painel e no site

| Verificação | Como | Resultado |
|---|---|---|
| Padrão seguro | planos existentes após a migração | os três ficaram `sob_consulta` e passaram a exibir "Sob consulta", apesar de terem preço cadastrado |
| Painel mostra o efeito | lista em `/admin/manutencao/planos` | "PREÇO CADASTRADO R$ 890,00 · BASE DE COBRANÇA Sob consulta · **NO SITE APARECE COMO Sob consulta**" |
| Validação cruzada | salvar com base `pacote` e quantidade vazia | recusado: "Pacote precisa dizer quantos equipamentos o preço cobre." Nada gravado |
| Gravação | salvar com `por_equipamento` e as condições | gravado; conferido no banco |
| Efeito público | `/planos-de-manutencao` | "R$ 890,00 · por equipamento, por 12 meses de cobertura", com peças, deslocamento, elegibilidade, fatores de preço e exclusões |
| Comparativo com bases diferentes | seed de demonstração com as três bases | linha "Cobrança" mostra "por equipamento", "para até 5 equipamentos" e "a partir de"; o aviso "Estes planos não cobram pela mesma coisa" aparece **antes** da tabela |

#### Calculadora — conferência aritmética na tela

Entradas: R$ 250,00/h, 50% da agenda, 8 h/dia, 2 dias, 2 vezes/ano, reparo
R$ 900,00.

```text
R$ 250,00/h × 50% da agenda      → R$ 125,00/h em risco
8 h/dia × 2 dias parados         → 16 h sem atender
16 h × R$ 125,00 por hora        → R$ 2.000,00 por parada
R$ 2.000,00 × 2 paradas no ano   → R$ 4.000,00 de receita
R$ 900,00 de reparo × 2          → R$ 1.800,00 em consertos
                                   ─────────────────────────
Exposição anual estimada           R$ 5.800,00
```

O total fecha com a soma das linhas, o percentual aparece uma vez só, e o
rótulo é "Exposição anual estimada" — não economia. A frase exigida pelo
escopo está na tela, literal: "Simulação com os dados informados. Não
representa garantia de economia ou ausência de falhas."

Com a receita zerada, a coluna do resultado lista o que falta ("Informe a
receita por hora.") em vez de mostrar R$ 0,00 ou NaN.

#### Passagem das premissas para a proposta

| Verificação | Resultado |
|---|---|
| Clicar em "Pedir proposta" | vai para `/planos-de-manutencao` com a URL limpa — **nenhum dado financeiro em parâmetro** |
| Onde o dado ficou | `sessionStorage`, chave `jb:premissas-parada` |
| No formulário | bloco "Da sua simulação" com as sete linhas, visível antes do envio |
| Campo enviado | `input[name=premissas]` com o mesmo texto |
| Botão "Não enviar" | remove o bloco, o campo oculto **e** a chave do `sessionStorage` |

### Fase 3 — conta obrigatória e checkout

Executado em 6 de setembro de 2026, servidor em `localhost:57762`.

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | **exit 0** |
| `pnpm test:unit` | **exit 0** — 249 testes |
| `pnpm build` | **exit 0** |
| `E2E_BASE_URL=… pnpm e2e` | **exit 0** — 48 → **52 testes**, 4,2 min |
| `pnpm prova:atomicidade` | **exit 0** — "TUDO OK", 14 conferências |
| `node scripts/acessibilidade.mjs --so=publico` | **exit 0** — 36 medições, 0 problemas |
| `node scripts/responsivo.mjs --so=publico` | **exit 0** — 108 medições, 0 problemas |

#### Testes E2E: o que mudou e o que entrou

Quatro testes novos, e um reescrito. O reescrito é o ponto importante:
`04-checkout.spec.ts` tinha "fecha o pedido como convidado e chega na página
do pedido", que descrevia exatamente o comportamento que esta fase remove. Ele
**não foi desligado**: virou "cria a conta dentro do checkout e chega na página
do pedido", com uma asserção a mais — o pedido precisa aparecer em
`/minha-jb/pedidos` sem passar por login, que é o que separa "criou conta" de
"criou conta e amarrou o pedido nela".

| Teste | O que prova |
|---|---|
| cria a conta dentro do checkout | comprador novo conclui e o pedido nasce na conta |
| sem senha, o checkout não fecha | a caixa antiga não existe (`toHaveCount(0)`) e a etapa 0 não avança |
| e-mail já cadastrado não vira conta nova | recusa com a frase única; segue em `/checkout`, sem pedido |
| cliente existente entra no próprio checkout | login na etapa 0 e pedido na conta certa |
| senha errada não cria pedido nem revela o e-mail | "E-mail ou senha inválidos.", sem pedido |

Três testes preexistentes precisaram do campo novo e foram ajustados, não
enfraquecidos: os dois de acessibilidade do checkout (o de teclado ganhou uma
asserção a mais — o foco visível no campo de senha) e o de frete.

#### Cenários da fase ainda sem execução automatizada

| Cenário | Situação |
|---|---|
| Cadastro legado com `passwordHash` nulo | a defesa está lida e é dupla (`autenticarCliente` recusa hash nulo; criar esbarra na unicidade). Falta um teste que crie esse estado no banco — o seed não produz cliente legado |
| Sessão expirada ou conta inativa | `garantirCompradorAutenticado` reconsulta `active` no banco a cada compra. Sem teste automatizado: exige manipular o cookie ou desativar a conta no meio do fluxo |
| Erro de frete/estoque/provedor com retomada | os caminhos existem e devolvem estado; sem execução dirigida nesta fase |
| Pedido de visitante antigo | o mecanismo (conferência de e-mail) não foi tocado e continua no código; sem execução nesta fase |

### Fases 4 a 10 — validação conjunta

Executada em 6 de setembro de 2026, servidor em `localhost:50440`, banco de
desenvolvimento.

| Comando | Resultado |
|---|---|
| `pnpm typecheck` | **exit 0** |
| `pnpm test:unit` | **exit 0** — 249 → **321 testes** |
| `pnpm build` | **exit 0**, com Cache Components ligado |
| `E2E_BASE_URL=… pnpm e2e` | **exit 0** — **52 testes** |
| `pnpm prova:atomicidade` | **exit 0** — "TUDO OK" |
| `node scripts/acessibilidade.mjs --so=publico` | **exit 0** — 36 medições, 0 problemas, **tags WCAG 2.2** |
| `node scripts/responsivo.mjs --so=publico` | **exit 0** — **126 medições** (7 larguras), 0 problemas |

Testes novos: 18 em `site-url`, 20 em `analytics-taxonomia`, 17 em
`midia-real`, 17 em `certificacao`.

#### Evidência da fase 5

A tabela de rotas do `pnpm build` mudou o símbolo da home de `ƒ` (dinâmica) para
`◐` (parcialmente prerenderizada). É a medição, não a intenção.

#### Seis regressões encontradas pela própria validação

Nenhuma estava no roteiro. Todas foram corrigidas antes deste registro.

| O que quebrou | Causa | Correção |
|---|---|---|
| Console da home com erro em toda visita | `metadataBase: new URL(...)` dentro de escopo `use cache` — `URL` não é serializável | textos cacheados; o objeto `Metadata` montado fora |
| `getByLabel("Situação")` ambíguo no painel | `<Activity>` do Cache Components mantém a rota anterior montada e escondida | localizador escopado ao painel do formulário |
| "Já recebido" ambíguo no pedido | idem | `filter({ visible: true })` no auxiliar, com o motivo escrito |
| `/admin/entrar` e o layout do painel acusando "runtime data" | `instant = false` estava no grupo acima, não no segmento que levanta a validação | opt-out no próprio segmento |
| `aria-controls` das abas da demonstração apontando para id inexistente | só o painel corrente era renderizado | os três painéis passam a existir, com `hidden` |
| Botão de aba saindo da tela em 320px | a largura entrou na auditoria nesta rodada | `flex-wrap` na lista de abas |

As duas últimas são da demonstração entregue na fase 8 e foram encontradas
pelos portões de acessibilidade e responsividade — não por leitura de código.

#### O que continua sem execução

| Item | Motivo |
|---|---|
| Redirecionamento canônico em produção | só age com `VERCEL_ENV=production`; não há como exercitá-lo localmente |
| Core Web Vitals reais | exige tráfego real e GA4 configurado |
| Limpeza e vínculo simultâneos | a proteção está nos dois lados (condição de estado no WHERE); falta uma execução concorrente dirigida |
| Emissão de 27 dos 30 eventos | a camada existe; falta a chamada em cada tela |
| CI no GitHub | o workflow existe; nunca rodou lá |

---

## Bateria final — fases 11 a 19

Rodada em 06/09/2026, contra o Postgres local (`localhost:5433/jb`). `.env.local`
ausente e conferido antes de cada comando que toca o banco.

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `pnpm test:unit` | **exit 0** — 192 → **545 testes**, 27 arquivos |
| `pnpm build` | **exit 0** — todas as rotas novas na tabela |
| `E2E_BASE_URL=… pnpm e2e` | **exit 0** — **52 testes**, 4,3 min |
| `BASE_URL=… node scripts/acessibilidade.mjs` | **exit 0** — 94 medições, 0 problemas |
| `BASE_URL=… node scripts/responsivo.mjs` | **exit 0** — 294 medições, 0 problemas |
| `pnpm prova:atomicidade` | **exit 0** — os quatro cenários |
| `pnpm pautas:prever` / `pautas:carregar` | executado — 19 criados; segunda execução: 19 "em dia", 0 criados |
| `curl /feed/produtos.xml` | 200, `application/xml`, RSS válido |

### Rotas acrescentadas às auditorias

Ambos os scripts passaram a percorrer o que estas fases construíram:
`/central-tecnica`, `/cases`, `/depoimentos`, `/comparar`,
`/simulador-de-custo`, `/busca?q=autoclave nao aquece`,
`/minha-jb/equipamentos/etiquetas`, `/admin/central-tecnica`, `/admin/cases`,
`/admin/avaliacoes` e `/admin/insights`. Sem isso, a bateria teria dado verde
sobre código que ela nunca visitou.

### Oito regressões encontradas pela própria validação

Nenhuma estava no roteiro. Todas corrigidas antes deste registro.

| O que quebrou | Onde | Causa | Correção |
|---|---|---|---|
| E2E do painel derrubado por erro de console | `/admin/produtos/novo` | `instant = false` estava nos layouts, e o guia é explícito em que ele vale para o **segmento** que levanta a validação | opt-out em cada `page`/`layout` de `(admin)` — 87 arquivos |
| `new Date()` instável no prerender | `sessaoStaff` / `sessaoCliente` | `jwtVerify` compara a expiração com o relógio, e `instant = false` **não** limpa IO síncrono | `await connection()` antes de conferir o token; o caminho sem token continua prerenderizável |
| `<ul>` com filho `div` | `/busca`, `/cases`, `/depoimentos`, `/central-tecnica` | `Grade como="ul"` não embrulha sozinha — o `li` é de quem chama | `<li>` em volta de cada cartão |
| `aria-labelledby` apontando para id inexistente | `/busca` | as seções referenciavam `g-produtos` e o `h2` não tinha id | id gerado a partir do grupo |
| campo de arquivo sem nome acessível | leitor de etiqueta | o input fica `sr-only` e o botão é quem dispara | `aria-label` e `tabIndex={-1}` |
| contraste de 2,49:1 | folha de etiquetas | `graf-400` em 12px sobre fundo claro | `graf-600` |
| texto de 10 e 11px na tela | folhas de etiqueta | corpo de impressão aplicado também ao monitor | `text-xs` na tela, `print:` para o papel |
| elemento fora da tela em 320px e alvo de toque de 42px | `/comparar` e `/simulador-de-custo` | item de grade sem `min-w-0`; caixa de seleção sem altura mínima | `min-w-0` no fieldset e nos rótulos; `min-h-11` na caixa |
| feed anunciando o catálogo de demonstração | `/feed/produtos.xml` | a exclusão de demonstração não existia | motivo `demonstracao`, pela mesma convenção de slug do seed |

As duas primeiras são as mais instrutivas: a segunda só apareceu **depois** de
a primeira ser corrigida. Opt-out de bloqueio e IO síncrono são erros
diferentes, e o guia de migração diz isso com todas as letras — mas só quem
roda a suíte descobre que os dois estavam ali.

### ESLint

> **Corrigido depois desta bateria.** O texto abaixo está preservado porque
> era o que se sabia na hora; a conclusão dele estava errada, e o registro de
> uma validação não se reescreve — anota-se.

`npx eslint .` acusa **793 erros**, e nenhum deles vem destas fases: rodado
sobre os arquivos novos, dá **0 erros**. A configuração tem plugin que não
resolve (`Definition for rule '@next/next/no-img-element' was not found`) e
regras que reprovam padrões do próprio projeto (`usarDialogo`,
`react-refresh/only-export-components` em toda página do App Router, que
exporta `metadata` por contrato).

Lint **não é** um dos quatro gates declarados em `ci.md`. Arrumar 793 erros
pré-existentes seria uma mudança grande e sem relação com o escopo destas
fases, então fica registrado como pendência, não silenciado.

**O que estava errado nisso:** não havia "a configuração". Não havia ESLint
no projeto — nem `eslint.config.*`, nem dependência, nem script. `npx eslint .`
baixava o ESLint na hora e rodava sem config nenhuma, medindo o código contra
regras que ninguém escolheu, num parser que não lê TSX. Os 793 eram o retrato
dessa ausência, não do código.

Com flat config de verdade são **76 problemas**: 27 corrigidos, 9 que vinham do
prefixo `usar` em vez de `use` nos hooks (renomeados — e o efeito colateral era
pior que o aviso: as regras dos hooks não estavam sendo verificadas naquelas
chamadas), duas âncoras deliberadas documentadas, e 49 avisos de duas regras do
compilador React que continuam contadas de propósito. `pnpm lint` fecha em zero
erro e virou o primeiro passo do job `estatico`. Ver `ci.md`, seção "Lint".

### O que continua sem execução

| Item | Motivo |
|---|---|
| Leitura do QR por câmera real | exige imprimir a etiqueta e escanear; os parâmetros do símbolo (quiet zone 4, correção M) foram escolhidos para isso |
| OCR de etiqueta ponta a ponta | nenhum provedor configurado — decisão registrada em `ocr-etiqueta.md` |
| Envio de convite de avaliação | desligado por configuração, à espera de autorização da JB |
| Publicação de artigo e de case | dependem de gente: autor, revisor e autorização do cliente |
| Indicadores com dado suficiente | o banco local não tem volume; a tela responde "ainda não há dados suficientes", que é o comportamento correto |
| ~~ESLint limpo~~ | resolvido depois: zero erro, e agora é gate. Ver acima |
