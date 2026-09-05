import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { Etiqueta, TituloSecao } from "@/components/ui/data";
import { Grade, colunasParaTotal } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import {
  BlocoPreco,
  CONDICAO_HOME,
  disponibilidadeDe,
  fotoDe,
  lerParcelamento,
  SELECAO_HOME,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Equipamentos em destaque

   Cartão grande, imagem dominante e só a informação que ajuda a decidir:
   condição, marca, nome, modelo, preço, parcela calculada e disponibilidade.
   Sem badge inventado, sem contador de visitas, sem selo que o dado não
   sustenta.

   Quando ainda não há nada marcado como destaque no painel, a faixa mostra o
   que entrou por último — e diz isso no título, em vez de fingir curadoria.
   ============================================================================ */

const PUBLICADO = { status: "active" } as const;

async function carregar() {
  const marcados = await prisma.product.findMany({
    where: { ...PUBLICADO, featured: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: SELECAO_HOME,
  });

  if (marcados.length > 0) return { produtos: marcados, curados: true };

  const recentes = await prisma.product.findMany({
    where: PUBLICADO,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: SELECAO_HOME,
  });

  return { produtos: recentes, curados: false };
}

export async function SecaoDestaques() {
  const [{ produtos, curados }, s] = await Promise.all([carregar(), getSettings()]);
  if (produtos.length === 0) return null;

  const parcelamento = lerParcelamento(s);

  return (
    <Secao fundo="clara" espaco="lg" separador>
      <TituloSecao
        sobretitulo={curados ? "Em destaque" : "Novidades"}
        titulo={curados ? "Escolhidos pela equipe técnica" : "Últimos equipamentos publicados"}
        descricao={
          curados
            ? "Os equipamentos que a JB põe à frente agora, com preço e disponibilidade atualizados."
            : "O que entrou no catálogo por último, com preço e disponibilidade atualizados."
        }
        acao={
          <Link
            href="/loja"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-jb-700 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            Ver todo o catálogo
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        }
        className="mb-10"
      />

      <Grade colunas={colunasParaTotal(produtos.length)} espaco="md" como="ul">
        {produtos.map((produto) => (
          <li key={produto.slug} className="flex">
            <CartaoDestaque produto={produto} parcelamento={parcelamento} />
          </li>
        ))}
      </Grade>
    </Secao>
  );
}

/**
 * O cartão inteiro é o link: um alvo grande, um único ponto de tabulação e o
 * nome acessível montado a partir do próprio conteúdo.
 */
export function CartaoDestaque({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];
  const estado = disponibilidadeDe(produto);
  const esgotado = produto.trackInventory && produto.stock <= 0;

  const desconto =
    produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? Math.round(
          ((produto.compareAtCents - produto.priceCents) / produto.compareAtCents) * 100,
        )
      : 0;

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-gradient-to-b from-white to-graf-50">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
            className={cn(
              "object-contain p-7 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] sm:p-8",
              esgotado && "opacity-60 grayscale",
            )}
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-graf-300"
          >
            <ImageOff className="size-10" />
          </span>
        )}

        <span className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {desconto >= 5 && !esgotado ? <Etiqueta tom="ok">−{desconto}%</Etiqueta> : null}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {produto.brand ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
            {produto.brand.name}
          </p>
        ) : null}

        <h3 className="mt-1.5 line-2 text-lg font-bold leading-snug text-graf-950 group-hover:text-jb-700">
          {produto.name}
        </h3>

        {produto.model ? (
          <p className="mt-1 truncate text-sm text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-6">
          <BlocoPreco produto={produto} parcelamento={parcelamento} />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-graf-100 pt-4">
            <Etiqueta tom={estado.tom} ponto>
              {estado.texto}
            </Etiqueta>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
              Ver equipamento
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
