import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  FileText,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type Props = {
  empresa: string;
  desde: string;
  cidade: string;
  uf: string;
  garantiaMeses?: number | null;
};

type Prova = {
  icone: LucideIcon;
  titulo: string;
  texto: string;
};

export function VendidoPelaJB({ empresa, desde, cidade, uf, garantiaMeses }: Props) {
  const praca = [cidade.trim(), uf.trim()].filter(Boolean).join(" · ");
  const anos = Number.parseInt(desde, 10);

  const provasPrincipais: Prova[] = [
    garantiaMeses && garantiaMeses > 0
      ? {
          icone: ShieldCheck,
          titulo: "Garantia JB registrada",
          texto: "Prazo e cobertura declarados nesta ficha",
        }
      : null,
    {
      icone: Wrench,
      titulo: "Assistência própria",
      texto: "A mesma equipe acompanha o equipamento depois",
    },
    {
      icone: Truck,
      titulo: "Entrega combinada antes",
      texto: "Frete e prazo são confirmados antes do pagamento",
    },
    {
      icone: FileText,
      titulo: "Nota fiscal",
      texto: "Venda formalizada pela JB",
    },
  ].filter((item): item is Prova => item !== null);

  return (
    <section
      aria-label="Quem vende este produto"
      className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-[0_12px_30px_-30px_rgba(15,23,42,0.4)]"
    >
      <div className="border-b border-graf-200 bg-graf-50/70 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-jb-700 ring-1 ring-graf-200">
            <BadgeCheck className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="micro text-graf-500">Procedência e pós-venda</p>
            <p className="mt-0.5 text-sm leading-5 text-graf-600">
              Vendido, entregue e assistido por{" "}
              <span className="font-extrabold text-graf-950">{empresa}</span>
            </p>
          </div>
        </div>
      </div>

      <ul className="grid gap-0 px-4">
        {provasPrincipais.map(({ icone: Icone, titulo, texto }, indice) => (
          <li
            key={titulo}
            className={`flex items-start gap-3 py-3 ${indice > 0 ? "border-t border-graf-100" : ""}`}
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
              <Icone className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0">
              <strong className="block text-xs font-extrabold text-graf-900">{titulo}</strong>
              {/* 12px é o piso de texto corrido do portão de responsividade;
                  estas quatro linhas estavam em 11px em toda largura. */}
              <span className="mt-0.5 block text-[0.75rem] leading-4 text-graf-500">
                {texto}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <details className="group border-t border-graf-200">
        <summary className="foco-jb flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-bold text-graf-600 transition-colors hover:bg-graf-50 hover:text-graf-900 [&::-webkit-details-marker]:hidden">
          Mais segurança da compra
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-2.5 border-t border-graf-100 bg-graf-50/45 px-4 py-3.5">
          <p className="flex items-start gap-2.5 text-xs leading-5 text-graf-600">
            <RotateCcw className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
            <span>Direito de arrependimento em 7 dias nas compras elegíveis pelo CDC.</span>
          </p>
          {Number.isFinite(anos) ? (
            <p className="flex items-start gap-2.5 text-xs leading-5 text-graf-600">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
              <span>Atuação no mercado odontológico desde {anos}.</span>
            </p>
          ) : null}
          {praca ? (
            <p className="flex items-start gap-2.5 text-xs leading-5 text-graf-600">
              <MapPin className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
              <span>Base técnica em {praca}.</span>
            </p>
          ) : null}
        </div>
      </details>

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
