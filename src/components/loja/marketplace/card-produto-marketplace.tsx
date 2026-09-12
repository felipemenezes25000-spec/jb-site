import Image from "next/image";
import Link from "next/link";
import { Heart, ImageOff, ShoppingCart } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import type {
  ParcelamentoMarketplace,
  ProdutoMarketplaceCard,
} from "@/components/loja/marketplace/tipos";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { adicionarAoCarrinhoDoCartao } from "@/app/acoes/carrinho";
import { alternarFavorito } from "@/app/acoes/minha-jb";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

import styles from "./marketplace.module.css";

const CONDICAO: Record<ProdutoMarketplaceCard["condition"], string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

function disponibilidade(produto: ProdutoMarketplaceCard) {
  if (produto.trackInventory && produto.stock <= 0) {
    return produto.unique ? "Unidade vendida" : "Indisponível";
  }
  if (produto.unique) return "Unidade única";
  return produto.trackInventory ? "Em estoque" : "Disponível";
}

export function CardProdutoMarketplace({
  produto,
  parcelamento,
  prioridade,
  favoritado = false,
  voltar,
}: {
  produto: ProdutoMarketplaceCard;
  parcelamento: ParcelamentoMarketplace;
  prioridade?: boolean;
  /** Já guardado por quem está logado. */
  favoritado?: boolean;
  /** Endereço desta listagem, para o formulário voltar para cá. */
  voltar?: string;
}) {
  const indisponivel = produto.trackInventory && produto.stock <= 0;
  const sobOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = sobOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento.max, parcelamento.minimoCents);
  const anterior =
    !sobOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;
  const desconto = anterior
    ? Math.round(((anterior - produto.priceCents) / anterior) * 100)
    : 0;
  const destaques = produto.destaques.slice(0, 2);

  return (
    <article
      data-marketplace-card
      className={`${styles.card} group relative flex w-full flex-col overflow-hidden`}
    >
      {/* Foto quadrada sobre branco, centrada e com folga. Era 4/3 sobre um
          degradê rosado: o degradê aparecia por baixo de recortes que já são
          transparentes, e o 4/3 cortava equipamento alto. */}
      <div data-palco-imagem-produto className="relative overflow-hidden bg-surface p-4">
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
          <span className="micro rounded-sm border border-graf-200 bg-white/95 px-2 py-1 leading-none text-graf-700 shadow-sm">
            {CONDICAO[produto.condition]}
          </span>
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
            sizes="(max-width: 374px) 60vw, 12rem"
            className="mx-auto aspect-square w-full max-w-[12rem] object-contain transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-[12rem] flex-col items-center justify-center gap-2 text-graf-500">
            <ImageOff className="size-5" aria-hidden />
            <span className="micro">Foto em cadastro</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[0.625rem] font-extrabold uppercase tracking-[0.09em] text-graf-500 sm:text-[0.6875rem]">
          {produto.brandName || produto.categoryName || "Produto odontológico"}
        </p>
        <h2 className="mt-1.5 line-clamp-2 min-h-10 text-apoio font-bold leading-5 text-graf-950 sm:text-corpo">
          <Link
            href={`/loja/${produto.slug}`}
            className="foco-jb rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h2>

        {destaques.length ? (
          <dl className="mt-3 grid gap-1.5 border-t border-graf-100 pt-3">
            {destaques.map((item) => (
              <div
                key={`${item.rotulo}-${item.valor}`}
                className="flex min-w-0 justify-between gap-2 text-xs"
              >
                <dt className="truncate text-graf-500">{item.rotulo}</dt>
                <dd className="truncate font-semibold text-graf-800">{item.valor}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 border-t border-graf-100 pt-3 text-xs text-graf-500">
            Detalhes técnicos na página do produto
          </p>
        )}

        <div className="mt-auto pt-4">
          {anterior ? (
            <p className="truncate text-xs text-graf-500 line-through">
              {formatarPreco(anterior)}
            </p>
          ) : null}
          <p className="tabular truncate text-lg font-extrabold leading-7 text-graf-950 sm:text-2xl">
            {sobOrcamento ? "Sob orçamento" : formatarPreco(produto.priceCents)}
          </p>
          <p className="min-h-5 truncate text-xs text-graf-500">
            {parcelas
              ? `${parcelas.parcelas}× de ${formatarPreco(parcelas.valorCents)} sem juros`
              : sobOrcamento
                ? "Preço e prazo com a equipe JB"
                : "Pagamento à vista"}
          </p>

          <div className="mt-2.5 flex min-h-5 items-center gap-1.5 text-xs font-semibold text-graf-700">
            <span
              className={`size-1.5 shrink-0 rounded-full ${indisponivel ? "bg-graf-400" : "bg-ok-500"}`}
              aria-hidden
            />
            <span className="truncate">{disponibilidade(produto)}</span>
          </div>

          {/* Linha de ações — reposta em 12/09/2026, a pedido.

              Ela já tinha existido e saído, com motivo medido: era um retângulo
              vermelho de largura inteira, dezesseis por tela, e o vermelho da
              JB é sinal de ação — repetido dezesseis vezes deixa de apontar
              para coisa nenhuma, e a foto do equipamento passava a disputar
              atenção com uma faixa de cor.

              O que volta não é aquilo. O destino continua sendo o cartão
              inteiro; esta linha traz o botão de contorno, e o vermelho fica
              só no ícone do carrinho — 44px, não a largura toda. O coração
              desceu do canto da foto para cá, junto das outras ações.

              Os três controles ficam acima da camada que torna o cartão
              clicável (`z-10` contra o `after:inset-0` do título) — sem isso,
              um clique no coração abriria a ficha. */}
          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/loja/${produto.slug}`}
              className="foco-jb relative z-10 inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-graf-200 px-3 text-apoio font-bold text-graf-950 transition-colors hover:border-jb-500 hover:text-jb-700"
            >
              {sobOrcamento ? "Pedir orçamento" : "Ver equipamento"}
            </Link>

            {!sobOrcamento && !indisponivel ? (
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
              {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
              <button
                type="submit"
                aria-pressed={favoritado}
                aria-label={
                  favoritado
                    ? `Remover ${produto.name} dos favoritos`
                    : `Guardar ${produto.name} nos favoritos`
                }
                className={`foco-jb grid min-h-11 min-w-11 place-items-center rounded-md border transition-colors ${
                  favoritado
                    ? "border-jb-500 bg-jb-50 text-jb-700"
                    : "border-graf-200 text-graf-700 hover:border-jb-500 hover:text-jb-700"
                }`}
              >
                <Heart className={`size-4 ${favoritado ? "fill-current" : ""}`} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </div>
    </article>
  );
}
