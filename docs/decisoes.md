# Decisões estruturais

Por que o código é assim. Cada item registra a decisão, a alternativa que foi
descartada e o custo de mudar de ideia depois. Serve para quem chega e pensa
"isso está errado" — pode estar, mas leia o motivo antes.

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

## 5. Snapshot no item do pedido

`OrderItem` copia nome, SKU, marca, modelo, condição, foto e preço unitário no
momento da compra, em vez de só apontar para `Product`.

O motivo é jurídico antes de ser técnico: o pedido é o documento do que foi
vendido. Se a JB renomear o produto, trocar a foto ou reajustar o preço, o pedido
do ano passado não pode mudar junto. O `productId` continua lá, para relatório e
para o prontuário — mas o que se mostra ao cliente é o snapshot.

---

## 6. Estoque baixado com `UPDATE` condicional, dentro da transação do pedido

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

## 7. Duas identidades de login, criptograficamente separadas

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
isso a sessão da equipe dura só 8 horas (a do cliente, 30 dias, porque o risco
é menor e a fricção de relogar num site de compra é alta). Se um dia for preciso
revogar sessão individual, entra uma tabela de sessões — e o custo de leitura
volta junto.

---

## 9. Autorização na página, não no proxy

O `proxy.ts` (que nesta versão do Next é o antigo `middleware.ts`) olha apenas a
**presença** do cookie para redirecionar visita anônima. Ele não valida
assinatura. A guarda de verdade é `exigirArea` / `exigirCliente` /
`exigirNivel`, na própria página ou ação.

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

As rotas de API que existem são as que **precisam** existir: webhook (quem chama
é uma máquina), upload (corpo multipart grande), captcha (resposta binária) e
download de documento (resposta de arquivo com autorização).

---

## 11. Um único adapter de pagamento por trás de uma interface

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

## 12. Só o webhook aprova pagamento

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

Decisão relacionada: **uma única fonte de verdade**. O `proxy.ts` não manda CSP.
Se os dois mandassem políticas diferentes, o navegador aplicaria a **interseção**
— tudo que uma libera e a outra não, cai — e o site quebraria sem erro visível no
servidor.

Caminho de migração, quando fizer sentido: `experimental.sri`, integridade por
hash, que tira `'unsafe-inline'` do `script-src` sem perder a geração estática.
Hoje é experimental, por isso está desligado.

Armadilha registrada: `headers()` roda em tempo de **build**. `PAYMENT_PROVIDER`
e `NODE_ENV` precisam existir no ambiente de build, não só no de execução —
mudar o provedor sem refazer o build não muda o CSP.

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

`/minha-jb/documentos/[id]/baixar` consulta filtrando por `id` **e**
`customerId` da sessão. Um id adivinhado devolve 404 igual a um id inexistente —
sem revelar que o documento existe para outra pessoa.

Quando o arquivo está no Blob, a rota redireciona; quando está em disco, o
caminho é resolvido e conferido contra a raiz de uploads, para nenhuma sequência
`..` sair da pasta.

---

## 17. Limite de taxa em memória, com o banco ganhando onde já existe registro

`src/lib/limite.ts` usa janela deslizante num `Map` do processo. Em serverless,
cada instância conta sua própria fatia — com 4 instâncias quentes, um limite de 5
vira até 20. Serve para segurar formulário abusado e robô preguiçoso; **não**
segura ataque distribuído, e o arquivo diz isso em voz alta no topo.

Por isso a regra do projeto: **onde já existe registro em banco, o banco ganha**.
Login de cliente e de equipe contam tentativas na tabela `LoginAttempt`, que é
compartilhada entre instâncias e sobrevive a um redeploy.

A troca por Redis/Upstash já está preparada: basta implementar
`ArmazenamentoDeLimite` e usar `checarLimiteEm`, que é a mesma decisão com
contrato assíncrono. Nenhum chamador muda de forma.

---

## 18. Fila de mensagens que não envia nada (ainda)

`enfileirar()` grava `OutboundMessage` com status `pendente` e **não envia**. O
envio real é trabalho de um worker que ainda não existe.

Isso é intencional na forma, não só na falta: quem chama — um checkout, uma
mudança de status — não pode ficar esperando rede de provedor de e-mail. A fila
desacopla, dá retentativa e dá deduplicação (`dedupeKey`).

O que falta é o consumidor. `mensagensPendentes` e `concluirMensagem` já são a
interface que ele vai usar. Enquanto ele não existe, o efeito prático está
listado no README, em "O que ainda não está pronto".

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
Brasil: `Botao`, `Campo`, `lerCarrinho`, `criarPedido`, `formatarPreco`. As
únicas exceções são os nomes vindos do Prisma (`Order`, `WorkOrder`,
`priceCents`), que são o schema, e as APIs do framework.

O motivo é operacional: quem mantém isto, quem lê o log e quem conversa com a JB
sobre um chamado usa as mesmas palavras que a JB usa. "Chamado" e "ordem de
serviço" significam coisas específicas nesse negócio, e traduzir para
`ticket`/`job` no código só cria um dicionário a mais para errar.

---

## 21. Vitrine e inventário são listas diferentes

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

## 22. Cadastro duplicado é problema de banco, corrigido em dois lugares

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

O cabeçalho ganhou uma camada de acabamento em CSS separado
(`header-premium.css`, `cabecalho-home-flagship.module.css`). A primeira versão
dela selecionava por posição — `> div:first-of-type > div > a:first-child` para
o logotipo, `div.absolute.inset-x-0.top-full` para o painel do mega menu — e
isso é a forma de estilo que quebra sem avisar: basta alguém envolver o logo num
`span` para o acabamento sumir, sem erro em lugar nenhum, sem teste vermelho.

Hoje todo seletor se prende a um gancho declarado no JSX:
`data-jb-premium-header`, `data-jb-home-header-v2`, `.jb-logo`,
`.jb-busca-topo`, `.jb-cta-topo`, `.jb-mega-painel`, `.jb-promo-ticker`. O
gancho é contrato: quem mexe no JSX vê o atributo e sabe que alguém depende
dele.

A mesma regra vale para **medida**: reserva de espaço no cabeçalho não é
porcentagem da janela. A faixa de menus da home ficou 85px por cima do bloco da
conta porque estava centrada em `left: 44%` com `width: min(42vw, 46rem)` —
dois valores que não sabem nada sobre onde as ações começam, ainda mais com a
largura do bloco variando conforme o nome de quem entrou. Agora o componente
mede as duas pontas com um `ResizeObserver` e publica `--jb-topo-esq` e
`--jb-topo-dir`; o CSS reserva o que foi medido.
