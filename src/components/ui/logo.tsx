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

/**
 * Dimensões reais dos arquivos, conferidas com sharp.
 *
 * Estavam codificadas como 900x499 e 481x497 — números que não batiam com os
 * arquivos (640x355 e 256x265). A diferença aparecia no arredondamento: a
 * altura calculada não fechava com a proporção real e o Next avisava, a cada
 * renderização, que só uma das dimensões estava sob controle.
 *
 * O padrão correto é este: os atributos carregam o tamanho intrínseco, e o
 * tamanho de exibição vem do CSS com o outro eixo em `auto`.
 */
const LOGO = { largura: 640, altura: 355 };
const SIMBOLO = { largura: 256, altura: 265 };

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
      width={LOGO.largura}
      height={LOGO.altura}
      priority={prioridade}
      style={{ height: altura, width: "auto" }}
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
      style={{ height: tamanho, width: "auto" }}
      className={cn("select-none", className)}
    />
  );
}
