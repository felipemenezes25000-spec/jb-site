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
