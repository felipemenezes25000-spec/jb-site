# Melhor Envio — configuração da JB

A integração foi implementada de ponta a ponta sem remover a tabela própria de frete. A tabela local continua como contingência; quando o Melhor Envio está configurado, o cliente escolhe a modalidade antes do checkout e o servidor recota o mesmo serviço antes de cobrar.

## Variáveis de ambiente

```env
# ativa o agregador. Sem token, a loja usa a tabela própria.
SHIPPING_PROVIDER="melhor_envio"

# sandbox | production
MELHOR_ENVIO_ENV="sandbox"
MELHOR_ENVIO_TOKEN=""

# obrigatório pela API. Use identificação real + contato técnico.
MELHOR_ENVIO_USER_AGENT="JB Solucoes Odontologicas (tecnologia@seudominio.com.br)"

# opcional: IDs de serviços separados por vírgula, conforme a conta do Melhor Envio.
MELHOR_ENVIO_SERVICES=""

# 0 = venda comercial com NF-e; 1 = envio não comercial/conteúdo.
# Não use 1 apenas para contornar a exigência fiscal.
MELHOR_ENVIO_NON_COMMERCIAL="0"

# remetente usado para comprar a etiqueta
MELHOR_ENVIO_FROM_NAME="JB Soluções Odontológicas"
MELHOR_ENVIO_FROM_EMAIL=""
MELHOR_ENVIO_FROM_PHONE=""
MELHOR_ENVIO_FROM_DOCUMENT=""                  # CPF ou CNPJ, só números
MELHOR_ENVIO_FROM_STATE_REGISTER=""            # IE; obrigatória no fluxo comercial
MELHOR_ENVIO_FROM_ECONOMIC_ACTIVITY_CODE=""    # quando aplicável
MELHOR_ENVIO_FROM_ADDRESS=""
MELHOR_ENVIO_FROM_NUMBER=""
MELHOR_ENVIO_FROM_COMPLEMENT=""
MELHOR_ENVIO_FROM_DISTRICT=""
MELHOR_ENVIO_FROM_CITY=""
MELHOR_ENVIO_FROM_STATE="SP"
MELHOR_ENVIO_FROM_POSTAL_CODE=""               # 8 dígitos
```

O token nunca é enviado ao navegador. O painel `/admin/frete` mostra somente se a configuração está completa e lista o nome das variáveis ausentes.

## Fluxo implementado

1. Produto recebe peso embalado, largura, altura e comprimento no painel de frete.
2. `/escolher-entrega` consulta `POST /api/v2/me/shipment/calculate` com quantidade, peso, dimensões e valor segurado.
3. Cliente escolhe transportadora/serviço. A escolha fica em cookie HTTP-only.
4. Checkout recalcula no servidor. O navegador nunca envia o preço do frete.
5. O pedido grava um rótulo persistente `Melhor Envio · Transportadora · Serviço`.
6. Pagamento aprovado chama a rotina idempotente de logística.
7. A rotina recota o serviço escolhido, insere em `/api/v2/me/cart`, compra em `/api/v2/me/shipment/checkout`, gera em `/api/v2/me/shipment/generate` e obtém a impressão em `/api/v2/me/shipment/print`.
8. IDs, URL da etiqueta, chave da NF-e, estado e rastreio ficam em metadados internos do pedido; não foi criada migração só para integrar o provedor.
9. O webhook tenta a etiqueta imediatamente. O worker `/api/fila` faz retry e rastreio periódico como rede de segurança.
10. `/admin/frete` permite informar NF-e, reprocessar sem duplicar compra, abrir etiqueta e atualizar rastreio manualmente.

## Venda comercial e NF-e

No modo padrão (`MELHOR_ENVIO_NON_COMMERCIAL=0`) o sistema não compra etiqueta comercial sem a chave de 44 dígitos da NF-e. O pedido fica como `aguardando_nfe` nos metadados e pode ser retomado no painel assim que a chave for informada.

Essa espera é intencional: a automação não deve transformar uma venda comercial em declaração de conteúdo apenas para conseguir emitir o frete.

## Carteira do Melhor Envio

O fluxo totalmente automático usa o checkout da carteira do Melhor Envio. A conta precisa ter saldo suficiente para comprar as etiquetas. Saldo insuficiente fica registrado como erro operacional no pedido e o reprocessamento é idempotente.

## Sandbox antes de produção

Use `MELHOR_ENVIO_ENV=sandbox` até validar:

- cotação com CEPs reais de teste;
- produtos leves e equipamentos maiores;
- pedido com quantidade maior que 1;
- NF-e comercial;
- compra e geração de etiqueta;
- reprocessamento do mesmo pedido;
- rastreio;
- fallback da tabela própria com token removido ou API indisponível.

Depois troque token/ambiente para produção e refaça um pedido pequeno de ponta a ponta.
