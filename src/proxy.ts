import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (o antigo `middleware.ts`).
 *
 * Nesta versão do Next o arquivo se chama `proxy.ts`, exporta uma função
 * chamada `proxy` (ou um default) e roda no runtime Node.js — o `runtime` de
 * segmento não é aceito aqui. Referência lida antes de escrever:
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 *
 * MORA EM `src/`. A documentação manda o arquivo ficar no mesmo nível de
 * `app`, e o app daqui é `src/app`. Até 18/09/2026 ele estava na raiz do
 * repositório e nunca foi carregado: o preview saía sem `X-Robots-Tag`, as
 * áreas privadas com `Cache-Control: public` e a visita anônima a `/admin`
 * recebia 200 com a moldura do painel antes do redirecionamento. O que rodava
 * era um `src/middleware.ts` (convenção depreciada) que só fazia o item 5
 * abaixo — agora ele mora aqui.
 *
 * A mesma documentação avisa que o proxy é pensado para rodar separado do
 * código de renderização, podendo até ser empurrado para a borda, e que não se
 * deve depender de módulos compartilhados. Por isso este arquivo é autossuficiente:
 * os nomes de cookie estão repetidos aqui em vez de importados de
 * `@/lib/seguranca` (onde estão as mesmas constantes, com o mesmo aviso).
 *
 * O que ele faz, e só isso:
 *
 *  1. em produção, leva o visitante para o host canônico quando ele chegou por
 *     outro — `www` contra apex, o domínio `.vercel.app`, um domínio antigo;
 *  2. responde 410 aos endereços da loja, que saiu quando a JB virou só
 *     assistência técnica (ver `LOJA_REMOVIDA`);
 *  3. barra visita anônima a `/admin` olhando apenas a PRESENÇA do cookie de
 *     sessão, sem tocar no banco;
 *  4. marca o painel como não-cacheável e não-indexável;
 *  5. em preview e desenvolvimento, manda `X-Robots-Tag: noindex` no site todo.
 *
 * O que ele NÃO faz, de propósito:
 *
 *  - não valida a assinatura do cookie. Um cookie `jb_staff` com lixo dentro
 *    passa por aqui e é recusado na página, por `exigirArea`,
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

/* -------------------------------------------------------------------- rotas */

const AREA_STAFF = "/admin";
const LOGIN_STAFF = "/admin/entrar";

/** Nada aqui pode ser guardado por CDN nem aparecer em buscador. */
const PRIVADAS = [AREA_STAFF];

/* ------------------------------------------------------- loja que saiu */

/**
 * Endereços da loja, que deixou de existir quando a JB virou só assistência.
 *
 * Respondem 410 (removido de vez) e não 404 nem redirecionamento: 410 diz ao
 * buscador que a página não volta, e ele a tira do índice mais rápido. Mandar
 * tudo para a home seria redirecionamento indiscriminado, que o Google trata
 * como página inexistente disfarçada.
 *
 * A página devolvida é HTML puro, escrito aqui: este arquivo não importa
 * componentes (ver o topo), e uma resposta de 200 bytes não precisa deles.
 */
const LOJA_REMOVIDA = [
  "/loja",
  "/seminovos",
  "/novos",
  "/usados",
  "/recondicionados",
  "/pecas-e-acessorios",
  "/categoria",
  "/marcas",
  "/busca",
  "/carrinho",
  "/checkout",
  "/escolher-entrega",
  "/pedido",
  "/verificar",
  "/comparar",
  "/simulador-de-custo",
  "/entrega",
  "/trocas-e-devolucoes",
];

const PAGINA_REMOVIDA = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Página removida · JB Soluções Odontológicas</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f7f8f8;color:#1a1c1e}
main{max-width:30rem;padding:2rem 1.25rem;text-align:center}h1{font-size:1.6rem;margin:0 0 .75rem}p{color:#51565c;line-height:1.6;margin:0 0 1.75rem}
a{display:inline-block;background:#e0141b;color:#fff;font-weight:700;text-decoration:none;padding:.9rem 1.5rem;border-radius:.6rem}</style></head>
<body><main><h1>Esta página saiu do ar</h1><p>A JB agora é dedicada à assistência técnica de equipamentos odontológicos. Conte o que aconteceu com o seu equipamento e fale com a nossa equipe.</p>
<a href="/">Ir para a assistência técnica</a></main></body></html>`;

/** `/admin` casa com `/admin` e `/admin/pedidos`, mas não com `/administrativo`. */
function dentroDe(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/* ---------------------------------------------------------- host canônico */

/**
 * O host que a JB publica, extraído de `NEXT_PUBLIC_SITE_URL`.
 *
 * Lido direto do ambiente e não de `@/lib/site-url` porque este arquivo é
 * autossuficiente de propósito — a documentação do proxy avisa que ele pode
 * rodar separado do código de renderização. A validação séria da variável
 * acontece no build, em `@/lib/site-url`; aqui basta saber o host, e um valor
 * ilegível simplesmente desliga o redirecionamento em vez de derrubar toda
 * navegação do site.
 */
function hostCanonico(): string | null {
  const bruto = process.env.NEXT_PUBLIC_SITE_URL;
  if (!bruto) return null;
  try {
    return new URL(bruto).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Redireciona para o endereço canônico, ou `null` quando já se está nele.
 *
 * Três cuidados contra laço de redirecionamento:
 *
 *  1. só age em produção — em preview o host é o do deploy, e mandar para o
 *     domínio real levaria a demonstração para o site verdadeiro;
 *  2. compara host com host, já em minúsculas, e sai fora quando são iguais;
 *  3. se a variável não estiver legível, não redireciona nada.
 *
 * Caminho e parâmetros são preservados: um link antigo com `?utm_source=` tem
 * de chegar inteiro do outro lado, senão a origem da visita se perde no meio
 * do redirecionamento.
 */
function paraOHostCanonico(request: NextRequest): URL | null {
  if (process.env.VERCEL_ENV !== "production") return null;

  const canonico = hostCanonico();
  if (!canonico) return null;

  const atual = (request.headers.get("host") ?? request.nextUrl.host).toLowerCase();
  if (!atual || atual === canonico) return null;

  const destino = request.nextUrl.clone();
  destino.host = canonico;
  destino.port = "";
  /* Em produção o TLS termina antes daqui, então `nextUrl.protocol` pode vir
     como http mesmo numa requisição HTTPS. Fixar https no destino resolve o
     redirecionamento de protocolo junto, sem uma segunda ida ao servidor. */
  destino.protocol = "https:";
  return destino;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* -------------------------------------------------------- canônico */

  /* Antes de qualquer outra coisa: se a pessoa chegou por um host que não é o
     canônico, ela é levada para lá com 308 — que preserva o método e diz ao
     buscador que a mudança é definitiva. Fazer isso depois do porteiro
     produziria um redirecionamento para o login do host errado. */
  const canonico = paraOHostCanonico(request);
  if (canonico) return NextResponse.redirect(canonico, 308);

  /* ------------------------------------------------------- loja que saiu */

  if (LOJA_REMOVIDA.some((base) => dentroDe(pathname, base))) {
    return new NextResponse(PAGINA_REMOVIDA, {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const naAreaStaff = dentroDe(pathname, AREA_STAFF) && !dentroDe(pathname, LOGIN_STAFF);

  /* ------------------------------------------------------------- porteiro */

  // Só navegação é redirecionada. Um POST sem cookie (Server Action, envio de
  // formulário) segue em frente e morre na guarda da própria ação: devolver 307
  // para a tela de login faria o navegador repetir o POST lá, o que só gera
  // erro confuso e perde o que a pessoa digitou.
  const ehNavegacao = request.method === "GET" || request.method === "HEAD";

  if (ehNavegacao && naAreaStaff && !request.cookies.has(COOKIE_STAFF)) {
    return NextResponse.redirect(paraLogin(request, LOGIN_STAFF, true));
  }

  /* ------------------------------------------------------------ cabeçalhos */

  const resposta = NextResponse.next();

  const ehPrivada = PRIVADAS.some((base) => dentroDe(pathname, base));
  const ehProducao = process.env.VERCEL_ENV === "production";

  if (ehPrivada) {
    // Redundante com o que o Next já manda em página dinâmica, e de propósito:
    // se um dia alguém tornar estática uma página do painel sem perceber,
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
