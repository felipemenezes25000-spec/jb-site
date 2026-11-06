import { Fragment } from "react";

import { cn } from "@/lib/utils";

/* ============================================================================
   O título que se conserta

   "Equipamento parou?" chega torto, cada palavra num ângulo, como peça fora
   do lugar. Logo depois "A JB assume daqui." entra e a pergunta encaixa, com
   um tranco curto de peça que trava na posição. Uma vez, na chegada, e
   acabou: nada se mexe em laço acima da dobra.

   Só `transform`, e nunca `opacity`: o título é o maior texto da primeira
   dobra (o LCP), e ele aparece pintado desde o primeiro quadro — torto, mas
   legível. O texto continua o mesmo para leitor de tela e para quem copia:
   as palavras são `span`s com os espaços entre elas, e mais nada.

   Os ângulos são fixos, não sorteados: servidor e navegador desenham igual,
   e a peça quebra sempre do mesmo jeito.
   ============================================================================ */

const DESALINHO = [
  { r: "-7deg", x: "-0.05em", y: "0.16em" },
  { r: "9deg", x: "0.06em", y: "0.34em" },
  { r: "-5deg", x: "0.02em", y: "0.2em" },
  { r: "6deg", x: "-0.03em", y: "0.28em" },
] as const;

export function TituloConserto({
  id,
  pergunta,
  resposta,
  className,
}: {
  id: string;
  pergunta: string;
  resposta: string;
  className?: string;
}) {
  const palavras = pergunta.split(" ");

  return (
    <h1 id={id} className={cn("jb-conserto", className)}>
      <span className="block">
        {palavras.map((palavra, indice) => {
          const torto = DESALINHO[indice % DESALINHO.length];
          return (
            <Fragment key={`${palavra}-${indice}`}>
              {indice > 0 ? " " : null}
              <span
                className="jb-conserto-peca"
                style={
                  {
                    "--r": torto.r,
                    "--x": torto.x,
                    "--y": torto.y,
                    "--d": `${indice * 40}ms`,
                  } as React.CSSProperties
                }
              >
                {palavra}
              </span>
            </Fragment>
          );
        })}
      </span>{" "}
      <span className="jb-conserto-resposta block text-jb-600">{resposta}</span>
    </h1>
  );
}
