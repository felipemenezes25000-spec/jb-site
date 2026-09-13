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
            titulo: "Inspeção verificável",
            texto: "Certificação ligada à unidade física",
          },
        ]
      : []),
    ...(garantiaMeses && garantiaMeses > 0
      ? [
          {
            icone: ShieldCheck,
            titulo: "Garantia JB por escrito",
            texto: "Prazo e cobertura declarados na ficha",
          },
        ]
      : []),
    {
      icone: Wrench,
      titulo: "Assistência técnica própria",
      texto: "Quem vende também acompanha o pós-venda",
    },
    ...(temInstalacao
      ? [
          {
            icone: PlugZap,
            titulo: "Instalação disponível",
            texto: "Preparação e execução pela equipe JB",
          },
        ]
      : []),
    ...(temFrete
      ? [
          {
            icone: Truck,
            titulo: "Entrega planejada",
            texto: "Frete e prazo definidos antes do pagamento",
          },
        ]
      : []),
  ].slice(0, 4);

  if (itens.length === 0) return null;

  return (
    <section
      aria-label="Benefícios desta compra"
      className="border-y border-graf-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.85),rgba(255,255,255,0.96))]"
    >
      <div className="container-loja grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {itens.map(({ icone: Icone, titulo, texto }) => (
          <div
            key={titulo}
            className="group flex min-w-0 items-center gap-3 rounded-2xl border border-graf-200/90 bg-white px-4 py-3.5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-jb-100 hover:shadow-card"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700 ring-1 ring-jb-100/70 transition-colors group-hover:bg-jb-100/70">
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
