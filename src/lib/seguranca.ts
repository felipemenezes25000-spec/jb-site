import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

/**
 * Utilidades de segurança usadas pelas rotas, ações e formulários públicos.
 *
 * Três responsabilidades, todas pequenas e sem estado em banco:
 *
 *  1. descobrir o IP real de quem chamou, atrás de proxy;
 *  2. comparar segredos sem vazar informação pelo tempo de resposta;
 *  3. proteger formulário público contra requisição forjada de outro site
 *     (CSRF) e validar o caminho de volta depois do login.
 *
 * O que este arquivo NÃO faz: limite de taxa (isso é `@/lib/limite`), sessão
 * (é `@/lib/auth` e `@/lib/auth-cliente`) e sanitização de HTML (é `@/lib/html`).
 *
 * `proxy.ts` na raiz do projeto propositalmente não importa nada daqui. A
 * documentação do Next é explícita ao dizer que o proxy roda separado do código
 * de renderização e não deve depender de módulos compartilhados
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * Por isso os nomes de cookie aparecem duplicados lá — com comentário apontando
 * para cá.
 */

/* ------------------------------------------------------------------ cookies */

/**
 * Nomes dos cookies de sessão.
 *
 * Espelham as constantes privadas de `@/lib/auth` (`jb_staff`) e
 * `@/lib/auth-cliente` (`jb_cliente`), que não são exportadas. Quem mexer
 * naqueles arquivos precisa mexer aqui e no `proxy.ts` também.
 */
export const COOKIE_STAFF = "jb_staff";
export const COOKIE_CLIENTE = "jb_cliente";

/* ----------------------------------------------------------------------- ip */

/**
 * Cabeçalhos que carregam o IP de origem, em ordem de confiança.
 *
 * `x-vercel-forwarded-for` é escrito pela borda da Vercel e não pode ser
 * falsificado pelo cliente; `x-forwarded-for` pode, quando a aplicação roda sem
 * proxy reverso na frente. Por isso a ordem importa: o valor mais confiável do
 * ambiente atual vem primeiro.
 */
const CABECALHOS_DE_IP = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
] as const;

/** Tira colchetes de IPv6 e a porta que alguns proxies grudam no fim. */
function limparIp(bruto: string) {
  const valor = bruto.trim();
  if (!valor) return "";

  // [2001:db8::1]:443 → 2001:db8::1
  const comColchete = valor.match(/^\[([^\]]+)\]/);
  if (comColchete) return comColchete[1];

  // IPv6 sem colchete tem vários ":" e nunca leva porta nesse formato
  if (valor.split(":").length > 2) return valor;

  // 203.0.113.7:53124 → 203.0.113.7
  return valor.split(":")[0] ?? "";
}

/**
 * IP de quem fez a requisição, ou string vazia quando não dá para saber.
 *
 * Aceita tanto um `Request` (route handler, proxy) quanto o `Headers` já lido
 * por `await headers()` numa Server Action.
 *
 * Nunca devolve "desconhecido" nem um valor inventado: string vazia é resposta
 * honesta, e quem usa isso para limitar taxa precisa decidir o que fazer com
 * ela — normalmente cair para uma chave por sessão ou por e-mail.
 */
export function ipDoPedido(fonte: Request | Headers): string {
  const cabecalhos = fonte instanceof Headers ? fonte : fonte.headers;

  for (const nome of CABECALHOS_DE_IP) {
    const bruto = cabecalhos.get(nome);
    if (!bruto) continue;
    // a lista é "cliente, proxy1, proxy2" — o primeiro é o cliente
    const primeiro = limparIp(bruto.split(",")[0] ?? "");
    if (primeiro) return primeiro;
  }

  return "";
}

/* -------------------------------------------------------------- comparação */

/**
 * Compara dois segredos em tempo constante.
 *
 * `a === b` sai no primeiro caractere diferente, e a diferença de tempo entre
 * "errou na primeira letra" e "errou na última" é medível pela rede. Comparar
 * os resumos SHA-256 resolve dois problemas de uma vez: o tempo não depende do
 * conteúdo e as duas entradas passam a ter sempre 32 bytes, então
 * `timingSafeEqual` não estoura com tamanhos diferentes.
 */
export function comparacaoConstante(a: string, b: string): boolean {
  const resumoA = crypto.createHash("sha256").update(a, "utf8").digest();
  const resumoB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(resumoA, resumoB);
}

/* ------------------------------------------------------------------ destino */

/**
 * Caminho interno seguro para redirecionar depois do login.
 *
 * Só passa caminho que começa com uma única barra. Isso barra o clássico
 * `?destino=//site-falso.com` (que o navegador entende como URL absoluta),
 * `https://…`, `javascript:` e qualquer coisa com barra invertida — o Windows e
 * alguns navegadores normalizam `\` para `/`.
 *
 * Retorna `padrao` quando a entrada não serve, nunca `null`, para o chamador
 * não precisar tratar ausência.
 */
export function sanitizarDestino(caminho: unknown, padrao = "/"): string {
  if (typeof caminho !== "string") return padrao;

  const valor = caminho.trim();
  if (!valor) return padrao;
  if (!valor.startsWith("/")) return padrao;
  if (valor.startsWith("//")) return padrao;
  if (valor.includes("\\")) return padrao;
  // caractere de controle — inclusive nova linha, que quebraria o cabeçalho
  // Location — não tem o que fazer numa URL de volta
  for (let i = 0; i < valor.length; i += 1) {
    const codigo = valor.charCodeAt(i);
    if (codigo < 0x20 || codigo === 0x7f) return padrao;
  }

  return valor;
}

/* --------------------------------------------------------------------- csrf */

/** Nome do campo escondido que carrega o token no formulário. */
export const CAMPO_CSRF = "csrf";

/** O token vale por 8 horas; a validação aceita também a janela anterior. */
const JANELA_CSRF_MS = 8 * 60 * 60 * 1000;

function segredoCsrf() {
  const base = process.env.AUTH_SECRET;
  if (!base) throw new Error("AUTH_SECRET ausente no ambiente");
  // chave derivada, distinta da que assina as sessões
  return `${base}:csrf`;
}

/**
 * Âncora do token: o valor do cookie de sessão de quem está pedindo.
 *
 * É isto que amarra o token a uma pessoa. Um site atacante consegue fazer o
 * navegador da vítima enviar os cookies dela, mas não consegue LER o cookie
 * (é `httpOnly` e de outra origem) — então não consegue produzir um token que
 * bata com a sessão dela.
 *
 * Sem sessão, a âncora é "anonimo". Isso é deliberado e vale entender: para
 * visitante anônimo o token é previsível, e não protege nada. Também não
 * precisa: CSRF só faz sentido quando a requisição forjada carrega autoridade,
 * e sessão nenhuma significa autoridade nenhuma. Formulário público que precisa
 * de freio contra robô usa o captcha de `/api/captcha` e `@/lib/limite`.
 */
async function ancoraDaSessao() {
  const jar = await cookies();
  const sessao = jar.get(COOKIE_STAFF)?.value ?? jar.get(COOKIE_CLIENTE)?.value ?? "anonimo";
  return crypto.createHash("sha256").update(sessao, "utf8").digest("hex");
}

function assinarJanela(ancora: string, janela: number) {
  return crypto
    .createHmac("sha256", segredoCsrf())
    .update(`${ancora}.${janela}`, "utf8")
    .digest("base64url");
}

/**
 * Token para colocar num campo escondido do formulário.
 *
 * ```tsx
 * <input type="hidden" name={CAMPO_CSRF} value={await tokenCsrf()} />
 * ```
 *
 * Só lê cookie, nunca escreve — pode ser chamado de Server Component, onde
 * escrever cookie lançaria erro.
 *
 * Server Actions do Next já checam `Origin` contra `Host` sozinhas; este token
 * é a segunda tranca, e a primeira para os `route handlers` de POST, que não
 * têm essa checagem embutida.
 */
export async function tokenCsrf(): Promise<string> {
  const ancora = await ancoraDaSessao();
  const janela = Math.floor(Date.now() / JANELA_CSRF_MS);
  return `${janela}.${assinarJanela(ancora, janela)}`;
}

/**
 * Confere o token recebido do formulário.
 *
 * Aceita a janela atual e a imediatamente anterior, para o visitante que abriu
 * a página às 07h59 e enviou às 08h01 não levar erro na cara.
 */
export async function validarCsrf(token: unknown): Promise<boolean> {
  if (typeof token !== "string" || !token.includes(".")) return false;

  const separador = token.indexOf(".");
  const janela = Number(token.slice(0, separador));
  const assinatura = token.slice(separador + 1);
  if (!Number.isInteger(janela) || !assinatura) return false;

  const agora = Math.floor(Date.now() / JANELA_CSRF_MS);
  if (janela !== agora && janela !== agora - 1) return false;

  const ancora = await ancoraDaSessao();
  return comparacaoConstante(assinatura, assinarJanela(ancora, janela));
}

/**
 * Lê e valida o token direto do `FormData`, que é o formato que chega numa
 * Server Action ou num `request.formData()`.
 */
export async function validarCsrfDoFormulario(dados: FormData): Promise<boolean> {
  return validarCsrf(dados.get(CAMPO_CSRF));
}

/* ------------------------------------------------------------------- origem */

function hostDaUrl(bruto: string) {
  try {
    return new URL(bruto).host.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * A requisição saiu do próprio site?
 *
 * É a checagem que o Next faz nas Server Actions e que os `route handlers` de
 * POST precisam fazer na mão. Sem `Origin` e sem `Referer` a resposta é `false`:
 * numa requisição de navegador com efeito colateral, pelo menos um dos dois
 * sempre chega.
 *
 * `x-forwarded-host` vem antes de `host` porque atrás de proxy reverso o `host`
 * costuma ser o do servidor interno, não o domínio que a pessoa digitou.
 */
export function mesmaOrigem(request: Request): boolean {
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).toLowerCase();
  if (!host) return false;

  const origem = request.headers.get("origin");
  if (origem) return hostDaUrl(origem) === host;

  const referer = request.headers.get("referer");
  if (referer) return hostDaUrl(referer) === host;

  return false;
}
