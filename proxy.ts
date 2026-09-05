import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (o antigo `middleware.ts`).
 *
 * Nesta versão do Next o arquivo se chama `proxy.ts`, exporta uma função
 * chamada `proxy` (ou um default) e roda no runtime Node.js — o `runtime` de
 * segmento não é aceito aqui. Referência lida antes de escrever:
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * A mesma documentação avisa que o proxy é pensado para rodar separado do
 * código de renderização, podendo até ser empurrado para a borda, e que não se
 * deve depender de módulos compartilhados. Por isso este arquivo é autossuficiente:
 * os nomes de cookie estão repetidos aqui em vez de importados de
 * `@/lib/seguranca` (onde estão as mesmas constantes, com o mesmo aviso).
 *
 * O que ele faz, e só isso:
 *
 *  1. barra visita anônima a `/admin` e `/minha-jb` olhando apenas a PRESENÇA do
 *     cookie de sessão, sem tocar no banco;
 *  2. marca as áreas privadas como não-cacheáveis e não-indexáveis;
 *  3. em preview e desenvolvimento, manda `X-Robots-Tag: noindex` no site todo.
 *
 * O que ele NÃO faz, de propósito:
 *
 *  - não valida a assinatura do cookie. Um cookie `jb_staff` com lixo dentro
 *    passa por aqui e é recusado na página, por `exigirArea` / `exigirCliente`,
 *    que são as guardas de verdade. Validar JWT no proxy custaria uma chamada
 *    de cripto em toda navegação para trocar um redirecionamento bonito por
 *    outro igual;
 *  - não carrega o CSP. Esse fica em `next.config.ts`, estático, pelo motivo
 *    explicado em detalhe lá (nonce por requisição obrigaria o site inteiro a
 *    renderizar dinamicamente).
 */

/* ------------------------------------------------------------------ cookies */

/** Espelha a constante privada de `@/lib/auth`. */
const COOKIE_STAFF = "jb_staff";
/** Espelha a constante privada de `@/lib/auth-cliente`. */
const COOKIE_CLIENTE = "jb_cliente";

/* -------------------------------------------------------------------- rotas */

const AREA_STAFF = "/admin";
const LOGIN_STAFF = "/admin/entrar";
const AREA_CLIENTE = "/minha-jb";
const LOGIN_CLIENTE = "/entrar";

/**
 * Nada aqui pode ser guardado por CDN nem aparecer em buscador: são páginas com
 * dado de uma pessoa só. `/carrinho` e `/checkout` entram mesmo sem exigir
 * login — comprar sem conta é permitido, mas o conteúdo é individual.
 */
const PRIVADAS = [AREA_STAFF, AREA_CLIENTE, "/checkout", "/carrinho"];

/** `/admin` casa com `/admin` e `/admin/pedidos`, mas não com `/administrativo`. */
function dentroDe(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const naAreaStaff = dentroDe(pathname, AREA_STAFF) && !dentroDe(pathname, LOGIN_STAFF);
  const naAreaCliente = dentroDe(pathname, AREA_CLIENTE);

  /* ------------------------------------------------------------- porteiro */

  // Só navegação é redirecionada. Um POST sem cookie (Server Action, envio de
  // formulário) segue em frente e morre na guarda da própria ação: devolver 307
  // para a tela de login faria o navegador repetir o POST lá, o que só gera
  // erro confuso e perde o que a pessoa digitou.
  const ehNavegacao = request.method === "GET" || request.method === "HEAD";

  if (ehNavegacao && naAreaStaff && !request.cookies.has(COOKIE_STAFF)) {
    return NextResponse.redirect(paraLogin(request, LOGIN_STAFF, true));
  }

  if (ehNavegacao && naAreaCliente && !request.cookies.has(COOKIE_CLIENTE)) {
    return NextResponse.redirect(paraLogin(request, LOGIN_CLIENTE, false));
  }

  /* ------------------------------------------------------------ cabeçalhos */

  const resposta = NextResponse.next();

  const ehPrivada = PRIVADAS.some((base) => dentroDe(pathname, base));
  const ehProducao = process.env.VERCEL_ENV === "production";

  if (ehPrivada) {
    // Redundante com o que o Next já manda em página dinâmica, e de propósito:
    // se um dia alguém tornar estática uma página de `/minha-jb` sem perceber,
    // este cabeçalho impede que um proxy compartilhado sirva o pedido de uma
    // pessoa para outra.
    resposta.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    resposta.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  } else if (!ehProducao) {
    // Preview de branch e ambiente local não podem competir com o site real no
    // Google. O `robots.txt` (src/app/robots.ts) já bloqueia tudo fora de
    // produção; este cabeçalho cobre a URL que já tenha sido descoberta por
    // link, onde o robots sozinho não desindexa.
    resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return resposta;
}

/**
 * URL da tela de login com o caminho de volta.
 *
 * As duas telas leem parâmetros diferentes hoje: `/admin/entrar` lê `de` e
 * `/entrar` lê `destino` (aceitando `voltar` também). Para não depender de uma
 * padronização que ainda não aconteceu, o redirecionamento da equipe manda os
 * dois nomes — `de`, que é o que a página usa, e `destino`, que é o nome
 * combinado no projeto.
 */
function paraLogin(request: NextRequest, login: string, ehStaff: boolean) {
  const url = request.nextUrl.clone();
  const volta = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.pathname = login;
  url.search = "";
  url.searchParams.set("destino", volta);
  if (ehStaff) url.searchParams.set("de", volta);

  return url;
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos:
     *
     *  - `_next/static` e `_next/image`: bundles e imagens otimizadas, servidos
     *    por CDN; passar por aqui só custaria latência;
     *  - `api/pagamento/webhook`: chamada de máquina, sem cookie e sem
     *    navegador. Um redirecionamento ou um cabeçalho a mais no meio do
     *    caminho pode fazer o provedor marcar a notificação como falha e
     *    reenviar em laço;
     *  - arquivos com extensão dentro de `public/` (imagens, fontes, PDF de
     *    manual, os uploads locais) e os arquivos de metadado da raiz.
     *
     * A lista precisa ser constante para o Next analisar em tempo de build —
     * nada de variável aqui dentro. As alternativas são todas planas, sem grupo
     * aninhado, para ficar igual ao exemplo da documentação: o `matcher` passa
     * por um path-to-regexp, e construção exótica no meio do caminho é o tipo
     * de coisa que quebra numa atualização sem aviso.
     */
    "/((?!_next/static|_next/image|api/pagamento/webhook|icon$|apple-icon$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.avif$|.*\\.svg$|.*\\.ico$|.*\\.css$|.*\\.js$|.*\\.map$|.*\\.txt$|.*\\.xml$|.*\\.webmanifest$|.*\\.pdf$|.*\\.woff$|.*\\.woff2$|.*\\.ttf$|.*\\.mp4$|.*\\.webm$).*)",
  ],
};
