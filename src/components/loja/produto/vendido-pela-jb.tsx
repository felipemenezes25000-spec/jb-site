import Link from "next/link";
import {
  BadgeCheck,
  FileText,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

type Props = {
  empresa: string;
  desde: string;
  cidade: string;
  uf: string;
  garantiaMeses?: number | null;
};

export function VendidoPelaJB({ empresa, desde, cidade, uf, garantiaMeses }: Props) {
  const praca = [cidade.trim(), uf.trim()].filter(Boolean).join(" · ");
  const anos = Number.parseInt(desde, 10);

  const provas = [
    garantiaMeses && garantiaMeses > 0
      ? {
          icone: ShieldCheck,
          texto: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia JB neste equipamento`,
        }
      : null,
    {
      icone: Wrench,
      texto: "Assistência técnica própria depois da compra",
    },
    {
      icone: Truck,
      texto: "Frete e prazo confirmados antes do pagamento",
    },
    {
      icone: FileText,
      texto: "Venda com nota fiscal",
    },
  ].filter((item) => item !== null);

  return (
    <section
      aria-label="Quem vende este produto"
      className="overflow-hidden rounded-2xl border border-graf-200 bg-graf-50/65"
    >
      <div className="border-b border-graf-200 bg-white px-4 py-3.5">
        <p className="micro text-graf-500">Compra protegida pela própria JB</p>
        <p className="mt-1 text-sm leading-5 text-graf-600">
          Vendido e entregue por{" "}
          <span className="font-extrabold text-graf-950">{empresa}</span>
        </p>
      </div>

      <ul className="grid gap-2 px-4 py-3.5">
        {provas.map(({ icone: Icone, texto }) => (
          <li key={texto} className="texto-apoio flex items-start gap-2.5 text-graf-600">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-jb-700 shadow-sm ring-1 ring-graf-200">
              <Icone className="size-3.5" aria-hidden />
            </span>
            <span>{texto}.</span>
          </li>
        ))}

        <li className="texto-apoio flex items-start gap-2.5 text-graf-600">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-jb-700 shadow-sm ring-1 ring-graf-200">
            <RotateCcw className="size-3.5" aria-hidden />
          </span>
          <span>Direito de arrependimento em 7 dias nas compras elegíveis pelo CDC.</span>
        </li>

        {Number.isFinite(anos) ? (
          <li className="texto-apoio flex items-start gap-2.5 text-graf-600">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-jb-700 shadow-sm ring-1 ring-graf-200">
              <BadgeCheck className="size-3.5" aria-hidden />
            </span>
            <span>Atuação no mercado odontológico desde {anos}.</span>
          </li>
        ) : null}

        {praca ? (
          <li className="texto-apoio flex items-start gap-2.5 text-graf-600">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-jb-700 shadow-sm ring-1 ring-graf-200">
              <MapPin className="size-3.5" aria-hidden />
            </span>
            <span>Base técnica em {praca}.</span>
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap gap-x-4 border-t border-graf-200 bg-white px-4 py-2.5">
        <Link
          href="/sobre"
          className="foco-jb texto-apoio inline-flex min-h-9 items-center font-bold text-jb-700 hover:text-jb-800"
        >
          Conhecer a JB
        </Link>
        <Link
          href="/assistencia-tecnica"
          className="foco-jb texto-apoio inline-flex min-h-9 items-center font-bold text-graf-600 hover:text-graf-950"
        >
          Ver assistência técnica
        </Link>
      </div>
    </section>
  );
}
