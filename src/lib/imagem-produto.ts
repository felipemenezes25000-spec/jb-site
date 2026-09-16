/**
 * Aponta as fotos demonstrativas para seus recortes com transparência real.
 *
 * O banco continua guardando a mídia original, útil para administração e
 * exportação. Na vitrine, porém, o JPG de estúdio é substituído pelo PNG
 * recortado sem depender de composição CSS ou da cor do fundo do card.
 */
export function imagemProdutoSemFundo(url: string): string;
export function imagemProdutoSemFundo(url: null): null;
export function imagemProdutoSemFundo(url: undefined): undefined;
export function imagemProdutoSemFundo(url: string | null | undefined) {
  if (!url) return url;

  return url.replace(
    /^\/catalogo-demo\/([^/?#]+)\.jpe?g(?=$|[?#])/i,
    "/catalogo-demo/sem-fundo/$1.png",
  );
}
