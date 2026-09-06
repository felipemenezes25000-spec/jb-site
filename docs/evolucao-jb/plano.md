# Plano de execução — evolução da plataforma JB

Origem: `PROMPT-MESTRE-CLAUDE-JB.md`, na raiz do workspace.
Base de trabalho: repositório `jb-site`, branch `plataforma`.

Este arquivo é o roteiro. O estado real de cada requisito está em
[`cobertura.md`](cobertura.md); o que foi de fato executado e com que
resultado está em [`validacao.md`](validacao.md).

---

## Regra de orquestração adotada

A seção 2 do prompt mestre fixa: **um agente principal, no máximo um auxiliar
simultâneo**, sem enxames, sem delegação recursiva, sem workflows concorrentes.
Essa regra vale sobre qualquer padrão de orquestração do ambiente. A execução
aqui é sequencial e coordenada por um único plano.

---

## Ordem de trabalho

Segue a tabela da seção 25 do prompt. Cada entrega só é marcada como concluída
quando tem evidência associada em `validacao.md`.

| # | Entrega | Fases | Situação |
|---|---|---|---|
| 1 | Baseline, mapa, planejamento, direção visual | 0 | **concluído** |
| 2 | Narrativa, institucional, naming, planos, calculadora | 1, 2 | fase 1 **validada localmente**; fase 2 em execução |
| 3 | Checkout com conta obrigatória | 3 | não iniciado |
| 4 | URL canônica, cache/shell, analytics/RUM | 4, 5, 6 | não iniciado |
| 5 | CI consolidado | 7 | não iniciado |
| 6 | Componentes de domínio, prontuário, demonstração | 8 | não iniciado |
| 7 | Mídia de visitante e SOS Equipamento | 9 | não iniciado |
| 8 | Certificação de seminovo, produto, pós-compra, instalação | 10, 11 | não iniciado |
| 9 | Área da Clínica como centro de operação | 12 | não iniciado |
| 10 | SEO comercial, Central Técnica, acervo/reviews/cases | 13, 14, 15 | não iniciado |
| 11 | QR privado e público | 16 | não iniciado |
| 12 | OCR de etiqueta | 17 | não iniciado |
| 13 | Busca por intenção, comparador, TCO | 18 | não iniciado |
| 14 | Operação do técnico, continuidade, indicadores | 19 | não iniciado |
| 15 | Integração, revisão visual, regressão, entrega | — | não iniciado |

---

## O que a fase 0 encontrou, e o que isso muda no plano

A auditoria que originou o prompt descreve um estado **anterior** ao código
atual. Três diferenças mudam o trabalho e estão registradas em
[`decisoes.md`](decisoes.md):

1. **O naming já foi migrado no código.** "Minha JB" tem **zero** ocorrências
   em `src/` e `prisma/`; "Área da Clínica" aparece em 55 arquivos. O que
   sobra da fase 1.4 é o conteúdo legado **no banco** (CMS) e a conferência de
   templates/e-mails — não uma varredura de JSX.
2. **Os valores de plano da auditoria são dados de demonstração.** Os três
   planos no banco local têm slug `demo-plano-*` e vieram de `seed-demo.ts`.
   R$ 890 / 1.590 / 2.890 não são preços comerciais confirmados da JB, e
   `MaintenancePlan` **não tem** campo de base de cobrança. A fase 2 precisa
   modelar isso e cair em "Sob consulta" enquanto não houver configuração.
3. **A fila de mensagens existe.** O README diz que o worker "não existe", mas
   `src/app/api/fila/route.ts`, `src/lib/mensageria.ts` e `src/lib/email/`
   estão implementados. O README está desatualizado nesse ponto e será
   corrigido junto da fase que tocar a fila.

---

## Fase 1 — narrativa, home, Sobre, Estrutura, naming

Subtarefas, em ordem:

1. **1.A — Hero e hierarquia da home.** H1 "Comprar é só o começo.", eyebrow
   "Equipamentos + assistência + prontuário técnico", apoio novo, três CTAs com
   pesos distintos. Preservar a vitrine real e a ausência de coluna sem foto.
2. **1.B — "Depois da compra" no produto da home**, distinguindo benefício de
   processo de estado já concluído.
3. **1.C — Ordem das seções** para narrar continuidade.
4. **1.D — Sobre**: reescrita integral do conteúdo institucional **na fonte
   renderizada** (CMS), com migração idempotente e detecção de edição humana.
5. **1.E — Estrutura**: direção "Onde o equipamento é cuidado", fluxo de
   bancada, dados reais de endereço e horário.
6. **1.F — Naming**: varredura no banco, templates de e-mail e metadados;
   `/minha-jb` preservada.

Dependência: nenhuma além do banco local. Pode começar imediatamente.

## Fase 2 — planos e calculadora

1. **2.A** — modelar base de cobrança em `MaintenancePlan` (migração + admin).
2. **2.B** — cartão, comparativo e formulário exibindo base, período, cobertura
   e elegibilidade; "Sob consulta" quando indefinido.
3. **2.C** — evoluir `calculadora-parada.tsx`: unidades explícitas, fórmula sem
   dupla contagem, validação, resultado antes da captura, lead contextual.
4. **2.D** — eventos `downtime_calculated` e `maintenance_lead` (contrato
   definido aqui, emissão efetiva na fase 6).

Dependência: fase 1 concluída para não disputar os mesmos arquivos de UI.

---

As fases 3 em diante são detalhadas quando entram em execução, para o plano não
virar ficção. O contrato de cada uma está no prompt mestre, seções 7 a 23.
