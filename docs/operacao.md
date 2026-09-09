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

Hospedagem: Vercel, projeto `jb-site`. **Todo `git push` para `main` publica.**
Branch publica em preview.

Antes de subir:

```bash
pnpm typecheck
pnpm build          # o build é o que pega erro de tipo em página e ação
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
| `PAYMENT_PROVIDER` | sim, e nunca `mock` |
| `MERCADO_PAGO_ACCESS_TOKEN` | quando `PAYMENT_PROVIDER=mercadopago` |
| `MERCADO_PAGO_WEBHOOK_SECRET` | idem, para validar a assinatura |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | idem, para o cartão no navegador |
| `JBPREV_DATABASE_URL` | **não. Nunca defina em produção.** |

Duas armadilhas de build, ambas já mordidas:

1. **`next.config.ts` lê `PAYMENT_PROVIDER` em tempo de build**, para montar o
   CSP (o SDK e os domínios do Mercado Pago só entram na política quando ele é o
   provedor). Mudar a variável sem refazer o build **não** muda o CSP, e o
   sintoma é o SDK sendo bloqueado sem erro no servidor — só no console do
   navegador.
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

Sintoma na tela: duas opções com o mesmo nome na barra de filtros, duas
pastilhas iguais nos atalhos, duas placas "Schuster" na parede de marcas, duas
opções idênticas na escolha do tipo de equipamento ao abrir chamado.

Causa: `Category` e `Brand` têm `slug` único, não `name`. O catálogo foi
carregado três vezes — site em PHP (`prisma/seed.ts`), protótipo aprovado
(`prisma/catalogo-demo.json`) e demonstração de operação
(`prisma/seed-demo.ts`) — e ficou com `bioseguranca` + `biosseguranca` e
`schuster` + `demo-schuster`.

A loja pública já junta cadastros de mesmo nome ao exibir, então **o site fica
correto mesmo sem esta limpeza**. O que ela conserta é o cadastro: enquanto
houver dois registros, o painel continua oferecendo os dois na hora de publicar
um equipamento, e o problema volta a nascer a cada produto novo.

```bash
pnpm duplicatas:prever     # imprime o plano; não altera nada
pnpm duplicatas:unificar   # aplica
```

O que ele faz: elege como canônico o cadastro com mais equipamentos publicados
(empate resolve por `order` e depois pelo mais antigo), move produtos, chamados
e equipamentos de cliente para ele e **despublica** o duplicado.

O que ele **não** faz: apagar linha. `published: false` mantém o registro no
painel; apagar levaria junto, por `SetNull`, o histórico de quem apontava para
ele. Também não junta grafias diferentes — "Biosegurança" com um "s" continua
sendo outro cadastro, porque corrigir grafia é trabalho de
`scripts/conteudo-categorias.ts` e juntar por semelhança esconderia o erro em
vez de mostrá-lo.

**Contra o preview**, puxe as variáveis daquele ambiente antes de rodar e apague
o arquivo depois — ele traz a credencial do Neon:

```bash
vercel env pull .env.preview --environment=preview --git-branch=plataforma
# rode com DATABASE_URL apontando para o DATABASE_URL_UNPOOLED de lá
rm .env.preview
```

**Depois de unificar, o preview precisa reconstruir.** As páginas de categoria
são pré-geradas a partir das publicadas, então `/categoria/<slug-antigo>`
continua servindo o HTML anterior até a próxima construção. Com a construção
nova ela sai da lista de rotas pré-geradas, cai no caminho dinâmico e
redireciona para a homônima que ficou.

O banco do preview foi unificado em 08/09/2026. O banco local de
desenvolvimento continua duplicado de propósito: é onde os seeds rodam, e eles
recriam o par a cada `pnpm db:seed` + `pnpm db:vitrine`.

---

## Numeração fora de sincronia

Sintoma: erro de violação de unicidade em `number` ao criar pedido, OS,
orçamento, chamado, contrato ou ticket.

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

O webhook é `POST /api/pagamento/webhook`. É o **único** lugar em que um
pagamento vira "pago". Ele fica fora do matcher do `proxy.ts` de propósito: um
redirecionamento ou um cabeçalho a mais no caminho pode fazer o provedor marcar
a notificação como falha e reenviar em laço.

### 1. Descobrir em que passo parou

Os códigos de resposta contam a história:

| Resposta | Significado |
|---|---|
| `400 Notificação inválida` | assinatura não confere ou corpo ilegível. **Nada foi tocado.** Confira `MERCADO_PAGO_WEBHOOK_SECRET` — é a causa mais comum depois de trocar credencial. |
| `500 Não foi possível ler a notificação` | `lerWebhook` lançou. Veja o log com o prefixo `[webhook]`. |
| `200 { ignorado: "pagamento desconhecido" }` | o `externalId` não existe neste banco. Normal quando a notificação é de outro ambiente (sandbox apontando para produção, ou vice-versa). Responder 200 encerra a reentrega. |
| `200 { repetido: true }` | evento já processado. É o caminho de idempotência funcionando. |
| `500 Falha ao processar o evento` | o efeito falhou depois do registro. O código **apaga a linha do `PaymentEvent`** para que a reentrega do provedor volte a valer. Não é preciso fazer nada além de deixar o provedor reenviar — mas investigue o log. |

### 2. Forçar a reconciliação sem esperar o provedor

Existe, no painel, a consulta manual ao provedor: `/admin/pagamentos/[id]`, botão
**Consultar** (`reconsultarPagamento`). Ela pergunta o estado ao provedor
(`consultar(externalId)`), grava a resposta e, se for `aprovado`, chama
`confirmarPagamento`. O `PaymentEvent` gerado usa chave determinística
(`consulta:<externalId>:<status>`), então reconsultar dez vezes não polui o
histórico.

O botão só aparece quando o pagamento tem `externalId`, não é do método
`manual` e o provedor configurado não é o de teste — não há a quem perguntar nos
outros casos.

**Essa é a ferramenta certa** quando o cliente pagou e o pedido não avançou. Ela
consulta o provedor — não confia na tela nem no cliente.

### 3. Recebimento por fora do site

Pagamento em dinheiro, transferência ou maquininha: use o bloco de pagamento
manual em `/admin/pedidos/[id]`. Ele cria um `Payment` com método `manual`, já
aprovado, e chama `confirmarPagamento`. Exige nível `gestor` ou acima
(`PODE.confirmarPagamentoManual`).

### 4. Em desenvolvimento e preview

Sem adquirente contratado não há quem chame o webhook. Use
`POST /api/pagamento/simular`:

```bash
curl -X POST http://localhost:3000/api/pagamento/simular \
  -H 'content-type: application/json' \
  -d '{"externalId":"mock_xxxxxxxx","status":"aprovado"}'
```

Status aceitos: `aprovado`, `recusado`, `expirado`, `cancelado`, `estornado`,
`em_analise`, `pendente`.

A rota responde **404** — comportando-se como se não existisse — se o ambiente
for produção, se o provedor configurado não for o de teste, ou se o pagamento
alvo não tiver sido criado pelo provedor de teste. As três travas precisam
passar.

Na página do pedido (`/pedido/[numero]`) existe um painel de simulação que faz a
mesma chamada pela interface, visível apenas nas mesmas condições.

### 5. Cenários repetíveis do provedor de teste

O desfecho é decidido pelos centavos do total do pedido:

| Total termina em | Cartão |
|---|---|
| `01` | recusado |
| `02` | em análise |
| qualquer outro | aprovado |

Pix e boleto sempre nascem pendentes e só fecham pelo webhook simulado.

---

## Ligar o Mercado Pago

Nunca foi feito em produção. O adapter está pronto; o roteiro é:

1. Definir no ambiente de produção: `PAYMENT_PROVIDER=mercadopago`,
   `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` e
   `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`.
2. **Refazer o build** — o CSP depende de `PAYMENT_PROVIDER` em tempo de build
   (ver acima).
3. Cadastrar `https://<domínio>/api/pagamento/webhook` no painel do Mercado
   Pago, com o mesmo segredo de assinatura.
4. Testar com um valor baixo, em produção, e conferir que o `PaymentEvent` foi
   gravado e que o pedido avançou para `pago`.
5. Conferir no console do navegador que o SDK
   (`https://sdk.mercadopago.com`) carregou — se estiver bloqueado por CSP, o
   passo 2 não foi feito.

Enquanto isso não acontece, `provedorPagamento()` **lança** em produção em vez de
cair no simulado. Isso é intencional: melhor um erro visível que um pedido
marcado como pago sem cobrança.

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
`next.config.ts`). Se as fotos de produto sumirem em produção com 400, é essa
lista. Ela é curta por segurança: cada domínio nela vira um endereço que qualquer
pessoa pode mandar o servidor buscar e redimensionar.

---

## Verificação depois do deploy

```bash
BASE_URL="https://<domínio>" pnpm tour --sem-fotos
```

Percorre todas as rotas — públicas, `/minha-jb` e `/admin` — e reporta status
HTTP, erro de console, exceção de página, requisição falha e link quebrado. Com
fotos (sem a flag), grava em `.shots/tour`, no desktop e no celular.

As rotas de `/minha-jb` e `/admin` exigem os usuários de demonstração
(`demo@jbteste.local` e `demo.gestor@jbteste.local`), que **não** existem em
produção — em produção use `--so=publico`.

Se o DNS de um domínio recém-configurado ainda não propagou na sua rede, force a
resolução do Chromium:

```bash
HOST_RULES="MAP www.exemplo.com.br 76.76.21.241" \
BASE_URL="https://www.exemplo.com.br" pnpm tour --so=publico --sem-fotos
```

---

## Tarefas que não têm cron (e por isso não acontecem sozinhas)

Nenhuma destas roda automaticamente hoje. Estão implementadas e prontas para um
job agendado:

| Função | Arquivo | O que faz |
|---|---|---|
| `expirarVencidos` | `src/lib/orcamento.ts` | move para `expirado` os orçamentos abertos com validade no passado |
| `visitasAtrasadas` | `src/lib/manutencao.ts` | lista visitas de manutenção que passaram da data |
| `lembretesPendentes` | `src/lib/manutencao.ts` | lista os lembretes de visita a disparar |
| `mensagensPendentes` | `src/lib/notificacoes.ts` | lê a fila de e-mail/WhatsApp que ninguém consome ainda |

Consequência prática: **nada sai por e-mail nem por WhatsApp**. Inclusive o link
de redefinição de senha — hoje, trocar a senha de um cliente é tarefa da equipe,
pelo painel. Em desenvolvimento o link é impresso no terminal para o fluxo ser
testável; em produção não é impresso nem enviado.

---

## Índice rápido de problemas

| Sintoma | Onde olhar |
|---|---|
| Cliente pagou, pedido não avançou | `/admin/pagamentos/[id]` → consultar o provedor |
| Webhook devolvendo 400 | `MERCADO_PAGO_WEBHOOK_SECRET` |
| SDK do Mercado Pago bloqueado no console | build feito sem `PAYMENT_PROVIDER=mercadopago` |
| Erro de unicidade em `number` | `DocumentSequence` fora de sincronia — `sincronizarSequencia` |
| Foto de produto com 400 em produção | `images.remotePatterns` em `next.config.ts` |
| Upload some no deploy seguinte | falta `BLOB_READ_WRITE_TOKEN` |
| Migração falha com erro estranho de DDL | falta `DATABASE_URL_UNPOOLED` (conexão sem pooler) |
| Preview escrevendo no banco real | falta `JBPREV_DATABASE_URL` no ambiente de preview |
| Desenvolvimento escrevendo no banco real | existe um `.env.local` — apague |
| Todo mundo deslogado de repente | `AUTH_SECRET` mudou |
| E-mail não chega | é esperado: não há worker de envio |
| Duas opções com o mesmo nome no filtro ou na parede de marcas | cadastro duplicado — `pnpm duplicatas:prever` |
| Endereço antigo de categoria servindo página velha depois de unificar | falta reconstruir o preview |
| Unidade seminova sumiu da lista | é a regra: unidade única vendida sai da vitrine; `?vendidos=1` traz de volta |
