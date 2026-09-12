import Image from "next/image";
import Link from "next/link";
import { Heart, ImageOff, ShoppingCart } from "lucide-react";

import { adicionarAoCarrinhoDoCartao } from "@/app/acoes/carrinho";
import { alternarFavorito } from "@/app/acoes/minha-jb";
import { BotaoComparar } from "@/components/loja/comparador-cliente";
import { Etiqueta } from "@/components/ui/data";
import { Grade, colunasAte, type ColunasPorTela } from "@/components/ui/grade";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

export type ProdutoCard = {
  /** Chave do produto — usada por quem precisa agir sobre ele (guardar, etc.). */
  id: string;
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

export type Parcelamento = { max: number; minimoCents: number };

export const CONDICAO = {
  novo: { rotulo: "Novo", tom: "neutro" as const },
  seminovo: { rotulo: "Seminovo JB", tom: "marca" as const },
  usado: { rotulo: "Usado", tom: "neutro" as const },
  recondicionado: { rotulo: "Recondicionado JB", tom: "alerta" as const },
};

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
  className,
}: {
  produto: ProdutoCard;
  prioridade?: boolean;
  parcelamento?: Parcelamento;
  className?: string;
}) {
  const semEstoque = produto.trackInventory && produto.stock <= 0;
  const soOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento?.max, parcelamento?.minimoCents);
  const condicao = CONDICAO[produto.condition];
  const estado = disponibilidade(produto);
  const precoAnterior =
    !soOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;
  const desconto =
    !semEstoque && precoAnterior
      ? Math.round(((precoAnterior - produto.priceCents) / precoAnterior) * 100)
      : 0;
  const chamada = soOrcamento ? "Pedir orçamento" : "Ver equipamento";

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-lg border border-graf-200 bg-surface",
        "transition-[border-color,box-shadow] duration-300",
        "hover:border-graf-300 hover:shadow-card",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-card",
        className,
      )}
    >
      {/* Foto quadrada sobre branco, centrada e com folga — o equipamento
          aparece inteiro em vez de preencher a caixa. A moldura cinza que
          existia aqui punha um fundo por baixo de um recorte que já é
          transparente. */}
      <div data-palco-imagem-produto className="relative overflow-hidden bg-surface p-4">
        {/* Condição e desconto empilhados no mesmo canto: são as duas
            informações que fazem alguém parar no cartão, e separadas em
            cantos opostos obrigavam a varrer a foto. */}
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
          {desconto >= 5 ? (
            <span className="micro rounded-sm bg-jb-500 px-2 py-1 leading-none text-white">
              −{desconto}%
            </span>
          ) : null}
        </div>

        <div className="absolute top-3 right-3 z-10">
          <BotaoComparar slug={produto.slug} nome={produto.name} />
        </div>

        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            width={512}
            height={512}
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            sizes="(max-width: 640px) 60vw, 12rem"
            className={cn(
              "mx-auto aspect-square w-full max-w-[12rem] object-contain",
              "transition-transform duration-500 group-hover:scale-105",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-[12rem] flex-col items-center justify-center gap-2 text-graf-500">
            <span className="flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-400">
              <ImageOff className="size-5" aria-hidden />
            </span>
            <span className="micro">Foto em cadastro</span>
          </div>
        )}

        {semEstoque ? (
          <p className="micro absolute inset-x-0 bottom-0 z-10 bg-graf-950/90 py-2 text-center text-white">
            {produto.unique ? "Vendido" : "Indisponível"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-graf-200 p-4">
        {produto.brandName ? (
          <p className="micro truncate text-graf-500">{produto.brandName}</p>
        ) : null}

        <h3 className="mt-2 line-clamp-2 min-h-10 text-[0.98rem] leading-snug font-bold text-graf-950">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-xs after:absolute after:inset-0 after:content-[''] hover:text-jb-700"
          >
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="micro mt-1 truncate text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          {precoAnterior ? (
            <p className="micro tabular text-graf-500 line-through">
              {formatarPreco(precoAnterior)}
            </p>
          ) : null}

          <p className="tabular text-[1.4rem] leading-tight font-black text-graf-950">
            {soOrcamento ? "Sob orçamento" : formatarPreco(produto.priceCents)}
          </p>

          <p className="micro tabular min-h-5 truncate text-graf-500">
            {soOrcamento
              ? "Preço e prazo com a equipe JB"
              : parcelas
                ? `${parcelas.parcelas}x de ${formatarPreco(parcelas.valorCents)} sem juros`
                : "Pagamento à vista"}
          </p>

          {estado ? (
            <p className={cn("micro mt-2 inline-flex items-center gap-1.5", estado.classe)}>
              <span className={cn("size-1.5 shrink-0 rounded-full", estado.pontoClasse)} aria-hidden />
              {estado.texto}
            </p>
          ) : null}
        </div>

        {/* Linha de ações.

            Os três botões redondos ficam ACIMA da camada que torna o cartão
            inteiro clicável (`z-10` contra o `after:inset-0` do título) — sem
            isso, um clique no coração abriria a ficha do produto.

            O que o desenho de referência traz aqui e não entrou: a nota de
            avaliação, que lá é um hash do slug — avaliação inventada —, e o
            "no Pix", que lá é 5% fixo. Esta loja tem avaliação de verdade,
            só que por SKU e cara demais para vinte e quatro cartões numa
            página; e desconto no Pix ela não tem. */}
        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/loja/${produto.slug}`}
            className="foco-jb relative z-10 inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-graf-200 px-3 text-apoio font-bold text-graf-950 transition-colors hover:border-jb-500 hover:text-jb-700"
          >
            {chamada}
          </Link>

          {!soOrcamento && !semEstoque ? (
            <form action={adicionarAoCarrinhoDoCartao} className="relative z-10">
              <input type="hidden" name="produtoId" value={produto.id} />
              <input type="hidden" name="quantidade" value="1" />
              <button
                type="submit"
                aria-label={`Adicionar ${produto.name} ao carrinho`}
                className="foco-jb grid min-h-11 min-w-11 place-items-center rounded-md border border-jb-500 bg-jb-500 text-white transition-colors hover:bg-jb-600"
              >
                <ShoppingCart className="size-4" aria-hidden />
              </button>
            </form>
          ) : null}

          <form action={alternarFavorito} className="relative z-10">
            <input type="hidden" name="produtoId" value={produto.id} />
            <button
              type="submit"
              aria-label={`Guardar ${produto.name} nos favoritos`}
              className="foco-jb grid min-h-11 min-w-11 place-items-center rounded-md border border-graf-200 text-graf-700 transition-colors hover:border-jb-500 hover:text-jb-700"
            >
              <Heart className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

const LARGURA_LISTA_CURTA: Record<number, string> = {
  1: "sm:max-w-sm",
  2: "sm:max-w-3xl",
};

export function GradeProdutos({
  produtos,
  colunas,
  parcelamento,
  extra,
  className,
}: {
  produtos: ProdutoCard[];
  colunas?: ColunasPorTela;
  parcelamento?: Parcelamento;
  extra?: React.ReactNode;
  className?: string;
}) {
  const teto = colunas ?? { base: 1, sm: 2, lg: 3, xl: 4 };
  const celulas = produtos.length + (extra ? 1 : 0);

  return (
    <Grade
      como="ul"
      espaco="md"
      colunas={colunasAte(celulas, teto)}
      className={cn(extra ? undefined : LARGURA_LISTA_CURTA[celulas], className)}
    >
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardProduto
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            className="w-full"
          />
        </li>
      ))}

      {extra ? <li className="flex">{extra}</li> : null}
    </Grade>
  );
}
