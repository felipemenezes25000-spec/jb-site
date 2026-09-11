import Link from "next/link";
import { MapPin, ShieldCheck, Wrench } from "lucide-react";

/* ============================================================================
   Quem vende, entrega e assiste

   A primeira dobra não dizia quem é o vendedor. Numa loja de vendedor único
   isso parece óbvio de dentro, mas é justamente o dado que quem gasta R$ 15
   mil procura — e as fichas medidas como referência colocam essa linha em
   posição fixa: a Kabum imprime "Vendido e entregue por: KaBuM!" logo abaixo
   do `h1`, o Mercado Livre e a Amazon carregam vendedor e "enviado por" dentro
   da caixa de compra.

   Aqui ela fica no pé da caixa de compra, e não sob o título, porque o
   argumento da JB não é só "quem vende": é que quem vende é quem instala e
   quem conserta depois. Esse é o diferencial que a home inteira promete, e ele
   pertence ao lado da decisão de compra.

   Filete e texto — sem cartão, sem ícone grande, sem faixa colorida. É
   informação de procedência, não banner.
   ============================================================================ */

type Props = {
  empresa: string;
  desde: string;
  cidade: string;
  uf: string;
};

export function VendidoPelaJB({ empresa, desde, cidade, uf }: Props) {
  const praca = [cidade.trim(), uf.trim()].filter(Boolean).join(" · ");
  const anos = Number.parseInt(desde, 10);

  return (
    <section
      aria-label="Quem vende este produto"
      className="border-t border-graf-150 pt-4"
    >
      <p className="texto-apoio text-graf-500">
        Vendido e entregue por{" "}
        <span className="font-extrabold text-graf-950">{empresa}</span>
      </p>

      <ul className="mt-3 space-y-2">
        <li className="texto-apoio flex items-start gap-2 text-graf-600">
          <Wrench className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>Assistência técnica própria — a mesma equipe que instala atende depois.</span>
        </li>
        {Number.isFinite(anos) ? (
          <li className="texto-apoio flex items-start gap-2 text-graf-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
            <span>No mercado odontológico desde {anos}.</span>
          </li>
        ) : null}
        {praca ? (
          <li className="texto-apoio flex items-start gap-2 text-graf-600">
            <MapPin className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
            <span>Base técnica em {praca}.</span>
          </li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-4">
        <Link
          href="/sobre"
          className="foco-jb texto-apoio inline-flex min-h-9 items-center font-bold text-jb-700 hover:text-jb-800"
        >
          Sobre a JB
        </Link>
        <Link
          href="/assistencia-tecnica"
          className="foco-jb texto-apoio inline-flex min-h-9 items-center font-bold text-graf-600 hover:text-graf-950"
        >
          Assistência técnica
        </Link>
      </div>
    </section>
  );
}
