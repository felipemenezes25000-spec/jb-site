import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import { Etiqueta } from "@/components/ui/data";
import { Grade, colunasAte, type ColunasPorTela } from "@/components/ui/grade";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

/* ============================================================================
   Cartão de produto

   É a peça mais repetida da loja: aparece na home, na vitrine, na busca, na
   página do produto e nos favoritos. A ordem de leitura é sempre a mesma —
   imagem, condição, marca, nome, preço, parcelamento, disponibilidade e o
   convite para abrir o equipamento.

   A foto manda. Equipamento de alto valor não pode aparecer como miniatura no
   meio de uma caixa vazia: a moldura mantém proporção estável e a imagem usa o
   máximo da área disponível sem cortar o equipamento.
   ============================================================================ */

export type ProdutoCard = {
  slug: string;
  name: string;
  model: string;
  condition: "novo" | "seminovo" | "usado" | "recondicionado";
  priceCents: number;
  compareAtCents: number | null;
  allowDirectPurchase: boolean;
  trackInventory: boolean;
  stock: number;
  unique: boolean;
  brandName: string | null;
  imageUrl: string | null;
  imageAlt: string;
};

/**
 * Regras de parcelamento da loja, vindas de `getSettings`. Quem renderiza em
 * Server Component passa os valores reais; sem isso vale o padrão de
 * `calcularParcelas`, que é o mesmo do cadastro inicial.
 */
export type Parcelamento = { max: number; minimoCents: number };

/** Rótulo e tom de cada condição. Texto sempre presente — nunca só a cor. */
export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "neutro" as const },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" as const },
  usado: { rotulo: "Usado", tom: "neutro" as const },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" as const },
};

/** Uma frase curta sobre a disponibilidade — ou nada, quando não se sabe. */
function disponibilidade(produto: ProdutoCard) {
  if (!produto.trackInventory) return null;
  if (produto.stock <= 0) {
    return {
      texto: produto.unique ? "Unidade vendida" : "Indisponível",
      classe: "text-graf-500",
      pontoClasse: "bg-graf-400",
    };
  }
  if (produto.unique) {
    return { texto: "Unidade única", classe: "text-jb-700", pontoClasse: "bg-jb-500" };
  }
  if (produto.stock <= 3) {
    return {
      texto: `Últimas ${produto.stock} unidades`,
      classe: "text-warn-700",
      pontoClasse: "bg-warn-500",
    };
  }
  return { texto: "Em estoque", classe: "text-ok-700", pontoClasse: "bg-ok-500" };
}

export function CardProduto({
  produto,
  prioridade,
  parcelamento,
  chamadaDestacada,
  className,
}: {
  produto: ProdutoCard;
  /** Carrega a imagem sem esperar — só nos primeiros cartões da primeira dobra. */
  prioridade?: boolean;
  parcelamento?: Parcelamento;
  /**
   * Transforma o convite do rodapé em botão cheio.
   *
   * Nas coleções comerciais (/loja e /seminovos) o cartão é o produto inteiro
   * na tela e o botão fecha a leitura; nas faixas de apoio — relacionados,
   * vistos recentemente, favoritos — ele competiria com o botão real da
   * página. O texto do botão é sempre `chamada`, então produto sob orçamento
   * continua convidando a pedir orçamento, e não a "ver detalhes".
   */
  chamadaDestacada?: boolean;
  className?: string;
}) {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents);
  const condicao = CONDICAO[produto.condition];
  const estado = disponibilidade(produto);
  const imagemLocal = Boolean(produto.imageUrl?.startsWith("/"));

  const precoAnterior =
    !soOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;

  const desconto =
    !semEstoque && precoAnterior
      ? Math.round(((precoAnterior - produto.priceCents) / precoAnterior) * 100)
      : 0;

  const chamada = soOrcamento ? "Pedir orçamento" : "Ver detalhes";

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-xl border border-graf-200 bg-white",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out-quint",
        "hover:-translate-y-px hover:border-graf-300 hover:shadow-raised",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-raised",
        className,
      )}
    >
      <div
        data-palco-imagem-produto
        className="relative aspect-5/4 max-h-72 overflow-hidden bg-graf-50/40"
      >
        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            unoptimized={imagemLocal}
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 46vw, (max-width: 1536px) 30vw, 25vw"
            className={cn(
              "object-contain p-1 transition-transform duration-500 ease-out-quint sm:p-1.5",
              "group-hover:scale-[1.025]",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          /* Produto sem foto não pode virar um buraco no meio da grade. A
             moldura mantém a mesma altura dos outros cartões e diz o que
             falta — quadro vazio parece imagem quebrada, e o cartão inteiro
             passa a parecer desligado. */
          <div className="flex size-full flex-col items-center justify-center gap-2.5 text-graf-500">
            <span className="flex size-12 items-center justify-center rounded-full border border-graf-200 bg-white/70 text-graf-400">
              <ImageOff className="size-5" aria-hidden />
            </span>
            <span className="text-[0.8125rem] font-semibold text-graf-500">Foto em cadastro</span>
          </div>
        )}

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <span className="flex flex-wrap items-start gap-1.5">
            <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          </span>
          <BotaoComparar slug={produto.slug} nome={produto.name} />
        </div>

        {semEstoque ? (
          <p
            aria-hidden
            className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-graf-950/90 py-2 text-center text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-white"
          >
            {produto.unique ? "Vendido" : "Indisponível"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-graf-100 p-4 sm:p-5">
        {produto.brandName ? (
          <p className="mb-1.5 truncate text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
            {produto.brandName}
          </p>
        ) : null}

        <h3 className="line-2 min-h-11 text-base font-bold leading-snug text-graf-950 sm:min-h-[3.125rem] sm:text-lg">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-xs after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="mt-1 truncate text-[0.8125rem] text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex h-6 items-center gap-2">
            {precoAnterior ? (
              <span className="tabular text-[0.8125rem] text-graf-500 line-through">
                {formatarPreco(precoAnterior)}
              </span>
            ) : null}
            {desconto >= 5 ? (
              <Etiqueta tom="ok" className="px-2 py-0.5 text-xs">
                −{desconto}%
              </Etiqueta>
            ) : null}
          </div>

          {soOrcamento ? (
            <p className="text-xl font-extrabold leading-8 tracking-tight text-graf-950">
              Sob orçamento
            </p>
          ) : (
            <p className="tabular text-2xl font-extrabold leading-8 tracking-tight text-graf-950">
              {formatarPreco(produto.priceCents)}
            </p>
          )}

          <div className="flex h-5 items-center">
            {soOrcamento ? (
              <span className="truncate text-[0.8125rem] text-graf-500">
                A equipe responde com preço e prazo.
              </span>
            ) : parcelas ? (
              <span className="tabular truncate text-[0.8125rem] text-graf-500">
                em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </span>
            ) : null}
          </div>

          <div className="mt-4 border-t border-graf-100 pt-3">
            <div className="flex h-6 items-center justify-between gap-3">
              {estado ? (
                <span
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold",
                    estado.classe,
                  )}
                >
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", estado.pontoClasse)}
                    aria-hidden
                  />
                  <span className="truncate">{estado.texto}</span>
                </span>
              ) : (
                <span aria-hidden />
              )}

              {chamadaDestacada ? null : (
                <span
                  aria-hidden
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-bold text-graf-800",
                    "transition-colors duration-150 group-hover:text-jb-600",
                  )}
                >
                  {chamada}
                  <ArrowRight className="size-4 shrink-0 transition-transform duration-200 ease-out-quint group-hover:translate-x-0.5" />
                </span>
              )}
            </div>

            {chamadaDestacada ? (
              <span
                aria-hidden
                className={cn(
                  "mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3",
                  "bg-gradient-to-b from-jb-500 to-jb-600 text-[0.8125rem] font-extrabold text-white",
                  "shadow-[0_10px_20px_-14px_rgb(196_14_21_/_0.65)] transition-colors duration-150",
                  "group-hover:from-jb-600 group-hover:to-jb-700",
                  semEstoque && "from-graf-400 to-graf-500 shadow-none",
                )}
              >
                {chamada}
                <ArrowRight className="size-4 shrink-0 transition-transform duration-200 ease-out-quint group-hover:translate-x-0.5" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Larguras máximas para lista curta.
 *
 * Fechar a fileira resolve o buraco ao lado do cartão órfão, mas sozinho cria
 * outro: um único produto ocupando a coluna inteira vira cartaz, com a foto
 * ampliada muito além do que o arquivo aguenta. O teto devolve ao cartão a
 * largura que ele teria numa grade cheia.
 */
const LARGURA_LISTA_CURTA: Record<number, string> = {
  1: "sm:max-w-sm",
  2: "sm:max-w-3xl",
};

/** Vitrine de cartões. Uma coluna no celular — equipamento caro pede leitura confortável. */
export function GradeProdutos({
  produtos,
  colunas,
  parcelamento,
  chamadaDestacada,
  extra,
  className,
}: {
  produtos: ProdutoCard[];
  colunas?: ColunasPorTela;
  parcelamento?: Parcelamento;
  /** Repassado a cada cartão — ver `CardProduto`. */
  chamadaDestacada?: boolean;
  /** Célula final da grade — entra na conta das colunas, como um cartão. */
  extra?: React.ReactNode;
  className?: string;
}) {
  const teto = colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 };
  const celulas = produtos.length + (extra ? 1 : 0);

  return (
    <Grade
      como="ul"
      espaco="md"
      /* A quantidade que veio do banco escolhe a grade: catálogo pequeno não
         pode desenhar colunas vazias ao lado do único produto publicado. */
      colunas={colunasAte(celulas, teto)}
      /* Com a célula extra a fileira já fecha sozinha: limitar a largura aí
         só devolveria, à direita, o vazio que a célula veio tapar. */
      className={cn(extra ? undefined : LARGURA_LISTA_CURTA[celulas], className)}
    >
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardProduto
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            chamadaDestacada={chamadaDestacada}
            className="w-full"
          />
        </li>
      ))}

      {extra ? <li className="flex">{extra}</li> : null}
    </Grade>
  );
}
