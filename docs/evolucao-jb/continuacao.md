# Checkpoint de continuação

Leia este arquivo antes de retomar. Ele diz onde a execução parou, não o que
seria bom fazer.

**Atualizado em:** 9 de setembro de 2026
**Repositório:** `jb-site` · **Branch:** `plataforma`

---

## Fases concluídas

| Fase | Situação | Commit |
|---|---|---|
| 0 — diagnóstico e baseline | validada | (no commit da fase 1) |
| 1 — narrativa, home, Sobre, Estrutura, naming | validada | `8936118` |
| 2 — planos e calculadora | validada | `68c9165` |
| 3 — conta obrigatória no checkout | validada | `c84e25e` |
| 4 — domínio canônico e configuração | validada | `84bed05` (junto da 5–7) |
| 5 — casca pública e Cache Components | validada, com migração declarada | `8b2dc50` |
| 6 — analytics e Core Web Vitals | implementada; emissão parcial | `77a7696` |
| 7 — CI | validada; branch protection pendente | `84bed05` |
| 8 — componentes de domínio e demonstração | validada | `146fb7e` |
| 9 — mídia de visitante | validada; SOS não iniciado | `6d4af6b`, `15b7741` |
| 10 — Seminovo Certificado | domínio e verificação validados; painel não iniciado | `6eaceb5` |
| 11 — produto, pós-compra e instalação | validada; fluxo móvel do técnico foi para a 19 | `7fdfa0a` |
| 12 — Área da Clínica como centro de operação | validada | `b08742d` |
| 13 — SEO comercial, Merchant Center e local | validada; conta externa não tocada | `44eba36` |
| 14 — Central Técnica e arquitetura editorial | validada; 19 rascunhos aguardando gente | `0fb9d7c` |
| 15 — acervo, reviews e cases | validada; acervo e envio aguardam a JB | `91b2045` |
| 16 — QR por equipamento e verificação | validada; leitura por câmera real não executada | `2416f12` |
| 17 — scanner de etiqueta e OCR | contrato e tela prontos; **nenhum provedor configurado, por decisão** | `97bfb29` |
| 18 — navegação, busca, comparador e TCO | validada | `d1a28a0` |
| 19 — operação do técnico e indicadores | validada | `bd53697` |

**Portões no fim da fase 19:** `typecheck` ✅ · `test:unit` **545** ✅ ·
`build` ✅ · `e2e` **52** ✅ · `prova:atomicidade` ✅ · `a11y` **94** medições,
0 problemas ✅ · `responsivo` **294** medições, 0 problemas ✅.

**Portões em 9 de setembro de 2026:** `typecheck` ✅ · `lint` ✅ ·
`test:unit` **581** ✅ · `build` ✅ · `e2e` **53** ✅ ·
`responsivo` ❌ e `a11y` ❌ — em duas frentes: `(admin)` e `/minha-jb`, e a
home/catálogo depois do redesenho da vitrine. `--so=publico` separa as duas.
Detalhe em `ci.md` e `validacao.md`.

A bateria final encontrou **oito regressões**, todas corrigidas antes deste
registro. As duas mais instrutivas estão em `validacao.md`: `instant = false`
precisa estar no segmento que levanta a validação, e ele **não** limpa IO
síncrono — `jwtVerify` lendo o relógio exigiu `connection()` antes.

---

## Depois das fases: auditoria visual e redesenho da vitrine

Duas frentes correram sobre a base entregue nas fases 0–19.

**Auditoria visual (8–9/09).** O site publicado foi percorrido em 22 rotas, no
desktop e em 390×844, e o resultado está em
[`../auditoria-visual-2026-09-08/`](../auditoria-visual-2026-09-08/) com 29
capturas. Os seis achados de alta prioridade foram aplicados — vitrine que
exige foto e disponibilidade, unidade única vendida fora das listas, cadastros
homônimos unificados, primeira dobra do celular com equipamento, abertura de
chamado compacta. A matriz está em `cobertura.md`, seção "Auditoria visual". O
banco do **preview** foi unificado (`pnpm duplicatas:unificar`); o local
continua duplicado de propósito.

**Redesenho da vitrine (9/09), em andamento.** A home ganhou cabeçalho próprio
(`cabecalho-home-flagship.tsx`), hero reescrito e seções novas; há trabalho não
commitado em `src/components/loja/marketplace/`. Os planos e a especificação
estão em [`../superpowers/`](../superpowers/). Duas coisas desse redesenho
estão registradas como pendência: o vocabulário "Marketplace" na abertura
pública, que contraria o modelo de vendedor único (P12), e o portão de
responsividade, que a vitrine redesenhada derrubou por texto abaixo de 12px —
546 achados na primeira medição, 399 depois de elevar a tipografia dos módulos
da home.

---

## Próxima tarefa

As vinte fases do prompt mestre (0 a 19) estão entregues. O que resta não é
fase nova: são buracos declarados na matriz de cobertura e decisões que
dependem da JB.

**Na ordem em que valem mais:**

1. **Painel da certificação** (14.7) — sem ele, nenhuma inspeção é criada ou
   publicada pela equipe. O domínio, a página pública e a folha de etiquetas
   existem; falta a tela que os alimenta.
2. **Selo na página do produto** (14.9) — a verificação existe e ninguém chega
   até ela pelo catálogo.
3. **SOS Equipamento** (13.3) — a entrada móvel direta.
4. **Emissão dos 27 eventos de analytics** que faltam — a taxonomia e o
   limpador existem; falta a chamada em cada tela.
5. **Combobox de autocomplete na busca** (22.busca.7) — a busca agrupa e
   ordena; não há sugestão enquanto se digita.
6. **Orçamento real no TCO** (22.tco.7) — hoje o valor do reparo é digitado;
   com autorização, ele pode vir do orçamento do próprio cliente.
7. ~~**ESLint**~~ — resolvido: zero erro, e agora é o primeiro passo do job
   `estatico`.
8. **Portões de `(admin)` e `/minha-jb`** — alvos de 40×40px e rótulos abaixo
   de 12px na casca das duas áreas. É o que impede a CI de fechar verde, e é
   decisão de densidade da JB, não defeito acidental.

**O que depende da JB, e não de código:** revisor técnico para os 19
rascunhos, autorização de cliente para o primeiro case, acervo fotográfico,
decisão sobre provedor de OCR, marco da garantia (P10) e as pendências P1 a P9.

---

## O que NÃO refazer

- A auditoria geral: está em `decisoes.md` e `validacao.md`.
- Procurar "Minha JB": 0 ocorrências.
- Tratar R$ 890 / 1.590 / 2.890 como tabela comercial: é seed de demonstração.
- Rodar `conteudo:migrar` esperando efeito: páginas em dia, categorias
  corrigidas.
- Reaplicar qualquer das quatro migrações no banco de desenvolvimento.
- Migrar as 31 páginas da loja "porque estão com `instant = false`" — isso é
  fase 5 continuada, e o custo/benefício de cada uma precisa ser pensado antes.

---

## Armadilhas que já custaram tempo

| Armadilha | Sintoma | O que fazer |
|---|---|---|
| `URL`, `Date` ou classe dentro de `use cache` | build passa, console reclama em toda visita | manter só dados simples no escopo cacheado |
| `<Activity>` mantém a rota anterior no DOM | localizador de teste vira ambíguo em modo estrito | escopar o localizador, ou `filter({ visible: true })` |
| `instant = false` no grupo de rota | a validação continua sendo levantada | pôr no segmento que a levanta |
| `instant = false` e IO síncrono | continua acusando `new Date()` no prerender | o opt-out **não** limpa IO síncrono; use `await connection()` antes da chamada instável |
| `Grade como="ul"` sem `<li>` | axe reprova "list has direct children that are not allowed" | o `li` é de quem chama; a `Grade` não embrulha |
| item de grade sem `min-w-0` | conteúdo comprido estoura a tela em 320px | `min-w-0` no contêiner e no rótulo |
| E2E não sobe com o dev aberto | "Another next dev server is already running" | usar `E2E_BASE_URL` |
| `.env.local` presente | o dev passa a escrever em produção | conferir `ls .env.local` antes de qualquer comando de banco |
| Painel do navegador sem pintar quadros | `getComputedStyle` devolve o valor inicial de uma transição para sempre; medição de estado "recolhido" mente | forçar uma captura antes de medir, ou zerar `transition` no elemento antes de ler |
| Reserva de espaço em porcentagem da janela | navegação do cabeçalho por cima do bloco da conta, e só em certas larguras | medir as duas pontas e publicar em variável CSS; o bloco da conta muda de largura conforme o nome de quem entrou |
| Seletor CSS preso à estrutura da árvore | acabamento some sem erro nenhum quando o JSX ganha um invólucro | prender a gancho declarado: `data-*` ou classe própria |
| Página pré-gerada depois de mexer no banco | endereço antigo continua servindo o HTML anterior | reconstruir; `generateStaticParams` só é reavaliado na construção |

---

## Comandos

```bash
docker compose up -d
pnpm dev --port 3010
```

```bash
E2E_BASE_URL=http://localhost:3010 pnpm e2e
BASE_URL=http://localhost:3010 pnpm a11y
BASE_URL=http://localhost:3010 pnpm responsivo
```
