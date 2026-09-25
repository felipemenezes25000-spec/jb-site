# JB Soluções Odontológicas — plataforma

Site de assistência técnica de equipamentos odontológicos e o backoffice da
equipe, no mesmo sistema. O site público existe para uma coisa: levar quem está
com uma autoclave, um compressor ou uma cadeira parada a uma conversa no
WhatsApp com a equipe técnica. **Toda chamada para ação abre o WhatsApp** — a
abertura da home, o diagnóstico em 3 toques, os blocos de equipamento, a
chamada final, o cabeçalho, a barra do pé do celular e a página 404 montam o
link do `wa.me` com a mensagem já escrita. Daí em diante o atendimento é da
equipe, pelo painel em `/admin`: cliente, equipamento, chamado, ordem de
serviço, orçamento de reparo e contrato de manutenção.

**Até 22/09/2026 havia uma loja aqui.** Vitrine, seminovos, carrinho, checkout,
pagamento (Mercado Pago), frete (Melhor Envio), cupons, comparador e a área do
cliente em `/minha-jb` saíram inteiros; o cliente passou a ser acompanhado pelo
WhatsApp. Os endereços antigos respondem 410 ou redirecionam (ver "Endereços
que saíram"), e o portão de arquitetura reprova quem voltar a importar um
módulo da loja. As tabelas da loja continuam no banco — ver "O que ainda não
está pronto".

A JB é a única empresa no sistema: não existe seller, comissão, split nem
terceiro em lugar nenhum do código.

Documentação complementar: [`design.md`](design.md) (a linguagem visual —
paleta com contraste medido, escala tipográfica, layout, movimento e
acessibilidade), [`docs/arquitetura-modular.md`](docs/arquitetura-modular.md) e
[`docs/criterios-de-escopo.md`](docs/criterios-de-escopo.md) (como o monólito
se divide e o que pode entrar no core), [`docs/dominio.md`](docs/dominio.md)
(fluxos de status e transições válidas), [`docs/decisoes.md`](docs/decisoes.md)
(por que o código é assim), [`docs/operacao.md`](docs/operacao.md) (deploy,
migração, seed), [`docs/evolucao-jb/`](docs/evolucao-jb/) (plano, cobertura e
portões de validação) e
[`docs/auditoria-visual-2026-09-08/`](docs/auditoria-visual-2026-09-08/)
(auditoria visual do site publicado, com as 29 capturas que a originaram).

`docs/dominio.md`, `docs/operacao.md`, `docs/decisoes.md` e trechos de
`design.md` ainda falam de pedido, pagamento, Mercado Pago e ficha de produto.
O que for da loja nesses arquivos é histórico, não o sistema de hoje.

---

## A linguagem visual

A paleta nasce da logo, amostrada pixel a pixel — **a marca é vermelha**,
`#e0141b`; qualquer briefing que peça "verde JB" está errado. Vermelho é sinal
(CTA, estado ativo, marca), nunca preenchimento de área grande.

O sistema inteiro — paleta com contraste medido degrau a degrau, escala
tipográfica, containers, movimento e as regras de acessibilidade que a suíte
cobra — está em [`design.md`](design.md). Duas coisas que economizam uma tarde
se lidas antes de escrever CSS:

- **`graf-400` nunca é texto** (2,6:1). O cinza de texto secundário é `graf-500`;
  a borda de campo é `graf-450`, que existe só para cumprir os 3:1 da WCAG
  1.4.11.
- **Degrau tipográfico novo precisa ser registrado em `src/lib/utils.ts`**, ou o
  `tailwind-merge` o confunde com cor e o descarta em silêncio quando a classe
  também traz `text-<cor>`.

---

## Stack, e por que cada peça está aqui

| Peça | Versão | Por quê |
|---|---|---|
| **Next.js** (App Router, Turbopack) | 16.3.4 | Server Components resolvem os dois lados da aplicação. O painel é quase todo leitura de banco com autorização por cima: o dado é buscado no servidor, o JavaScript enviado ao navegador fica pequeno e o segredo nunca sai de lá. O site público é quase todo igual para todo mundo e sai do cache (`cacheComponents`), derrubado por etiqueta quando alguém salva no painel. Server Actions eliminam a camada de rotas CRUD que só existiria para o formulário conversar com o banco. |
| **React** | 19.2.8 | `useActionState` liga formulário a Server Action com estado de erro e de pendência sem biblioteca de formulário no meio. |
| **TypeScript** estrito | 5 | Um schema com 78 modelos e 33 enums (as tabelas da loja ainda contadas) só se sustenta com o compilador conferindo cada `Record<Status, …>`. Sem `any`, sem `@ts-ignore`. |
| **Prisma + PostgreSQL** | 6.19.3 | Transação de verdade (status e evento do chamado gravados juntos, número do documento reservado dentro da transação que cria o registro), `INSERT … ON CONFLICT … RETURNING` atômico para a numeração, e tipos gerados a partir do schema — os enums do Prisma são a mesma fonte de verdade que as etiquetas da interface. |
| **Tailwind CSS 4** (CSS-first) | 4 | Os tokens da marca vivem em `src/app/globals.css`, não num arquivo de configuração JS. Uma cor, um lugar. |
| **zod** | 4.5 | Toda entrada de Server Action e de rota é validada antes de tocar no banco. |
| **jose** + **bcryptjs** | 6.2 / 3.0 | Sessão da equipe em JWT assinado dentro do cookie (sem tabela de sessão para consultar a cada requisição) e senha em bcrypt com custo 12. |
| **@vercel/blob** | 2 | Em serverless o disco é efêmero e o upload precisa de armazenamento externo. Sem o token, o mesmo código grava em `public/uploads` e funciona igual num servidor próprio. |
| **sonner** | 2 | Toaster já montado no layout raiz. |
| **lucide-react** | 1 | Ícones em SVG, sem fonte de ícone e sem sprite. |
| **Playwright** | 1.62 | A suíte de ponta a ponta e os scripts de verificação em `scripts/` percorrem o site de verdade, num navegador de verdade. Transbordo, contraste e alvo de toque dependem de fonte e imagem carregadas — nada disso dá para saber lendo o JSX. |

---

## Rodar local do zero

Pré-requisitos: Node 20+, `pnpm` 10.28 (`corepack enable`) e Docker, para o
Postgres. Todos os comandos rodam na raiz do repositório.

Se o Docker Desktop não estiver aberto, `docker compose up -d` falha com
`cannot find the file specified`. A home e as páginas de equipamento ainda
abrem — sem banco, as configurações voltam aos padrões da JB para o botão do
WhatsApp nunca sumir —, mas toda página que lê o banco sem essa rede (o painel,
os cases, a Central Técnica, as políticas) cai na página de erro. A mensagem
real (`Can't reach database server at localhost:5433`) aparece no terminal do
`pnpm dev`, não na tela.

```bash
# 1. banco de desenvolvimento (Postgres 17 na porta 5433)
docker compose up -d

# 2. variáveis
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#    cole o valor impresso em AUTH_SECRET, dentro do .env

# 3. dependências (o postinstall roda `prisma generate` sozinho)
pnpm install

# 4. esquema do banco
pnpm db:deploy          # = prisma migrate deploy

# 5. carga base: configurações, páginas, categorias, FAQ
#    e o primeiro usuário do painel — a senha é impressa no terminal
pnpm db:seed

# 6. dados de demonstração (opcional, mas é o que enche o painel)
pnpm db:demo            # cliente, equipamento e chamado
pnpm db:demo:operacao   # OS, orçamento, contrato, leads, suporte e a equipe demo

# 7. subir
pnpm dev
```

Site em `http://localhost:3000`, painel em `http://localhost:3000/admin`.

Os dois seeds de demonstração ainda gravam também o que era da loja (produtos,
marcas, pedido, pagamento), porque essas tabelas continuam no schema. Nenhuma
tela mostra esses registros.

Com os seeds de demonstração carregados, entra-se no painel em `/admin/entrar`
com `demo.gestor@jbteste.local` e a senha `demo12345`. A mesma senha vale para
`demo.admin`, `demo.comercial` e `demo.tecnico`, cada um com o seu papel.

Para remover só o que os seeds de demonstração criaram, sem tocar em dado real:
`pnpm db:demo:limpar`.

### Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | desenvolvimento |
| `pnpm build` / `pnpm start` | build e execução de produção. O `prebuild` roda os dois portões abaixo antes |
| `pnpm ambiente:verificar` | portão de ambiente: banco de preview separado do de produção, nada de simulado em produção |
| `pnpm arquitetura:verificar` | portão de arquitetura: dívida legada congelada e nenhum módulo da loja de volta |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint .` |
| `pnpm db:deploy` | aplica as migrações existentes (é o que roda em produção) |
| `pnpm db:push` | empurra o schema sem gerar migração — só para banco descartável |
| `pnpm db:reset` | **apaga o banco** e reaplica tudo do zero |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | carga base |
| `pnpm db:demo` · `pnpm db:demo:operacao` · `pnpm db:demo:limpar` | dados de demonstração |
| `pnpm db:vitrine` | catálogo de demonstração da loja antiga. Sobrou: enche tabelas que o site não lê mais |
| `pnpm conteudo:prever` · `pnpm conteudo:migrar` | corrige o texto herdado do site em PHP — páginas `sobre` e `estrutura` e descrições de categoria. As duas páginas não são mais servidas |
| `pnpm pautas:prever` · `pnpm pautas:carregar` | carrega as pautas da Central Técnica |
| `pnpm test:unit` | **346** testes unitários em 20 arquivos (Vitest) |
| `pnpm e2e` | ponta a ponta (Playwright) — **ainda escrita para a loja**, ver "Testes" |
| `pnpm test` | os dois acima, em sequência |
| `pnpm responsivo` | mede o layout em 7 larguras num navegador de verdade — lista de rotas ainda da loja |
| `pnpm a11y` | axe-core (WCAG 2.1 A e AA) mais 3 medições próprias — lista de rotas ainda da loja |
| `pnpm tour` | percorre as rotas num navegador e fotografa — lista de rotas ainda da loja |

---

## O site público

São **dois** grupos de rota, e o parêntese nunca entra na URL:

| Grupo | O que guarda |
|---|---|
| `(site)` | o site de assistência: home, uma página por equipamento, cases, Central Técnica, privacidade, termos e a resposta de avaliação |
| `(admin)` | o backoffice, sob `/admin` |

A casca do `(site)` (`src/app/(site)/layout.tsx`) é a faixa vermelha do topo,
o cabeçalho de uma linha com o WhatsApp sempre à mão, o conteúdo e o rodapé com
os canais e os links das páginas de equipamento. A barra de WhatsApp do
celular monta no `template.tsx` do grupo, e não no layout, de propósito: ela
copia a mensagem do botão grande da página, e o layout não remonta entre uma
página e outra. Da home para `/autoclave` por link interno, ela continuaria
mandando a mensagem genérica.

### Rotas — grupo `src/app/(site)`

| Rota | O que é |
|---|---|
| `/` | home: diagnóstico em 3 toques, equipamentos atendidos, autorizada EVOXX, simulador de parada, como funciona, atendimento na clínica ou na bancada, dúvidas, chamada final |
| `/autoclave`, `/compressor`, `/bomba-de-vacuo`, `/cadeira-odontologica`, `/seladora`, `/destilador`, `/lavadora-ultrassonica` | uma página por equipamento, para o anúncio cair no lugar certo |
| `/cases`, `/cases/[slug]` | cases técnicos publicados no painel |
| `/central-tecnica`, `/central-tecnica/[slug]` | textos técnicos publicados no painel; sem publicação, estado vazio com o WhatsApp |
| `/privacidade`, `/termos` | políticas. O texto padrão está no código; um registro em `Page` com o mesmo slug, editado no painel, toma o lugar dele |
| `/avaliar/[token]` | resposta a um convite de avaliação. O token opaco é a autenticação; a página é sempre `noindex` |

Metadados gerados: `/sitemap.xml` (home, as sete páginas de equipamento,
políticas e o que estiver publicado em cases e Central Técnica — com o banco
fora do ar, só as rotas fixas), `/robots.txt`, `/manifest.webmanifest` e a
imagem de compartilhamento, uma geral e uma por página de equipamento.

### Como o WhatsApp é montado

- **O número** é a configuração `whatsapp`, editada no painel.
  `configuracoesPublicas()` (`src/lib/site-publico.ts`) a guarda em cache e, se
  o banco não responder, devolve os padrões de `SETTING_DEFAULTS`, que são os
  dados reais da JB. Quem chegou de anúncio precisa do botão mesmo quando o
  Postgres soluça. O mesmo número serve ao "Ligar agora": o telefone fixo saiu
  do site.
- **O link** sai de `whatsappHref` (`src/lib/format.ts`): `wa.me`, DDI 55 e a
  mensagem em `?text=`. Não existe API de envio: o site não manda nada
  sozinho, a pessoa revisa a mensagem e envia.
- **O diagnóstico em 3 toques** (`src/lib/diagnostico.ts`, módulo puro) monta
  a mensagem a partir de equipamento, defeito e situação da clínica. Os
  defeitos estão escritos como o dentista vê o problema ("não pressuriza"), não
  como o técnico o descreve.
- **Todo botão público marca `data-whatsapp`** com a posição dele na página. É
  essa marca que a medição de anúncios escuta (ver "Medição de anúncios").

### Páginas por equipamento

O conteúdo das sete páginas está em `src/lib/paginas-equipamento.ts`: título,
foto, defeitos (os mesmos do diagnóstico), cuidados de "enquanto isso", dúvidas
do equipamento e a mensagem do WhatsApp já com o nome dele. O desenho é um só,
`src/components/site/pagina-equipamento.tsx`. As páginas, o rodapé, o sitemap e
os testes leem desse módulo.

A regra do texto: **nada de prazo, preço, garantia em meses ou afirmação técnica
que a JB não confirmou.** Os cuidados de "enquanto isso" são de segurança
(desligar, esfriar, não forçar), nunca roteiro de conserto.

Página nova é uma entrada em `PAGINAS_DE_EQUIPAMENTO` e uma pasta em
`src/app/(site)/` com `page.tsx` e `opengraph-image.tsx`, no molde de
`autoclave/`. As rotas são estáticas, não um `[slug]`: cada uma é uma pasta.

### Endereços que saíram

- **A loja responde 410** no `src/proxy.ts` (lista `LOJA_REMOVIDA`): `/loja`,
  `/seminovos`, `/novos`, `/usados`, `/recondicionados`, `/pecas-e-acessorios`,
  `/categoria`, `/marcas`, `/busca`, `/carrinho`, `/checkout`,
  `/escolher-entrega`, `/pedido`, `/verificar`, `/comparar`,
  `/simulador-de-custo`, `/entrega` e `/trocas-e-devolucoes`, com tudo abaixo
  deles. A resposta é uma página curta que leva à home. 410, e não
  redirecionamento para a home: mandar `/loja/autoclave-12l` para `/` seria
  redirecionamento indiscriminado, que o Google trata como página inexistente
  disfarçada; 410 diz que a página não volta, e ela sai do índice mais rápido.
- **O que tem equivalente na home redireciona com 308** (`REDIRECIONAMENTOS`,
  em `next.config.ts`): a antiga assistência técnica, o SOS, o orçamento, o
  contato, as dúvidas, sobre, estrutura, o `/empresa` herdado do PHP e toda a
  área do cliente (`/entrar`, `/cadastro`, `/recuperar-senha`,
  `/redefinir-senha`, `/minha-jb/*`, `/chamado/*`).

---

## Backoffice — grupo `src/app/(admin)`, tudo sob `/admin`

`/admin/entrar` é a porta. Depois dela, agrupadas como no menu lateral
(`src/lib/permissoes.ts` é a fonte da verdade de quem vê o quê):

- **Geral** — `/admin` (painel)
- **Atendimento** — `clientes` (com as unidades de cada clínica), `suporte`,
  `orcamentos`
- **Assistência** — `categorias` (categorias de equipamento e serviços, que
  entram no orçamento), `assistencia` (chamados), `os`, `agenda`, `manutencao`
  (com `manutencao/contratos` e `manutencao/planos`), `equipamentos`, `tecnicos`
- **Conteúdo** — `conteudo` (e, abaixo dele, `home`, `slides`, `paginas`, `faq`,
  `midia`), `central-tecnica`, `avaliacoes`, `cases`, `leads` (com
  `leads/exportar`, que devolve CSV)
- **Sistema** — `insights`, `usuarios`, `configuracoes`, `mensagens`,
  `auditoria`

Fora do menu: `/admin/busca`, `/admin/conta`, as versões para impressão
(`/admin/os/[id]/imprimir`, `/admin/orcamentos/[id]/imprimir`) e o download de
documento em `/admin/documentos/[id]/baixar`.

### Rotas de API

| Rota | Para quê |
|---|---|
| `POST /api/upload` | upload de mídia, só da equipe. Mídia operacional nunca devolve a URL real do storage |
| `GET /api/midia/[id]` | entrega da mídia operacional privada (foto de equipamento, chamado, OS), só para a equipe. Arquivo inexistente e arquivo sem autorização dão o mesmo 404 |
| `POST /api/admin/upload` | biblioteca de mídia do painel |
| `GET`/`POST /api/fila` | worker da fila de mensagens e limpeza de anexos órfãos. Exige `CRON_SECRET`; sem ele, responde 503 |
| `GET /api/captcha` | captcha em SVG assinado em cookie. Sobrou dos formulários públicos, que saíram: hoje nenhuma página o usa |

---

## Medição de anúncios

A conversa no WhatsApp é a conversão do site, e é ela que o Google Ads e a Meta
precisam enxergar para saber qual anúncio funciona. Três destinos, todos
opcionais e todos configurados no painel, em **Configurações › Integrações**:

| Destino | Configuração | O que recebe |
|---|---|---|
| Google Analytics 4 | `codigo_analytics` (`G-…`) | uso do site, `whatsapp_click` com posição do botão, equipamento e origem da visita, e LCP/INP/CLS reais |
| Google Ads | `google_ads_id` (`AW-…`) e `google_ads_rotulo_whatsapp` | `conversion` a cada clique no WhatsApp; sem o rótulo, só remarketing |
| Pixel da Meta | `meta_pixel_id` (só dígitos) | `Contact` a cada clique no WhatsApp |

Quatro regras que valem para os três (`src/components/analytics/medicao.tsx`):

1. **O script só entra depois do "sim".** Ele não é carregado escondido: não
   existe na página de quem não aceitou. A escolha fica em `localStorage`
   (`src/lib/analytics/consentimento.ts`), e "Cookies e medição", no rodapé,
   a desfaz — quem recusa depois de aceitar para de enviar na hora.
2. **O painel guarda só o identificador, nunca código colado.** O formato é
   validado ao salvar e de novo antes de chegar à página
   (`src/lib/analytics/destinos.ts`); inválido vale como vazio. Um campo que
   aceitasse o "código do pixel" inteiro seria injeção de script com um passo
   administrativo no meio.
3. **Sem destino configurado, nada acontece** — nem o aviso de consentimento
   aparece.
4. **A origem da visita é guardada antes da resposta.** UTM, ou na falta dela
   `gclid`/`gbraid`/`wbraid` (Google) e `fbclid` (Meta), só existem na URL de
   chegada. `src/lib/analytics/origem.ts` guarda fonte, meio e campanha em
   `sessionStorage`, limpos, e eles acompanham o `whatsapp_click`. Guardar não
   envia nada: quem envia pergunta pelo consentimento.

A conversão sai de um ouvinte só, na página (`ouvirCliquesNoWhatsapp`, em
`src/lib/analytics/anuncios.ts`), que pega todo clique — inclusive com o botão
do meio — em link marcado com `data-whatsapp`. Assim o link do rodapé, o da
página de erro e os que são HTML do servidor, sem JavaScript próprio, também
contam. Os links de WhatsApp do
painel (a equipe chamando um cliente) não têm a marca e não viram conversão.
Nada disso lança nem espera: com bloqueador, sem rede ou sem destino, o link
abre do mesmo jeito.

As origens dos três entram no CSP em tempo de build (`next.config.ts`), mesmo
para quem não aceitou: o consentimento é decidido por visitante, em execução, e
um CSP por pessoa obrigaria o site inteiro a renderizar dinamicamente. Permitir
a origem não carrega nada.

---

## O modelo de domínio, em prosa

O cliente fala com a JB pelo WhatsApp; quem registra é a equipe, no painel. O
eixo é o equipamento da clínica e a cadeia
**chamado → OS → orçamento → contrato** que gira em volta dele. Cada elo tem um
arquivo de regra em `src/lib/`, e é lá que a decisão mora — não na página.

1. **Equipamento** — `src/lib/equipamento.ts`, modelo `Equipment`. Cadastrado
   na ficha do cliente, com histórico, garantia e próxima manutenção prevista.
   A assistência atende equipamento comprado ou não da JB.
2. **Chamado** — `src/lib/assistencia.ts`, modelo `ServiceRequest`, prefixo
   `AT`. Sempre aponta para um equipamento. Nasce com número e com evento, e
   status e evento andam sempre na mesma transação: status sem evento é buraco
   na linha do tempo, evento sem status é mentira.
3. **Ordem de serviço** — `src/lib/os.ts`, modelo `WorkOrder`, prefixo `OS`.
   Nasce do chamado. Tem itens (peça, serviço, deslocamento), checklist, mídia,
   diagnóstico e aceite. `concluirOS` fecha a OS, devolve o equipamento a
   `operacional`, carimba `lastMaintenanceAt` e recalcula `nextMaintenanceAt`.
4. **Orçamento** — `src/lib/orcamento.ts`, modelo `Quote`, prefixo `ORC`. **Só
   de reparo**: peça, mão de obra e deslocamento, sem produto, frete nem
   conversão em pedido. Os totais são sempre somados a partir dos itens
   gravados. A aprovação do cliente chega pelo WhatsApp e é registrada pela
   equipe; aprovado, o chamado vinculado passa a `aprovado` e o serviço é
   liberado.
5. **Contrato de manutenção** — `src/lib/manutencao.ts`, modelo
   `MaintenanceContract`, prefixo `CT`. Cobre equipamentos específicos e gera as
   visitas previstas segundo o plano (um plano de 12 meses com 2 visitas visita a
   cada 6). Visita concluída volta para o histórico do equipamento; contrato
   encerrado cancela as visitas que ainda não aconteceram.

Ao redor desse eixo: clientes e unidades, categorias e serviços
(`src/app/acoes/admin-cadastros.ts`), fila de mensagens
(`src/lib/notificacoes.ts` enfileira, `src/lib/mensageria.ts` entrega), leads,
tickets de suporte, convites de avaliação (`src/lib/convites.ts`), cases
técnicos, Central Técnica, CMS, JB Insights e auditoria (`src/lib/auditoria.ts`).

Os fluxos de status, com as transições válidas, estão em
[`docs/dominio.md`](docs/dominio.md) — lá as seções de pedido, pagamento,
conversão em pedido e produto são da loja que saiu.

### Dinheiro, datas e numeração

**Dinheiro é sempre inteiro em centavos.** Todo campo monetário do schema
termina em `Cents` e é `Int`. Não existe `Float` de dinheiro em lugar nenhum, e
não deve passar a existir: `0.1 + 0.2` não é `0.3` em ponto flutuante, e o erro
aparece justamente no fechamento do mês. Formate com `formatarPreco(centavos)`
de `@/lib/format`; converta entrada de formulário com `paraCentavos`.

**Datas são gravadas em UTC e exibidas em America/Sao_Paulo.** Nunca use
`toLocaleDateString` solto: os helpers `formatarData`, `formatarDataHora`,
`formatarDataExtensa` e `paraInputDate` de `@/lib/format` fixam o fuso, e é isso
que impede uma OS aberta às 22h de aparecer no dia seguinte. O selo "Atendendo
agora" da home também é calculado no fuso de São Paulo, pelo horário
configurado no painel.

**Numeração de documento** vive em `src/lib/codigos.ts`. Hoje saem quatro
prefixos — `AT` chamado, `OS` ordem de serviço, `ORC` orçamento, `CT` contrato
—, no formato `AT-000123`. `JB` (pedido) e `SUP` (ticket) continuam na tabela
de prefixos, mas nenhum fluxo os emite desde que a loja e a área do cliente
saíram. O contador fica na tabela `DocumentSequence`, incrementado com
`INSERT … ON CONFLICT DO UPDATE … RETURNING`, que é atômico no Postgres.
`count + 1` colidiria sob concorrência. `proximoCodigo` aceita um cliente de
transação, para o número ser reservado dentro da mesma transação que cria o
registro. Se linhas entrarem por fora — importação, restauração de backup
parcial, `INSERT` manual — o contador fica atrás do que já existe e o próximo
código colide: rode `sincronizarSequencia` antes de voltar a emitir.
`codigos.ts` é `server-only`, então os scripts que rodam fora do Next repetem o
mesmo SQL à mão em vez de importá-lo.

---

## Autenticação: só a equipe

Existe **um** login, o da equipe. O cliente não tem conta no site desde
22/09/2026: `Customer` continua como cadastro no painel, sem senha em uso.

| | Equipe interna |
|---|---|
| Módulo | `src/lib/auth.ts` |
| Tabela | `User` |
| Cookie | `jb_staff` |
| Duração | 8 horas |
| Chave do JWT | `AUTH_SECRET` |
| Guarda | `exigirStaff` / `exigirNivel` / `exigirArea` |

Tentativas de login são contadas na tabela `LoginAttempt`, compartilhada entre
instâncias e que sobrevive a um redeploy.

Os papéis (`StaffRole`) são `admin`, `gestor`, `comercial`, `tecnico` e
`editor`, com hierarquia numérica em `auth.ts`; `tecnico` é uma trilha
operacional paralela. Duas camadas convivem: `PODE.*` responde "pode executar
esta capacidade" e `AREAS`, em `src/lib/permissoes.ts`, responde "pode abrir
esta tela". Quando as duas discordam, quem manda na navegação é
`permissoes.ts`.

A autorização é **sempre no servidor**. O `src/proxy.ts` (o antigo
`middleware.ts`, que nesta versão do Next mudou de nome e mora em `src/`, ao
lado de `app`) só olha a *presença* do cookie para redirecionar visita anônima
a `/admin`, e não valida a assinatura, de propósito: validar JWT em toda
navegação custaria cripto no caminho quente para trocar um redirecionamento por
outro igual. A guarda de verdade é `exigirArea` na página e na ação.

---

## Ambientes

| | Produção | Preview (branch) | Local |
|---|---|---|---|
| `VERCEL_ENV` | `production` | `preview` | ausente |
| Banco | `DATABASE_URL` | `JBPREV_DATABASE_URL` | `DATABASE_URL` (docker) |
| Indexação | liberada | `noindex` (robots + `X-Robots-Tag`) | `noindex` |
| Seeds de demonstração | recusados | permitidos | permitidos |

A escolha do banco está em `urlsBancoEfetivas`
(`src/lib/seguranca-ambiente.ts`), a mesma para a aplicação e para o Prisma CLI:
**havendo `JBPREV_DATABASE_URL` fora de produção, ela vence** — e a conexão
direta de preview (`JBPREV_DATABASE_URL_UNPOOLED`) acompanha, para uma migração
de branch nunca cair na conexão direta de produção. A Vercel expõe as duas
conexões no mesmo ambiente, então a escolha precisa ser explícita — senão uma
demonstração em branch escreveria no banco real.

`problemasDoAmbiente`, no mesmo arquivo, é o portão que roda no `prebuild`, nos
scripts de banco e ao abrir a conexão. Ele reprova, em vez de ignorar em
silêncio:

- `JBPREV_DATABASE_URL` definida em produção;
- preview sem `JBPREV_DATABASE_URL`;
- `JBPREV_DATABASE_URL` igual a `DATABASE_URL` em preview (e o mesmo para as
  conexões diretas);
- `PAYMENT_PROVIDER=mock` em produção — resto da loja, ver a última seção;
- comando destrutivo ou seed de demonstração contra produção, a menos que
  `PERMITIR_OPERACAO_PRODUCAO=JB-PRODUCAO-CONFIRMADA` esteja no ambiente.

### O perigo do `.env.local`

Já aconteceu neste projeto, e vai acontecer de novo se ninguém avisar:

`vercel env pull` e `vercel integration add` escrevem um **`.env.local`** com as
variáveis de **produção**, `DATABASE_URL` inclusive. O Next dá prioridade a
`.env.local` sobre `.env`. A partir daí, `pnpm dev` na sua máquina está lendo e
**escrevendo no banco de produção** — sem aviso, sem banner, sem nenhuma
diferença visual na tela. Um `pnpm db:demo` distraído nesse estado despeja dados
de demonstração no cadastro real da JB; um `pnpm db:reset` apaga tudo.

Como conviver com isso:

- `.env.local` e `.env.preview` estão no `.gitignore` justamente por esse
  motivo, com o comentário explicando por quê.
- Se precisar rodar um comando contra produção, rode **só aquele comando**, com
  as variáveis no escopo dele, e **apague o `.env.local` em seguida**. O
  ajudante `_prod.sh` (também ignorado) existe para isso: exporta apenas
  `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do `.env.local` para o processo
  filho, sem imprimir os valores.
- Na dúvida, confira antes de qualquer comando destrutivo: se `ls .env.local`
  encontra o arquivo, você provavelmente está apontado para produção.

O passo a passo está em [`docs/operacao.md`](docs/operacao.md).

---

## Testes

Cinco camadas, e cada uma responde a uma pergunta diferente. Nenhuma delas
substitui a outra.

| Camada | Pergunta que responde | Como roda |
|---|---|---|
| `pnpm test:unit` | a regra de negócio está certa? | **346** testes em 20 arquivos, em memória, sem banco |
| `pnpm e2e` | o fluxo funciona de ponta a ponta? | navegador real, banco real |
| `pnpm responsivo` | o layout aguenta a tela do cliente? | 7 larguras por rota, medido no navegador |
| `pnpm a11y` | dá para usar sem enxergar, sem mouse? | axe-core WCAG 2.1 A/AA, mais 3 medições próprias |
| `pnpm tour` | alguma tela quebrou? | percorre as rotas e fotografa |

**Só a primeira reflete o site de hoje.** A suíte de ponta a ponta
(`tests/e2e/`) e as listas de rotas de `scripts/responsivo.mjs`,
`scripts/acessibilidade.mjs` e `scripts/tour.mjs` ainda são da loja — catálogo,
carrinho, checkout, `/minha-jb`, produtos e estoque no painel — e vão ser
reescritas para o site de assistência. Até lá, o resultado delas não diz nada
sobre o site atual: as rotas que elas visitam respondem 410 ou redirecionam, e
as sete páginas de equipamento não são medidas por nenhuma delas. Na CI
(`.github/workflows/validacao.yml`), e2e, a11y e responsivo rodam no job "E2E,
acessibilidade e responsividade"; os outros dois jobs rodam
`arquitetura:verificar`, lint, tipos, os testes de unidade e o build.

As três do meio saem com código 1 quando acham problema, então servem de
portão. Todas medem no navegador de verdade em vez de inspecionar o código:
transbordo, contraste e alvo de toque dependem de fonte carregada, imagem
carregada e quebra de linha — nada disso dá para saber lendo o JSX.

```bash
# 1. suba o site e carregue os dados de demonstração
pnpm db:seed && pnpm db:demo && pnpm db:demo:operacao
pnpm dev --port 3400

# 2. em outro terminal
pnpm test:unit
E2E_BASE_URL=http://localhost:3400 pnpm e2e
BASE_URL=http://localhost:3400 pnpm responsivo
BASE_URL=http://localhost:3400 pnpm a11y
pnpm tour
```

Um detalhe que custa tempo se for descoberto na hora errada: o `pnpm e2e` sobe
o próprio `next dev` na porta 3210 (`E2E_PORT` troca), e o Next 16 recusa um
segundo servidor de desenvolvimento no mesmo diretório. Se você já tem um
rodando, aponte a suíte para ele com `E2E_BASE_URL` em vez de deixar os dois
brigarem — sem isso a suíte demora minutos e falha por tempo esgotado, sem
dizer o porquê.

Uma diferença que vale saber antes de caçar fantasma: **local roda com
`retries: 0` e a CI com 1.** Uma falha intermitente aparece aqui e some lá — e a
inversa também.

`pnpm a11y` e `pnpm responsivo` precisam do Postgres de pé — sem ele, o portão
do painel diz "não foi possível entrar" e **passa com zero medição**, que lê
como verde e não é. Ver
[`docs/evolucao-jb/validacao.md`](docs/evolucao-jb/validacao.md).

### Teste visual mede depois, nunca antes

Quatro testes desta suíte já falharam por medir antes de a página existir:
conteúdo que chega por streaming, foco no primeiro `Tab`, hidratação, animação
de gaveta. A guarda certa **espera o resultado**, não um tempo:

```ts
// errado: mede uma vez, logo depois do goto
expect((await contar()).length).toBeGreaterThan(0);

// certo: espera a página entregar o que promete
await expect.poll(async () => (await contar()).length).toBeGreaterThan(0);
```

E a armadilha oposta, que é pior porque é silenciosa: **amostra vazia não é
aprovação.** Um seletor que casa zero elementos faz o teste passar dizendo nada.
Toda medição por varredura precisa de uma guarda de amostra mínima.

O `pnpm a11y` mede três coisas que o axe-core não cobre: se o anel de foco
realmente aparece (o axe só olha se o `outline` foi zerado, não se algo o
substituiu), se o alvo de toque tem 44px **contando o rótulo** que comanda o
campo, e se algum `aria-labelledby`/`aria-controls` aponta para um id que não
existe na página.

`pnpm tour` (= `node scripts/tour.mjs`) grava as fotos em `.shots/tour`, no
desktop e no celular, e aceita `--so=publico|conta|admin`, `--sem-fotos` e
`--celular`.

Os demais scripts em `scripts/` são verificações pontuais: `testa-upload.mjs`
prova que o upload grava no Vercel Blob; `shot.mjs` e `shot-admin.mjs` capturam
telas. `e2e.mjs`, `compara.mjs`, `diff-html.mjs` e `extrai-legado.mjs` são
herdados da migração do site antigo em PHP e estão desatualizados.

---

## Produção

**Atenção antes de publicar: o domínio oficial ainda serve o site antigo.**

| | Onde vive | Branch |
|---|---|---|
| Site oficial — **ainda o legado** | https://jbsolucoesodontologicas.com.br | `main` |
| **A plataforma** | https://jb-plataforma.vercel.app | `plataforma` |
| Painel | `/admin` de cada um | — |
| Hospedagem | Vercel, projeto `jb-site` | — |
| Banco | Neon Postgres, um por escopo (ver "Ambientes") | — |
| Arquivos | Vercel Blob, store `jb-midia` | — |

Tudo que este README descreve roda hoje **no preview**, para aprovação. A branch
`plataforma` está centenas de commits à frente de `main`, e o alias
`jb-plataforma.vercel.app` é um domínio amarrado a ela — não se move à mão.

Levar a plataforma para o domínio oficial é uma decisão, não um `push`, e tem
um pré-requisito que não é código: a revisão jurídica de privacidade e termos
(ver a última seção).

Uma trava prática: o plano da Vercel é o gratuito, **100 deploys por dia**.
Estourado o limite, o push simplesmente deixa de virar build, em silêncio.

O `vercel.json` roda `pnpm db:deploy` antes do build só quando
`VERCEL_ENV=production`, e agenda `/api/fila` uma vez por dia. Deploy, migração
e seed estão em [`docs/operacao.md`](docs/operacao.md).

---

## O que ainda não está pronto

Lista honesta. Nada disto aparece como "em breve" na interface — onde falta
dado, a tela mostra estado vazio com uma ação útil.

- **As tabelas da loja continuam no banco.** `Product`, `Cart`, `Order`,
  `Payment`, `Coupon` e o resto do comércio seguem no schema, e a migração que
  as apaga vem em separado. Até ela, os seeds de demonstração e o
  `pnpm db:vitrine` continuam gravando nelas.
- **E2E, responsivo, a11y e tour ainda são da loja.** Ver "Testes". A cobertura
  de navegador do site atual — home, páginas de equipamento, barra do celular,
  aviso de medição — ainda não existe.
- **Privacidade e termos pedem revisão de advogado antes de produção.** Os
  pontos estão listados no topo de `src/app/(site)/privacidade/page.tsx` e de
  `termos/page.tsx`. Revisado, o texto vai para a página de mesmo slug no
  painel.
- **Restos da loja na configuração.** O portão de ambiente e o CSP de
  `next.config.ts` ainda leem `PAYMENT_PROVIDER` (e o CSP libera o Mercado Pago
  quando ele vale `mercadopago`); o `.env.example` ainda traz
  `PAYMENT_PROVIDER="mock"`; o `matcher` do `proxy.ts` ainda exclui
  `api/pagamento/webhook`. Nenhum provedor de pagamento existe mais. Em
  produção, deixe `PAYMENT_PROVIDER` sem definir: `mock` reprova o build.
  Também sobraram `/api/captcha` e o formulário de contato
  (`src/components/institucional/formulario-contato.tsx`), que nenhuma página
  usa.
- **O conteúdo do painel e o site novo não se falam por inteiro.** A home é
  código mais configurações: as telas de `home`, `slides` e `faq` em
  `/admin/conteudo` continuam editáveis, mas o site público não lê essas
  tabelas. De `paginas`, só `privacidade` e `termos` são servidas.
- **E-mail só sai com provedor configurado.** A fila existe: `enfileirar()` grava
  `OutboundMessage`, `src/lib/mensageria.ts` entrega pela Resend e
  `/admin/mensagens` mostra o resultado e processa na hora. Sem `RESEND_API_KEY`
  e `EMAIL_FROM`, cada linha fica como `simulado`, com o motivo à vista na tela.
  O envio de convite de avaliação tem um portão a mais: a configuração
  `avaliacoes_envio`.
- **O cron roda uma vez por dia.** `/api/fila` está agendado em `vercel.json`
  para `0 6 * * *` (UTC), e só processa mensagens e anexos órfãos. O resto do
  que depende do tempo passar não tem agenda: `expirarVencidos`
  (`src/lib/orcamento.ts`) não é chamado por nenhuma tela nem rota, e os
  lembretes e atrasos de visita de manutenção só aparecem quando alguém abre o
  painel ou `/admin/manutencao`.
- **Limite de taxa é por instância.** `src/lib/limite.ts` usa um `Map` em
  memória: em serverless cada instância conta a própria fatia, então o limite
  real é o configurado vezes o número de instâncias quentes. Segura robô
  preguiçoso; não segura ataque distribuído. O login da equipe não depende
  disso — conta tentativas em `LoginAttempt`.
- **Sem CSP com nonce.** `script-src` carrega `'unsafe-inline'`, porque nonce
  exigiria renderização dinâmica em todas as páginas — o motivo está comentado
  em detalhe no topo de `next.config.ts`. O caminho de migração é
  `experimental.sri`, hoje experimental e por isso desligado.
- **Falta fotografia própria.** As fotos da home e das páginas de equipamento
  (`public/site/`) vêm do protótipo aprovado e do acervo da loja antiga, e os
  textos alternativos descrevem a cena sem dizer que é a equipe da JB. Quando
  houver foto real da bancada e da equipe, basta trocar os arquivos. A
  auditoria de 08/09/2026
  ([`docs/auditoria-visual-2026-09-08/`](docs/auditoria-visual-2026-09-08/))
  registra o pedido.
- **Scripts herdados da migração do PHP estão desatualizados.** `e2e.mjs` ainda
  aponta para `/admin/login`, rota que hoje se chama `/admin/entrar`;
  `compara.mjs` e `diff-html.mjs` comparam com páginas do site antigo que não
  existem mais.
