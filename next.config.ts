import type { NextConfig } from "next";

/**
 * Configuração do Next e cabeçalhos de segurança do site.
 *
 * ------------------------------------------------------------------
 * POR QUE O CSP ESTÁ AQUI, ESTÁTICO, E NÃO NO `proxy.ts` COM NONCE
 * ------------------------------------------------------------------
 * A documentação desta versão (node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md) é direta: nonce exige renderização dinâmica em
 * TODAS as páginas — "Static optimization and Incremental Static Regeneration
 * (ISR) are disabled", "No CDN caching", "Partial Prerendering is incompatible".
 *
 * Para uma loja, esse preço é alto e cai justamente onde não deveria: catálogo,
 * página de produto, home e páginas institucionais são conteúdo público, igual
 * para todo mundo, que hoje pode ser servido do cache. Trocar isso por uma
 * renderização por visita encarece a hospedagem e piora o tempo de resposta
 * das páginas que mais recebem visita — em troca de fechar `'unsafe-inline'`
 * num site que não injeta HTML de terceiro em lugar nenhum (o HTML vindo do CMS
 * passa por `stripTags`/sanitização em `@/lib/html`).
 *
 * Também não vale misturar os dois. Se o `proxy.ts` mandasse um CSP e este
 * arquivo mandasse outro, o navegador aplicaria a INTERSEÇÃO das duas
 * políticas: tudo que uma libera e a outra não, cai. É a receita clássica de
 * quebrar o site inteiro sem erro visível no servidor. Então existe uma única
 * fonte de verdade: este arquivo.
 *
 * O caminho de migração, quando fizer sentido: ligar `experimental.sri`
 * (integridade por hash, documentada no mesmo guia) para tirar `'unsafe-inline'`
 * do `script-src` SEM perder a geração estática. É experimental hoje, por isso
 * não está ligado.
 *
 * ATENÇÃO: `headers()` é lido em tempo de BUILD. As variáveis consultadas aqui
 * (`PAYMENT_PROVIDER`, `NODE_ENV`) precisam estar definidas no ambiente de
 * build, não só no de execução. Mudar `PAYMENT_PROVIDER` sem refazer o build
 * não muda o CSP.
 */

const emDesenvolvimento = process.env.NODE_ENV === "development";
const emProducao = process.env.NODE_ENV === "production";

/**
 * O SDK do Mercado Pago só entra no CSP quando ele é mesmo o provedor. Com o
 * provedor de teste (`mock`), a política fica menor — e política menor é
 * política mais segura.
 */
const usaMercadoPago = (process.env.PAYMENT_PROVIDER ?? "mock") === "mercadopago";

/** Junta as fontes de uma diretiva descartando o que estiver vazio. */
function diretiva(nome: string, ...fontes: Array<string | false | undefined>) {
  const lista = fontes.filter((fonte): fonte is string => Boolean(fonte));
  return lista.length ? `${nome} ${lista.join(" ")}` : nome;
}

/** Onde o Vercel Blob serve o que foi enviado pelo painel (`@/lib/upload`). */
const BLOB = "https://*.public.blob.vercel-storage.com";

/** Domínios do Mercado Pago, usados só quando ele está configurado. */
const MP_SCRIPT = "https://sdk.mercadopago.com";
const MP_API = "https://api.mercadopago.com https://api.mercadolibre.com";
const MP_FRAME = "https://www.mercadopago.com.br https://www.mercadopago.com";
const MP_IMG = "https://http2.mlstatic.com https://*.mlstatic.com";

const csp = [
  // Padrão fechado: o que não estiver liberado explicitamente abaixo, cai.
  diretiva("default-src", "'self'"),

  // Impede que HTML injetado mude a base das URLs relativas da página.
  diretiva("base-uri", "'self'"),

  // Nada de <object>, <embed> ou <applet>. O site não usa nenhum dos três.
  diretiva("object-src", "'none'"),

  // O site não pode ser embutido em iframe de ninguém — é a defesa contra
  // clickjacking. Vale junto com o X-Frame-Options mais abaixo, que é o mesmo
  // recado para navegador antigo.
  diretiva("frame-ancestors", "'none'"),

  // Formulário só envia para o próprio site. O Checkout Pro do Mercado Pago
  // recebe a pessoa por navegação (init_point), não por POST de formulário,
  // mas os domínios entram junto quando ele está ligado: se o fluxo mudar para
  // um POST de retorno, o CSP não vira o culpado misterioso.
  diretiva("form-action", "'self'", usaMercadoPago && MP_FRAME),

  /*
   * script-src
   *
   * `'unsafe-inline'` é obrigatório sem nonce: o App Router injeta os dados do
   * RSC em <script> inline (`self.__next_f.push(...)`) em toda página, e sem
   * essa permissão a hidratação não acontece — a página aparece e nada
   * funciona. Ver o bloco de comentário no topo do arquivo.
   *
   * `'unsafe-eval'` só em desenvolvimento: o React usa `eval` para reconstruir
   * a pilha de erro do servidor no navegador. Em produção nem o React nem o
   * Next usam.
   */
  diretiva(
    "script-src",
    "'self'",
    "'unsafe-inline'",
    emDesenvolvimento && "'unsafe-eval'",
    usaMercadoPago && MP_SCRIPT,
  ),

  /*
   * style-src
   *
   * `'unsafe-inline'` cobre dois usos legítimos: o <style> que o `next/font`
   * injeta e os `style={{ ... }}` do React (galeria de produto, Toaster,
   * barras de progresso do envio de arquivo). Atributo de estilo é regido por
   * `style-src-attr`, que herda daqui — nonce não resolveria esse caso.
   *
   * `fonts.googleapis.com` é a folha de estilo do Google Fonts. O `next/font`
   * baixa as fontes em tempo de build e serve do próprio domínio, então em tese
   * não é usada; fica liberada porque uma página do CMS pode trazer um <link>
   * de fonte e não vale quebrar a página por isso.
   */
  diretiva("style-src", "'self'", "'unsafe-inline'", "https://fonts.googleapis.com"),

  /*
   * img-src
   *
   * `data:` é o captcha em SVG e os ícones embutidos; `blob:` é a prévia local
   * do arquivo antes do envio (`EnviarArquivo` cria object URL). O Blob é onde
   * ficam as fotos de produto em produção — em desenvolvimento elas caem em
   * `public/uploads`, que é 'self'.
   */
  diretiva("img-src", "'self'", "data:", "blob:", BLOB, usaMercadoPago && MP_IMG),

  // As fontes do `next/font` saem de /_next/static/media, ou seja, 'self'.
  // O gstatic acompanha o googleapis do style-src pelo mesmo motivo.
  diretiva("font-src", "'self'", "data:", "https://fonts.gstatic.com"),

  /*
   * connect-src
   *
   * `viacep.com.br` é a busca de endereço por CEP, que o `CampoCep` do kit de
   * UI faz direto do navegador. Sem essa linha, o campo de CEP para de
   * completar o endereço sozinho — sem erro visível para o usuário.
   *
   * Em desenvolvimento entram o websocket e o host do Turbopack, senão o
   * recarregamento automático morre.
   */
  diretiva(
    "connect-src",
    "'self'",
    "https://viacep.com.br",
    BLOB,
    usaMercadoPago && MP_API,
    emDesenvolvimento && "ws:",
    emDesenvolvimento && "http://localhost:*",
  ),

  diretiva("media-src", "'self'", "blob:", BLOB),

  /*
   * frame-src
   *
   * O mapa da página de contato é um <iframe> de
   * `https://www.google.com/maps/embed` (o endereço vem da configuração
   * `maps_embed`, em `@/lib/settings`). Sem esta linha, o mapa fica em branco.
   */
  diretiva(
    "frame-src",
    "'self'",
    "https://www.google.com",
    "https://maps.google.com",
    usaMercadoPago && MP_FRAME,
  ),

  // Nenhum service worker hoje; `blob:` cobre worker criado por biblioteca.
  diretiva("worker-src", "'self'", "blob:"),

  diretiva("manifest-src", "'self'"),

  // Em produção, qualquer sub-recurso pedido em http é buscado em https.
  // Fora de produção ficaria no caminho do http://localhost.
  emProducao && "upgrade-insecure-requests",
]
  .filter((linha): linha is string => Boolean(linha))
  .join("; ");

/**
 * Cabeçalhos aplicados a todas as respostas.
 *
 * Os que dependem da rota (não-cacheável e noindex nas áreas privadas) ficam no
 * `proxy.ts`, que enxerga o caminho pedido.
 */
const cabecalhos = [
  { key: "Content-Security-Policy", value: csp },

  // Navegador antigo que não entende frame-ancestors ainda entende isto.
  { key: "X-Frame-Options", value: "DENY" },

  // Impede o navegador de adivinhar o tipo de um arquivo e executar como script
  // algo que foi servido como texto — importante por causa dos uploads.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Mesma origem recebe a URL inteira; site externo recebe só o domínio. Evita
  // vazar caminho de pedido ou de chamado no `Referer` de um link clicado.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  /*
   * Permissions-Policy
   *
   * Desliga o que o site não usa. `camera=(self)` fica ligado para a própria
   * origem porque o envio de foto do equipamento pelo celular usa
   * `<input type="file" capture>`, e `payment=(self)` porque a API de pagamento
   * do navegador pode ser usada pelo provedor no futuro — as duas restritas ao
   * próprio domínio, nunca a terceiro.
   */
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=(self)",
      "display-capture=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=(self)",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
];

/*
 * HSTS só em produção.
 *
 * Em desenvolvimento o site roda em http://localhost; um HSTS vazado para lá
 * faria o navegador insistir em https no localhost e o ambiente pararia de
 * abrir — e a única saída seria limpar o cache de HSTS na mão.
 *
 * `preload` NÃO está incluído de propósito. Entrar na lista de preload dos
 * navegadores é praticamente irreversível e vale para todos os subdomínios;
 * é uma decisão da JB, não do código. Quando todos os subdomínios estiverem em
 * https, basta acrescentar "; preload" e submeter o domínio.
 */
if (emProducao) {
  cabecalhos.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  // O Prisma faz acesso dinâmico ao sistema de arquivos; deixá-lo fora do
  // bundle evita que o rastreamento arraste a pasta public inteira para o
  // pacote do servidor.
  serverExternalPackages: ["@prisma/client", "sharp"],

  images: {
    /*
     * De onde o otimizador de imagem pode buscar arquivo remoto.
     *
     * Só o Vercel Blob, que é para onde `@/lib/upload` grava quando existe
     * `BLOB_READ_WRITE_TOKEN`. Sem esta lista, `<Image src="https://...">`
     * responde 400 e a foto do produto some em produção.
     *
     * A lista é curta por segurança: cada domínio aqui vira um endereço que
     * qualquer pessoa pode mandar o servidor buscar e redimensionar.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
    // SVG remoto pode carregar script; o otimizador não deve tocar em nenhum.
    dangerouslyAllowSVG: false,
  },

  async headers() {
    // `/(.*)` é a forma que a própria documentação usa para "toda resposta".
    return [{ source: "/(.*)", headers: cabecalhos }];
  },
};

export default nextConfig;
