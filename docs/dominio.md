# Domínio: estados e transições

Este documento descreve os fluxos de status de cada entidade da plataforma e
quem tem permissão de movê-los. Tudo aqui foi lido do código: os enums estão em
`prisma/schema.prisma`, e a regra que os move está no arquivo de `src/lib/`
citado em cada seção. Quando a tela e este documento discordarem, o código é
quem manda — corrija este arquivo.

Uma observação vale para tudo o que vem abaixo: **status e evento andam sempre
juntos, na mesma transação**. Um status sem evento é um buraco na linha do
tempo; um evento sem status é uma mentira. Todas as entidades desta página têm
uma tabela de eventos ao lado (`OrderStatusEvent`, `ServiceRequestEvent`,
`WorkOrderEvent`, `QuoteEvent`, `EquipmentEvent`), e ela é a fonte do histórico
mostrado ao cliente.

Também vale para todas: o cliente só vê o evento marcado como visível
(`visibleToCustomer`). Nota interna de triagem existe, é útil, e fica do lado de
cá.

---

## Pedido — `OrderStatus`

**Arquivo:** `src/lib/pedido.ts` · **Modelo:** `Order` · **Prefixo:** `JB`

Treze estados:

`aguardando_pagamento`, `pagamento_em_analise`, `pago`, `separacao`,
`revisao_tecnica`, `aguardando_frete`, `pronto_retirada`, `enviado`,
`instalacao_agendada`, `entregue`, `concluido`, `cancelado`, `reembolsado`.

### Fluxo mostrado ao cliente

`FLUXO_PADRAO` é o subconjunto que vira linha do tempo em `/pedido/[numero]` e
`/minha-jb/pedidos/[numero]`:

```
aguardando_pagamento → pago → separacao → enviado → entregue → concluido
```

Os demais estados existem para a operação da JB e aparecem como etiqueta, não
como etapa: `pagamento_em_analise`, `revisao_tecnica`, `aguardando_frete`,
`pronto_retirada`, `instalacao_agendada`, `cancelado`, `reembolsado`.

Os rótulos em português estão em `ROTULO_STATUS`, e é ele que a interface usa —
nunca o valor cru do enum.

### Quem move o quê

| Transição | Quem dispara | Onde |
|---|---|---|
| (criação) → `aguardando_pagamento` | `criarPedido` | checkout ou conversão de orçamento comercial |
| → `pagamento_em_analise` | webhook, quando o provedor devolve `em_analise` | `POST /api/pagamento/webhook` |
| → `pago` | **só** `confirmarPagamento`, chamado pelo webhook ou pelo pagamento manual da equipe | `confirmarPagamento` |
| → `instalacao_agendada` | agendamento de instalação pela equipe | `src/app/acoes/admin-vendas.ts` |
| qualquer outra | equipe, na tela do pedido | `mudarStatus` |
| → `cancelado` | **só** `cancelarPedido` | `cancelarPedido` |

Não existe uma matriz de transições permitidas para o pedido: a equipe pode
corrigir o status para qualquer valor do enum, porque a realidade da operação
não é linear (um pedido volta para separação, um envio é desfeito). O que existe
são guardas em `src/app/acoes/admin-vendas.ts`:

- não se grava o status em que o pedido já está;
- `cancelado` **não** pode ser gravado por essa ação — precisa passar por
  `cancelarPedido`, que devolve o estoque e libera as unidades físicas;
- `pago` é recusado se `paidAt` já estiver preenchido — reconfirmar pagamento
  criaria equipamento duplicado no prontuário.

### Marcos de data

`mudarStatus` carimba automaticamente, além do status:

| Status | Campo |
|---|---|
| `pago` | `paidAt` |
| `enviado` | `shippedAt` |
| `entregue` | `deliveredAt` |
| `concluido` | `closedAt` |
| `cancelado` | `canceledAt` |

### Efeitos colaterais

- **Ao criar** (dentro da transação): itens gravados com snapshot; estoque
  baixado com `UPDATE … WHERE stock >= quantidade` (o segundo comprador
  simultâneo recebe `ErroDeEstoque`); `InventoryUnit` do produto único passa a
  `vendido` e é amarrada ao `OrderItem`; `InventoryMovement` de tipo `saida`;
  `usedCount` do cupom incrementado; addon de instalação vira `InstallationTask`
  pendente; o carrinho é apagado.
- **Ao confirmar o pagamento** (`confirmarPagamento`, idempotente — sai na
  primeira linha se `paidAt` já existe): cada item de produto vira um
  `Equipment` no prontuário do cliente, com origem `compra_jb`, garantia a
  partir de `warrantyMonths` e `nextMaintenanceAt` em 180 dias; uma
  `Notification` é criada.
- **Ao cancelar** (`cancelarPedido`): estoque devolvido item a item,
  `InventoryMovement` de tipo `devolucao`, unidades físicas de volta a
  `disponivel` com `orderItemId` nulo.

---

## Pagamento — `PaymentStatus`

**Arquivo:** `src/lib/pagamento/` · **Modelos:** `Payment`, `PaymentEvent`

Oito estados: `criado`, `pendente`, `em_analise`, `aprovado`, `recusado`,
`expirado`, `cancelado`, `estornado`.

O estado do pagamento **não é decidido aqui**: é espelho do que o provedor diz.
O único lugar que o altera a partir do provedor é
`POST /api/pagamento/webhook`, e a consulta manual da equipe
(`src/app/acoes/admin-vendas.ts`), que pergunta ao provedor e grava a resposta —
nunca o contrário.

| Estado recebido | O que acontece com o pedido |
|---|---|
| `aprovado` | `confirmarPagamento(pedidoId)` |
| `em_analise` | pedido vai a `pagamento_em_analise`, se ainda estava em `aguardando_pagamento` e não pago |
| `recusado` | **não cancela o pedido.** Registra um `OrderStatusEvent` dizendo que dá para tentar de novo; o estoque continua reservado |
| `expirado` / `cancelado` | mesma coisa: evento informando, pedido intacto |
| `estornado` | `cancelarPedido(...)` — estoque devolvido |
| `criado` / `pendente` | só o registro do evento |

### Idempotência

O `PaymentEvent` é gravado com `eventKey` único **antes** de qualquer efeito.
Reentrega repetida esbarra no unique e devolve 200 sem fazer nada. Se o
processamento falhar *depois* disso, a linha do evento é apagada, para que a
próxima entrega do provedor volte a valer — senão o evento ficaria marcado como
tratado sem nunca ter surtido efeito.

O handler responde 200 sempre que aceita o evento, mesmo quando não há nada a
fazer (cobrança de outro ambiente, pagamento já removido). Provedor que recebe
erro reenvia em laço, e laço de reentrega é incidente noturno.

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

### As seis etapas visíveis ao cliente

Catorze status é vocabulário de bancada, não de quem espera o equipamento
voltar. `passosDoChamado` colapsa tudo em seis etapas
(`solicitacao_recebida`, `triagem`, `visita_agendada`, `em_diagnostico`,
`em_manutencao`, `concluido`), pelo mapa `ETAPA_DO_STATUS`:

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
| (criação) → `solicitacao_recebida` | `abrirChamado`, do site ou do painel |
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

Ao cliente são mostradas três etapas (`aberta`, `em_execucao`, `concluida`);
`aguardando_peca` e `aguardando_aprovacao` colapsam em "em execução",
`cancelada` colapsa em "concluída".

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

**Arquivo:** `src/lib/orcamento.ts` · **Modelo:** `Quote` · **Prefixo:** `ORC`

Sete estados: `rascunho`, `enviado`, `em_duvida`, `aprovado`, `recusado`,
`expirado`, `convertido`. Dois tipos (`QuoteKind`): `comercial` (venda de
equipamento) e `assistencia` (serviço técnico).

```
rascunho ──enviarOrcamento──► enviado ──┬── aprovarOrcamento ──► aprovado
                                 ▲      │                          │
                       em_duvida ┘      ├── recusarOrcamento ──► recusado
                                        └── expirarVencidos ──► expirado

aprovado (kind = comercial) ──converterEmPedido──► convertido
```

`STATUS_ORCAMENTO_ABERTOS` = `enviado`, `em_duvida` — são os estados em que a
proposta ainda está viva e pode ser decidida pelo cliente.

### Guardas reais

- `enviarOrcamento` recusa orçamento **sem itens** e orçamento já `convertido`.
  Define `sentAt` e, se ainda não houver, `validUntil` (padrão: 7 dias).
- `aprovarOrcamento` é idempotente: `aprovado` e `convertido` devolvem o que já
  existe. Recusa `rascunho` ("ainda não foi enviado ao cliente") e recusa
  proposta com `validUntil` no passado ("o prazo desta proposta venceu").
- `recusarOrcamento` recusa apenas o já `convertido`. Registra o motivo — é o
  motivo que alimenta a próxima proposta.
- `expirarVencidos` move para `expirado` tudo que está em
  `STATUS_ORCAMENTO_ABERTOS` com `validUntil` no passado. É idempotente: o
  segundo passe não encontra mais nada em aberto. **Ninguém chama isso num
  cron** — hoje só roda quando uma tela o invoca (ver "O que ainda não está
  pronto", no README).

### Efeitos no chamado vinculado

| Ação no orçamento | Chamado (`requestId`) vai para |
|---|---|
| enviado | `orcamento_enviado` |
| aprovado | `aprovado` |
| recusado | `aguardando_cliente` |

### Conversão em pedido

Só orçamento **`comercial`** vira pedido, e só na aprovação
(`converterEmPedido`, dentro da mesma transação). Orçamento de `assistencia`
aprovado libera o serviço; não gera pedido.

---

## Equipamento — `EquipmentStatus` e `EquipmentOrigin`

**Arquivo:** `src/lib/equipamento.ts` · **Modelo:** `Equipment`

Estados: `operacional`, `em_manutencao`, `aguardando_peca`, `inoperante`,
`desativado`.

Origens (`EquipmentOrigin`): `compra_jb`, `cadastro_cliente`,
`cadastro_tecnico`, `atendimento`. A origem não muda depois de criada — é
proveniência, não estado.

O equipamento é a única entidade cujo estado é quase todo **derivado do que
acontece em volta**:

| Evento | Efeito |
|---|---|
| pagamento confirmado de um item de produto | equipamento criado, `operacional`, origem `compra_jb`, garantia e próxima manutenção calculadas |
| OS concluída (`concluirOS`) | volta a `operacional`; `lastMaintenanceAt` = agora; `nextMaintenanceAt` = agora + `maintenanceIntervalDays` |
| visita de manutenção concluída (`concluirVisita`) | mesmas duas datas atualizadas; `EquipmentEvent` de tipo `manutencao` |
| mudança manual pela equipe ou pelo cliente | `mudarStatusEquipamento`, que grava o `EquipmentEvent` correspondente |

O histórico da ficha (`historicoDoEquipamento`) é a união de cinco fontes —
eventos próprios, chamados, ordens de serviço, visitas e documentos — ordenada
no tempo. É o "prontuário" do título.

---

## Contrato de manutenção e visitas

**Arquivo:** `src/lib/manutencao.ts` · **Modelos:** `MaintenanceContract`,
`MaintenanceVisit`, `MaintenancePlan` · **Prefixo:** `CT`

### Contrato — `ContractStatus`

`rascunho`, `ativo`, `suspenso`, `encerrado`.

`contratarPlano` cria o contrato já **`ativo`** (não passa por `rascunho`),
exige ao menos um equipamento e confere que os equipamentos são mesmo daquele
cliente. Calcula o fim pela vigência do plano (`periodMonths`), notifica o
cliente e, por padrão, gera as visitas previstas.

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
- `concluirVisita` é idempotente (visita já `concluida` volta como está).
  Atualiza as datas de manutenção do equipamento, grava `EquipmentEvent`,
  notifica o cliente e, opcionalmente, **abre uma OS** para o que precisa de
  reparo — a OS é aberta antes da transação, e seu número entra nas notas da
  visita.
- `visitasAtrasadas` e `lembretesPendentes` existem para um cron que ainda não
  existe.

---

## Produto, estoque e unidade física

**Modelos:** `Product`, `InventoryUnit`, `InventoryMovement`

- `ProductStatus`: `draft`, `active`, `archived`. Só `active` aparece no
  catálogo público (`PUBLICADO`, em `src/lib/catalogo.ts`).
- `ProductCondition`: `novo`, `seminovo`, `usado`, `recondicionado` — é o que
  alimenta as rotas `/novos`, `/seminovos`, `/usados` e `/recondicionados`.
- `UnitStatus` (`InventoryUnit`): `disponivel`, `reservado`, `vendido`,
  `indisponivel`. Unidade física identificável é **obrigatória** para
  seminovo, usado e recondicionado — cada aparelho usado é um item único, com
  número de série e histórico próprio.
- `StockMovementKind` (`InventoryMovement`, o livro-razão do estoque):
  `entrada`, `saida`, `reserva`, `liberacao_reserva`, `ajuste`, `devolucao`.
  Toda alteração de quantidade deixa uma linha aqui, com motivo e, quando
  aplicável, o pedido que a causou.

---

## Demais estados

| Enum | Valores | Onde |
|---|---|---|
| `TicketStatus` | `aberto`, `respondido`, `aguardando_cliente`, `fechado` | `SupportTicket`, prefixo `SUP` |
| `DocumentKind` | `nota_fiscal`, `pedido`, `orcamento`, `ordem_servico`, `laudo`, `certificado`, `manual`, `garantia`, `contrato`, `outro` | `Document` — arquivo privado do cliente, servido só por rota autorizada |
| `Urgency` | `baixa`, `normal`, `alta`, `parado` | prioridade do chamado; `parado` é equipamento fora de operação |
| `ServiceKind` | `instalacao`, `visita_tecnica`, `manutencao_preventiva`, `manutencao_corretiva`, `treinamento`, `retirada_equipamento`, `outro` | `Service`. `instalacao` comprada como addon vira `InstallationTask` |
| `ShippingKind` | `retirada`, `entrega_local`, `transportadora`, `sob_orcamento`, `gratis`, `nao_aplicavel` | hoje o checkout só grava `retirada` ou `sob_orcamento` |
| `PaymentMethod` | `pix`, `cartao`, `boleto`, `manual` | `manual` é o recebimento por fora, lançado pela equipe |
| `CouponKind` | `percentual`, `valor_fixo` | em `valor_fixo`, `value` é centavos; em `percentual`, é 0–100 |
| `PersonType` | `fisica`, `juridica` | decide CPF ou CNPJ e o campo de razão social |
| `StaffRole` | `admin`, `gestor`, `comercial`, `tecnico`, `editor` | ver README, "Autenticação" |
