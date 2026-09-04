# JB Soluções Odontológicas

O mesmo site que rodava em PHP 5.6 + MySQL, reconstruído em stack moderna.
Layout, conteúdo e comportamento idênticos ao original — o que mudou foi a
tecnologia por baixo e o painel de administração.

| | Antes | Agora |
|---|---|---|
| Linguagem | PHP 5.6 (`mysql_connect`, sem suporte desde 2018) | TypeScript + React 19 |
| Framework | — | Next.js 16 (App Router) |
| Banco | MySQL 5.6 | SQLite no local · Postgres na Vercel (Prisma) |
| Painel | MARS v5.3.1 (G4web, 2010) | Painel próprio em `/admin` |
| Senhas | texto plano no banco | hash bcrypt |
| Hospedagem | servidor PHP | Vercel |

O visual é o CSS original (Bootstrap 3 + `main.css` da G4web), copiado sem
alteração para `public/css`. As páginas React reproduzem a mesma marcação, de
modo que a comparação lado a lado bate pixel a pixel.

## Rodar localmente

```bash
pnpm install
pnpm db:seed     # carrega o conteúdo migrado do site antigo
pnpm dev
```

Site em `http://localhost:3000`, painel em `http://localhost:3000/admin`.

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

## Deploy na Vercel

1. **Banco.** Em Storage › Create › Postgres, crie o banco e copie a
   `DATABASE_URL`. Antes do primeiro deploy, troque em `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"   // era "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

   Depois rode `pnpm prisma migrate deploy` e `pnpm db:seed` apontando para ele.

2. **Imagens.** Em Storage › Create › Blob. A Vercel injeta
   `BLOB_READ_WRITE_TOKEN` sozinha, e a rota de upload passa a gravar no Blob em
   vez do disco — o disco da Vercel é efêmero e perderia os arquivos.

3. **Variáveis.** Veja `.env.example`. `AUTH_SECRET` precisa ser uma chave
   aleatória longa:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Domínio.** No painel da Vercel, Settings › Domains, adicione
   `jbsolucoesodontologicas.com.br`. A Vercel mostra os registros DNS; copie-os
   no painel do registro.br (Alterar servidores DNS / Editar zona). O
   certificado HTTPS é emitido automaticamente.

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
