# Checkpoint de continuação

Leia este arquivo antes de retomar. Ele diz onde a execução parou, não o que
seria bom fazer.

**Atualizado em:** 6 de setembro de 2026
**Repositório:** `jb-site` · **Branch:** `plataforma` · **HEAD na abertura:** `fade93a`

---

## Última fase concluída

**Fase 1 — narrativa, home, Sobre, Estrutura e naming.** Validada localmente.
Os 24 requisitos da matriz estão em `cobertura.md`; as execuções que sustentam
cada um estão em `validacao.md`.

Portões no fim da fase: `typecheck` ✅ · `test:unit` **213** ✅ · `build` ✅ ·
`e2e` **48** ✅ · `a11y` 34 medições, 0 problemas ✅ · `responsivo` 102
medições, 0 problemas ✅.

Antes dela, **fase 0** — diagnóstico, com duas divergências importantes entre a
auditoria e o código (D2, D3 em `decisoes.md`).

---

## Tarefa atual

**Fase 2 — clareza dos planos e calculadora comercial** (seção 6 do prompt
mestre). Nada foi iniciado ainda além do diagnóstico:

- `MaintenancePlan` **não tem** campo de base de cobrança (D4).
- Os três planos no banco são de demonstração, slug `demo-plano-*` (D3).

Primeira subtarefa: modelar a base de cobrança com migração versionada e
controle em `/admin/manutencao/planos`.

---

## O que a fase 1 mudou

### Aplicação

- `src/components/loja/home/hero.tsx` — hero reescrito; a propriedade passou de
  `produtos` para `produto`; faixa "Depois da compra"; `priority` → `preload`.
- `src/app/(loja)/page.tsx` — ordem das faixas e a nova propriedade do hero.
- `src/components/loja/home/area-clinica.tsx` — marcadores neutros no lugar dos
  "check"; frase duplicada da renomeação corrigida.
- `src/components/loja/home/provas.tsx` e `src/app/(loja)/sobre/page.tsx` —
  passaram a usar `src/lib/prova.ts`.
- `src/app/(loja)/estrutura/page.tsx` — percurso da bancada em nove etapas;
  título e trilha novos.
- `src/lib/prova.ts` — **novo**: quando uma contagem vira prova.
- `src/lib/conteudo/migracao.ts` — **novo**: a decisão da migração de conteúdo.
- `src/app/acoes/admin-conteudo.ts` — `salvarPagina` guarda revisão e marca
  propriedade humana; `restaurarRevisaoDaPagina` é nova.
- `src/app/(admin)/admin/conteudo/paginas/[slug]/page.tsx` — painel "Histórico
  de versões".
- `src/app/sitemap.ts` — exclui endereço redirecionado e página de corpo vazio.
- `next.config.ts` — `redirects()` com `/empresa` → `/sobre`.

### Dados e scripts

- `prisma/schema.prisma` + migração `20260906035205_conteudo_revisoes`.
- `scripts/conteudo-institucional.ts`, `scripts/conteudo-categorias.ts`,
  `scripts/migrar-conteudo-institucional.ts`.
- `pnpm conteudo:prever` e `pnpm conteudo:migrar` no `package.json`.
- `/estrutura` acrescentada às rotas de `acessibilidade.mjs` e `responsivo.mjs`.

### Testes

- `tests/unitarios/prova.test.ts` (7).
- `tests/unitarios/migracao-conteudo.test.ts` (14).

---

## Próximos comandos

```bash
docker compose up -d
pnpm dev --port 3010
pnpm typecheck && pnpm test:unit
```

Com o servidor de desenvolvimento já de pé, o E2E precisa da variável, senão o
Playwright tenta subir um segundo servidor e o Next recusa:

```bash
E2E_BASE_URL=http://localhost:3010 pnpm e2e
```

---

## O que NÃO refazer na retomada

- Não repetir a auditoria geral: está em `decisoes.md` e `validacao.md`.
- Não procurar "Minha JB" no código: 0 ocorrências (D2).
- Não tratar R$ 890 / 1.590 / 2.890 como tabela comercial: é seed de
  demonstração (D3).
- **Não rodar `conteudo:migrar` de novo esperando efeito**: as páginas estão em
  dia e as categorias corrigidas. A execução é inofensiva, mas não faz nada.
- Não reaplicar `20260906035205_conteudo_revisoes` no banco de desenvolvimento.
- Não rodar migração contra banco remoto. Conferir a ausência de `.env.local`
  antes de qualquer comando de banco.

---

## Riscos conhecidos

| Risco | Detecção | Mitigação |
|---|---|---|
| `.env.local` apontar o dev para produção | `ls .env.local` antes de comando de banco | apagar o arquivo; README, "O perigo do `.env.local`" |
| Porta 3000 ocupada por outro contêiner da máquina | `pnpm dev` sobe em outra porta | `--port 3010`; `.claude/launch.json` já usa essa |
| E2E não subir com o dev aberto | "Another next dev server is already running" | usar `E2E_BASE_URL` |
| Migração de conteúdo aplicada em produção sem a migração de schema antes | erro de coluna `systemHash` inexistente | `pnpm db:deploy` primeiro; ver `operacao.md` |
| `priority` continua em 6 componentes fora da fase 1 | aviso do Next no console de desenvolvimento | fase 5 (performance) troca por `preload`/`loading`; a documentação instalada confirma a descontinuação |
| O teste E2E de checkout como convidado passa hoje | `04-checkout.spec.ts:18` | a fase 3 torna a conta obrigatória; o teste terá de ser reescrito **com justificativa**, não desligado |
