import Image from "next/image";

import { cn } from "@/lib/utils";

/* ============================================================================
   Raio-X: o scanner que atravessa a foto

   Uma faixa grafite cruza a foto da esquerda para a direita e, dentro dela,
   aparecem os traços do próprio equipamento (a "planta", gerada da foto real
   por `scripts/gerar-raiox.mjs`). Fora da faixa, a foto continua a foto.

   Só `transform`: a faixa anda para a direita e a planta, dentro dela, anda
   para a esquerda na mesma medida, então os traços ficam parados sobre o
   equipamento enquanto a janela passa. Nada é refeito quadro a quadro.

   Quem dispara é o quadro da foto, por `data-raiox` (o desenho mora em
   `acabamento.css`, o movimento em `site.css`):
   · `abertura` (home e landings): no computador, uma vez na chegada, porque
     a foto está na primeira dobra; no celular, onde a foto vem depois dos
     botões, pela rolagem, quando ela cruza o meio da tela;
   · `cartao`: no computador, a cada vez que o mouse entra; no celular, pela
     rolagem.
   Com `lente`, o computador ganha também uma lupa de raio-X que segue o
   mouse (o quadro precisa de `data-luz`). Movimento reduzido: só a lente.

   Tudo aqui é `aria-hidden`: o scanner não informa nada que a foto e o texto
   alternativo já não digam.
   ============================================================================ */

export type ModoRaioX = "abertura" | "cartao";

export function CamadasRaioX({
  planta,
  encaixe = "absolute inset-0",
  ajuste = "object-contain",
  posicao,
  lente = false,
  rotulo = "Raio-X",
}: {
  /** Traços da foto, de `plantaDaFoto`. */
  planta: string;
  /** Caixa onde a foto está dentro do quadro: a planta ocupa a mesma. */
  encaixe?: string;
  /** Mesmo `object-fit` da foto, para os traços caírem em cima dela. */
  ajuste?: string;
  /** Mesmo `object-position` da foto, quando ela não é centrada. */
  posicao?: string;
  lente?: boolean;
  rotulo?: string;
}) {
  const desenho = (
    <span className={encaixe}>
      <Image
        src={planta}
        alt=""
        fill
        unoptimized
        draggable={false}
        className={cn("jb-raiox-tracos", ajuste)}
        style={posicao ? { objectPosition: posicao } : undefined}
      />
    </span>
  );

  return (
    <>
      {/* A faixa anda; a janela recorta e escurece; o feixe (o `::after` da
          faixa) fica fora da janela para o brilho não ser cortado. */}
      <span aria-hidden className="jb-raiox-faixa">
        <span className="jb-raiox-janela">
          <span className="jb-raiox-planta">{desenho}</span>
          <span className="jb-raiox-rotulo">{rotulo}</span>
        </span>
      </span>
      {lente ? (
        <>
          <span aria-hidden className="jb-raiox-lente">
            {desenho}
          </span>
          <span aria-hidden className="jb-raiox-mira" />
        </>
      ) : null}
    </>
  );
}
