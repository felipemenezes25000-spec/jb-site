# Decisões — evolução da plataforma JB

Cada decisão registra **origem** (onde o fato foi lido) e **efeito** (o que muda
no código). Decisão sem origem verificável não entra aqui.

---

## D1 — Orquestração: um agente, execução sequencial

**Origem:** prompt mestre, seção 2, "Política obrigatória de agentes, workflows
e consumo".

**Decisão:** a execução é feita por um agente principal, com no máximo um
auxiliar simultâneo para tarefa independente e delimitada. Nenhum workflow
paralelo, nenhuma delegação recursiva, nenhum agente por fase ou arquivo.

**Efeito:** o plano é único e sequencial. Schema, autenticação, configuração e
revisão final ficam sempre sob o agente principal.

---

## D2 — O naming público já está migrado no código

**Origem:** varredura em `src/` e `prisma/` em 6 de setembro de 2026:
`grep -rn "Minha JB"` devolve **0 ocorrências**; "Área da Clínica" aparece em
**55 arquivos**. Commits recentes da branch (`7344e16`, "a Área da Clínica ganha
casca própria") confirmam que a renomeação já foi feita.

**Decisão:** a fase 1.4 não é uma varredura de JSX. O que resta é (a) conteúdo
legado no banco, (b) templates de e-mail em `src/lib/email/registro.ts`, e
(c) metadados/configurações. A rota `/minha-jb` e os identificadores internos
(`mj-*`, `minha-jb.ts`) ficam como estão, conforme o contrato de execução.

---

## D3 — Os preços de plano da auditoria são dados de demonstração

**Origem:** `select slug, name, "priceCents" from "MaintenancePlan"` no banco de
desenvolvimento devolve três linhas com slug `demo-plano-essencial`,
`demo-plano-avancado` e `demo-plano-total`, valores 89000, 159000 e 289000
centavos. Os três nascem de `prisma/seed-demo.ts`, que o README descreve como
"dados de demonstração (opcional, mas é o que enche as telas)".

**Decisão:** R$ 890, R$ 1.590 e R$ 2.890 **não** são a tabela comercial da JB e
não podem ser apresentados como anuidade por equipamento. A fase 2 modela a base
de cobrança explicitamente; enquanto ela não estiver preenchida com dado
confirmado, o cartão mostra "Sob consulta".

**Pendência externa associada:** a tabela comercial real precisa vir do
proprietário — registrada em `pendencias-externas.md`.

---

## D4 — `MaintenancePlan` não tem base de cobrança

**Origem:** `\d "MaintenancePlan"` no banco. Colunas existentes: `priceCents`,
`periodMonths`, `visitsIncluded`, `partsDiscountPercent`, `benefits`,
`published`, `order`. Não há nada que diga se o preço é por equipamento, por
pacote ou preço inicial.

**Decisão:** acrescentar a base de cobrança como campo próprio, com migração
versionada e controle no painel, em vez de inferir do preço. O prompt mestre
(seção 6, item 1) exige exatamente isso.

---

## D5 — O conteúdo institucional legado está no banco, não no JSX

**Origem:** `select body from "Page" where slug='sobre'` devolve 3697 caracteres
de HTML herdado do site em PHP, com entidades (`&ccedil;`), erros de
concordância ("A JB Soluções Odontológicas especializada na manutenção"),
"são paulo" em minúscula e "auto claves" separado. A página `estrutura` tem
1367 caracteres na mesma condição.

`src/app/(loja)/sobre/page.tsx` renderiza `pagina.body` via `CorpoCms` quando há
texto, e só cai no texto derivado das configurações quando o CMS está vazio.

**Decisão:** a reescrita da fase 1 precisa acontecer na fonte renderizada — o
registro `Page` no banco — por uma migração de conteúdo idempotente, com backup
do texto anterior e detecção de edição humana. Alterar apenas o JSX não mudaria
nada para quem visita o site.

---

## D6 — A fila de mensagens existe; o README está desatualizado

**Origem:** `src/app/api/fila/route.ts` (3341 bytes), `src/lib/mensageria.ts` e
`src/lib/email/` com adapters `resend`, `smtp` e `registro` estão presentes e
compilam. O README, seção "O que ainda não está pronto", afirma que "o worker
que leria essa fila (...) não existe".

**Decisão:** tratar o README como desatualizado nesse ponto e corrigi-lo na fase
que tocar a fila. Não reimplementar o que já existe.

---

## D7 — Banco local é isolado e seguro para migrações

**Origem:** `.env` aponta `DATABASE_URL` e `DATABASE_URL_UNPOOLED` para
`postgresql://…@localhost:5433/jb`; o contêiner `jb-pg` (postgres:17-alpine) do
`docker-compose.yml` está em execução. Não existe `.env.local` na árvore.

**Decisão:** migrações e seeds podem rodar localmente. Nenhum comando é
executado contra o banco da Vercel/Neon. Antes de qualquer comando destrutivo,
conferir a ausência de `.env.local`, conforme o README.
