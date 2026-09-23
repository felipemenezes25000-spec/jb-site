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
 * A página devolvida é HTML/CSS puro, escrito aqui: este arquivo não importa
 * componentes nem consulta configurações. Assim uma URL antiga continua
 * explicando a mudança mesmo quando o banco estiver indisponível. A marca vem
 * de arquivo estático do próprio domínio e os CTAs voltam para rotas públicas
 * estáveis, sem número de WhatsApp hardcoded no proxy.
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
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#111315">
<title>Página removida · JB Soluções Odontológicas</title>
<style>
*{box-sizing:border-box}html{background:#111315}body{margin:0;min-height:100dvh;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 82% 10%,rgba(224,20,27,.22),transparent 30rem),radial-gradient(circle at 8% 92%,rgba(255,255,255,.06),transparent 24rem),#111315;color:#fff;display:grid;place-items:center;padding:max(1rem,env(safe-area-inset-top)) max(1rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-left))}
main{width:min(100%,46rem);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:2rem;background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(248,249,250,.98));color:#111315;padding:clamp(1.25rem,4vw,3rem);box-shadow:0 42px 110px -52px rgba(0,0,0,.82)}
main:before{content:"";position:absolute;right:-8rem;top:-10rem;width:24rem;height:24rem;border-radius:999px;background:radial-gradient(circle,rgba(224,20,27,.16),transparent 66%);pointer-events:none}.topo{position:relative;display:flex;align-items:center;justify-content:space-between;gap:1rem}.marca{display:inline-flex;align-items:center;border:1px solid #e4e6e8;border-radius:1rem;background:#fff;padding:.55rem .8rem;box-shadow:0 14px 32px -28px rgba(17,19,21,.55)}.marca img{display:block;width:auto;height:2.25rem}.status{display:inline-flex;align-items:center;gap:.5rem;border:1px solid #ead1d2;border-radius:999px;background:#fff7f7;padding:.45rem .7rem;color:#a5090c;font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.status:before{content:"";width:.45rem;height:.45rem;border-radius:999px;background:#e0141b}.conteudo{position:relative;margin-top:clamp(2.4rem,7vw,4.8rem)}.eyebrow{margin:0;color:#a5090c;font-size:.72rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase}h1{max-width:10ch;margin:.65rem 0 0;font-size:clamp(2.55rem,8vw,5rem);line-height:.94;letter-spacing:-.055em;text-wrap:balance}h1 span{display:block;color:#e0141b}p{max-width:37rem;margin:1.25rem 0 0;color:#555b61;font-size:clamp(.98rem,2vw,1.08rem);line-height:1.65}.provas{display:flex;flex-wrap:wrap;gap:.55rem;margin:1.45rem 0 0;padding:0;list-style:none}.provas li{border:1px solid #e1e3e5;border-radius:.8rem;background:#fff;padding:.58rem .75rem;color:#35393d;font-size:.76rem;font-weight:800}.acoes{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.7rem}.acoes a{min-height:3rem;display:inline-flex;align-items:center;justify-content:center;border-radius:.9rem;padding:.8rem 1.05rem;font-size:.88rem;font-weight:850;text-decoration:none;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.principal{background:#e0141b;color:#fff;box-shadow:0 22px 48px -30px rgba(224,20,27,.75)}.secundario{border:1px solid #d9dcdf;background:#fff;color:#22262a}.acoes a:hover{transform:translateY(-1px)}.acoes a:focus-visible{outline:3px solid rgba(224,20,27,.34);outline-offset:3px}.rodape{position:relative;margin-top:2.2rem;padding-top:1.1rem;border-top:1px solid #e4e6e8;color:#777d83;font-size:.72rem;font-weight:700}
@media(max-width:32rem){main{border-radius:1.35rem;padding:1rem}.topo{align-items:flex-start}.marca img{height:1.9rem}.status{font-size:.62rem;padding:.4rem .55rem}.conteudo{margin-top:2.5rem}h1{font-size:clamp(2.35rem,13.5vw,3.45rem)}.provas{display:grid;grid-template-columns:1fr 1fr}.provas li:last-child{grid-column:1/-1}.acoes{display:grid;grid-template-columns:1fr}.acoes a{width:100%;min-height:3.1rem}.rodape{margin-top:1.6rem}}
@media(prefers-reduced-motion:reduce){.acoes a{transition:none}}
</style>
</head>
<body>
<main>
<div class="topo"><span class="marca"><img src="/marca/jb-logo.webp" alt="JB Soluções Odontológicas"></span><span class="status">HTTP 410</span></div>
<div class="conteudo"><p class="eyebrow">A JB mudou de foco</p><h1>A loja saiu.<span>A assistência ficou.</span></h1><p>Esta página comercial foi encerrada. A JB agora concentra o site público na assistência técnica de equipamentos odontológicos de todas as marcas.</p><ul class="provas"><li>Assistência técnica</li><li>Todas as marcas</li><li>São Paulo e região</li></ul><div class="acoes"><a class="principal" href="/">Ir para a assistência técnica</a><a class="secundario" href="/#equipamentos">Ver equipamentos atendidos</a></div></div>
<div class="rodape">JB Soluções Odontológicas · A URL antiga continua retornando 410 para indicar que o conteúdo comercial foi removido definitivamente.</div>
</main>
</body>
</html>`;

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
