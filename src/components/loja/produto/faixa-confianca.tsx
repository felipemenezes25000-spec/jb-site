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
  texto: string;
};

export function FaixaConfianca({
  certificado,
  garantiaMeses,
  temFrete,
  temInstalacao,
}: Props) {
  const itens: ItemConfianca[] = [
    ...(certificado
      ? [
          {
            icone: BadgeCheck,
            titulo: "Unidade inspecionada",
            texto: "Certificação JB verificável",
          },
        ]
      : []),
    ...(garantiaMeses && garantiaMeses > 0
      ? [
          {
            icone: ShieldCheck,
            titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia`,
            texto: "Cobertura informada nesta ficha",
          },
        ]
      : []),
    {
      icone: Wrench,
      titulo: "Assistência técnica própria",
      texto: "A mesma equipe acompanha o pós-venda",
    },
    ...(temInstalacao
      ? [
          {
            icone: PlugZap,
            titulo: "Instalação disponível",
            texto: "Preparação e execução pela JB",
          },
        ]
      : []),
    ...(temFrete
      ? [
          {
            icone: Truck,
            titulo: "Entrega planejada",
            texto: "Frete e prazo antes do pagamento",
          },
        ]
      : []),
  ].slice(0, 4);

  if (itens.length === 0) return null;

  return (
    <section aria-label="Benefícios desta compra" className="border-y border-graf-200 bg-graf-50/75">
      <div className="container-loja grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {itens.map(({ icone: Icone, titulo, texto }) => (
          <div
            key={titulo}
            className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-graf-200/80"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-700">
              <Icone className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm font-extrabold text-graf-950">{titulo}</strong>
              <span className="mt-0.5 block text-xs leading-4 text-graf-500">{texto}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
