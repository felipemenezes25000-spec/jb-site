# JB Soluções Odontológicas

O mesmo site que rodava em PHP 5.6 + MySQL, reconstruído em stack moderna.
Layout, conteúdo e comportamento idênticos ao original — o que mudou foi a
tecnologia por baixo e o painel de administração.

| | Antes | Agora |
|---|---|---|
| Linguagem | PHP 5.6 (`mysql_connect`, sem suporte desde 2018) | TypeScript + React 19 |
| Framework | — | Next.js 16 (App Router) |
| Banco | MySQL 5.6 | Postgres (Prisma) — o mesmo local e em produção |
| Painel | MARS v5.3.1 (G4web, 2010) | Painel próprio em `/admin` |
| Senhas | texto plano no banco | hash bcrypt |
| Hospedagem | servidor PHP | Vercel |

O visual é o CSS original (Bootstrap 3 + `main.css` da G4web), copiado sem
alteração para `public/css`. As páginas React reproduzem a mesma marcação, de
modo que a comparação lado a lado bate pixel a pixel.

## Rodar localmente

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # cole em AUTH_SECRET
docker compose up -d        # Postgres na porta 5433
pnpm install
pnpm prisma migrate deploy
pnpm db:seed                # carrega o conteúdo migrado do site antigo
pnpm dev
```

Site em `http://localhost:3000`, painel em `http://localhost:3000/admin`.
O seed imprime a senha do primeiro acesso.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | sobe o site em modo desenvolvimento |
| `pnpm build` / `pnpm start` | build e execução em produção |
| `pnpm db:seed` | recarrega o conteúdo migrado (não sobrescreve o que já foi editado no painel) |
| `pnpm db:studio` | abre o Prisma Studio para inspecionar o banco |
| `node scripts/compara.mjs` | fotografa site novo × site antigo lado a lado |
| `node scripts/e2e.mjs` | testa login, edição, formulário e captcha ponta a ponta |

Os dois últimos precisam do site antigo no ar (`docker compose up -d` dentro de
`../jb-local`, na porta 8080).

## O painel

Substitui o MARS com as mesmas funções:

- **Banners da home** — o carrossel do topo, com data de saída (era `area_nobre`)
- **Chamadas da home** — as três colunas com imagem (era `home`)
- **Páginas** — Empresa e Estrutura, com editor de texto, imagens e SEO (era `institucional` + `seo`)
- **Soluções** — os blocos sanfonados (era `mp5600_servicos`)
- **Cadastros** — o que chega pelo formulário, com situação e anotações (era `cadastros`)
- **Mídia** — biblioteca de imagens com upload
- **Configurações** — telefone, endereço, mapa e redes sociais (era `configuracoes`)
- **Usuários** — acesso ao painel, com permissão de editor ou administrador
- **Registro de atividade** — quem alterou o quê e quando (era `log`)

O editor de conteúdo preserva os `<span style="color:…">` que o conteúdo antigo
usa nos marcadores vermelhos. Para qualquer coisa que ele não represente bem,
existe a aba **HTML**, que edita a marcação crua.

## Produção

| | |
|---|---|
| Site | https://jbsolucoesodontologicas.com.br |
| Painel | https://jbsolucoesodontologicas.com.br/admin |
| Repositório | https://github.com/felipemenezes25000-spec/jb-site (privado) |
| Projeto Vercel | `felipemenezes25000-specs-projects/jb-site` |
| Banco | Neon Postgres (`neon-bisque-window`), provisionado pela Vercel |
| Domínio | https://jbsolucoesodontologicas.com.br — no ar, com HTTPS |

Todo `git push` para `main` publica sozinho.

### DNS (concluído)

A zona no registro.br tem os dois registros abaixo, e o domínio usa os
nameservers `e.sec.dns.br` / `f.sec.dns.br` do próprio registro.br:

| Tipo | Nome | Valor |
|---|---|---|
| A | *(raiz)* | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Certificado HTTPS emitido pela Vercel; `http` redireciona para `https` com 308.

### Blob (concluído)

O store `jb-midia` está conectado ao projeto e `BLOB_READ_WRITE_TOKEN` existe
nos três ambientes. Uploads do painel vão para
`*.public.blob.vercel-storage.com`. Verificado com `scripts/testa-upload.mjs`.

### Rodar comandos contra o banco de produção

```bash
vercel env pull .env.local          # baixa as variáveis de produção
DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')" DATABASE_URL_UNPOOLED="$(grep '^DATABASE_URL_UNPOOLED=' .env.local | cut -d= -f2- | tr -d '"')"   pnpm prisma migrate deploy
```

Apague o `.env.local` depois: o Next.js dá prioridade a ele sobre o `.env`, e
o desenvolvimento local passaria a escrever no banco de produção sem avisar.

### Testar a produção

```bash
BASE_URL="https://www.jbsolucoesodontologicas.com.br" ADMIN_PASSWORD="a senha do painel"   node scripts/e2e.mjs

BASE_URL="https://www.jbsolucoesodontologicas.com.br" ADMIN_PASSWORD="a senha do painel"   node scripts/testa-upload.mjs
```

Se o DNS ainda não tiver propagado na sua rede, force a resolução:

```bash
HOST_RULES="MAP www.jbsolucoesodontologicas.com.br 76.76.21.241"   BASE_URL="https://www.jbsolucoesodontologicas.com.br" node scripts/e2e.mjs
```

## Como o conteúdo foi migrado

`scripts/extrai-legado.mjs` lê o MySQL do backup e grava
`prisma/conteudo-legado.json`, que o seed carrega. A leitura usa `HEX()` para
não perder bytes: o banco antigo guardava UTF-8 codificado duas (às vezes três)
vezes sobre cp1252, e o script desfaz essas camadas. Por isso os acentos e as
aspas curvas chegam corretos.

## Estrutura

```
src/app/(site)/      páginas públicas — marcação idêntica à do PHP
src/app/admin/       painel
src/app/api/         captcha e upload
src/components/site/ cabeçalho, rodapé, carrossel, formulário
src/components/admin/ formulários e editor do painel
public/css|fonts|images/  assets originais do site antigo, sem alteração
prisma/              schema, migrações e carga inicial
scripts/             comparação visual, testes e extração do legado
```
