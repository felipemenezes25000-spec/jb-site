import { BadgeCheck, PlugZap, ShieldCheck, Truck, Wrench } from "lucide-react";

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
  const candidatos: (ItemConfianca | null)[] = [
    certificado ? { icone: BadgeCheck, titulo: "Inspecionado pela JB" } : null,
    garantiaMeses
      ? {
          icone: ShieldCheck,
          titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia`,
        }
      : null,
    { icone: Wrench, titulo: "Assistência técnica própria" },
    temFrete ? { icone: Truck, titulo: "Entrega por CEP" } : null,
    temInstalacao ? { icone: PlugZap, titulo: "Instalação disponível" } : null,
  ];
  const itens = candidatos.filter((item): item is ItemConfianca => item !== null).slice(0, 4);
  const colunas =
    itens.length === 1
      ? "lg:grid-cols-1"
      : itens.length === 2
        ? "lg:grid-cols-2"
        : itens.length === 3
          ? "lg:grid-cols-3"
          : "lg:grid-cols-4";

  if (itens.length === 0) return null;

  return (
    <div className="border-y border-graf-200 bg-graf-50/55">
      <ul
        aria-label="Confiança desta compra"
        className={`container-jb scrollbar-none flex max-w-[112rem] snap-x gap-2 overflow-x-auto py-2.5 sm:grid sm:grid-cols-2 sm:gap-0 sm:overflow-visible sm:py-0 ${colunas}`}
      >
        {itens.map((item, indice) => {
          const Icone = item.icone;
          return (
            <li
              key={item.titulo}
              className={`flex min-h-11 shrink-0 snap-start items-center gap-2.5 rounded-full border border-graf-200 bg-white px-3.5 py-2 sm:min-h-14 sm:shrink sm:rounded-none sm:border-0 sm:bg-transparent sm:px-4 sm:py-3 ${
                indice > 0 ? "sm:border-l" : ""
              } ${indice === 2 ? "sm:border-t lg:border-t-0" : ""}`}
            >
              <Icone className="size-4 shrink-0 text-jb-600" aria-hidden />
              <span className="whitespace-nowrap text-[0.8125rem] font-semibold text-graf-800 sm:whitespace-normal sm:text-sm">
                {item.titulo}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
