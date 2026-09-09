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
    temFrete ? { icone: Truck, titulo: "Entrega calculada por CEP" } : null,
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

  return (
    <div className="border-y border-graf-200 bg-graf-50/55">
      <ul
        aria-label="Confiança desta compra"
        className={`container-jb grid max-w-[112rem] sm:grid-cols-2 ${colunas}`}
      >
        {itens.map((item, indice) => {
          const Icone = item.icone;
          return (
            <li
              key={item.titulo}
              className={`flex min-h-16 items-center gap-3 border-graf-200 px-4 py-3 ${
                indice > 0 ? "border-t sm:border-l sm:border-t-0" : ""
              } ${indice === 2 ? "sm:border-t lg:border-t-0" : ""}`}
            >
              <Icone className="size-4 shrink-0 text-jb-600" aria-hidden />
              <span className="text-sm font-semibold text-graf-800">{item.titulo}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
