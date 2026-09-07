import { NextResponse, type NextRequest } from "next/server";

/**
 * Carrega o caminho pedido para dentro da renderização.
 *
 * Um layout do App Router não recebe a URL da requisição, e é o layout de
 * `/minha-jb` que barra quem não está logado. Sem esse dado ele só podia
 * mandar todo mundo para `/entrar?voltar=/minha-jb`: quem clicava num link
 * direto para os pedidos era devolvido à raiz da área, embora a tela de login
 * prometesse continuar de onde parou. As páginas até passavam o destino
 * certo, mas o layout resolve antes e o redirecionamento dele é o que vale.
 *
 * O cabeçalho é lido por `exigirCliente` quando nenhum destino é passado à
 * mão. O `matcher` mantém isto restrito à área da clínica — não há motivo
 * para pesar cada requisição do catálogo com um middleware.
 */
export const CABECALHO_CAMINHO = "x-caminho-pedido";

export function middleware(pedido: NextRequest) {
  const cabecalhos = new Headers(pedido.headers);
  cabecalhos.set(CABECALHO_CAMINHO, pedido.nextUrl.pathname + pedido.nextUrl.search);

  return NextResponse.next({ request: { headers: cabecalhos } });
}

export const config = {
  matcher: ["/minha-jb/:path*"],
};
