# JB — assistência técnica com prioridade para WhatsApp

Data: 22/09/2026. Estado: proposta para revisão; não implementada.

## Intenção do projeto

Retirar a operação de venda de equipamentos do site e transformar a presença pública da JB em um canal de captação de assistência técnica odontológica. O usuário pediu a remoção completa de vendas/marketplace e esclareceu que o maior foco é receber pessoas dos anúncios e gerar contatos pelo WhatsApp.

O resultado esperado é este percurso:

`anúncio ou conteúdo → página de assistência → WhatsApp → triagem pela equipe → atendimento técnico`

O site também oferece uma solicitação curta para quem prefere deixar seus dados. Cadastro, login, prontuário e formulário completo de chamado não são pré-requisitos para o primeiro contato.

## Decisão recomendada

Uma página principal forte, com páginas complementares apenas quando ajudam a explicar um serviço, comprovar o trabalho ou responder a uma dúvida. Manter o painel técnico já existente como ferramenta da equipe. A área do cliente continua apenas com funções de assistência, em acesso secundário para quem já está em atendimento.

Essa preservação dos recursos técnicos internos é uma recomendação, não uma exigência expressa do usuário. Ela evita reconstruir chamados, OS e documentos que o projeto já possui e não interfere na simplicidade da página pública.

Alternativas consideradas:

| Abordagem | Consequência | Decisão |
| --- | --- | --- |
| Esconder produtos e botões de compra | Mantém rotas, APIs, modelos e manutenção da loja | Não atende à remoção solicitada |
| Página de assistência + operação técnica existente | Remove comércio e aproveita chamados, equipamentos, OS e conteúdo real | Recomendada |
| Substituir tudo por página estática e WhatsApp | Elimina também a operação técnica e o acompanhamento existentes | Só faria sentido se a JB decidisse abandonar esses recursos |

Não manter loja adormecida por uma flag, aba de vendas, catálogo sem preço ou aviso de “vendas em breve”. Histórico de código continua no Git; não é necessário deixá-lo carregado na aplicação.

## Página principal

Menu curto: Serviços, Como funciona, Casos reais, Área atendida e Contato. CTA principal: **Falar com a assistência no WhatsApp**. Acesso de acompanhamento pode ficar no rodapé, sem competir com o contato.

Ordem proposta:

1. **Abertura:** assistência técnica odontológica, região real atendida, foto autêntica da equipe ou bancada e botão do WhatsApp visível sem rolar. Texto proposto: “Assistência técnica para os equipamentos da sua clínica.” Apoio: “Conte qual equipamento apresentou problema e em qual cidade você está. Nossa equipe orienta os próximos passos.”
2. **Equipamentos e problemas atendidos:** apresentar o que a equipe realmente repara; nomes e imagens descrevem atendimento, sem preço de produto, vitrine ou link de compra.
3. **Como funciona:** contato, triagem, avaliação/orçamento técnico e execução acompanhada. Não apresentar o clique como agendamento confirmado.
4. **Prova do trabalho:** bancada, equipe, casos e depoimentos reais autorizados. Somente evidências disponíveis; nenhuma nota, contagem, credencial ou prazo inventado.
5. **Área de atendimento e horários:** dados confirmados da operação, incluindo como é combinada a avaliação presencial ou em bancada.
6. **Dúvidas frequentes:** avaliação, deslocamento, orçamento, envio de fotos e continuidade do atendimento, conforme as condições reais da JB.
7. **Contato final:** WhatsApp em destaque; telefone e formulário curto como alternativas.

No celular, manter uma ação fixa e acessível para WhatsApp, sem cobrir o aviso de medição, o formulário, o teclado ou outros controles. Não acumular botão flutuante, dock e duas barras fixas para a mesma ação.

Preservar vermelho, branco e grafite, tipografia e componentes do design system. O símbolo do WhatsApp identifica o canal; não transformar a identidade da JB em verde. Priorizar leitura, fotos reais e carregamento rápido, com movimento discreto e suporte a movimento reduzido.

## Contato e medição

O botão abre um link de WhatsApp com mensagem pronta, por exemplo: “Olá! Vim pelo site da JB e preciso de assistência técnica odontológica.” Uma página de serviço pode acrescentar seu nome público. A pessoa revisa e envia a mensagem no WhatsApp; o site não envia mensagens automaticamente.

O link deve funcionar mesmo com analytics recusado, bloqueado ou indisponível. Número e horário vêm das configurações, com validação; configuração inválida não deve produzir um link quebrado. Nessa situação, mostrar os canais válidos e impedir a liberação da campanha até corrigir o destino principal.

O formulário alternativo pede nome, WhatsApp, cidade, equipamento/problema e e-mail opcional. Não exige CPF/CNPJ, senha, número de série, endereço completo ou foto para iniciar uma conversa. Registrar uma solicitação no servidor e mostrá-la no painel, com confirmação somente depois de persistir. Não chamar isso de visita agendada nem de chamado completo sem a triagem necessária.

Métricas distintas:

- visita à página de assistência;
- clique no WhatsApp, incluindo página e posição do botão;
- solicitação pelo formulário realmente recebida;
- contato qualificado, avaliação combinada e serviço aprovado, quando registrados pela equipe.

Cliques não provam mensagens enviadas ou conversas iniciadas. O link `wa.me` sozinho não confirma esses resultados. Inicialmente, a equipe pode registrar a qualificação no atendimento existente; uma integração de mensagens só entra se resolver uma necessidade observada.

Reaproveitar o mecanismo atual de consentimento e a lista de campos permitidos. Atribuição de campanha usa valores limitados e sanitizados, sem mandar telefone, nome, e-mail, relato livre, serial, identificador de chamado ou URL completa para analytics. Não instalar todos os pixels por padrão: configurar apenas os canais de campanha efetivamente escolhidos, com testes de consentimento e deduplicação.

## Conteúdo e alcance

As páginas de serviços atendem necessidades concretas, com conteúdo específico e CTA contextual. O primeiro conjunto deve vir dos serviços realmente oferecidos e das campanhas efetivamente usadas, sem dezenas de páginas genéricas por cidade.

Reaproveitar Central Técnica e casos como base para conteúdo compartilhável: problemas frequentes, cuidados preventivos e bastidores autorizados. Cada publicação aponta para o atendimento correspondente e possui título, descrição e imagem de compartilhamento próprios. Conteúdo técnico não deve incentivar intervenção insegura em equipamento.

O site pode facilitar compartilhamento, descoberta e conversão; alcance e viralização dependem também do conteúdo, da distribuição e da resposta do público. Não são resultados garantidos por mudar o layout.

## Fronteira de remoção

**Sai:** catálogo de compra, ficha comercial de produto, novos/seminovos/recondicionados/usados para venda, peças à venda, comparação de compra, favoritos de produtos, carrinho, checkout, cupons, pedidos de venda, frete comercial, pagamentos de pedidos, avaliações de compra, campanhas e conteúdo de comércio.

**Fica:** serviços, solicitações, chamados, triagem, visitas, equipamentos do cliente, ordens de serviço, orçamento de reparo, itens de peça/mão de obra/deslocamento na OS, manutenção, documentos técnicos, casos, conteúdo técnico, cadastros necessários ao atendimento, segurança e auditoria.

**Exige separação:** categorias de equipamentos versus categorias de loja; marca atendida versus marca de produto; orçamento técnico versus comercial; avaliações e documentos de assistência versus compra; notificações e tarefas periódicas compartilhadas.

O termo “orçamento” permanece quando significa avaliação e proposta de reparo. Remover venda de peça ao público não implica remover a peça utilizada e registrada em um conserto.

## Restrições técnicas

- Manter Next.js 16.3.4, TypeScript, Prisma e PostgreSQL; não introduzir outra stack.
- Manter monólito modular; UI/Actions coordenam e domínio contém regras reutilizáveis.
- Não ampliar `admin-servico.ts`, `admin-catalogo.ts`, `admin-vendas.ts` ou `admin-conteudo.ts`; extrair os casos técnicos compartilhados antes de remover o comércio.
- Dinheiro em centavos inteiros; datas persistidas em UTC e exibidas em `America/Sao_Paulo`.
- Manter autorização no servidor, separação entre cliente e equipe, isolamento de banco de preview e proteção de documentos.
- Não criar CRM, ERP, chat, BI ou estoque genérico para substituir a loja.
- A homepage pública não consulta produtos, preços, estoque, pedidos ou carrinho.
- Dados antigos não são presumidos descartáveis. Retirar comércio da aplicação e eliminar dados históricos são etapas diferentes da migração.

## Critérios de conclusão

1. Uma pessoa vinda de anúncio entende que a JB presta assistência e consegue abrir o WhatsApp sem login ou formulário obrigatório.
2. Não há compra disponível em página, URL direta, action ou API; navegação, conteúdo, metadados e compartilhamentos não anunciam venda.
3. Rotas comerciais antigas têm resposta definida, sem ressurgir pelo CMS nem redirecionamento indiscriminado para a home.
4. A equipe continua recebendo solicitações e operando chamados, orçamentos técnicos e OS.
5. Categorias, documentos, casos e equipamentos necessários à assistência continuam íntegros após a migração.
6. A medição distingue intenção de contato e resultado confirmado e respeita a escolha de medição.
7. Tipos, unitários, arquitetura, build e fluxos de navegador definidos no plano passam em ambiente apropriado; nenhuma verificação pulada é contada como aprovada.

## O que precisa ser conferido antes da publicação

Número que deve receber as conversas, cidades/regiões atendidas, equipamentos e serviços efetivamente cobertos, horários, destino interno das solicitações e autorização das imagens/depoimentos. Os valores atuais do código são ponto de partida, não comprovação da configuração em produção.

Também é necessário inventariar os dados históricos, pedidos/pagamentos pendentes, integrações externas e URLs com uso real antes da retirada definitiva das respectivas estruturas. Nenhum banco ou conta de anúncios foi acessado para elaborar esta proposta.

## Decisões tomadas depois desta proposta (22/09/2026)

- **Área do cliente sai inteira.** Login, cadastro, Minha JB, `/chamado/[numero]` e `/e/[localizador]` deixam de existir; o cliente é acompanhado pelo WhatsApp. Isso substitui a recomendação acima de mantê-la em acesso secundário.
- **Formulário curto fica**, discreto, como alternativa ao WhatsApp (nome, WhatsApp, cidade, problema), caindo no painel.
- **Painel da equipe continua** com chamados, OS, agenda, técnicos, equipamentos, manutenção, orçamentos de reparo, clientes, categorias de equipamento e serviços.
- **WhatsApp que recebe:** (11) 96341-7994. Telefone alternativo continua o do site, (11) 95847-7337.
  *Atualizado em 23/09/2026:* os dois são WhatsApp. O principal (96341-7994) recebe a mensagem pronta de todos os botões; os dois aparecem por escrito, cada um clicável, na abertura da home e das páginas de equipamento, na chamada final e no rodapé. O segundo é a configuração `whatsapp_alternativo` (antes `telefone_alternativo`, que não aparecia no site).
- **Autoridade:** a JB é assistência técnica autorizada EVOXX (lista oficial em evoxx.com.br/assistencia). A home cita e linka a lista.
- **URLs antigas:** as da loja respondem 410 no `src/proxy.ts`; as de assistência, contato, dúvidas e área do cliente redirecionam (308) para a home, em `next.config.ts`.
