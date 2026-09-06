# Operação — o que esta evolução acrescenta

Complementa `docs/operacao.md`, que continua valendo para deploy, migração e
recuperação do que já existia. Aqui entra só o que **esta** evolução introduz.

---

## Variáveis de ambiente novas

_(nenhuma até agora)_

## Migrações novas

### `20260906035205_conteudo_revisoes`

Puramente aditiva — nenhuma coluna existente foi alterada ou removida:

- `Page.systemHash TEXT NULL` — carimbo de quem escreveu o corpo por último.
- tabela `PageRevision` — versões anteriores do texto de cada página, com
  chave estrangeira para `Page` e `ON DELETE CASCADE`.

Aplicar com `pnpm db:deploy`. Em base existente, todas as páginas nascem com
`systemHash` nulo, que é exatamente o estado "conteúdo legado" que a migração
de conteúdo espera encontrar na primeira execução.

### `20260906042505_plano_base_de_cobranca`

Também aditiva. Cria o enum `PlanBillingBasis` e acrescenta a
`MaintenancePlan`: `billingBasis` (padrão `sob_consulta`), `coveredEquipment`,
`eligibility`, `priceFactors`, `partsPolicy`, `travelPolicy` e `exclusions`.

**O efeito em produção precisa ser esperado:** todo plano existente nasce com
`billingBasis = sob_consulta` e passa a exibir **"Sob consulta"** na página
pública, mesmo tendo preço cadastrado. Isso é intencional — sem base declarada
não se sabe do que o preço é o preço. Para voltar a exibir valor, abrir
`/admin/manutencao/planos`, editar cada plano e escolher a base de cobrança.
Ver `pendencias-externas.md`, P1.

## Tarefas agendadas novas

_(nenhuma até agora)_

## Scripts novos

### `pnpm conteudo:prever` e `pnpm conteudo:migrar`

Migração do conteúdo institucional legado (`/sobre`, `/estrutura`) e das
descrições de categoria herdadas do site em PHP.

```bash
pnpm conteudo:prever    # não escreve; diz exatamente o que faria
pnpm conteudo:migrar    # aplica
```

A prévia é o modo padrão. A escrita exige `--aplicar`, que é o que o segundo
script passa.

Três comportamentos que valem conhecer antes de rodar em qualquer ambiente:

1. **Idempotente.** A segunda execução não escreve nada.
2. **Reversível.** O texto anterior de cada página vai para `PageRevision`, e o
   painel restaura em `/admin/conteudo/paginas/<slug>` › "Histórico de versões".
   O texto anterior das categorias vai para
   `docs/evolucao-jb/backups/categorias-antes-de-institucional-2026-09.json`.
3. **Não sobrescreve edição humana.** Página salva pelo painel recebe a marca
   `manual` em `systemHash` e passa a ser ignorada pela migração, para sempre.
   Categoria só é corrigida enquanto a descrição for exatamente a legada.

Ordem correta em produção: aplicar a migração de schema **antes**
(`pnpm db:deploy`), depois rodar a prévia, conferir a lista e só então aplicar.

---

## Procedimento seguro de banco durante esta evolução

Antes de qualquer comando que escreva no banco:

```bash
ls .env.local        # se este arquivo existir, você provavelmente está apontado para PRODUÇÃO
docker ps | grep jb-pg   # o banco de desenvolvimento precisa estar de pé
```

O `.env` versionado aponta para `postgresql://…@localhost:5433/jb`, que é o
contêiner `jb-pg` do `docker-compose.yml`. Migração, seed e
`pnpm prova:atomicidade` rodam contra ele e só contra ele.

Nunca executar nesta evolução, sem autorização explícita e nova:
`pnpm db:reset`, `pnpm db:deploy` apontando para Neon, `pnpm db:demo` com
`.env.local` presente.

---

## Registro de execuções de migração

| Data | Migração | Ambiente | Resultado |
|---|---|---|---|
| 06/09/2026 | `20260906035205_conteudo_revisoes` | desenvolvimento (`jb-pg`, 5433) | aplicada, sem erro |
| 06/09/2026 | `conteudo:migrar` (institucional + categorias) | desenvolvimento | 2 páginas e 6 categorias gravadas; 2 revisões guardadas |
| — | as duas acima | **produção** | **não executadas** |
