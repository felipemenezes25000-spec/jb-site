# Critérios de escopo — JB Plataforma

A JB não precisa vencer por ter o maior número de módulos. Ela precisa vencer por
conectar melhor o ciclo que já diferencia o negócio:

`produto → compra → equipamento da clínica → documentos → assistência → manutenção → relacionamento`

Este documento existe para impedir que toda necessidade operacional vire um
novo mini-ERP dentro da plataforma.

## Regra de entrada

Uma capacidade nova só deve ser desenvolvida como módulo próprio quando cumprir
pelo menos um destes critérios:

1. melhora diretamente conversão, confiança ou margem na venda de produtos da JB;
2. mantém contexto do equipamento depois da compra e melhora o pós-venda;
3. reduz atrito real da assistência/manutenção que depende de dados exclusivos da JB;
4. elimina trabalho manual relevante que não pode ser resolvido de forma segura por integração;
5. é necessária para segurança, auditoria, conformidade ou confiabilidade de uma função já existente.

Se não cumprir nenhum deles, a opção padrão é **não construir**.

## Perguntas antes de abrir um módulo

Antes de implementar CRM, financeiro, agenda, mensageria, documentos, logística
ou qualquer função horizontal, responda no PR:

- Qual etapa do ciclo JB melhora?
- Que dado exclusivo da JB torna a função melhor aqui do que em uma ferramenta externa?
- Existe integração suficiente com uma ferramenta especializada?
- Qual fluxo atual deixa de existir depois da entrega?
- Qual métrica mostra que vale manter esse código pelos próximos anos?

Sem respostas concretas, a feature fica fora do core.

## O que é core

- catálogo e decisão de compra;
- carrinho, orçamento, pedido e pagamento;
- estoque necessário à venda e à rastreabilidade;
- frete/logística vinculados ao pedido;
- conta da clínica;
- prontuário e documentos do equipamento;
- chamados, visitas, OS e manutenção;
- relacionamento e conteúdo técnico diretamente ligados a produto/equipamento;
- autenticação, autorização, auditoria e segurança desses fluxos.

## O que não vira core automaticamente

- contabilidade completa;
- folha/RH;
- CRM genérico para qualquer tipo de lead;
- helpdesk genérico sem relação com equipamento/cliente JB;
- ERP fiscal completo;
- BI genérico;
- chat corporativo;
- gestão de projetos interna;
- agenda genérica que não participe da assistência/manutenção.

Essas capacidades podem existir por integração. Só entram no core quando houver
uma razão de negócio específica e documentada.

## Regra de arquitetura

Adicionar uma feature horizontal não autoriza criar microserviço. A arquitetura
continua sendo monólito modular até existir uma necessidade operacional medida
que justifique separar processo, dados ou escala.

## Regra para PR

Feature nova de escopo relevante deve explicar em poucas linhas:

- problema;
- etapa do ciclo JB afetada;
- por que construir em vez de integrar;
- domínio proprietário da mudança;
- forma de testar sucesso e regressão.

A quantidade de telas não é métrica de produto. Continuidade operacional e
valor para a clínica são.
