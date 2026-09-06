# Checkpoint de continuação

Leia este arquivo antes de retomar. Ele diz onde a execução parou, não o que
seria bom fazer.

**Atualizado em:** 6 de setembro de 2026
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

**Portões no fim da fase 10:** `typecheck` ✅ · `test:unit` **321** ✅ ·
`build` ✅ · `e2e` **52** ✅ · `prova:atomicidade` ✅ · `a11y` 36 medições, 0
problemas ✅ · `responsivo` 126 medições, 0 problemas ✅.

---

## Próxima tarefa

**Fase 11 — produto, pós-compra e instalação registrada** (seção 15 do prompt
mestre).

Antes dela, três buracos das fases já feitas continuam abertos e estão na
matriz de cobertura. Eles são pequenos e ficam melhor fechados antes de abrir
a fase 11:

1. **Painel da certificação** (14.7) — sem ele, nenhuma inspeção pode ser
   criada ou publicada pela equipe. O domínio e a página pública existem; falta
   a tela que os alimenta.
2. **Selo na página do produto** (14.9) — a verificação existe e ninguém chega
   até ela pelo catálogo.
3. **SOS Equipamento** (13.3) — a entrada móvel direta.

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
| E2E não sobe com o dev aberto | "Another next dev server is already running" | usar `E2E_BASE_URL` |
| `.env.local` presente | o dev passa a escrever em produção | conferir `ls .env.local` antes de qualquer comando de banco |

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
