import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Marca oficial da JB — sempre o arquivo real, nunca redesenhada em CSS/SVG.
 *
 * `completa` traz símbolo + monograma (header, rodapé, documentos).
 * `simbolo` traz só o emblema circular (favicon, avatar, espaços apertados).
 *
 * A proporção é preservada pelo próprio next/image; o respiro fica por conta
 * de quem posiciona, com a altura definida aqui.
 */

const PROPORCAO_COMPLETA = 900 / 499;
const PROPORCAO_SIMBOLO = 481 / 497;

export function Logo({
  className,
  altura = 40,
  prioridade,
}: {
  className?: string;
  altura?: number;
  prioridade?: boolean;
}) {
  return (
    <Image
      src="/marca/jb-logo.webp"
      alt="JB Soluções Odontológicas"
      width={Math.round(altura * PROPORCAO_COMPLETA)}
      height={altura}
      priority={prioridade}
      className={cn("h-auto w-auto select-none", className)}
      style={{ height: altura }}
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
      width={Math.round(tamanho * PROPORCAO_SIMBOLO)}
      height={tamanho}
      priority={prioridade}
      className={cn("select-none", className)}
      style={{ height: tamanho }}
    />
  );
}
