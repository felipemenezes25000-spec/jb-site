import { PlugZap, ShieldCheck, Wrench } from "lucide-react";

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
  garantiaMeses,
  temInstalacao,
}: Props) {
  const itens: ItemConfianca[] = [
    ...(garantiaMeses
      ? [{
          icone: ShieldCheck,
          titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia`,
        }]
      : []),
    { icone: Wrench, titulo: "Assistência técnica própria" },
    ...(temInstalacao ? [{ icone: PlugZap, titulo: "Instalação disponível" }] : []),
  ].slice(0, 3);

  if (itens.length === 0) return null;

  return (
    <div className="border-y border-graf-150 bg-white">
      <ul
        aria-label="Benefícios desta compra"
        className="container-jb scrollbar-none flex max-w-[100rem] items-center gap-0 overflow-x-auto py-2 sm:justify-center sm:overflow-visible"
      >
        {itens.map((item, indice) => {
          const Icone = item.icone;
          return (
            <li
              key={item.titulo}
              className={`flex min-h-10 shrink-0 items-center gap-2 px-3 text-xs font-semibold text-graf-700 sm:px-5 sm:text-[0.8125rem] ${
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
