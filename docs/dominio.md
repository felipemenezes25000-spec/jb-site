# Domínio: estados e transições

Este documento descreve os fluxos de status de cada entidade da plataforma e
quem tem permissão de movê-los. Tudo aqui foi lido do código: os enums estão em
`prisma/schema.prisma`, e a regra que os move está no arquivo de `src/lib/`
citado em cada seção. Quando a tela e este documento discordarem, o código é
quem manda — corrija este arquivo.

Uma observação vale para tudo o que vem abaixo: **status e evento andam sempre
juntos, na mesma transação**. Um status sem evento é um buraco na linha do
tempo; um evento sem status é uma mentira. Todas as entidades desta página têm
uma tabela de eventos ao lado (`ServiceRequestEvent`, `WorkOrderEvent`,
`QuoteEvent`, `EquipmentEvent`), e ela é a fonte da linha do tempo de cada ficha
no painel.

**Desde 22/09/2026 o cliente não tem tela no site.** A área `/minha-jb` e o
acompanhamento público de chamado saíram junto com a loja (`f420606`), e os
endereços antigos redirecionam para a home. O cliente fala com a JB pelo
WhatsApp; quem lê estes estados é a equipe, no painel, e é ela quem repassa ao
cliente o que importa.

A marca `visibleToCustomer` continua sendo gravada e ainda separa duas coisas:
o que pode ser dito ao cliente e a nota interna de triagem. No painel, o evento
interno aparece marcado como tal. Nota interna existe, é útil, e fica do lado de
cá.

O mesmo vale para os avisos: `assistencia.ts`, `os.ts`, `orcamento.ts` e
`manutencao.ts`, e várias ações de `src/app/acoes/admin-servico.ts`, ainda
gravam `Notification` para o cliente, com link para `/minha-jb/...`. Quem lia
essa tabela era a caixa de avisos da área do cliente. **Hoje nenhuma tela lê
`Notification`**: o aviso é gravado e ninguém o vê. O que chega ao cliente de
verdade é o que entra na fila de e-mail (`enfileirar`) e a conversa da equipe
no WhatsApp.

---

## Pedido — `OrderStatus`

**Saiu com a loja, em 22/09/2026 (`f420606`).** Não existe mais fluxo que crie,
pague, mova ou cancele pedido: `src/lib/pedido.ts`, `src/lib/pedido-base.ts`,
o checkout, `src/app/acoes/admin-vendas.ts` e as telas de `/admin/pedidos`
foram apagados, e `/pedido/*` responde 410.

O que ficou é banco. O enum `OrderStatus` (treze estados) e os modelos `Order`,
`OrderItem`, `OrderStatusEvent` e `InstallationTask` **continuam em
`prisma/schema.prisma`**, com as linhas que já existiam; a migração que apaga as
tabelas da loja vem em separado. Até ela:

- `pnpm db:demo:operacao` ainda grava pedido e pagamento de demonstração;
- dois leitores sobraram no painel e precisam sair junto com a migração:
  `candidatosAConvite` (`src/lib/convites.ts`) ainda trata pedido `entregue`
  ou `concluido` como candidato a convite de avaliação, ao lado da OS
  concluída; e a agenda (`/admin/agenda`) lista `InstallationTask`, que
  `atualizarInstalacao` (`src/app/acoes/admin-servico.ts`) ainda edita.

A regra que movia o pedido — transições, marcos de data, baixa e devolução de
estoque — está no histórico, em `src/lib/pedido.ts` e `src/lib/pedido-base.ts`
de `f420606^` (`git show f420606^:src/lib/pedido-base.ts`).

---

## Pagamento — `PaymentStatus`

**Saiu com a loja, em 22/09/2026 (`f420606`).** Não há provedor de pagamento no
código: `src/lib/pagamento/`, `POST /api/pagamento/webhook`,
`POST /api/pagamento/simular` e as telas de `/admin/pagamentos` foram apagados.
Nenhum caminho do sistema de hoje cria, consulta ou aprova pagamento.

O enum `PaymentStatus` (oito estados) e os modelos `Payment` e `PaymentEvent`
**continuam no schema** até a migração que apaga as tabelas da loja. O que
sobrou de configuração — `PAYMENT_PROVIDER` no portão de ambiente e no CSP, a
exclusão de `api/pagamento/webhook` no `matcher` do `proxy.ts` — está listado
no README, em "O que ainda não está pronto".

A regra que valia — só o webhook aprova, evento gravado com chave única antes
do efeito — está em [`decisoes.md`](decisoes.md), itens 11 e 12, marcados como
histórico.

---

## Chamado de assistência — `ServiceRequestStatus`

**Arquivo:** `src/lib/assistencia.ts` · **Modelo:** `ServiceRequest` ·
**Prefixo:** `AT`

Catorze estados. A ordem canônica (`FLUXO_CHAMADO`) é:

```
solicitacao_recebida → triagem → visita_agendada → tecnico_a_caminho
  → em_diagnostico → orcamento_enviado → aguardando_aprovacao → aprovado
  → aguardando_peca → em_manutencao → testes → concluido
```

Fora dessa linha ficam dois estados que **não são etapas de avanço**, e sim
desvios que podem acontecer em qualquer ponto do caminho:

- `aguardando_cliente` — a bola está com o cliente (responder, aprovar, liberar
  acesso). Entra em `STATUS_CHAMADO_ABERTOS`, porque o chamado ainda consome
  atenção.
- `cancelado` — saída.

### As seis etapas do lado do cliente

Catorze status é vocabulário de bancada, não de quem espera o equipamento
voltar. `passosDoChamado` colapsa tudo em seis etapas
(`solicitacao_recebida`, `triagem`, `visita_agendada`, `em_diagnostico`,
`em_manutencao`, `concluido`), pelo mapa `ETAPA_DO_STATUS`.

Até 22/09/2026 essa era a linha do tempo da área do cliente. Hoje ela aparece
só no painel, na ficha do chamado, no cartão "Etapa do atendimento" (com o
subtítulo "Como o cliente enxerga"): é a frase que a equipe usa para dizer ao
cliente, no WhatsApp, em que ponto o equipamento está.

| Status real | Etapa mostrada |
|---|---|
| `solicitacao_recebida` | Solicitação recebida |
| `triagem`, `aguardando_cliente` | Em triagem |
| `visita_agendada`, `tecnico_a_caminho` | Visita agendada |
| `em_diagnostico`, `orcamento_enviado`, `aguardando_aprovacao`, `aprovado` | Em diagnóstico |
| `aguardando_peca`, `em_manutencao`, `testes` | Em manutenção |
| `concluido`, `cancelado` | Concluído |

`aguardando_peca` continua sendo "em manutenção" aos olhos de quem espera — e
essa é a leitura certa.

### Quem move o quê

Todo caminho que mexe em status passa por `aplicarStatus`, que grava status +
evento + notificação numa transação só e carimba `closedAt` quando o status é
final (`concluido` ou `cancelado`) — e o limpa quando não é.

| Transição | Disparada por |
|---|---|
| (criação) → `solicitacao_recebida` | `abrirChamado`, só pelo painel (`/admin/assistencia/novo`) — o site não abre chamado, leva ao WhatsApp |
| → `visita_agendada` | `agendarVisita` (recusa chamado `cancelado`) |
| → `em_diagnostico` | `abrirOS`, quando a OS nasce de um chamado |
| → `orcamento_enviado` | `enviarOrcamento`, num orçamento ligado ao chamado |
| → `aprovado` | `aprovarOrcamento` |
| → `aguardando_cliente` | `recusarOrcamento` — a bola volta para a JB revisar a proposta com o cliente |
| → `concluido` | `concluirOS` |
| qualquer outra | equipe, por `mudarStatusChamado` |

Não há matriz de transições proibidas: a triagem real pula etapas, e travar isso
no código só produziria contorno manual no banco.

---

## Ordem de serviço — `WorkOrderStatus`

**Arquivo:** `src/lib/os.ts` · **Modelo:** `WorkOrder` · **Prefixo:** `OS`

Seis estados. Ordem canônica (`FLUXO_OS`), com `cancelada` fora dela por ser
saída e não etapa:

```
aberta → em_execucao → aguardando_aprovacao → aguardando_peca → concluida
```

`STATUS_OS_ABERTOS` = `aberta`, `em_execucao`, `aguardando_peca`,
`aguardando_aprovacao` — é o filtro de "OS que ainda ocupa a agenda de alguém".

A linha do tempo da OS (`passosDaOS`) tem três etapas (`aberta`,
`em_execucao`, `concluida`) e, depois delas, o aceite do cliente;
`aguardando_peca` e `aguardando_aprovacao` colapsam em "em execução",
`cancelada` colapsa em "concluída". Era a leitura do cliente na área dele; hoje
é o cartão "Andamento" da OS no painel.

### Regras

- **Abertura** (`abrirOS`): quando nasce de um chamado, o chamado é movido a
  `em_diagnostico` **dentro da mesma transação**, escrevendo direto em vez de
  chamar `mudarStatusChamado` — chamar abriria uma segunda transação enquanto
  esta ainda segura as linhas. Se há equipamento, ele ganha um `EquipmentEvent`.
- **Totais**: `recalcularTotaisDaOS` refaz peças, serviços e desconto a partir
  dos itens. Qualquer rota que mexa em item precisa chamá-la — é ela que garante
  que o total nunca venha do formulário.
- **Conclusão** (`concluirOS`): idempotente (OS já concluída volta como está) e
  recusa OS `cancelada`. Carimba `closedAt`, grava diagnóstico, serviço
  executado, teste final, garantia e aceite; devolve o equipamento a
  `operacional`, com `lastMaintenanceAt` agora e `nextMaintenanceAt` recalculado
  pelo `maintenanceIntervalDays`; e, havendo chamado vinculado, move o chamado a
  `concluido`.

---

## Orçamento — `QuoteStatus`

**Arquivos:** `src/lib/orcamento.ts` (regra) e
`src/app/acoes/admin-orcamentos.ts` (painel) · **Modelo:** `Quote` ·
**Prefixo:** `ORC`

**Só orçamento de reparo.** Peça, mão de obra e deslocamento, em linhas de
texto livre — sem produto de catálogo, sem frete e sem conversão em pedido. O
orçamento nasce no painel, por dois caminhos, e os dois gravam
`kind = assistencia` e status `rascunho`:

- `criarOrcamentoAdmin` (`/admin/orcamentos/novo`) — avulso, para um cliente
  cadastrado ou só com o nome do contato;
- `abrirOrcamentoDoChamado` (`src/app/acoes/admin-servico.ts`) — ligado ao
  chamado pelo `requestId`, e é esse vínculo que faz as decisões do orçamento
  moverem o chamado.

O enum tem oito estados: `rascunho`, `solicitado`, `enviado`, `em_duvida`,
`aprovado`, `recusado`, `expirado`, `convertido`. Dois deles não nascem mais e
só aparecem em registro antigo:

- `solicitado` era o pedido que o cliente fazia pelo site, em `/orcamento`. A
  página saiu, e nenhum caminho passa `pedidoDoCliente` a `criarOrcamento`.
- `convertido` era o orçamento comercial que virou pedido (ver "Conversão em
  pedido", abaixo).

Pelo mesmo motivo, `QuoteKind` ainda tem `comercial` (venda de equipamento) ao
lado de `assistencia`, mas só `assistencia` é criado. `comercial` sobra em
registro antigo e no `pnpm db:demo:operacao`.

```
rascunho ──enviarOrcamento──► enviado ──anotarOrcamento──► em_duvida
                                 │     ("em negociação")       │
                                 └──────────────┬──────────────┘
                                                ├── aprovarOrcamento ──► aprovado
                                                ├── recusarOrcamento ──► recusado
                                                └── expirarVencidos ───► expirado
```

`STATUS_ORCAMENTO_ABERTOS` = `enviado`, `em_duvida` — são os estados em que a
proposta ainda está viva e espera a decisão do cliente.

### Quem registra a decisão

**A equipe.** O cliente não tem mais tela para aprovar: ele responde pelo
WhatsApp, pelo telefone ou pelo e-mail, e alguém da equipe registra a decisão
no painel, em `/admin/orcamentos/[id]`, por `aprovarOrcamentoAdmin` ou
`recusarOrcamentoAdmin`. As duas exigem `exigirEdicao("orcamentos")` e deixam
auditoria.

Consequência para quem lê o registro: na aprovação, `decidedByName` é o que
foi digitado em "Quem aprovou" — o nome de quem confirmou do lado do cliente;
em branco, fica o de quem está logado. Na recusa, o formulário não pede nome, e
fica sempre o de quem está logado. Nos dois casos, `decidedIp` é o IP de quem
registrou no painel, **não** o do cliente.

### Guardas reais

- `enviarOrcamento` recusa orçamento **sem itens** e orçamento já `convertido`.
  Define `sentAt` e, se ainda não houver, `validUntil` (padrão: 7 dias).
- No painel, o mesmo botão envia e reenvia; quem separa os dois é o `sentAt`.
  O primeiro envio publica e põe na fila um e-mail com o valor e a validade,
  pedindo a resposta pelo próprio e-mail ou pelo WhatsApp — sem link de
  aprovação. Sem e-mail de contato, o orçamento é marcado como enviado e a tela
  pede para mandar pelo WhatsApp. O reenvio (`reenviarOrcamento`) numera a
  tentativa na chave de deduplicação e não republica. O corpo que ele monta
  ainda cita `/minha-jb/orcamentos/<id>`, mas não é esse texto que sai: a fila
  guarda só o template, e o worker remonta o e-mail pelo modelo
  `orcamento_enviado` (`src/lib/email/registro.ts`), que pede a resposta pelo
  e-mail ou pelo WhatsApp.
- `aprovarOrcamento` é idempotente: `aprovado` e `convertido` devolvem o que já
  existe. Recusa `rascunho` ("ainda não foi enviado ao cliente") e recusa
  proposta com `validUntil` no passado ("o prazo desta proposta venceu").
- `recusarOrcamento` recusa apenas o já `convertido`. Registra o motivo — é o
  motivo que alimenta a próxima proposta. O painel exige ao menos cinco
  caracteres.
- `anotarOrcamento` grava no histórico um recado visível ou uma anotação
  interna. Marcada como "em negociação", a anotação move `enviado` para
  `em_duvida`.
- `excluirOrcamento` só apaga `rascunho`, e só para `admin`
  (`PODE.excluirRegistros`). O que já foi enviado não se apaga: registra-se a
  recusa. A mensagem da tela também sugere "deixar expirar", o que hoje não
  acontece sozinho — ver `expirarVencidos`, abaixo.
- `expirarVencidos` move para `expirado` tudo que está em
  `STATUS_ORCAMENTO_ABERTOS` com `validUntil` no passado. É idempotente: o
  segundo passe não encontra mais nada em aberto. **Ninguém a chama** —
  nenhuma tela, nenhuma ação, nenhuma rota, nem o cron de `/api/fila`. Proposta
  vencida continua `enviado` ou `em_duvida` até alguém registrar a recusa; o
  que impede aprová-la é a guarda de `aprovarOrcamento`.

### Efeitos no chamado vinculado

| Ação no orçamento | Chamado (`requestId`) vai para |
|---|---|
| enviado | `orcamento_enviado` |
| aprovado | `aprovado` |
| recusado | `aguardando_cliente` |

### Conversão em pedido

**Não existe mais.** Até 22/09/2026, orçamento `comercial` aprovado virava
pedido na mesma transação da aprovação (`converterEmPedido`). A loja saiu, e
hoje a aprovação só libera o serviço: o chamado vinculado vai a `aprovado`, com
o evento "O serviço está liberado", e a OS segue o fluxo normal.

O que sobrou do fluxo antigo é defensivo, para os registros que já existem:
`convertido` continua no enum; `substituirItens`, `enviarOrcamento`,
`reenviarOrcamento`, `recusarOrcamento` e a edição pelo painel recusam mexer em
orçamento convertido; e `passosDoOrcamento` ainda desenha "Pedido gerado" como
último passo quando o registro antigo é `comercial`.

---

## Equipamento — `EquipmentStatus` e `EquipmentOrigin`

**Arquivo:** `src/lib/equipamento.ts` · **Modelo:** `Equipment`

Estados: `operacional`, `em_manutencao`, `aguardando_peca`, `inoperante`,
`desativado`.

Origens (`EquipmentOrigin`): `compra_jb`, `cadastro_cliente`,
`cadastro_tecnico`, `atendimento`. A origem não muda depois de criada — é
proveniência, não estado.

Hoje só nasce `cadastro_tecnico`: o único caminho que cria equipamento é
`cadastrarEquipamento`, chamado pelo painel (`cadastrarEquipamentoNoAdmin`). As
outras três ficam para os registros que já existem. `compra_jb` era carimbada
quando o pagamento de um pedido era confirmado, e `cadastro_cliente` era o
cadastro feito pelo cliente na área dele — os dois caminhos saíram com a loja
(`compra_jb` ainda nasce no `pnpm db:demo`). `atendimento` não é gravado por
nenhum caminho do código.

O equipamento é a única entidade cujo estado é quase todo **derivado do que
acontece em volta**:

| Evento | Efeito |
|---|---|
| OS concluída (`concluirOS`) | volta a `operacional`; `lastMaintenanceAt` = agora; `nextMaintenanceAt` = agora + `maintenanceIntervalDays` |
| visita de manutenção concluída (`concluirVisita`) | mesmas duas datas atualizadas; `EquipmentEvent` de tipo `manutencao` |
| mudança manual pela equipe | `mudarStatusEquipamento`, que grava o `EquipmentEvent` correspondente |

O histórico da ficha (`historicoDoEquipamento`) é a união de cinco fontes —
eventos próprios, chamados, ordens de serviço, visitas e documentos — ordenada
no tempo. É o "prontuário" do título, e hoje é lido só no painel, na ficha do
equipamento (`/admin/equipamentos/[id]`).

---

## Contrato de manutenção e visitas

**Arquivo:** `src/lib/manutencao.ts` · **Modelos:** `MaintenanceContract`,
`MaintenanceVisit`, `MaintenancePlan` · **Prefixo:** `CT`

### Contrato — `ContractStatus`

`rascunho`, `ativo`, `suspenso`, `encerrado`.

`contratarPlano` cria o contrato já **`ativo`** (não passa por `rascunho`),
exige ao menos um equipamento e confere que os equipamentos são mesmo daquele
cliente. Calcula o fim pela vigência do plano (`periodMonths`), grava uma
`Notification` para o cliente — que ninguém lê, ver o topo desta página — e,
por padrão, gera as visitas previstas.

`mudarStatusContrato` aceita qualquer um dos quatro. `encerrado` tem efeito
colateral: **cancela todas as visitas em aberto** (`prevista` e `agendada`) —
contrato encerrado não deixa visita pendurada na agenda.

### Visita — `VisitStatus`

`prevista`, `agendada`, `concluida`, `cancelada`.

```
prevista ──agendarVisitaDeManutencao──► agendada ──concluirVisita──► concluida
   └────────────── encerramento do contrato ──────────────► cancelada
```

- `gerarVisitasDoContrato` cria as visitas `prevista` até o fim da vigência. A
  periodicidade sai do plano: 12 meses com 2 visitas incluídas = uma a cada 6.
  Sem plano, o intervalo do equipamento (em dias) é convertido para meses. A
  função devolve **quantas criou e quais equipamentos ficaram sem agenda por
  falta de periodicidade** — a tela precisa poder dizer isso em voz alta, em vez
  de fingir que está tudo agendado.
- `agendarVisitaDeManutencao` é um dos dois passos do contrato que chegam ao
  cliente de verdade (o outro é o lembrete, abaixo): além da `Notification`,
  põe na fila um e-mail (`visita_agendada`)
  para o endereço do cliente, que sai como qualquer mensagem da fila (ver
  `docs/operacao.md`, "O cron diário e as tarefas que não têm cron"). A data
  entra na chave de deduplicação, então remarcar manda aviso novo e salvar a
  mesma data não manda o segundo.
- `concluirVisita` é idempotente (visita já `concluida` volta como está).
  Atualiza as datas de manutenção do equipamento, grava `EquipmentEvent`,
  grava `Notification` para o cliente e, opcionalmente, **abre uma OS** para o
  que precisa de reparo — a OS é aberta antes da transação, e seu número entra
  nas notas da visita.
- `lembretesPendentes` alimenta o bloco de lembretes de `/admin/manutencao`, e
  cada lembrete tem um botão (o mesmo que aparece na ficha da visita), a ação
  `enviarLembreteDeVisita`, que chama `enviarLembreteDaVisita`. Ele põe na fila
  um e-mail (`visita_lembrete`) para o endereço do cliente e **só depois**
  grava o `MaintenanceReminder` que tira a visita da lista e impede o segundo
  envio. Se o e-mail não entra na fila — cliente sem e-mail, e-mail inválido,
  falha do banco —, nada é registrado, a visita continua pendente e a tela
  manda a equipe avisar pelo WhatsApp. A chave de deduplicação leva a
  antecedência e a data da visita: o lembrete de 7 dias e o de 1 dia são
  e-mails diferentes, remarcar gera lembrete novo, e clicar de novo no mesmo
  não manda o segundo. Visita concluída ou cancelada não recebe lembrete, nem
  no clique nem no envio (o modelo relê a visita e falha a linha). Até
  22/09/2026 o botão gravava só `Notification` e respondia "Cliente avisado"
  sem avisar ninguém.
- `visitasAtrasadas` não tem quem a chame. O painel conta as visitas vencidas
  com uma consulta própria, em `/admin`.

---

## Produto, estoque e unidade física

**Saíram com a loja, em 22/09/2026 (`f420606`).** Não há mais catálogo público
nem estoque no painel: `src/lib/catalogo.ts`, `src/lib/homonimos.ts`, as telas
de `/admin/produtos`, `/admin/estoque` e `/admin/marcas` e todas as páginas de
vitrine foram apagados. As rotas públicas da vitrine (`/loja`, `/seminovos`,
`/novos`, `/usados`, `/recondicionados`, `/categoria`, `/marcas`, `/busca`)
respondem 410 no `proxy.ts`.

O que ficou é banco. `Product`, `Brand`, `InventoryUnit`, `InventoryMovement` e
os enums `ProductStatus`, `ProductCondition`, `UnitStatus` e
`StockMovementKind` **continuam em `prisma/schema.prisma`** até a migração que
apaga as tabelas da loja. Até lá:

- `pnpm db:demo` e `pnpm db:vitrine` ainda gravam marcas, produtos e unidades
  físicas de demonstração;
- três leitores de `Product` sobraram no painel e precisam sair junto com a
  migração: o produto ligado a um ticket antigo em `/admin/suporte/[id]`, a
  escolha de produto para pergunta frequente (`produtosParaEscolha`, em
  `src/components/admin/conteudo/consultas.tsx`) e uma consulta de
  `isEquipment` na trilha de auditoria (`src/lib/auditoria.ts`).

As regras de vitrine — `PUBLICADO`, `DISPONIVEL`, `VITRINE`, unidade única
vendida — estão em [`decisoes.md`](decisoes.md), item 21, marcado como
histórico, e no código de `f420606^:src/lib/catalogo.ts`.

### Categoria e marca com o mesmo nome

`Category` **não** saiu: é o tipo de equipamento, escolhido ao cadastrar
equipamento e ao abrir chamado no painel (só as publicadas aparecem), e é
editado na área "cadastros", em `/admin/categorias`
(`src/app/acoes/admin-cadastros.ts`). `Brand` ficou só no banco.

Nenhuma das duas tem restrição de nome único — só de `slug`. O catálogo
carregou três vezes (site em PHP, protótipo, demonstração) e ficou com duas
categorias "Biossegurança" e duas marcas "Schuster". O banco do preview foi
unificado em 08/09/2026; o banco local continua com os pares, que os seeds
recriam.

A proteção que existia saiu com a loja. `src/lib/homonimos.ts`, que juntava
homônimos na exibição, e `pnpm duplicatas:unificar`, que movia os vínculos para
o canônico, foram apagados. Onde as duas categorias continuarem publicadas, o
painel mostra duas "Biossegurança" na escolha de categoria. Ver
`docs/operacao.md`, "Cadastros duplicados de categoria e marca".

---

## Demais estados

| Enum | Valores | Onde |
|---|---|---|
| `TicketStatus` | `aberto`, `respondido`, `aguardando_cliente`, `fechado` | `SupportTicket`, prefixo `SUP`. Nenhum fluxo do código cria ticket; `/admin/suporte` responde e fecha os que já existem |
| `DocumentKind` | `nota_fiscal`, `pedido`, `orcamento`, `ordem_servico`, `laudo`, `certificado`, `manual`, `garantia`, `contrato`, `outro` | `Document` — arquivo privado, servido só à equipe, por `/admin/documentos/[id]/baixar` (área `clientes`, cada download na auditoria). Hoje só `concluirOS` cria documento, o laudo |
| `Urgency` | `baixa`, `normal`, `alta`, `parado` | prioridade do chamado; `parado` é equipamento fora de operação |
| `ServiceKind` | `instalacao`, `visita_tecnica`, `manutencao_preventiva`, `manutencao_corretiva`, `treinamento`, `retirada_equipamento`, `outro` | `Service`, editado em "cadastros". A instalação comprada como addon, que virava `InstallationTask`, saiu com a loja |
| `ShippingKind` | `retirada`, `entrega_local`, `transportadora`, `sob_orcamento`, `gratis`, `nao_aplicavel` | da loja; continua no schema até a migração, e só o `pnpm db:demo:operacao` ainda grava |
| `PaymentMethod` | `pix`, `cartao`, `boleto`, `manual` | da loja; idem |
| `CouponKind` | `percentual`, `valor_fixo` | da loja; idem |
| `PersonType` | `fisica`, `juridica` | decide CPF ou CNPJ e o campo de razão social no cadastro do cliente, no painel |
| `StaffRole` | `admin`, `gestor`, `comercial`, `tecnico`, `editor` | ver README, "Autenticação: só a equipe" |
