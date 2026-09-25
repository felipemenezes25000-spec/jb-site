# Decisões estruturais

Por que o código é assim. Cada item registra a decisão, a alternativa que foi
descartada e o custo de mudar de ideia depois. Serve para quem chega e pensa
"isso está errado" — pode estar, mas leia o motivo antes.

**Desde 22/09/2026 o site não vende** (`f420606`). Vitrine, checkout,
pagamento, frete e a área do cliente saíram; o que ficou é assistência técnica,
com o WhatsApp na frente e o painel atrás. Os itens que só existiam por causa
da loja — 5, 6, 7, 11, 12, 21, 22, 24 e 26 — estão marcados como
**histórico**: o código que eles descrevem saiu, mas o motivo fica, porque é o
primeiro lugar que alguém vai ler se a venda voltar, e porque várias das lições
valem para o resto do código. Os que mudaram só em parte ganharam uma nota com o
que vale hoje. A numeração não muda: outros documentos citam os itens pelo
número.

---

## 1. Vendedor único, não marketplace

A JB vende o que a JB tem. Não existe `Seller`, `commission`, `split` nem
`payout` em lugar nenhum do schema, e não deve passar a existir sem uma decisão
de negócio explícita.

Isso simplifica coisas que num marketplace são difíceis: o pagamento é um só, o
estoque é um só, a numeração de documento é global (não por vendedor), e o
prontuário do equipamento pode assumir que quem vendeu e quem dá assistência são
a mesma empresa. Se um dia houver um segundo vendedor, quase tudo em
`src/lib/pedido.ts` e `src/lib/codigos.ts` precisa ser revisto.

Hoje: `src/lib/pedido.ts` saiu com a loja, e a JB não vende mais pelo site. A
regra continua de pé — está também no `AGENTS.md` — e vale para o dia em que a
venda voltar.

---

## 2. Dinheiro em centavos, sempre `Int`

Todo campo monetário do schema termina em `Cents` e é `Int`.

Descartado: `Decimal` do Prisma. Funciona, mas obriga a carregar um tipo
arbitrário-precisão até a camada de apresentação, serializa mal na fronteira
Server/Client Component e convida alguém a fazer `Number(...)` no meio do
caminho — que é exatamente o bug que se queria evitar. Inteiro em centavos é
imune, cabe em `number` de JavaScript com folga (`2^53` centavos são 90 trilhões
de reais) e passa por JSON sem cerimônia.

Descartado com mais firmeza: `Float`. `0.1 + 0.2 !== 0.3`, e o erro só aparece
no fechamento do mês.

Custo de mudar: alto e não vale. A conversão fica nas bordas —
`paraCentavos` na entrada e `formatarPreco` na saída, ambos em `@/lib/format`.

---

## 3. Datas em UTC no banco, America/Sao_Paulo na tela

O Postgres guarda UTC. A conversão para o fuso de São Paulo acontece **só na
formatação**, pelos helpers de `@/lib/format`.

Descartado: gravar já no horário local. Some com a informação de fuso, quebra em
horário de verão (que pode voltar) e torna impossível comparar registro antigo
com registro novo.

A regra prática: nunca chame `toLocaleDateString` solto numa página. Um pedido
feito às 22h precisa aparecer no dia certo, e é o helper que garante isso.

---

## 4. Numeração por sequência atômica, não por `count()`

`DocumentSequence` guarda um contador por prefixo, incrementado com
`INSERT … ON CONFLICT DO UPDATE … RETURNING`, que o Postgres serializa.

Descartado: `count() + 1`. Sob concorrência, duas requisições leem o mesmo
`count` e emitem o mesmo número — e `number` é `@unique`, então a segunda
explode na cara do cliente no pior momento possível (fim do checkout).

Descartado também: `SEQUENCE` nativa do Postgres. Seria correta, mas a sequência
nativa não é transacional para o efeito que queremos (um `ROLLBACK` deixa buraco
no número), e a JB emite documento que é conferido por número.

Consequência assumida: **todo número precisa passar por `proximoCodigo`**. Linha
que entra por fora — importação, restauração de backup parcial, `INSERT` manual
— deixa o contador atrás do que já existe, e o próximo código colide.
`sincronizarSequencia` conserta, empurrando o contador para o maior número já
usado, com `GREATEST` para nunca andar para trás.

---

## 5. Snapshot no item do pedido — histórico

**A loja saiu em 22/09/2026 (`f420606`).** Não há mais pedido nem checkout;
`OrderItem` continua no schema, com os snapshots já gravados, até a migração que
apaga as tabelas da loja. O motivo abaixo vale para qualquer documento de venda
que voltar a existir.

`OrderItem` copia nome, SKU, marca, modelo, condição, foto e preço unitário no
momento da compra, em vez de só apontar para `Product`.

O motivo é jurídico antes de ser técnico: o pedido é o documento do que foi
vendido. Se a JB renomear o produto, trocar a foto ou reajustar o preço, o pedido
do ano passado não pode mudar junto. O `productId` continua lá, para relatório e
para o prontuário — mas o que se mostra ao cliente é o snapshot.

---

## 6. Estoque baixado com `UPDATE` condicional, dentro da transação do pedido — histórico

**A loja saiu em 22/09/2026 (`f420606`).** Não há mais estoque nem pedido: o
`UPDATE` abaixo morava em `src/lib/pedido-base.ts`, que saiu
(`git show f420606^:src/lib/pedido-base.ts`). A lição — comparar e escrever no
mesmo comando, e deixar o Postgres serializar — vale para qualquer contador que
duas requisições possam disputar.

```sql
UPDATE "Product" SET "stock" = "stock" - $1
WHERE "id" = $2 AND ("trackInventory" = false OR "stock" >= $1)
```

Zero linhas afetadas significa que não havia estoque, e o código lança
`ErroDeEstoque`.

Descartado: ler o estoque, comparar em JavaScript e depois escrever. Entre a
leitura e a escrita cabe outra requisição inteira — é a corrida clássica, e num
catálogo com seminovo único (estoque 1) ela não é hipótese, é o caso comum: dois
compradores no mesmo aparelho. Aqui o Postgres serializa as escritas na linha e
a segunda tentativa simplesmente não encontra linha para atualizar. O primeiro
leva, o segundo recebe erro. Nunca os dois.

Descartado também: `SELECT … FOR UPDATE`. Daria o mesmo resultado com mais
código e um lock explícito para segurar.

---

## 7. Duas identidades de login, criptograficamente separadas — histórico

**A loja saiu em 22/09/2026 (`f420606`).** Hoje existe **uma** identidade: a
equipe (`User`, cookie `jb_staff`). A área do cliente saiu,
`src/lib/auth-cliente.ts` foi apagado e `Customer` ficou como cadastro no
painel, sem senha em uso. O raciocínio abaixo é o que deve voltar junto se o
cliente voltar a ter login.

`User` (equipe) e `Customer` (cliente) são tabelas, cookies e chaves de
assinatura diferentes. A chave do cliente é derivada: `AUTH_SECRET:cliente`.

Descartado: uma tabela de pessoas com um campo `role`, incluindo `cliente`. É o
desenho mais comum e o mais perigoso aqui: todo bug de escalonamento de papel na
área do cliente — que é a superfície pública, aberta a cadastro de qualquer
pessoa — passaria a ser um caminho para o backoffice. Com chave derivada, um
cookie de cliente nem sequer é decodificável como sessão de staff. A separação é
criptografia, não uma comparação de `if` que alguém pode esquecer.

Custo assumido: quem é cliente **e** funcionário tem dois cadastros. Numa
empresa deste tamanho, é um caso raro e barato.

---

## 8. Sessão em JWT no cookie, não em tabela

`jose` assina o payload da sessão e o cookie carrega tudo. Não há consulta ao
banco para validar sessão.

Vantagem: cada requisição de página economiza um round-trip ao Postgres — e em
serverless, com conexão pooled, isso importa.

Custo assumido: **não dá para revogar uma sessão específica**. Mudar
`AUTH_SECRET` derruba todo mundo, e é o único botão de pânico que existe. Por
isso a sessão da equipe dura só 8 horas. (A do cliente durava 30 dias, porque o
risco era menor e a fricção de relogar num site de compra é alta; saiu com a
área do cliente, em 22/09/2026.) Se um dia for preciso revogar sessão
individual, entra uma tabela de sessões — e o custo de leitura volta junto.

---

## 9. Autorização na página, não no proxy

O `proxy.ts` (que nesta versão do Next é o antigo `middleware.ts`) olha apenas a
**presença** do cookie para redirecionar visita anônima. Ele não valida
assinatura. A guarda de verdade é `exigirArea` / `exigirEdicao` /
`exigirNivel`, na própria página ou ação. (Até 22/09/2026 havia também
`exigirCliente`, da área do cliente, que saiu.)

Um cookie `jb_staff` com lixo dentro passa pelo proxy e é recusado depois. Isso é
proposital: validar JWT no proxy custaria uma operação de cripto em toda
navegação para trocar um redirecionamento bonito por outro igual. E, mais
importante, a segurança não pode depender de um arquivo que a documentação do
próprio Next descreve como algo que pode ser empurrado para a borda e rodar
separado do código de renderização.

Corolário: **o proxy não é a linha de defesa**. Se alguém remover o `proxy.ts`
inteiro, nenhum dado vaza — só a experiência de redirecionamento piora.

O `proxy.ts` também é autossuficiente de propósito: os nomes de cookie estão
repetidos lá dentro em vez de importados de `@/lib/auth`, pelo mesmo motivo.

---

## 10. Server Actions com `useActionState`, não rotas de API para formulário

Formulário fala com Server Action em `src/app/acoes/*.ts`; a ação valida com
zod, escreve, chama `revalidatePath` e devolve `{ erro?, campo?, ok? }`.

Descartado: uma camada de rotas `POST /api/...` só para o formulário conversar
com o banco. Seria código de transporte sem regra de negócio, com validação
duplicada nos dois lados e um `fetch` a mais para errar.

As rotas de API que existem são as que **precisam** existir: a fila (quem chama
é o cron), upload (corpo multipart grande), mídia privada e download de
documento (resposta de arquivo com autorização) e captcha (resposta binária —
sobrou dos formulários públicos, e hoje nenhuma página o usa). O webhook de
pagamento, que estava nesta lista porque quem o chamava era uma máquina, saiu
com a loja em 22/09/2026.

---

## 11. Um único adapter de pagamento por trás de uma interface — histórico

**A loja saiu em 22/09/2026 (`f420606`).** `src/lib/pagamento/` (a interface, o
simulado e o adapter do Mercado Pago, que nunca foi ligado em produção) e
`/api/pagamento/simular` foram apagados. Sobra `PAYMENT_PROVIDER` no portão de
ambiente e no CSP, e o portão ainda recusa `mock` em produção. As duas regras
abaixo são as que um provedor novo teria de seguir.

`ProvedorPagamento` tem quatro métodos e nenhuma menção a adquirente.
`provedorPagamento()` escolhe a implementação pelo ambiente.

Duas decisões dentro dessa:

**O simulado nunca entra em produção.** Se `VERCEL_ENV=production` e o provedor
configurado não é real, a fábrica **lança**. A alternativa — cair no simulado
silenciosamente — produziria pedidos marcados como pagos que ninguém cobrou. Um
erro visível é infinitamente melhor.

**A simulação usa o mesmo handler de webhook.** `/api/pagamento/simular` monta a
notificação que o provedor mandaria e chama a função `POST` do webhook
diretamente. Um caminho paralelo de "aprovar pagamento em desenvolvimento"
divergiria do caminho real em três semanas, e o bug apareceria só em produção.

---

## 12. Só o webhook aprova pagamento — histórico

**A loja saiu em 22/09/2026 (`f420606`).** `POST /api/pagamento/webhook` foi
apagado, e o sistema de hoje não cobra nem registra pagamento. A regra continua
no `AGENTS.md`: pagamento só se confirma por fonte confiável, nunca pela página
de retorno do navegador. O código antigo está em
`git show f420606^:src/app/api/pagamento/webhook/route.ts`.

Nem a tela, nem o retorno do navegador depois do banco, nem um botão. O
navegador pode ser fechado, a rede pode cair, e a URL de retorno pode ser
forjada.

O evento é gravado com chave única **antes** de qualquer efeito — é isso que
torna a reentrega um no-op. Se o processamento falhar depois disso, a linha do
evento é **apagada**, para que a próxima entrega volte a valer; sem isso, um
evento ficaria marcado como tratado sem nunca ter surtido efeito, e o pedido
ficaria preso em "aguardando pagamento" para sempre.

E o handler responde 200 sempre que aceita o evento, mesmo sem ter o que fazer.
Provedor que recebe erro reenvia em laço.

---

## 13. Isolamento de banco por variável, decidido em código

```ts
const preview = process.env.JBPREV_DATABASE_URL;
if (preview && process.env.VERCEL_ENV !== "production") return preview;
return process.env.DATABASE_URL;
```

A Vercel expõe as duas conexões no mesmo ambiente. Se a escolha fosse implícita
(por exemplo, sobrescrever `DATABASE_URL` no escopo de preview), bastaria alguém
configurar errado uma vez para um deploy de branch escrever no banco real. Aqui a
regra está no código, é lida por qualquer um em cinco linhas, e o pior caso de
configuração errada é preview apontando para preview.

A contrapartida: **`JBPREV_DATABASE_URL` jamais pode existir no ambiente de
produção**. Está escrito no `.env.example` e no README.

---

## 14. CSP estático em `next.config.ts`, sem nonce

A documentação desta versão do Next é direta: CSP com nonce exige renderização
dinâmica em **todas** as páginas — sem otimização estática, sem ISR, sem cache de
CDN, incompatível com Partial Prerendering.

Para uma loja, o preço cai onde mais dói: catálogo, página de produto, home e
institucional são conteúdo público, igual para todo mundo, hoje servido do cache.
Trocar isso por renderização por visita encarece a hospedagem e piora o tempo de
resposta das páginas mais visitadas — em troca de fechar `'unsafe-inline'` num
site que não injeta HTML de terceiro em lugar nenhum (o HTML vindo do CMS passa
por sanitização em `@/lib/html`).

A loja saiu em 22/09/2026, e o argumento vale igual para o que ficou: a home, as
sete páginas de equipamento, os cases e a Central Técnica são conteúdo público,
o mesmo para quem chega de anúncio e para quem chega de busca.

Decisão relacionada: **uma única fonte de verdade**. O `proxy.ts` não manda CSP.
Se os dois mandassem políticas diferentes, o navegador aplicaria a **interseção**
— tudo que uma libera e a outra não, cai — e o site quebraria sem erro visível no
servidor.

Caminho de migração, quando fizer sentido: `experimental.sri`, integridade por
hash, que tira `'unsafe-inline'` do `script-src` sem perder a geração estática.
Hoje é experimental, por isso está desligado.

Armadilha registrada: `headers()` roda em tempo de **build**. `PAYMENT_PROVIDER`
e `NODE_ENV` precisam existir no ambiente de build, não só no de execução —
mudar o provedor sem refazer o build não muda o CSP. Com a loja fora,
`PAYMENT_PROVIDER` é sobra: só decide se o CSP libera os domínios do Mercado
Pago, e em produção deve ficar sem definir.

---

## 15. Upload com dois destinos e uma interface

Havendo `BLOB_READ_WRITE_TOKEN`, o arquivo vai para o Vercel Blob; sem ela, para
`public/uploads`. Quem chama só enxerga a URL devolvida.

Isso mantém o projeto rodável fora da Vercel — VPS, contêiner, máquina de quem
está desenvolvendo — sem `if` espalhado pelas telas. Em serverless o disco é
efêmero, então em produção o Blob não é opcional.

Detalhe de segurança que não é acidente: **a extensão do arquivo salvo vem do
MIME conferido, nunca do nome enviado pelo navegador**. Um `.php` renomeado não
vira arquivo executável.

---

## 16. Documento privado servido por rota, nunca por URL pública

Hoje só a equipe baixa documento: `/admin/documentos/[id]/baixar` exige a área
`clientes` (`exigirArea("clientes")`, a mesma guarda da ficha do cliente, de
onde os links saem) e grava cada download na trilha de auditoria. Não há filtro
por dono, porque quem tem a área de clientes vê a ficha inteira.

Até 22/09/2026 havia também a rota do cliente,
`/minha-jb/documentos/[id]/baixar`, que consultava filtrando por `id` **e**
`customerId` da sessão: um id adivinhado devolvia 404 igual a um id
inexistente, sem revelar que o documento existia para outra pessoa. Saiu com a
área do cliente; é o desenho a repetir se o cliente voltar a baixar documento.

A rota não redireciona para o storage: `respostaDeArquivo` (`src/lib/upload.ts`)
devolve os bytes, de onde quer que o arquivo esteja, e o endereço do Blob nunca
sai do servidor. Quando está em disco, o caminho é resolvido e conferido contra
a raiz de uploads, para nenhuma sequência `..` sair da pasta.

---

## 17. Limite de taxa em memória, com o banco ganhando onde já existe registro

`src/lib/limite.ts` usa janela deslizante num `Map` do processo. Em serverless,
cada instância conta sua própria fatia — com 4 instâncias quentes, um limite de 5
vira até 20. Serve para segurar formulário abusado e robô preguiçoso; **não**
segura ataque distribuído, e o arquivo diz isso em voz alta no topo.

Por isso a regra do projeto: **onde já existe registro em banco, o banco ganha**.
O login da equipe — o único que sobrou desde 22/09/2026 — conta tentativas na
tabela `LoginAttempt`, que é compartilhada entre instâncias e sobrevive a um
redeploy.

A troca por Redis/Upstash já está preparada: basta implementar
`ArmazenamentoDeLimite` e usar `checarLimiteEm`, que é a mesma decisão com
contrato assíncrono. Nenhum chamador muda de forma.

---

## 18. Fila de mensagens, com o envio separado de quem pede

`enfileirar()` grava `OutboundMessage` com status `pendente` e **não envia** na
mesma chamada. Quando este item foi escrito, o envio era trabalho de um worker
que ainda não existia.

Isso é intencional na forma, não só na falta: quem chama — um envio de
orçamento, uma visita agendada — não pode ficar esperando rede de provedor de
e-mail. A fila desacopla, dá retentativa e dá deduplicação (`dedupeKey`).

O consumidor existe desde 05/09/2026: `src/lib/mensageria.ts`, que usa
`mensagensPendentes` e `concluirMensagem` — a interface que a fila já expunha —
e reserva cada linha antes de enviar, para duas execuções não mandarem o mesmo
e-mail. Ele tenta logo depois da resposta (`after`, em `enfileirar`), e o que
ficar pendente sai no cron diário de `/api/fila` ou no botão de
`/admin/mensagens`. Só o canal `email` tem provedor (a Resend); sem credencial,
a mensagem fica `simulado`. Ver `docs/operacao.md`, "O cron diário e as tarefas
que não têm cron".

Detalhe do schema: `OutboundMessage` guarda canal, destinatário, template, chave
de deduplicação e status — **não** guarda assunto nem corpo. O corpo é devolvido
a quem chama (útil para montar um link de WhatsApp na hora) e o worker
rerenderiza a partir do template na hora de enviar.

---

## 19. Permissão em duas camadas

`PODE.*` (em `@/lib/auth`) responde "pode executar esta capacidade".
`AREAS` (em `@/lib/permissoes`) responde "pode abrir esta tela". Quando os dois
discordam, quem manda na navegação é `permissoes.ts`.

`permissoes.ts` é a fonte única do menu lateral, da guarda de rota e dos blocos
do painel: adicionar uma área é adicionar uma entrada, não espalhar comparação de
papel por página. Ele é **módulo de servidor** — depende de `@/lib/auth`, que é
`server-only`. Componente cliente que precise saber de permissão recebe por prop;
o layout do admin resolve as áreas visíveis no servidor e passa a lista pronta.

Sobre a hierarquia: `admin` (100) > `gestor` (80) > `comercial` (60) > `editor`
(40) = `tecnico` (40). `tecnico` empata com `editor` de propósito — é uma trilha
operacional paralela, não um degrau: técnico não gerencia catálogo, e editor não
mexe em OS.

---

## 20. Português em tudo, inclusive no código

Nomes de variável, função, componente, tipo e comentário são em português do
Brasil: `Botao`, `Campo`, `abrirChamado`, `concluirOS`, `formatarPreco`. As
únicas exceções são os nomes vindos do Prisma (`Order`, `WorkOrder`,
`priceCents`), que são o schema, e as APIs do framework.

O motivo é operacional: quem mantém isto, quem lê o log e quem conversa com a JB
sobre um chamado usa as mesmas palavras que a JB usa. "Chamado" e "ordem de
serviço" significam coisas específicas nesse negócio, e traduzir para
`ticket`/`job` no código só cria um dicionário a mais para errar.

---

## 21. Vitrine e inventário são listas diferentes — histórico

**A loja saiu em 22/09/2026 (`f420606`).** `src/lib/catalogo.ts`, com os filtros
abaixo, foi apagado, e as rotas de vitrine respondem 410. A lição sobrevive à
loja: "está publicado" e "vale a pena mostrar primeiro" são perguntas
diferentes, e responder as duas com o mesmo filtro produz número certo na tela
errada.

`src/lib/catalogo.ts` guarda quatro filtros nomeados em vez de um só
`PUBLICADO`: `UNIDADE_VENDIDA`, `DISPONIVEL` e `VITRINE` ao lado dele. A
distinção não é técnica, é comercial — "está no catálogo" e "é o que a JB
mostra primeiro" são duas perguntas, e responder as duas com o mesmo filtro foi
o que produziu os achados de alta prioridade da auditoria de 08/09/2026.

A home abria com uma cadeira sem foto, por R$ 500, já vendida, e anunciava esse
mesmo valor como "menor preço do catálogo". Nenhum dos dois era erro de
cálculo: os dois números estavam corretos para a pergunta "o que está
publicado?". Estavam errados para a pergunta que a home faz, que é "o que vale
a pena mostrar primeiro?".

`VITRINE` responde a segunda: publicado, **com foto** e disponível. Vale para o
destaque da home, para as faixas e para o painel de abertura das coleções.
Listagem continua usando `PUBLICADO`, porque listagem é inventário.

A regra irmã é a da **unidade única já vendida**. Seminovo na JB é unidade, não
modelo: quando aquela autoclave sai, não existe uma segunda igual esperando
reposição. Ela sai das listas por padrão, a página dela continua de pé e
`?vendidos=1` traz o conjunto de volta com ficha removível na barra de filtros.
Produto de linha esgotado continua listado — ele volta, e o cartão já diz
"Indisponível".

O que isso NÃO faz: esconder informação. Contagem do topo, contagem da faceta e
resultado do clique passaram a sair da mesma regra, então "3 unidades
publicadas" com 2 cartões na tela deixou de ser possível.

---

## 22. Cadastro duplicado é problema de banco, corrigido em dois lugares — histórico

**A loja saiu em 22/09/2026 (`f420606`),** e as duas camadas abaixo foram
junto: `src/lib/homonimos.ts` e `scripts/unificar-duplicatas.ts` foram
apagados, e as rotas de categoria e marca respondem 410. `Category` ficou, como
tipo de equipamento no painel, e sem a camada de exibição um par publicado
aparece duas vezes nas escolhas de categoria. O banco do preview já foi
unificado; o estado de cada banco e o que fazer está em `docs/operacao.md`,
"Cadastros duplicados de categoria e marca".

O catálogo nasceu de três cargas diferentes e delas sobraram duas categorias
"Biossegurança" e duas marcas "Schuster". Para quem visita não existe "o
cadastro certo": existem duas opções com o mesmo nome, e escolher uma esconde
metade do que ela promete.

A correção acontece em duas camadas, de propósito:

1. **Exibição** — `src/lib/homonimos.ts` junta cadastros de mesmo nome numa
   opção só, soma as contagens e elege como canônico o que tem mais
   equipamentos publicados. `expandirCategorias` e `expandirMarcas` abrem o
   slug da URL em todos os homônimos, para rótulo, contagem e resultado do
   clique concordarem. O endereço continua com um slug — curto,
   compartilhável, estável.
2. **Cadastro** — `scripts/unificar-duplicatas.ts` move produtos, chamados e
   equipamentos de cliente para o canônico e despublica o duplicado. Não apaga
   linha: apagar levaria junto o histórico de quem apontava para ela.

Só a camada 1 conserta o site sem acesso ao banco, e é ela que garante que o
problema não reapareça enquanto a limpeza não roda. Só a camada 2 impede que
ele volte a nascer, porque enquanto houver dois registros o painel continua
oferecendo os dois na hora de publicar um equipamento.

Categoria e marca despublicadas por unificação **redirecionam** para a homônima
publicada em vez de responder 404 — link salvo e índice de busca continuam
valendo. Sem homônima, segue 404, que é a resposta certa para uma prateleira
que a JB tirou do ar.

---

## 23. Acabamento se prende a gancho declarado, nunca à estrutura da árvore

**O exemplo é da loja, a regra continua.** O cabeçalho descrito abaixo saiu em
22/09/2026 (`f420606`), e o do site de hoje é
`src/components/site/cabecalho-site.tsx`. As folhas citadas também já não
existem: `header-premium.css` tinha sido fundida em `src/app/cabecalho.css`,
que continua importada em `src/app/layout.tsx` — mas nenhum componente declara
mais os ganchos dela (`data-jb-premium-header`, `.jb-logo`, `.jb-busca-topo`…),
então hoje ela não casa com nada.

O cabeçalho ganhou uma camada de acabamento em CSS separado
(`header-premium.css`, `cabecalho-home-flagship.module.css`). A primeira versão
dela selecionava por posição — `> div:first-of-type > div > a:first-child` para
o logotipo, `div.absolute.inset-x-0.top-full` para o painel do mega menu — e
isso é a forma de estilo que quebra sem avisar: basta alguém envolver o logo num
`span` para o acabamento sumir, sem erro em lugar nenhum, sem teste vermelho.

A versão corrigida prendia todo seletor a um gancho declarado no JSX:
`data-jb-premium-header`, `data-jb-home-header-v2`, `.jb-logo`,
`.jb-busca-topo`, `.jb-cta-topo`, `.jb-mega-painel`, `.jb-promo-ticker`. O
gancho é contrato: quem mexe no JSX vê o atributo e sabe que alguém depende
dele.

A mesma regra vale para **medida**: reserva de espaço no cabeçalho não é
porcentagem da janela. A faixa de menus da home ficou 85px por cima do bloco da
conta porque estava centrada em `left: 44%` com `width: min(42vw, 46rem)` —
dois valores que não sabem nada sobre onde as ações começam, ainda mais com a
largura do bloco variando conforme o nome de quem entrou. O componente passou a
medir as duas pontas com um `ResizeObserver` e publicar `--jb-topo-esq` e
`--jb-topo-dir`, e o CSS a reservar o que foi medido.

---

## 24. Checkout tem casca própria — e o atributo que ela quase perdeu — histórico

**A loja saiu em 22/09/2026 (`f420606`).** O grupo `(checkout)`, o `(vitrine)` e
o `(loja)` foram apagados; o site de hoje tem um grupo público só, `(site)`. A
regra prática do fim vale para qualquer grupo novo. E o atributo do título
ficou órfão: nenhuma casca declara mais `data-jb-publico`, e as regras de
`globals.css` que o procuram não casam com nada.

`/checkout` e `/escolher-entrega` saíram de `(vitrine)` para o grupo
`(checkout)`. A casca é mínima de propósito: marca, selo de compra segura,
contato, e um rodapé com telefone, horário e as três políticas. Sem menu, sem
busca, sem carrinho — quem está pagando não precisa de mais nada para clicar, e
cada saída a mais é uma chance de abandonar. O funil foi de 40 saídas possíveis
para 4.

O que essa mudança ensinou custa mais que a mudança: **grupo de rota carrega
comportamento que não está escrito na página**. Enquanto o checkout morava em
`(vitrine)`, herdava `data-jb-publico` da casca de lá, e com ele a regra de
`globals.css` que faz o texto secundário da loja pública ser preto em vez de
cinza. Ao ganhar casca própria, perdeu — em silêncio, sem teste que cobrisse,
porque a rota exige carrinho cheio e nenhuma varredura automática chega lá.

A regra prática: **ao criar um grupo de rota, compare os atributos da casca
antiga com os da nova antes de dar por pronto.** Um `data-*` que nenhum
componente lê, mas que uma folha de estilo global procura, não aparece em
nenhuma busca por referência.

## 25. O piso de toque fala do alvo, não da tinta

44px é o mínimo de alvo de toque da plataforma, medido a 320px em contexto
móvel. O erro natural ao corrigir uma violação é engordar o desenho — e aí um
ícone discreto no canto de uma foto vira um botão pesado.

O botão de favoritar do cartão de produto nasceu `size-9`: 36px em tudo, e 16
alvos pequenos por página de catálogo. A correção não mexeu no desenho. O
círculo de 36px desceu para um `<span>` e o **botão** cresceu em volta dele até
44px, transparente:

```tsx
<button className="foco-jb flex size-11 items-center justify-center rounded-full">
  <span className="flex size-9 items-center justify-center rounded-full border …">
    <Heart className="size-4" aria-hidden />
  </span>
</button>
```

O canto da foto ficou idêntico; o dedo ganhou os 8px que faltavam. O padrão a
copiar já existia no projeto: o tamanho `sm` do botão usa
`min-h-10 pointer-coarse:min-h-11` — 40px com mouse, 44px com dedo.

O cartão de produto saiu com a loja, em 22/09/2026; a regra e o tamanho `sm` do
botão continuam.

## 26. Repetição previsível vale mais que economia que muda de página — histórico

**A loja saiu em 22/09/2026 (`f420606`),** e a ficha de produto foi junto. A
frase do fim vale para as sete páginas de equipamento de hoje, que
compartilham um desenho só (`src/components/site/pagina-equipamento.tsx`).

A ficha de produto mostrava 4 das 5–6 especificações de decisão na dobra e
repetia a lista inteira 1.100px abaixo, dentro de "Especificações técnicas".
Subir a lista completa para a coluna do meio resolveu a dobra — e criou a
tentação de esconder o cartão de baixo, já que viraria a mesma tabela duas
vezes.

Foi feito, medido e **desfeito**: com o cartão condicional, o título da seção
passava a depender do produto, e as estruturas distintas de ficha saltaram de
**7 para 11**. O ganho era economia de pixel; o custo era a ficha de cada
produto ter uma forma diferente — exatamente a queixa que a rodada começou
tentando resolver.

Mercado Livre e Amazon repetem de propósito: prévia na dobra, tabela completa
embaixo, sempre com o mesmo nome. **Numa página que a pessoa vai ver dez vezes
seguidas, previsibilidade é a feature.**

## 27. Token de tamanho puro, para poder renomear sem mudar desenho

`text-[0.8125rem]` aparecia 325 vezes no código e `text-[0.9375rem]`, 148 — os
dois tamanhos mais usados do projeto, nenhum com nome. Já existia
`@utility texto-apoio` com o mesmo tamanho, mas ela **também** fixa
`line-height: 1.55`, e a maioria dos 325 usos traz um `leading-*` próprio:
trocar por ela mudaria entrelinha em centenas de pontos.

A saída foi criar `--text-apoio` e `--text-corpo` como tokens de **tamanho
puro**. O CSS gerado é idêntico ao do valor avulso, então a troca vira
renomeação — e renomeação se prova: uma assinatura tipográfica (quantos
elementos visíveis em cada tamanho de fonte) foi tirada de 11 rotas × 2 larguras
antes e depois, **22 de 22 idênticas**.

A renomeação revelou um bug que estava lá havia semanas. `tailwind-merge` não
conhece tamanho customizado: classifica como cor e descarta quando a classe
também traz `text-<cor>`. `src/lib/utils.ts` já documentava a armadilha e
registrava `hero, display, section, title` — mas **`bloco` nunca entrou na
lista**. O token criado para o `h2` de seção da ficha era jogado fora em
silêncio em qualquer `cn("text-bloco", "text-graf-950")`, e o texto caía para os
16px herdados sem ninguém ver.

**Todo degrau tipográfico novo precisa entrar naquela lista.** É a única parte
do design system que falha sem erro.

## 28. Sangria negativa é um espelho, e espelho quebra em silêncio

Duas peças do painel se esticam até a borda da página com recuo negativo: a
faixa em destaque de `/admin` e a barra fixa de salvar de todo formulário. As
duas traziam `-mx-4 sm:-mx-6`, escrito quando o respiro da página era
`px-4 sm:px-6`. A página passou a `px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8` — e a
sangria ficou um degrau adiantada a partir de 640px.

O resultado eram **4px de página fora da tela em toda largura de tablet para
cima**, com barra de rolagem horizontal em `/admin` e `/admin/configuracoes`.
Nada quebra, nada avisa: um recuo negativo maior que o respiro simplesmente
transborda.

Duas coisas valem a lembrança:

- **A sangria não tem valor próprio.** Ela é sempre o negativo do respiro da
  página, e por isso precisa ser escrita degrau a degrau ao lado dele
  (`-mx-4 px-4 sm:-mx-5 sm:px-5 …`), nunca resumida. Escrita assim, uma
  divergência futura aparece lendo as duas linhas lado a lado.
- **O comentário mentia com convicção.** `formulario-base.tsx` dizia que os
  recuos casavam com o respiro da página — verdade quando foi escrito, falso
  desde que a página ganhou três degraus. Comentário que afirma acoplamento
  envelhece junto com o acoplamento; o portão de responsividade foi o que
  percebeu.

Isso fechou o último problema de responsividade do projeto: o painel passou de
1 rota vazando para **9 de 9 limpas**.
