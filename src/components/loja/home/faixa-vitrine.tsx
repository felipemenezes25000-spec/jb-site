import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { GradeVitrine } from "@/components/loja/card-vitrine";
import { TituloSecao } from "@/components/ui/data";
import { Secao, type FundoSecao } from "@/components/ui/secao";

/* ============================================================================
   Faixa de vitrine — a fileira de equipamentos com cabeçalho

   É a peça que mais se repete na home: ofertas, seminovos, procurados e o que
   a clínica costuma repor no carrinho. Antes cada uma trazia a sua própria
   casca — `<section>` com respiro escrito à mão, container com teto próprio e
   um cabeçalho copiado três vezes. O resultado aparecia em medição: títulos
   começando em 40px numa faixa e em 120px na seguinte, respiro de 56px ao
   lado de respiro de 64px, e o rótulo em caixa alta a 11px onde o design
   system pede 13.

   Agora a casca é `Secao` (fundo, respiro e caixa da loja) e o cabeçalho é
   `TituloSecao` (o degrau sobretítulo → título → apoio). Quem monta a faixa
   escolhe o que ela diz, não como ela é espaçada.
   ============================================================================ */

export function FaixaVitrine({
  sobretitulo,
  titulo,
  descricao,
  href,
  rotuloDoLink,
  produtos,
  parcelamento,
  colunas,
  fundo = "branco",
  className,
}: {
  sobretitulo: string;
  titulo: string;
  /** Linha de apoio. Opcional: faixa de oferta vive bem sem ela. */
  descricao?: string;
  href: string;
  rotuloDoLink: string;
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
  colunas?: Parameters<typeof GradeVitrine>[0]["colunas"];
  fundo?: Extract<FundoSecao, "branco" | "clara">;
  className?: string;
}) {
  if (produtos.length === 0) return null;

  return (
    <Secao fundo={fundo} largura="loja" espaco="sm" separador className={className}>
      <TituloSecao
        sobretitulo={sobretitulo}
        titulo={titulo}
        descricao={descricao}
        className="border-b border-graf-200 pb-6"
        acao={
          <Link
            href={href}
            className="foco-jb inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-900"
          >
            {rotuloDoLink}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />

      <GradeVitrine
        produtos={produtos}
        parcelamento={parcelamento}
        colunas={colunas ?? { base: 1, sm: 2, lg: 4 }}
        className="mt-8"
      />
    </Secao>
  );
}
