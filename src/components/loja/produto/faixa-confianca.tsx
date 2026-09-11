import { BadgeCheck, PlugZap, ShieldCheck, Truck, Wrench } from "lucide-react";

/* ============================================================================
   Faixa de confiança

   `certificado` e `temFrete` estavam no tipo, eram passados pela ficha de
   produto e a função desestruturava só `garantiaMeses` e `temInstalacao`: dois
   sinais de confiança chegavam e eram descartados em silêncio. Agora os quatro
   entram, na ordem em que pesam para quem compra equipamento — a inspeção
   registrada é o argumento mais raro, e por isso vem primeiro quando existe.

   O corte em quatro itens continua: a faixa é uma linha, não uma seção.
   ============================================================================ */

type Props = {
  certificado: boolean;
  garantiaMeses: number | null;
  temFrete: boolean;
  temInstalacao: boolean;
};

type ItemConfianca = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
};

export function FaixaConfianca({
  certificado,
  garantiaMeses,
  temFrete,
  temInstalacao,
}: Props) {
  const itens: ItemConfianca[] = [
    ...(certificado
      ? [{ icone: BadgeCheck, titulo: "Inspeção registrada por técnico" }]
      : []),
    ...(garantiaMeses
      ? [
          {
            icone: ShieldCheck,
            titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia`,
          },
        ]
      : []),
    { icone: Wrench, titulo: "Assistência técnica própria" },
    ...(temInstalacao ? [{ icone: PlugZap, titulo: "Instalação disponível" }] : []),
    ...(temFrete ? [{ icone: Truck, titulo: "Frete calculado por CEP" }] : []),
  ].slice(0, 4);

  if (itens.length === 0) return null;

  return (
    <div className="border-y border-graf-150 bg-white">
      {/* `tabIndex` porque no celular a faixa rola na horizontal e nenhum dos
          itens é focável: sem isto, quem navega por teclado não alcança o que
          passa da borda (axe `scrollable-region-focusable`, grave). A partir
          de `sm` a faixa cabe inteira e o `overflow` some, mas a parada de
          tabulação é barata perto de esconder conteúdo do teclado. */}
      <ul
        aria-label="Benefícios desta compra"
        tabIndex={0}
        className="foco-jb container-jb scrollbar-none flex max-w-[100rem] items-center gap-0 overflow-x-auto py-2 sm:justify-center sm:overflow-visible"
      >
        {itens.map((item, indice) => {
          const Icone = item.icone;
          return (
            <li
              key={item.titulo}
              className={`texto-apoio flex min-h-10 shrink-0 items-center gap-2 px-3 font-semibold text-graf-700 sm:px-5 ${
                indice > 0 ? "border-l border-graf-200" : ""
              }`}
            >
              <Icone className="size-4 shrink-0 text-jb-600" aria-hidden />
              <span className="whitespace-nowrap">{item.titulo}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
