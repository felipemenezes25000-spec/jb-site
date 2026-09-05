# JB Soluções Odontológicas — plataforma

Loja de equipamentos odontológicos, assistência técnica, prontuário do
equipamento, área do cliente e backoffice, no mesmo sistema. A pessoa compra um
autoclave, ele entra no prontuário dela; quando para de funcionar, ela abre um
chamado por esse mesmo equipamento, recebe orçamento, acompanha a ordem de
serviço e vê a garantia contar. **O vendedor é único: a própria JB.** Isto não é
marketplace — não existe seller, comissão, split de pagamento nem loja de
terceiro em lugar nenhum do código.

Documentação complementar: [`docs/dominio.md`](docs/dominio.md) (fluxos de
status e transições válidas), [`docs/decisoes.md`](docs/decisoes.md) (por que o
código é assim), [`docs/operacao.md`](docs/operacao.md) (deploy, migração, seed,
webhook).

---

## Stack, e por que cada peça está aqui

| Peça | Versão | Por quê |
|---|---|---|
| **Next.js** (App Router, Turbopack) | 16.3.4 | Server Components resolvem o problema central desta aplicação: quase toda tela é leitura de banco com autorização por cima. O dado é buscado no servidor, o JavaScript enviado ao navegador fica pequeno e o segredo nunca sai de lá. Server Actions eliminam a camada de rotas CRUD que só existiria para o formulário conversar com o banco. |
| **React** | 19.2 | `useActionState` liga formulário a Server Action com estado de erro e de pendência sem biblioteca de formulário no meio. |
| **TypeScript** estrito | 5 | Um domínio com 67 modelos e cerca de 40 estados nomeados só se sustenta com o compilador conferindo cada `Record<Status, …>`. Sem `any`, sem `@ts-ignore`. |
| **Prisma + PostgreSQL** | 6.19.3 | Transação de verdade (baixa de estoque e criação do pedido no mesmo `$transaction`), `INSERT … ON CONFLICT … RETURNING` atômico para a numeração de documentos, e tipos gerados a partir do schema — os enums do Prisma são a mesma fonte de verdade que as etiquetas da interface. |
| **Tailwind CSS 4** (CSS-first) | 4 | Os tokens da marca vivem em `src/app/globals.css`, não num arquivo de configuração JS. Uma cor, um lugar. |
| **zod** | 4 | Toda entrada de Server Action e de rota é validada antes de tocar no banco. |
| **jose** + **bcryptjs** | 6 / 3 | Sessão em JWT assinado dentro do cookie (sem tabela de sessão para consultar a cada requisição) e senha em bcrypt com custo 12. |
| **@vercel/blob** | 2 | Em serverless o disco é efêmero e o upload precisa de armazenamento externo. Sem o token, o mesmo código grava em `public/uploads` e funciona igual num servidor próprio. |
| **sonner** | 2 | Toaster já montado no layout raiz. |
| **lucide-react** | 1 | Ícones em SVG, sem fonte de ícone e sem sprite. |
| **Playwright** | 1.62 | Os scripts de verificação em `scripts/` percorrem o site de verdade, num navegador de verdade. |

---

## Rodar local do zero

Pré-requisitos: Node 20+, `pnpm` 10.28 (`corepack enable`) e Docker, para o
Postgres. Todos os comandos rodam na raiz do repositório.

```bash
# 1. banco de desenvolvimento (Postgres 17 na porta 5433)
docker compose up -d

# 2. variáveis
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#    cole o valor impresso em AUTH_SECRET, dentro do .env

# 3. dependências (o postinstall roda `prisma generate` sozinho)
pnpm install

# 4. esquema do banco
pnpm db:deploy          # = prisma migrate deploy

# 5. carga base: configurações, páginas institucionais, categorias, FAQ
#    e o primeiro usuário do painel — a senha é impressa no terminal
pnpm db:seed

# 6. dados de demonstração (opcional, mas é o que enche as telas)
pnpm db:demo            # vitrine: marcas, produtos, cliente, equipamento
pnpm db:demo:operacao   # operação: pedido, pagamento, OS, orçamento, contrato

# 7. subir
pnpm dev
```

Site em `http://localhost:3000`, painel em `http://localhost:3000/admin`.

Com os seeds de demonstração carregados, entra-se com:

| Onde | E-mail | Senha |
|---|---|---|
| `/entrar` (cliente) | `demo@jbteste.local` | `demo12345` |
| `/admin/entrar` (equipe) | `demo.gestor@jbteste.local` | `demo12345` |

Para remover só o que os seeds de demonstração criaram, sem tocar em dado real:
`pnpm db:demo:limpar`.

### Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | desenvolvimento |
| `pnpm build` / `pnpm start` | build e execução de produção |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:deploy` | aplica as migrações existentes (é o que roda em produção) |
| `pnpm db:push` | empurra o schema sem gerar migração — só para banco descartável |
| `pnpm db:reset` | **apaga o banco** e reaplica tudo do zero |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | carga base |
| `pnpm db:demo` · `pnpm db:demo:operacao` · `pnpm db:demo:limpar` | dados de demonstração |
| `pnpm test:unit` | 192 testes unitários (Vitest) |
| `pnpm e2e` | 48 testes de ponta a ponta (Playwright) |
| `pnpm test` | os dois acima, em sequência |
| `pnpm responsivo` | mede o layout em 6 larguras × 33 rotas num navegador de verdade |
| `pnpm a11y` | roda o axe-core (WCAG 2.1 A e AA) em 34 rotas, mais 3 medições próprias |
| `pnpm prova:atomicidade` | prova, com concorrência real contra o Postgres, que pagamento, estoque e cupom não duplicam |
| `pnpm tour` | percorre todas as rotas num navegador e fotografa (ver "Testes") |

---

## Mapa de rotas

### Públicas — grupo `src/app/(loja)`

| Rota | O que é |
|---|---|
| `/` | home |
| `/loja`, `/loja/[slug]` | catálogo e página de produto |
| `/categoria/[slug]` | catálogo filtrado por categoria |
| `/marcas`, `/marcas/[slug]` | marcas atendidas |
| `/busca` | busca no catálogo |
| `/novos`, `/seminovos`, `/usados`, `/recondicionados` | recortes por condição |
| `/pecas-e-acessorios` | recorte de peças e acessórios |
| `/servicos`, `/servicos/[slug]` | serviços técnicos vendidos |
| `/assistencia-tecnica` | apresentação da assistência |
| `/assistencia-tecnica/solicitar` | abertura de chamado (funciona sem conta) |
| `/chamado/[numero]` | acompanhamento público do chamado, por link assinado |
| `/manutencao-preventiva`, `/planos-de-manutencao` | manutenção e planos |
| `/orcamento` | pedido de orçamento geral (venda, serviço ou plano) |
| `/carrinho`, `/checkout` | compra |
| `/pedido/[numero]` | acompanhamento do pedido e do pagamento, com ou sem conta |
| `/contato`, `/sobre`, `/estrutura`, `/faq` | institucional |
| `/entrega`, `/trocas-e-devolucoes`, `/privacidade`, `/termos` | políticas |
| `/[slug]` | páginas do CMS (modelo `Page`). É a **última** rota a casar na raiz — segmento estático sempre vence o dinâmico. |

Metadados gerados: `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`.

### Conta do cliente — grupo `src/app/(conta)`

`/entrar`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` e, atrás de
sessão, tudo sob `/minha-jb`:

| Rota | O que é |
|---|---|
| `/minha-jb` | painel do cliente |
| `/minha-jb/pedidos`, `/minha-jb/pedidos/[numero]` | compras |
| `/minha-jb/orcamentos`, `/minha-jb/orcamentos/[numero]` | propostas — é onde o cliente aprova ou recusa |
| `/minha-jb/assistencia`, `…/novo`, `…/[numero]` | chamados |
| `/minha-jb/equipamentos`, `…/novo`, `…/[id]`, `…/[id]/editar` | prontuário dos equipamentos |
| `/minha-jb/manutencoes` | contratos e visitas previstas |
| `/minha-jb/documentos` | notas, laudos, manuais, certificados |
| `/minha-jb/documentos/[id]/baixar` | download autorizado — a consulta filtra por `id` **e** `customerId` da sessão |
| `/minha-jb/favoritos`, `/minha-jb/enderecos`, `/minha-jb/perfil` | conta |

### Backoffice — grupo `src/app/(admin)`, tudo sob `/admin`

`/admin/entrar` é a porta. Depois dela, agrupadas como no menu lateral
(`src/lib/permissoes.ts` é a fonte da verdade de quem vê o quê):

- **Geral** — `/admin` (painel), `/admin/busca`, `/admin/agenda`
- **Comercial** — `pedidos`, `pagamentos`, `orcamentos`, `clientes`, `leads`
  (com `leads/exportar`, que devolve CSV), `cupons`, `frete`
- **Catálogo** — `produtos`, `categorias`, `marcas`, `servicos`, `estoque`
  (com `estoque/produto/[id]` e `estoque/unidades`)
- **Assistência** — `assistencia` (chamados), `os`, `equipamentos`,
  `manutencao` (com `manutencao/contratos` e `manutencao/planos`), `tecnicos`,
  `suporte`
- **Conteúdo** — `conteudo` e, abaixo dele, `home`, `slides`, `paginas`, `faq`,
  `midia`
- **Sistema** — `usuarios`, `configuracoes`, `auditoria`

Versões para impressão: `/admin/pedidos/[id]/imprimir`,
`/admin/os/[id]/imprimir`, `/admin/orcamentos/[id]/imprimir`.

### Rotas de API

| Rota | Para quê |
|---|---|
| `POST /api/pagamento/webhook` | única entrada por onde um pagamento vira "pago". Sem sessão: a autenticação é a assinatura da mensagem. Fica fora do matcher do `proxy.ts` de propósito. |
| `POST /api/pagamento/simular` | dispara o mesmo handler de webhook com o provedor de teste. Responde 404 em produção. |
| `POST /api/upload` | upload de mídia da equipe e do cliente — o cliente só nas pastas `chamados` e `equipamentos` |
| `POST /api/admin/upload` | biblioteca de mídia do painel |
| `GET /api/captcha` | captcha em SVG dos formulários públicos |

---

## O modelo de domínio, em prosa

O eixo da plataforma é a cadeia
**pedido → pagamento → equipamento → chamado → OS → orçamento → contrato**.
Cada elo tem um arquivo de regra em `src/lib/`, e é lá que a decisão mora — não
na página.

1. **Carrinho** — `src/lib/carrinho.ts`, modelo `Cart`. Visitante tem carrinho
   preso a um cookie opaco; ao entrar, `fundirCarrinhoNoLogin` junta esse
   carrinho ao da conta.
2. **Pedido** — `src/lib/pedido.ts`, modelo `Order`, prefixo `JB`.
   `criarPedido` roda dentro de uma transação: recalcula subtotal, desconto e
   total **a partir do banco**, grava os itens com snapshot (nome, SKU, marca,
   modelo, condição, preço e foto — o pedido antigo nunca depende do produto
   atual), baixa o estoque com `UPDATE` condicional, amarra a unidade física ao
   item quando o produto é único, registra o movimento de estoque, incrementa o
   uso do cupom e apaga o carrinho. Dois compradores simultâneos do mesmo
   seminovo: o primeiro leva, o segundo recebe `ErroDeEstoque`.
3. **Pagamento** — `src/lib/pagamento/`, modelos `Payment` e `PaymentEvent`. O
   pedido só vira `pago` pelo webhook, em `confirmarPagamento`, que é
   idempotente.
4. **Equipamento** — `src/lib/equipamento.ts`, modelo `Equipment`. Ao confirmar
   o pagamento, cada item de produto vira um equipamento no prontuário do
   cliente, com origem `compra_jb`, garantia contada a partir de
   `warrantyMonths` e próxima manutenção prevista. O cliente também pode
   cadastrar equipamento que **não** comprou da JB — a assistência atende os
   dois casos.
5. **Chamado** — `src/lib/assistencia.ts`, modelo `ServiceRequest`, prefixo
   `AT`. Aberto pelo site (com ou sem conta) ou pela equipe, sempre apontando
   para um equipamento. Status e evento andam sempre na mesma transação: status
   sem evento é buraco na linha do tempo, evento sem status é mentira.
6. **Ordem de serviço** — `src/lib/os.ts`, modelo `WorkOrder`, prefixo `OS`.
   Nasce do chamado. Tem itens (peça, serviço, deslocamento), checklist, mídia,
   diagnóstico e aceite. `concluirOS` fecha a OS, devolve o equipamento a
   `operacional`, carimba `lastMaintenanceAt` e recalcula `nextMaintenanceAt`.
7. **Orçamento** — `src/lib/orcamento.ts`, modelo `Quote`, prefixo `ORC`. Dois
   tipos: `comercial` (venda) e `assistencia` (serviço). Quando um orçamento
   comercial é aprovado, `converterEmPedido` cria o pedido — é a ponte de volta
   ao passo 2. Aprovado um orçamento de assistência, o chamado vinculado passa a
   `aprovado` e o serviço é liberado.
8. **Contrato de manutenção** — `src/lib/manutencao.ts`, modelo
   `MaintenanceContract`, prefixo `CT`. Cobre equipamentos específicos e gera as
   visitas previstas segundo o plano (um plano de 12 meses com 2 visitas visita a
   cada 6). Visita concluída volta para o prontuário do equipamento; contrato
   encerrado cancela as visitas que ainda não aconteceram.

Ao redor desse eixo: catálogo (`src/lib/catalogo.ts`), estoque e unidades
físicas identificáveis, cupons, documentos privados, notificações e fila de
mensagens (`src/lib/notificacoes.ts`), leads, tickets de suporte, CMS
(páginas, slides, seções da home, FAQ, mídia) e auditoria
(`src/lib/auditoria.ts`).

Os fluxos de status de cada entidade, com as transições válidas, estão em
[`docs/dominio.md`](docs/dominio.md).

### Dinheiro, datas e numeração

**Dinheiro é sempre inteiro em centavos.** Todo campo monetário do schema
termina em `Cents` e é `Int`. Não existe `Float` de dinheiro em lugar nenhum, e
não deve passar a existir: `0.1 + 0.2` não é `0.3` em ponto flutuante, e o erro
aparece justamente no fechamento do mês. Formate com `formatarPreco(centavos)`
de `@/lib/format`; converta entrada de formulário com `paraCentavos`.

**Datas são gravadas em UTC e exibidas em America/Sao_Paulo.** Nunca use
`toLocaleDateString` solto: os helpers `formatarData`, `formatarDataHora`,
`formatarDataExtensa` e `paraInputDate` de `@/lib/format` fixam o fuso, e é isso
que impede um pedido feito às 22h de aparecer no dia seguinte.

**Numeração de documento** vive em `src/lib/codigos.ts`. Cada tipo tem prefixo —
`JB` pedido, `OS` ordem de serviço, `ORC` orçamento, `AT` chamado, `CT`
contrato, `SUP` ticket — e o contador fica na tabela `DocumentSequence`,
incrementado com `INSERT … ON CONFLICT DO UPDATE … RETURNING`, que é atômico no
Postgres. `count + 1` colidiria sob concorrência. `proximoCodigo` aceita um
cliente de transação, para o número ser reservado dentro da mesma transação que
cria o registro. Se linhas entrarem por fora — importação, restauração de backup
parcial, `INSERT` manual — o contador fica atrás do que já existe e o próximo
código colide: rode `sincronizarSequencia` antes de voltar a emitir.
`codigos.ts` é `server-only`, então os scripts que rodam fora do Next repetem o
mesmo SQL à mão em vez de importá-lo.

---

## Autenticação: duas identidades separadas

Existem **dois sistemas de login que não se encontram**.

| | Equipe interna | Cliente final |
|---|---|---|
| Módulo | `src/lib/auth.ts` | `src/lib/auth-cliente.ts` |
| Tabela | `User` | `Customer` |
| Cookie | `jb_staff` | `jb_cliente` |
| Duração | 8 horas | 30 dias |
| Chave do JWT | `AUTH_SECRET` | derivada: `AUTH_SECRET:cliente` |
| Guarda | `exigirStaff` / `exigirNivel` / `exigirArea` | `exigirCliente` |

Por que separado, e não um campo `role` numa tabela só: são populações com ciclo
de vida oposto. O cliente se cadastra sozinho, esquece a senha, some por meses e
volta; o membro da equipe é criado por um administrador e um dia sai da empresa.
Juntar os dois significaria que todo bug de escalonamento de papel na área do
cliente vira acesso ao backoffice. Com chave de assinatura derivada, um cookie de
cliente não é sequer decodificável como sessão de staff — a separação é
criptográfica, não uma comparação de `if`.

Os papéis da equipe (`StaffRole`) são `admin`, `gestor`, `comercial`, `tecnico` e
`editor`, com hierarquia numérica em `auth.ts`; `tecnico` é uma trilha
operacional paralela e não gerencia catálogo. Duas camadas convivem: `PODE.*`
responde "pode executar esta capacidade" e `AREAS`, em `src/lib/permissoes.ts`,
responde "pode abrir esta tela". Quando as duas discordam, quem manda na
navegação é `permissoes.ts`.

A autorização é **sempre no servidor**. O `proxy.ts` (o antigo `middleware.ts`,
que nesta versão do Next mudou de nome) só olha a *presença* do cookie para
redirecionar visita anônima, e não valida a assinatura, de propósito: validar
JWT em toda navegação custaria cripto no caminho quente para trocar um
redirecionamento por outro igual. A guarda de verdade é `exigirArea` /
`exigirCliente` na página, e todo acesso a dado de cliente filtra pelo id da
sessão, nunca por id vindo do navegador.

---

## Pagamento

A aplicação nunca fala com um adquirente específico: fala com a interface
`ProvedorPagamento` (`src/lib/pagamento/tipos.ts`), que tem quatro métodos —
`criarCobranca`, `lerWebhook`, `consultar` e o opcional `estornar`. Trocar de
adquirente é escrever outro adapter, sem tocar em pedido, estoque ou telas.

Há dois adapters:

- **`mock`** (`pagamento/mock.ts`) — provedor de teste, para desenvolvimento,
  demonstração e CI. Nenhuma cobrança real acontece. O desfecho é decidido pelos
  centavos do total, o que dá cenários repetíveis sem depender de sandbox
  externo: terminando em `01` recusa, em `02` fica em análise, qualquer outro
  valor aprova. Pix sempre nasce pendente e é confirmado por
  `POST /api/pagamento/simular`, que monta a mesma notificação que o provedor
  mandaria e entrega ao **mesmo** handler de webhook — não existe caminho
  paralelo, então mudar a regra lá muda aqui junto.
- **`mercadopago`** (`pagamento/mercadopago.ts`) — checkout transparente, Pix e
  cartão, com validação de assinatura no webhook e tradução do vocabulário do
  provedor para o estado interno. O cartão é tokenizado pelo SDK no navegador:
  número completo e CVV **nunca** passam por este servidor.

**A regra dura: produção nunca usa o simulado.** Se `VERCEL_ENV=production` e o
provedor escolhido não for um real, `provedorPagamento()` lança na hora, em vez
de fingir que cobrou — um pedido "pago" que ninguém cobrou é pior que um erro
visível. Do outro lado, `/api/pagamento/simular` responde 404 quando o ambiente é
produção, quando o provedor não é o de teste, ou quando o pagamento alvo não foi
criado pelo provedor de teste: as três travas precisam passar, e a rota se
comporta como se não existisse em vez de revelar que existe em outro ambiente.

E, em qualquer provedor, **só o webhook aprova**. Nem a tela, nem a volta do
navegador depois do banco. O evento é gravado com chave única *antes* de
qualquer efeito, o que torna a reentrega repetida um no-op; se o processamento
falhar depois disso, a linha do evento é apagada para que a próxima entrega volte
a valer.

---

## Ambientes

| | Produção | Preview (branch) | Local |
|---|---|---|---|
| `VERCEL_ENV` | `production` | `preview` | ausente |
| Banco | `DATABASE_URL` | `JBPREV_DATABASE_URL` | `DATABASE_URL` (docker) |
| Provedor de pagamento | real, obrigatório | simulado | simulado |
| Indexação | liberada | `noindex` (robots + `X-Robots-Tag`) | `noindex` |
| Seeds de demonstração | recusados | permitidos | permitidos |

O isolamento de banco está em `src/lib/prisma.ts`, em cinco linhas:

```ts
function urlDoBanco() {
  const preview = process.env.JBPREV_DATABASE_URL;
  if (preview && process.env.VERCEL_ENV !== "production") return preview;
  return process.env.DATABASE_URL;
}
```

Ou seja: **havendo `JBPREV_DATABASE_URL` fora de produção, ela vence**. A Vercel
expõe as duas conexões no mesmo ambiente, então a escolha precisa ser explícita —
senão uma demonstração em branch escreveria no banco real. Consequência prática:
**nunca defina `JBPREV_DATABASE_URL` no ambiente de produção**, e mantenha o
banco de preview de fato separado.

### O perigo do `.env.local`

Já aconteceu neste projeto, e vai acontecer de novo se ninguém avisar:

`vercel env pull` e `vercel integration add` escrevem um **`.env.local`** com as
variáveis de **produção**, `DATABASE_URL` inclusive. O Next dá prioridade a
`.env.local` sobre `.env`. A partir daí, `pnpm dev` na sua máquina está lendo e
**escrevendo no banco de produção** — sem aviso, sem banner, sem nenhuma
diferença visual na tela. Um `pnpm db:demo` distraído nesse estado despeja dados
de demonstração no cadastro real da JB; um `pnpm db:reset` apaga tudo.

Como conviver com isso:

- `.env.local` e `.env.preview` estão no `.gitignore` justamente por esse
  motivo, com o comentário explicando por quê.
- Se precisar rodar um comando contra produção, rode **só aquele comando**, com
  as variáveis no escopo dele, e **apague o `.env.local` em seguida**. O
  ajudante `_prod.sh` (também ignorado) existe para isso: exporta apenas
  `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do `.env.local` para o processo
  filho, sem imprimir os valores.
- Na dúvida, confira antes de qualquer comando destrutivo: se `ls .env.local`
  encontra o arquivo, você provavelmente está apontado para produção.

O passo a passo está em [`docs/operacao.md`](docs/operacao.md).

---

## Testes

Cinco camadas, e cada uma responde a uma pergunta diferente. Nenhuma delas
substitui a outra.

| Camada | Pergunta que responde | Como roda |
|---|---|---|
| `pnpm test:unit` | a regra de negócio está certa? | 192 testes, em memória, sem banco |
| `pnpm e2e` | o fluxo funciona de ponta a ponta? | 48 testes, navegador real, banco real |
| `pnpm prova:atomicidade` | duas pessoas ao mesmo tempo quebram? | concorrência real contra o Postgres |
| `pnpm responsivo` | o layout aguenta a tela do cliente? | 6 larguras × 33 rotas, medido no navegador |
| `pnpm a11y` | dá para usar sem enxergar, sem mouse? | axe-core WCAG 2.1 A/AA em 34 rotas |

As três últimas saem com código 1 quando acham problema, então servem de
portão. Todas medem no navegador de verdade em vez de inspecionar o código:
transbordo, contraste e alvo de toque dependem de fonte carregada, imagem
carregada e quebra de linha — nada disso dá para saber lendo o JSX.

```bash
# 1. suba o site e carregue os dados de demonstração
pnpm db:seed && pnpm db:demo && pnpm db:demo:operacao
pnpm dev --port 3400

# 2. em outro terminal
pnpm test:unit
E2E_BASE_URL=http://localhost:3400 pnpm e2e
BASE_URL=http://localhost:3400 pnpm responsivo
BASE_URL=http://localhost:3400 pnpm a11y

# 3. o teste de fumaça: percorre TODAS as rotas (públicas, /minha-jb e /admin),
#    entrando com o cliente e com a equipe de demonstração, e reporta status
#    HTTP, erro de console, exceção de página, requisição falha e link quebrado
pnpm tour
```

Um detalhe que custa tempo se for descoberto na hora errada: o `pnpm e2e` sobe
o próprio `next dev` na porta 3210, e o Next 16 recusa um segundo servidor de
desenvolvimento no mesmo diretório. Se você já tem um rodando, aponte a suíte
para ele com `E2E_BASE_URL` em vez de deixar os dois brigarem — sem isso a
suíte demora minutos e falha por tempo esgotado, sem dizer o porquê.

O `pnpm a11y` mede três coisas que o axe-core não cobre: se o anel de foco
realmente aparece (o axe só olha se o `outline` foi zerado, não se algo o
substituiu), se o alvo de toque tem 44px **contando o rótulo** que comanda o
campo, e se algum `aria-labelledby`/`aria-controls` aponta para um id que não
existe na página.

`pnpm tour` (= `node scripts/tour.mjs`) grava as fotos em `.shots/tour`, no
desktop e no celular, e aceita `--so=publico|conta|admin`, `--sem-fotos` e
`--celular`. É o teste de fumaça do projeto: se uma tela quebrou, ele acusa.

`pnpm typecheck` confere os tipos sem gerar build.

Os demais scripts em `scripts/` são verificações pontuais: `testa-upload.mjs`
prova que o upload grava no Vercel Blob; `shot.mjs` e `shot-admin.mjs` capturam
telas. `e2e.mjs`, `compara.mjs`, `diff-html.mjs` e `extrai-legado.mjs` são
herdados da migração do site antigo em PHP e estão desatualizados — ver a última
seção.

---

## Produção

| | |
|---|---|
| Site | https://jbsolucoesodontologicas.com.br |
| Painel | `/admin` |
| Hospedagem | Vercel, projeto `jb-site` |
| Banco | Neon Postgres, provisionado pela Vercel |
| Arquivos | Vercel Blob, store `jb-midia` |

Todo `git push` para `main` publica. Deploy, migração, seed e o que fazer quando
o webhook falha estão em [`docs/operacao.md`](docs/operacao.md).

---

## O que ainda não está pronto

Lista honesta. Nada disto aparece como "em breve" na interface — onde falta
dado, a tela mostra estado vazio com uma ação útil.

- **Nada é enviado por e-mail ou WhatsApp.** `enfileirar()` em
  `src/lib/notificacoes.ts` grava `OutboundMessage` com status `pendente`, e o
  worker que leria essa fila, renderizaria o template e faria o disparo **não
  existe**. Consequência concreta: o e-mail de redefinição de senha não chega.
  Em desenvolvimento o link é impresso no terminal para o fluxo ser testável; em
  produção não é impresso nem enviado. Hoje, trocar a senha de um cliente é
  tarefa da equipe, pelo painel.
- **Frete não é calculado no checkout.** Existem `ShippingProfile` e
  `ShippingZone` no schema e a tela `/admin/frete` para cadastrá-los, mas
  `src/app/acoes/checkout.ts` grava toda entrega que não é retirada como
  `sob_orcamento` com `valorCents: 0` — o frete é combinado depois, fora do
  sistema. Ligar o cálculo é conectar os perfis já cadastrados ao checkout.
- **Mercado Pago nunca rodou em produção.** O adapter está escrito e implementa
  a interface inteira, mas a plataforma opera hoje com o provedor de teste.
  Ligar exige `PAYMENT_PROVIDER=mercadopago`, as três variáveis do MP, cadastrar
  a URL do webhook no painel do provedor e **refazer o build** — o CSP em
  `next.config.ts` lê `PAYMENT_PROVIDER` em tempo de build.
- **Limite de taxa é por instância.** `src/lib/limite.ts` usa um `Map` em
  memória: em serverless cada instância conta a própria fatia, então o limite
  real é o configurado vezes o número de instâncias quentes. Segura formulário
  abusado e robô preguiçoso; não segura ataque distribuído. Login de cliente e
  de equipe já não dependem disso — contam tentativas na tabela `LoginAttempt`,
  que é compartilhada e sobrevive a um redeploy.
- **Não há job agendado.** O que depende do tempo passar — expirar orçamento
  vencido (`expirarVencidos`), avisar de visita de manutenção
  (`lembretesPendentes`, `visitasAtrasadas`) — só acontece quando alguém abre a
  tela correspondente. Falta um cron.
- **Scripts herdados da migração do PHP estão desatualizados.** `e2e.mjs` ainda
  aponta para `/admin/login`, rota que hoje se chama `/admin/entrar`;
  `compara.mjs` e `diff-html.mjs` comparam com o site antigo em `/empresa.php`,
  `/solucoes.php` e outras páginas que não existem mais. `pnpm tour` substitui
  os três.
- **Sem CSP com nonce.** `script-src` carrega `'unsafe-inline'`, porque nonce
  exigiria renderização dinâmica em todas as páginas — o motivo está comentado
  em detalhe no topo de `next.config.ts`. O caminho de migração é
  `experimental.sri`, hoje experimental e por isso desligado.
- **Não há verificação de e-mail no cadastro.** O campo `emailVerifiedAt` existe
  em `Customer` e aparece no painel, mas nada o preenche — depende do mesmo
  worker de envio que falta.
