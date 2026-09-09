# Melhor Envio — configuração da JB

A integração foi implementada de ponta a ponta sem remover a tabela própria de frete. A tabela local continua como contingência; quando o Melhor Envio está configurado, o cliente escolhe a modalidade antes do checkout e o servidor recota **a mesma modalidade** antes de cobrar.

> O arquivo `docs/melhor-envio.env.example` contém um bloco pronto para copiar para a Vercel/ambiente. Nunca commite o token real.

## Variáveis principais

```env
SHIPPING_PROVIDER="melhor_envio"
MELHOR_ENVIO_ENV="sandbox"                 # sandbox | production
MELHOR_ENVIO_TOKEN=""
MELHOR_ENVIO_USER_AGENT="JB Solucoes Odontologicas (tecnologia@seudominio.com.br)"
MELHOR_ENVIO_SERVICES=""                   # opcional: IDs separados por vírgula
MELHOR_ENVIO_NON_COMMERCIAL="0"            # 0 = comercial/NF-e

MELHOR_ENVIO_FROM_NAME="JB Soluções Odontológicas"
MELHOR_ENVIO_FROM_EMAIL=""
MELHOR_ENVIO_FROM_PHONE=""
MELHOR_ENVIO_FROM_DOCUMENT=""              # CPF ou CNPJ
MELHOR_ENVIO_FROM_STATE_REGISTER=""        # IE no fluxo comercial
MELHOR_ENVIO_FROM_ECONOMIC_ACTIVITY_CODE=""
MELHOR_ENVIO_FROM_ADDRESS=""
MELHOR_ENVIO_FROM_NUMBER=""
MELHOR_ENVIO_FROM_COMPLEMENT=""
MELHOR_ENVIO_FROM_DISTRICT=""
MELHOR_ENVIO_FROM_CITY="São Paulo"
MELHOR_ENVIO_FROM_STATE="SP"
MELHOR_ENVIO_FROM_POSTAL_CODE=""           # 8 dígitos
```

O token é usado apenas no servidor. O navegador nunca recebe token, saldo da carteira, dados internos do Melhor Envio ou preço aceito como verdade.

## Agência de postagem

Quando a integração usa **token gerado diretamente no painel do Melhor Envio**, LATAM Cargo, Azul Cargo e Buslog podem exigir uma agência/unidade de postagem. A agência é uma escolha operacional da JB e não pode ser inventada pelo código.

Configure por `companyId`:

```env
# CSV
MELHOR_ENVIO_AGENCY_BY_COMPANY="6:123,9:456"

# ou JSON
MELHOR_ENVIO_AGENCY_BY_COMPANY='{"6":123,"9":456}'
```

Consulte os IDs reais da conta pelo endpoint de agências/transportadoras do Melhor Envio. Não use nome da transportadora como chave de regra.

## Fluxo implementado

1. Cada produto recebe **peso e dimensões da embalagem de transporte** no painel.
2. `/escolher-entrega` consulta `POST /api/v2/me/shipment/calculate` usando origem, destino, quantidade, dimensões, peso e valor segurado.
3. Só as opções realmente devolvidas pela API aparecem ao cliente; preço usa `custom_price` e prazo usa `custom_delivery_time`.
4. Cliente escolhe transportadora/serviço. A escolha fica em cookie HTTP-only com IDs, nunca com preço confiável.
5. No fechamento o servidor recota a modalidade escolhida. Se ela sumiu ou a API não consegue confirmar o preço, **não troca silenciosamente por outro frete e não cobra**.
6. O pedido grava `Melhor Envio · Transportadora · Serviço`; os IDs técnicos e demais estados ficam no bloco interno de logística.
7. Pagamento confirmado aciona a rotina de logística independentemente de ter vindo de cartão síncrono, webhook ou confirmação manual.
8. A rotina insere em `/api/v2/me/cart`, compra em `/api/v2/me/shipment/checkout`, gera em `/api/v2/me/shipment/generate` e obtém a impressão em `/api/v2/me/shipment/print`.
9. IDs, pacotes, URL da etiqueta, NF-e, rastreios e estado ficam em metadata interna do pedido.
10. O worker `/api/fila` reprocessa falhas, atualiza rastreio e tenta novamente cancelamentos pendentes.
11. `/admin/frete` permite testar cotação, preencher peso/dimensões, informar NF-e, emitir/reprocessar e atualizar rastreio.

## Concorrência e idempotência

Pagamento síncrono, webhook, botão do admin e worker podem chegar quase juntos. Para impedir compra duplicada, a emissão usa um **lock otimista na linha do pedido**, com TTL curto, sem manter transação de banco aberta durante HTTP externo.

Cada ID criado no carrinho do Melhor Envio é persistido imediatamente. Num envio com vários pacotes, se o processo cair depois do primeiro volume, o retry continua dos volumes faltantes em vez de comprar tudo outra vez.

## Múltiplos volumes

A cotação do Melhor Envio pode devolver vários `packages`. O sistema preserva dimensões, peso e mapeamento `packages[].products`.

- Transportadoras/serviços que aceitam volumes agrupados recebem todos os volumes na mesma inserção.
- Correios (serviços 1, 2 e 17) e serviço 27 são separados automaticamente pacote a pacote conforme a regra atual da API.
- Para J&T/Loggi ou qualquer serviço que recuse o agrupamento com `422`, o sistema faz fallback seguro para uma etiqueta por pacote, desde que a cotação tenha informado quais produtos pertencem a cada pacote.
- IDs adicionais conhecidos na sua conta podem ser declarados em `MELHOR_ENVIO_SINGLE_VOLUME_COMPANY_IDS`.

O sistema não duplica a lista inteira de produtos em cada pacote: isso geraria declaração fiscal incorreta.

## Venda comercial e NF-e

No modo padrão (`MELHOR_ENVIO_NON_COMMERCIAL=0`) o sistema não compra etiqueta comercial sem chave NF-e de 44 dígitos. O pedido fica aguardando NF-e e retoma do ponto correto quando a chave é informada.

A automação não transforma venda comercial em declaração de conteúdo para contornar regra fiscal.

### Azul Cargo

A documentação atual do Melhor Envio mantém restrições adicionais para compra comercial da Azul e cita `options.invoice.xml_content` em determinados fluxos. Esta implementação trabalha com **chave NF-e**, não XML completo; por segurança, `companyId 9` fica bloqueado por padrão em cotação comercial:

```env
MELHOR_ENVIO_COMMERCIAL_DISABLED_COMPANY_IDS="9"
```

Não remova esse bloqueio até o fluxo da JB fornecer exatamente o documento exigido pela API vigente.

## Cancelamento

Ao cancelar ou estornar um pedido, a operação comercial/estoque é concluída primeiro. Depois o sistema solicita o cancelamento das etiquetas do Melhor Envio (`reason_id=2`).

Se a transportadora estiver fora ou a etiqueta não puder ser cancelada naquele momento, **o cancelamento do pedido não é revertido**: a pendência fica registrada e o worker tenta novamente. Etiquetas já postadas/coletadas podem não ser canceláveis e exigem tratamento operacional.

## Rastreamento

O sistema aceita uma ou várias etiquetas por pedido. Guarda todos os códigos de rastreio e só marca o pedido como **entregue** quando todos os volumes acompanhados estiverem entregues. Também evita criar eventos de entrega duplicados a cada rodada do worker.

## Carteira do Melhor Envio

O fluxo automático usa o checkout da carteira do Melhor Envio. A conta precisa ter saldo suficiente. Saldo insuficiente fica registrado como erro operacional e o retry não volta a criar novos itens de carrinho quando os IDs já foram persistidos.

## Sandbox antes de produção

Use `MELHOR_ENVIO_ENV=sandbox` e valide pelo menos:

- PAC/SEDEX e Jadlog no ambiente de teste;
- CEP atendido e CEP não atendido;
- produto sem dimensão (deve bloquear cotação);
- quantidade maior que 1;
- cotação retornando mais de um pacote;
- mudança/indisponibilidade da modalidade antes do pagamento (não pode haver fallback silencioso);
- NF-e comercial;
- saldo insuficiente;
- dupla confirmação de pagamento/webhook simultâneo;
- reprocessamento do mesmo pedido;
- cancelamento antes da postagem;
- rastreio com uma e várias etiquetas;
- tabela própria com integração desativada.

Depois troque token/ambiente para produção e faça um pedido pequeno de ponta a ponta antes de liberar o fluxo para todos os produtos.
