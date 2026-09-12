import Link from "next/link";
import { BadgeCheck, FileText, MapPin, RotateCcw, ShieldCheck, Truck, Wrench } from "lucide-react";

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
  /** Garantia deste equipamento, em meses. Sai da ficha, não é promessa fixa. */
  garantiaMeses?: number | null;
};

export function VendidoPelaJB({ empresa, desde, cidade, uf, garantiaMeses }: Props) {
  const praca = [cidade.trim(), uf.trim()].filter(Boolean).join(" · ");
  const anos = Number.parseInt(desde, 10);

  return (
    <section
      aria-label="Quem vende este produto"
      className="border-t border-hairline pt-4"
    >
      <p className="texto-apoio text-graf-500">
        Vendido e entregue por{" "}
        <span className="font-extrabold text-graf-950">{empresa}</span>
      </p>

      {/* Cinco linhas, não três.

          Faltavam as três que quem gasta quinze mil reais procura antes de
          clicar: o prazo da garantia DESTE equipamento, o direito de
          arrependimento e a nota fiscal. As duas últimas valem para qualquer
          venda desta loja — arrependimento é o artigo 49 do CDC, e nota fiscal
          é obrigação de quem vende com CNPJ —, então não são promessa: são o
          que já acontece, escrito onde a decisão é tomada. */}
      <ul className="mt-3 space-y-2">
        {garantiaMeses && garantiaMeses > 0 ? (
          <li className="texto-apoio flex items-start gap-2 text-graf-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
            <span>
              {garantiaMeses} {garantiaMeses === 1 ? "mês" : "meses"} de garantia JB neste
              equipamento.
            </span>
          </li>
        ) : null}
        <li className="texto-apoio flex items-start gap-2 text-graf-600">
          <Wrench className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>Assistência técnica própria — a mesma equipe que instala atende depois.</span>
        </li>
        <li className="texto-apoio flex items-start gap-2 text-graf-600">
          <Truck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>Frete e prazo definidos antes do pagamento.</span>
        </li>
        <li className="texto-apoio flex items-start gap-2 text-graf-600">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>Troca em 7 dias por arrependimento, como manda o CDC.</span>
        </li>
        <li className="texto-apoio flex items-start gap-2 text-graf-600">
          <FileText className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
          <span>Venda com nota fiscal.</span>
        </li>
        {Number.isFinite(anos) ? (
          <li className="texto-apoio flex items-start gap-2 text-graf-600">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
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
