# Taxonomia de eventos — JB

Contrato do que a plataforma mede. A fonte de verdade é
`src/lib/analytics/taxonomia.ts`; este documento explica as decisões e diz o
que já emite e o que ainda não.

**Versão da taxonomia:** 1

---

## As três regras

1. **Nome fixo, semântica fixa.** Uma reorganização visual do SOS não pode
   mudar o significado de `assistance_step_3`. Os identificadores das etapas
   estão presos ao domínio, não à ordem da tela.
2. **Resultado só depois do fato.** `purchase` sai da confirmação do servidor,
   nunca do clique nem da volta da página de pagamento. `assistance_submit` sai
   do chamado persistido, com número. Clique é intenção.
3. **Lista de permissão no payload.** `limparPayload` derruba todo campo que
   não esteja explicitamente liberado, e todo texto que se pareça com e-mail,
   CPF, CNPJ, telefone ou sequência longa de dígitos. Campo novo nasce
   bloqueado.

---

## O que NUNCA sai

Nome, e-mail, telefone, CPF, CNPJ, número de série, endereço, relato de
defeito, token, URL assinada, número de pedido, número de chamado.

Rota é normalizada antes de sair: `/pedido/JB-2026-0042` vira
`/pedido/[numero]`. Sem isso, o número do pedido de cada cliente entraria no
relatório de páginas mais vistas — e número de pedido abre a página dele.

**Dado financeiro da clínica não é métrica de produto.** A receita por hora, o
custo de reparo e a exposição anual da calculadora de parada não vão para
analytics. Eles seguem para a equipe pelo lead, que é CRM interno.

---

## Campos permitidos

`id_ocorrencia`, `versao`, `origem`, `rota`, `categoria`, `condicao`, `sku`,
`marca`, `metodo`, `quantidade`, `valor_centavos`, `moeda`, `etapa`, `plano`,
`resultado`, `termo`, `resultados`, `dispositivo`, `release`.

---

## Consentimento

Padrão: **não medir**. O script do GA4 não existe na página de quem não
aceitou — não é carregado "sem cookies", ele simplesmente não entra.

Revogar para na hora, sem recarregar. O aviso tem dois botões do mesmo peso
visual: a assimetria entre "aceitar" grande e "recusar" escondido é a forma
mais comum de arrancar um consentimento que não foi dado.

A loja funciona inteira sem medição. Nenhum fluxo depende de um evento ter
saído.

---

## Deduplicação

| Camada | Como |
|---|---|
| Dentro da aba | `Set` em memória com `id_ocorrencia`; cobre remontagem, Strict Mode e voltar para a página |
| Entre cliente e servidor | `id_ocorrencia` deriva da referência de negócio (`purchase:<pedidoId>`), então os dois lados produzem a mesma chave |
| Webhook repetido | o efeito de negócio já é idempotente (`PaymentEvent` com chave única); o evento acompanha |

---

## Estado da instrumentação

| Evento | Emite hoje | Onde |
|---|---|---|
| `downtime_calculated` | **sim** | `calculadora-parada.tsx`, ao levar o resultado adiante |
| `maintenance_lead` | **sim** | `formulario-plano.tsx`, depois do sucesso confirmado pelo servidor |
| LCP, INP, CLS | **sim** | `medicao.tsx`, via `useReportWebVitals` |
| `home_view`, `catalog_view`, `product_view` | não | a camada existe; falta chamar nas páginas |
| `search` | não | idem — o termo passa pelo filtro de dado pessoal |
| `add_to_cart`, `checkout_start` | não | idem |
| `purchase` | não | precisa sair do servidor, na confirmação de pagamento |
| `assistance_*` | não | idem |
| `whatsapp_click`, `phone_click` | não | idem |
| `clinic_signup`, `equipment_registered` | não | idem |
| `quote_*`, `document_downloaded`, `maintenance_scheduled`, `review_requested` | não | idem |

O que falta é chamada, não infraestrutura: a camada, o consentimento, o filtro
de privacidade, a deduplicação e o CSP estão prontos e testados.

---

## Funis

Definidos, ainda sem consulta montada no provedor — depende de o GA4 estar
configurado e receber volume.

- **Compra:** `home_view` → `catalog_view` → `product_view` → `add_to_cart` →
  `checkout_start` → `purchase`
- **Assistência:** `assistance_start` → `assistance_step_1..5` →
  `assistance_submit`
- **Preventiva:** `maintenance_plan_view` → `downtime_calculated` →
  `maintenance_lead`
- **Plataforma:** `clinic_signup` → `equipment_registered`
- **Orçamento:** `quote_opened` → `quote_approved` / `quote_rejected`

---

## Core Web Vitals

Coletadas de navegador real (RUM), não de laboratório. As metas do escopo — no
p75, LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1, separadas por celular e desktop —
são **metas**, não resultado. Enquanto não houver amostra, não há número a
declarar.

O valor vai multiplicado por mil porque CLS é fracionário e agregador só soma
inteiro; quem lê divide por mil.

---

## Ativação

1. Criar a propriedade GA4 e obter o identificador `G-XXXXXXXXXX`.
2. Salvar em `/admin/configuracoes`, campo "Código do Analytics". O formato é
   validado no cadastro — o campo não aceita HTML nem script.
3. Sem identificador válido, nada carrega e o aviso de consentimento nem
   aparece: perguntar sobre medição a quem não tem medição configurada é pedir
   uma decisão sem consequência.

Registrado como dependência externa em `pendencias-externas.md`.
