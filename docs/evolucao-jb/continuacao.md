# Checkpoint de continuação

Leia este arquivo antes de retomar. Ele diz onde a execução parou, não o que
seria bom fazer.

**Atualizado em:** 6 de setembro de 2026
**Repositório:** `jb-site` · **Branch:** `plataforma` · **HEAD na abertura:** `fade93a`

---

## Fases concluídas

| Fase | Situação | Commit |
|---|---|---|
| 0 — diagnóstico e baseline | validada localmente | (parte do commit da fase 1) |
| 1 — narrativa, home, Sobre, Estrutura, naming | validada localmente | `8936118` |
| 2 — planos e calculadora | validada localmente | `68c9165` |

Portões no fim da fase 2: `typecheck` ✅ · `test:unit` **249** ✅ · `build` ✅ ·
`e2e` **48** ✅ · `a11y` 36 medições, 0 problemas ✅ · `responsivo` 108
medições, 0 problemas ✅.

---

## Tarefa atual

**Fase 3 — conta obrigatória e checkout integrado** (seção 7 do prompt mestre).
É a fase que o próprio escopo marca como prioritária, e precisa ser concluída
no frontend **e** no backend.

O que já se sabe do código, por leitura de `src/app/acoes/checkout.ts`:

- O checkout hoje aceita compra como convidado: `customerId` fica `null` e o
  acompanhamento sai pelo cookie assinado `jb_pedidos`.
- Existe o checkbox `criarConta`; desmarcado, a compra segue sem conta. É o
  bypass que a fase 3 manda remover.
- E-mail já cadastrado com `criarConta` marcado devolve erro e sugere
  **seguir como convidado** — saída que deixa de existir.
- Cadastro legado com `passwordHash = null` existe no modelo e precisa de
  recuperação/ativação com prova de controle.
- `criarPedido` (`src/lib/pedido.ts`) tem outros consumidores além do checkout
  público — importação e pedidos administrativos. A obrigatoriedade tem de
  ficar na fronteira certa, não dentro do domínio.

**Atenção ao teste E2E `04-checkout.spec.ts:18`**, "fecha o pedido como
convidado e chega na página do pedido": ele passa hoje e descreve o
comportamento que esta fase muda. Precisa ser reescrito para o contrato novo,
com justificativa — nunca desligado.

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
