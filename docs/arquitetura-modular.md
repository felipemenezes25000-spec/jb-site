# Arquitetura modular — JB Plataforma

## Objetivo

A JB continua sendo um **monólito modular em Next.js**, não microserviços. O
objetivo é deixar as fronteiras de negócio explícitas antes que o crescimento da
plataforma transforme Server Actions e o schema em pontos únicos de acoplamento.

## Regra de dependência

Fluxo preferido:

`page/componente -> Server Action/API -> caso de uso/domínio -> infraestrutura`

Server Action deve coordenar: autenticar, validar entrada, chamar o caso de uso,
registrar/revalidar e devolver estado. Regra de negócio reutilizável não deve
nascer dentro de `src/app/acoes`.

## Módulos de negócio

1. **Catálogo** — produto, categoria, marca, unidade física, mídia e estoque.
2. **Comércio** — descoberta, comparação, atributos de decisão, avaliações,
   relacionamento e resumo de produto. A nomenclatura `marketplace` é legado.
3. **Vendas** — carrinho, pedido, orçamento, cupom e ciclo comercial.
4. **Pagamento** — provedores, webhook, confirmação, estorno e reconciliação.
5. **Logística** — frete, Melhor Envio, etiqueta, rastreio e pendência fiscal.
6. **Clientes** — cadastro, unidades da clínica, endereços e área Minha JB.
7. **Equipamentos** — prontuário do equipamento e histórico de eventos.
8. **Assistência** — chamado, triagem, visita e vínculo com equipamento.
9. **Manutenção/OS** — ordem de serviço, checklist, peças, plano e preventiva.
10. **Conteúdo** — institucional, Central Técnica, casos e CMS.
11. **Identidade e governança** — autenticação, autorização, auditoria e upload.

## Server Actions grandes

Quatro arquivos entram em modo de redução:

- `admin-servico.ts` — 96.946 bytes
- `admin-catalogo.ts` — 72.455 bytes
- `admin-vendas.ts` — 70.147 bytes
- `admin-conteudo.ts` — 60.048 bytes

`scripts/verificar-arquitetura.ts` impede que eles cresçam. O alvo não é trocar
um arquivo gigante por dez arquivos aleatórios; é extrair por caso de uso e por
módulo mantendo as assinaturas públicas enquanto as páginas são migradas.

### Ordem recomendada de extração

1. `admin-servico`: chamados -> equipamentos -> visitas -> OS -> manutenção -> contratos.
2. `admin-vendas`: pedidos/pagamentos -> clientes -> orçamentos -> cupons -> frete.
3. `admin-catalogo`: produto base -> preços -> mídia -> estoque/unidades -> categorias/marcas.
4. `admin-conteudo`: páginas -> Central Técnica -> banners/blocos -> FAQ/conteúdo auxiliar.

Cada extração deve manter os testes existentes verdes antes da próxima.

## Estados críticos

Pedidos, pagamentos, estoque, equipamentos, chamados e OS devem ter transições
de estado concentradas na camada de domínio. Página ou formulário não pode
inventar transição própria. Dinheiro continua em centavos inteiros e o histórico
de pedido permanece por snapshot.

## Ambientes e operações de banco

`src/lib/seguranca-ambiente.ts` é a regra única para erros de configuração. Em
especial:

- produção com `JBPREV_DATABASE_URL` falha;
- preview sem `JBPREV_DATABASE_URL` falha;
- pagamento simulado em produção falha;
- operação destrutiva em ambiente de produção exige confirmação explícita.

A ideia é transformar runbook em guardrail executável.

## O que não fazer

- Não converter a JB em marketplace multi-vendedor sem decisão de negócio.
- Não criar microserviço para “organizar” código.
- Não mover regra de negócio para componente React.
- Não aceitar total/preço calculado pelo navegador.
- Não duplicar lógica de status entre tela, action e webhook.
- Não adicionar funcionalidade grande aos quatro arquivos legados; extrair primeiro.
