import Image from "next/image";

import { cn } from "@/lib/utils";

/** Marca oficial da JB — sempre o arquivo real, nunca redesenhada em CSS/SVG. */

const LOGO = { largura: 640, altura: 355 };
const SIMBOLO = { largura: 256, altura: 265 };

export function Logo({
  className,
  altura = 40,
  alturaMinima,
  prioridade,
}: {
  className?: string;
  altura?: number;
  /**
   * Quando informada, a logo escala entre este valor e `altura` conforme a
   * viewport. Útil no cabeçalho mobile: uma única imagem responsiva evita
   * manter logo completa e símbolo escondidos ao mesmo tempo.
   */
  alturaMinima?: number;
  prioridade?: boolean;
}) {
  const alturaCss = alturaMinima
    ? `clamp(${alturaMinima}px, 4vw, ${altura}px)`
    : altura;

  return (
    <Image
      src="/marca/jb-logo.webp"
      alt="JB Soluções Odontológicas"
      width={LOGO.largura}
      height={LOGO.altura}
      priority={prioridade}
      sizes={`${Math.ceil((altura * LOGO.largura) / LOGO.altura) * 2}px`}
      style={{ height: alturaCss, width: "auto" }}
      className={cn("select-none", className)}
    />
  );
}

export function Simbolo({
  className,
  tamanho = 32,
  prioridade,
}: {
  className?: string;
  tamanho?: number;
  prioridade?: boolean;
}) {
  return (
    <Image
      src="/marca/jb-simbolo.webp"
      alt=""
      aria-hidden
      width={SIMBOLO.largura}
      height={SIMBOLO.altura}
      priority={prioridade}
      sizes={`${tamanho * 2}px`}
      style={{ height: tamanho, width: "auto" }}
      className={cn("select-none", className)}
    />
  );
}
