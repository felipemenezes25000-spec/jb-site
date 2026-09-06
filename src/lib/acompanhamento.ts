import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

/* ============================================================================
   Acompanhamento de pedido por cookie assinado

   O cookie `jb_pedidos` guarda os números dos últimos pedidos fechados NESTE
   navegador. Ele existe para abrir `/pedido/[numero]` sem sessão.

   Por que ele continua existindo depois de a compra passar a exigir conta:

     • os pedidos de visitantes fechados antes daquela mudança ainda dependem
       dele — e o escopo manda preservar esse acesso;
     • ele cobre a janela entre fechar a compra e a sessão expirar.

   A assinatura é obrigatória. Cookie é dado do cliente: sem HMAC bastaria
   digitar o número de outra pessoa no devtools para ler o pedido dela. O
   formato do valor é `n1.n2~assinatura`.

   Este módulo existe porque a escrita (no checkout) e a leitura (na página do
   pedido) precisam concordar sobre o formato e sobre o segredo. Enquanto eram
   duas cópias, um comentário pedia que elas "andassem juntas" — o que é o
   mesmo que não ter garantia nenhuma.
   ============================================================================ */

const COOKIE = "jb_pedidos";
const DURACAO = 60 * 60 * 24 * 30; // 30 dias
const MAXIMO = 10;

function assinar(lista: string) {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET ausente no ambiente");
  return crypto.createHmac("sha256", `${segredo}:pedido`).update(lista).digest("base64url");
}

/**
 * Comparação em tempo constante.
 *
 * `===` sobre a assinatura vaza, pelo tempo de resposta, quantos caracteres
 * iniciais estavam certos — o suficiente para forjar um HMAC caractere a
 * caractere com pedidos repetidos. O comprimento é conferido antes porque
 * `timingSafeEqual` lança com tamanhos diferentes.
 */
function assinaturaConfere(lista: string, assinatura: string) {
  const esperada = assinar(lista);
  if (assinatura.length !== esperada.length) return false;
  return crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada));
}

/** Números guardados neste navegador. Assinatura inválida devolve lista vazia. */
export function numerosDoCookie(bruto: string | undefined): string[] {
  if (!bruto) return [];
  const separador = bruto.lastIndexOf("~");
  if (separador <= 0) return [];
  const lista = bruto.slice(0, separador);
  return assinaturaConfere(lista, bruto.slice(separador + 1)) ? lista.split(".") : [];
}

/** Lê direto do jar de cookies da requisição. */
export async function pedidosDoNavegador(): Promise<string[]> {
  const jar = await cookies();
  return numerosDoCookie(jar.get(COOKIE)?.value);
}

/** Dá a este navegador o direito de ver o pedido recém-aberto. */
export async function liberarAcompanhamento(numero: string) {
  const jar = await cookies();
  const anteriores = numerosDoCookie(jar.get(COOKIE)?.value);
  const lista = [numero, ...anteriores.filter((n) => n !== numero)]
    .slice(0, MAXIMO)
    .join(".");

  jar.set(COOKIE, `${lista}~${assinar(lista)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO,
  });
}

/**
 * Apaga o cookie. Chamado no logout.
 *
 * Em computador compartilhado, o pedido de quem saiu não pode continuar
 * aberto para quem entrar depois. Quem comprou como visitante antes da
 * exigência de conta recupera o acesso pela conferência de e-mail da própria
 * página do pedido, que tem freio de tentativas e regrava o cookie.
 */
export async function esquecerPedidosDoNavegador() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
