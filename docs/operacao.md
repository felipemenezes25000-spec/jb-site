# Operação

Deploy, migração, seed e o que fazer quando algo quebra. Escrito para ser
seguido às três da manhã.

---

## Antes de qualquer comando destrutivo

```bash
ls .env.local
```

Se o arquivo existir, **você provavelmente está apontado para o banco de
produção**. `vercel env pull` e `vercel integration add` criam esse arquivo com
as variáveis de produção dentro, e o Next dá prioridade a ele sobre o `.env`. A
partir daí, `pnpm dev`, `pnpm db:seed`, `pnpm db:demo` e `pnpm db:reset` na sua
máquina operam no banco real, sem aviso e sem nenhuma diferença visual na tela.

Isto já aconteceu neste projeto. Apague o `.env.local` assim que terminar de
usá-lo.

---

## Deploy

Hospedagem: Vercel, projeto `jb-site`.

**Onde cada coisa está hoje, antes de qualquer push:**

| | Endereço | Branch |
|---|---|---|
| Site oficial — **ainda o legado** | https://jbsolucoesodontologicas.com.br | `main` |
| **A plataforma** | https://jb-plataforma.vercel.app | `plataforma` |

`git push` para `main` **publica no domínio oficial**, que hoje serve o site
antigo — não a plataforma. A plataforma vive na branch `plataforma`, centenas de
commits à frente, e `jb-plataforma.vercel.app` é um domínio amarrado a ela: não
se move à mão, acompanha a branch.

Levar a plataforma para o domínio oficial é uma decisão, não um `push`, e tem um
pré-requisito que não é código: **o banco de produção ainda não recebeu a
migração de conteúdo institucional** aplicada no preview em 06/09/2026. Código
novo contra banco velho mostra texto velho, e o sintoma parece bug de deploy
quando é de dado. Ver a seção de migração abaixo.

Uma trava prática: o plano da Vercel é o gratuito, **100 deploys por dia**.
Estourado o limite, o push deixa de virar build — em silêncio, sem erro no
terminal e sem aviso no painel.

Antes de subir:

```bash
pnpm typecheck
pnpm build          # o build é o que pega erro de tipo em página e ação
pnpm test           # 621 unitários + 99 cenários de ponta a ponta
```

Variáveis que precisam existir no ambiente de produção (lista completa e
comentada em `.env.example`):

| Variável | Obrigatória em produção |
|---|---|
| `DATABASE_URL` | sim |
| `DATABASE_URL_UNPOOLED` | sim (é a que `prisma migrate` usa) |
| `AUTH_SECRET` | sim, e diferente da de desenvolvimento |
| `NEXT_PUBLIC_SITE_URL` | sim |
| `BLOB_READ_WRITE_TOKEN` | sim, na prática — em serverless o disco é efêmero |
| `CRON_SECRET` | sim — sem ela, `/api/fila` responde 503 e o cron diário não processa nada |
| `RESEND_API_KEY` e `EMAIL_FROM` | para o e-mail sair de verdade; sem as duas, cada mensagem fica `simulado` |
| `PAYMENT_PROVIDER` | **não defina.** Sobra da loja: `mock` reprova o build de produção |
| `JBPREV_DATABASE_URL` | **não. Nunca defina em produção.** |

`MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` e
`NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` saíram com a loja: nenhum código as lê. O
`.env.example` ainda as traz comentadas.

Duas armadilhas de build, ambas já mordidas:

1. **`next.config.ts` lê `PAYMENT_PROVIDER` em tempo de build**, para montar o
   CSP: o SDK e os domínios do Mercado Pago só entram na política quando ele
   vale `mercadopago`. É resto da loja — não há mais SDK nenhum para carregar —,
   mas enquanto a leitura existir vale a regra: mudar a variável sem refazer o
   build **não** muda o CSP.
2. **`postinstall` roda `prisma generate`.** Se o cliente do Prisma parecer
   desatualizado depois de mexer no schema, é isso que precisa rodar de novo.

---

## Migração

O schema é aplicado com migrações versionadas em `prisma/migrations/`. Em
produção **sempre** `migrate deploy`, nunca `db push` e nunca `migrate dev`.

```bash
# desenvolvimento — aplica o que existe
pnpm db:deploy

# desenvolvimento — criar uma migração nova depois de editar o schema
pnpm exec prisma migrate dev --name descricao_curta

# banco descartável (preview recém-criado), sem gerar migração
pnpm db:push

# recomeçar do zero — APAGA O BANCO
pnpm db:reset
```

### Rodar `migrate deploy` contra produção

```bash
vercel env pull .env.local

DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '\"')" \
DATABASE_URL_UNPOOLED="$(grep '^DATABASE_URL_UNPOOLED=' .env.local | cut -d= -f2- | tr -d '\"')" \
  pnpm exec prisma migrate deploy

rm .env.local        # NÃO PULE ESTA LINHA
```

Alternativa mais segura, com o ajudante `_prod.sh` (ignorado pelo git), que
exporta só as duas variáveis de banco para o processo filho sem imprimi-las:

```bash
./_prod.sh pnpm exec prisma migrate deploy
rm .env.local
```

`DATABASE_URL_UNPOOLED` é a conexão direta, sem pooler. Postgres gerenciado
(Neon, Vercel) não aceita DDL pela URL com pooler — sem essa variável, a
migração falha com erro que não parece ser sobre isso.

---

## Seed

| Comando | O que faz | Pode rodar em produção? |
|---|---|---|
| `pnpm db:seed` | configurações, páginas institucionais, categorias, FAQ e o primeiro usuário do painel | **sim** — é idempotente: não sobrescreve o que já foi editado no painel, e não recria o usuário se o e-mail já existe |
| `pnpm db:demo` | vitrine de demonstração: marcas, produtos, cliente, equipamento, chamado | **não** |
| `pnpm db:demo:operacao` | operação de demonstração: pedido, pagamento, OS, orçamento, contrato, documentos, leads, suporte | **não** |
| `pnpm db:demo:limpar` | remove tudo o que os dois seeds de demonstração criaram | — |
| `pnpm db:vitrine` | catálogo de demonstração da vitrine: 12 equipamentos com ficha, foto e destaque; arquiva o catálogo demo anterior em vez de apagar | **não** |

`db:demo`, `db:demo:operacao` e `db:vitrine` ainda gravam nas tabelas da loja
— marcas, produtos, unidades físicas, pedido, pagamento, cupom —, que continuam
no schema até a migração que as apaga. O site não mostra esse lado, e o painel
só o toca nos leitores que sobraram (listados em `docs/dominio.md`); o que os
seeds criam de cliente, equipamento, chamado, OS, orçamento e contrato continua
enchendo o painel.

Os dois seeds de demonstração se **recusam a rodar** com `NODE_ENV=production`,
a menos que exista `PERMITIR_DEMO`. Não defina essa variável em produção.

O que eles criam é reconhecível de propósito: slug e SKU com prefixo `demo-`,
e-mails em `@jbteste.local`, planos com slug `demo-`, e a nota interna
`[DEMO] gerado por seed-demo-operacao` nos registros de operação. O
`db:demo:limpar` filtra por essas marcas e não toca em dado real.

**A ordem importa no `limpar`.** Boa parte das relações é `SetNull` de propósito
(um pedido não desaparece porque o cliente foi apagado), então apagar o cliente
não leva junto pedido, chamado, orçamento, OS nem ticket — o script remove cada
um explicitamente, dos filhos para os pais.

O `db:seed` imprime a senha do usuário administrador criado. Se `ADMIN_PASSWORD`
não estiver definida, ele sorteia uma. **Anote na hora**: ela não é gravada em
lugar nenhum além do hash.

---

## Cadastros duplicados de categoria e marca

**O script que corrigia isso saiu com a loja.** `scripts/unificar-duplicatas.ts`
e os comandos `pnpm duplicatas:prever` e `pnpm duplicatas:unificar` foram
apagados em `f420606`, junto com `src/lib/homonimos.ts`, que juntava homônimos
na exibição.

Causa, que continua valendo: `Category` e `Brand` têm `slug` único, não `name`.
O catálogo foi carregado três vezes — site em PHP (`prisma/seed.ts`), protótipo
aprovado (`prisma/catalogo-demo.json`) e demonstração de operação
(`prisma/seed-demo.ts`) — e ficou com `bioseguranca` + `biosseguranca` e
`schuster` + `demo-schuster`.

Onde isso ainda aparece:

- **Categoria** é o tipo de equipamento. Com as duas publicadas, o painel
  mostra duas "Biossegurança" na escolha de categoria em
  `/admin/assistencia/novo` e `/admin/equipamentos/novo`, e as duas na lista de
  `/admin/categorias`. O site público não lista categoria.
- **Marca** ficou só no banco: a tela de marcas e a parede de marcas saíram, e
  nenhuma tela lista `Brand`.

Estado dos bancos: o do **preview foi unificado em 08/09/2026**, com o script
antigo, e o duplicado ficou despublicado. O **banco local** continua duplicado
de propósito: é onde os seeds rodam, e eles recriam o par a cada
`pnpm db:seed` + `pnpm db:vitrine`.

Se o par voltar a incomodar num banco que importa, não há comando pronto. Em
`/admin/categorias` dá para arquivar a duplicada (o botão alterna `published`),
o que a tira das escolhas do painel — mas não move os chamados e equipamentos
que apontam para ela. O script antigo, que movia os vínculos para a canônica,
está em `git show f420606^:scripts/unificar-duplicatas.ts`; ele importava
`src/lib/homonimos.ts`, que também saiu, então não roda como está.

A regra que ele seguia continua boa para quem refizer: não apagar linha
(`published: false` mantém o registro; apagar levaria junto, por `SetNull`, o
histórico de quem apontava para ele) e não juntar grafias diferentes —
"Biosegurança" com um "s" é outro cadastro, e corrigir grafia é trabalho de
`scripts/conteudo-categorias.ts`.

---

## Numeração fora de sincronia

Sintoma: erro de violação de unicidade em `number` ao criar chamado, OS,
orçamento ou contrato — os quatro prefixos que o sistema ainda emite.

Causa: alguma linha entrou sem passar por `proximoCodigo` — importação,
restauração de backup parcial, `INSERT` manual — e o contador em
`DocumentSequence` ficou atrás do maior número já gravado.

Conserto: chamar `sincronizarSequencia(tipo, maiorNumeroExistente)` de
`src/lib/codigos.ts`, uma vez por prefixo. Ela usa `GREATEST`, então rodar duas
vezes, ou rodar com um número menor que o atual, não faz nada.

Para inspecionar o estado atual: `pnpm db:studio`, tabela `DocumentSequence` —
uma linha por prefixo (`JB`, `OS`, `ORC`, `AT`, `CT`, `SUP`).

---

## Quando o webhook de pagamento falha

**Não há mais webhook de pagamento.** `POST /api/pagamento/webhook`,
`POST /api/pagamento/simular`, `/admin/pagamentos` (com o botão **Consultar**) e
o bloco de pagamento manual de `/admin/pedidos/[id]` saíram com a loja, em
22/09/2026 (`f420606`). O sistema de hoje não cobra nem registra pagamento: o
orçamento de reparo é aprovado na conversa com o cliente e a equipe registra a
decisão no painel (ver `docs/dominio.md`, "Orçamento").

Sobrou, até a migração que apaga as tabelas da loja:

- `Payment` e `PaymentEvent` no schema, com o que já foi gravado;
- a exclusão de `api/pagamento/webhook` no `matcher` do `src/proxy.ts`, para
  uma rota que não existe mais;
- a leitura de `PAYMENT_PROVIDER` no CSP e no portão de ambiente (ver
  "Deploy", acima).

Se um provedor de pagamento voltar um dia, o desenho que valia — o webhook como
único caminho para "pago", evento gravado com chave única antes do efeito,
reconsulta pelo painel e simulação pelo mesmo handler — está em
[`decisoes.md`](decisoes.md), itens 11 e 12, e o código, em
`git show f420606^:src/app/api/pagamento/webhook/route.ts`.

---

## Ligar o Mercado Pago

**Não se aplica mais.** O adapter do Mercado Pago saiu com a loja sem nunca ter
sido ligado em produção. Não defina `PAYMENT_PROVIDER` nem as variáveis
`MERCADO_PAGO_*`: nenhum código lê as `MERCADO_PAGO_*`, e `PAYMENT_PROVIDER` só
é lido pelo CSP e pelo portão de ambiente, que reprova `mock` em produção.

---

## Arquivos e uploads

Em produção os arquivos vão para o Vercel Blob (store `jb-midia`), porque o
disco de uma função serverless é efêmero — arquivo gravado em `public/uploads`
some no próximo deploy. O que decide é a presença de `BLOB_READ_WRITE_TOKEN`.

Verificar que o caminho está funcionando:

```bash
BASE_URL="https://<domínio>" ADMIN_PASSWORD="<senha do painel>" \
  node scripts/testa-upload.mjs
```

O otimizador de imagem do Next só aceita buscar de
`*.public.blob.vercel-storage.com` (`images.remotePatterns` em
`next.config.ts`). Se as imagens vindas do Blob sumirem em produção com 400, é
essa lista. Ela é curta por segurança: cada domínio nela vira um endereço que qualquer
pessoa pode mandar o servidor buscar e redimensionar.

---

## Verificação depois do deploy

```bash
BASE_URL="https://<domínio>" pnpm tour --sem-fotos
```

Percorre as rotas de uma lista fixa e reporta status HTTP, erro de console,
exceção de página, requisição falha e link quebrado. Com fotos (sem a flag),
grava em `.shots/tour`, no desktop e no celular.

**A lista ainda é a da loja.** `scripts/tour.mjs` percorre vitrine, carrinho,
`/minha-jb` e as telas de produto e estoque do painel, que hoje respondem 410,
redirecionam para a home ou não existem; as páginas de equipamento
(`/autoclave`, `/compressor`…) não estão nela. Até o script ser reescrito, leia
o relatório sabendo disso: 410 e redirecionamento nessas rotas é o esperado, e
o que ele prova de verdade é a home, as políticas e as telas do painel que
continuam.

As rotas de `/minha-jb` e `/admin` pedem os usuários de demonstração
(`demo@jbteste.local` e `demo.gestor@jbteste.local`), que **não** existem em
produção — em produção use `--so=publico`.

Se o DNS de um domínio recém-configurado ainda não propagou na sua rede, force a
resolução do Chromium:

```bash
HOST_RULES="MAP www.exemplo.com.br 76.76.21.241" \
BASE_URL="https://www.exemplo.com.br" pnpm tour --so=publico --sem-fotos
```

---

## O cron diário e as tarefas que não têm cron

`vercel.json` agenda **uma** tarefa: `GET /api/fila`, todo dia às `0 6 * * *`
— 06:00 UTC, 03:00 em São Paulo. A rota exige `CRON_SECRET` (a Vercel manda
`Authorization: Bearer <CRON_SECRET>`; fora dela, o cabeçalho `x-cron-secret`
também vale) e responde 503 se a variável não existir. A cada passada ela:

- processa um lote da fila de mensagens (`processarFila`, em
  `src/lib/mensageria.ts`; 25 por padrão, `?limite=` muda até 100);
- apaga os anexos temporários vencidos (`limparOrfaosVencidos`, em
  `src/lib/envio-temporario.ts`) — sobra do envio de fotos pelo visitante, que
  saiu com o site antigo; hoje nada cria `TempUpload`, e ela só limpa o que
  ficou.

O cron é a rede de segurança, não o caminho normal do e-mail. `enfileirar()`
grava a mensagem e tenta entregá-la logo depois da resposta (`after`, em
`src/lib/notificacoes.ts`); o cron só pega o que ficou `pendente`. Entre uma
passada e outra, a tela `/admin/mensagens` tem o botão **Processar a fila
agora**.

O que sai de verdade depende do provedor: com `RESEND_API_KEY` e `EMAIL_FROM`,
a mensagem é entregue; sem eles, fica `simulado`, com o motivo à vista em
`/admin/mensagens`. **Não existe envio por WhatsApp**: uma linha de canal
`whatsapp` falharia com "não tem provedor configurado", e hoje nenhum fluxo
enfileira uma. O WhatsApp do site é o `wa.me` que a pessoa abre e envia.

O que **não** roda sozinho:

| Função | Arquivo | Situação |
|---|---|---|
| `expirarVencidos` | `src/lib/orcamento.ts` | **ninguém chama** — nem o cron, nem tela, nem ação. Orçamento vencido fica `enviado` ou `em_duvida`; o que impede aprová-lo é a guarda de validade de `aprovarOrcamento` |
| `lembretesPendentes` | `src/lib/manutencao.ts` | lida na hora em que alguém abre `/admin/manutencao`; **nada manda lembrete sozinho**. O botão ao lado de cada visita põe um e-mail `visita_lembrete` na fila e sai como qualquer mensagem dela. O lembrete só fica registrado se o e-mail entrou na fila; cliente sem e-mail volta erro, e a equipe avisa pelo WhatsApp |
| `visitasAtrasadas` | `src/lib/manutencao.ts` | sem chamador; `/admin` conta as vencidas com uma consulta própria, quando alguém abre o painel |

Não há mais link de redefinição de senha: o cliente não tem conta, e a senha
da equipe é trocada por um admin em `/admin/usuarios`, que gera uma senha
temporária mostrada uma única vez.

---

## Índice rápido de problemas

| Sintoma | Onde olhar |
|---|---|
| Build de produção reprova por `PAYMENT_PROVIDER` | sobra da loja — apague a variável; `mock` é recusado em produção |
| Erro de unicidade em `number` | `DocumentSequence` fora de sincronia — `sincronizarSequencia` |
| Imagem do Blob com 400 em produção | `images.remotePatterns` em `next.config.ts` |
| Upload some no deploy seguinte | falta `BLOB_READ_WRITE_TOKEN` |
| Migração falha com erro estranho de DDL | falta `DATABASE_URL_UNPOOLED` (conexão sem pooler) |
| Preview escrevendo no banco real | falta `JBPREV_DATABASE_URL` no ambiente de preview |
| Desenvolvimento escrevendo no banco real | existe um `.env.local` — apague |
| Todo mundo deslogado de repente | `AUTH_SECRET` mudou |
| E-mail não chega | `/admin/mensagens`: `simulado` é falta de `RESEND_API_KEY`/`EMAIL_FROM`; `pendente` parado é entrega imediata que falhou — processe a fila |
| `/api/fila` respondendo 503 | falta `CRON_SECRET` |
| Cliente diz que não recebeu o lembrete de visita | `/admin/mensagens`, modelo "Lembrete de visita": `simulado` é falta de provedor, `falhou` com "foi cancelada/concluída" é a visita que mudou antes do envio. Sem linha nenhuma, ninguém clicou no botão — lembrete não sai sozinho |
| Orçamento vencido continua "Enviado" | é esperado: `expirarVencidos` não é chamado por ninguém |
| Duas "Biossegurança" na escolha de categoria do painel | cadastro duplicado — ver "Cadastros duplicados de categoria e marca" |
