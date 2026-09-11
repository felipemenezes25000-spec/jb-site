import Image from "next/image";
import Link from "next/link";
import { Heart, ImageOff } from "lucide-react";

import { BotaoComparar } from "@/components/loja/comparador-cliente";
import type {
  ParcelamentoMarketplace,
  ProdutoMarketplaceCard,
} from "@/components/loja/marketplace/tipos";
import { calcularParcelas, formatarPreco } from "@/lib/format";
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
      <div
        data-palco-imagem-produto
        className="relative aspect-[4/3] bg-[linear-gradient(145deg,#fff_0%,#fff8f8_100%)]"
      >
        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            /* Larguras reais depois da coluna de filtros: uma coluna abaixo de
               375px, duas até 1023 e, do desktop em diante, a grade adapta por
               `auto-fill` com piso de 264px — o cartão fica entre 264 e ~340,
               e nunca passa disso. Pedir `24vw` a 1920 era pedir 460px para um
               espaço de 281. */
            sizes="(max-width: 374px) 94vw, (max-width: 1023px) 46vw, 340px"
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 bg-graf-50 text-xs font-semibold text-graf-500">
            <ImageOff className="size-5" aria-hidden />
            <span>Foto em cadastro</span>
          </div>
        )}

        <div className="absolute inset-x-2.5 top-2.5 z-10 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          <span className="rounded-md border border-graf-200 bg-white/95 px-2 py-1 text-[0.625rem] font-extrabold uppercase tracking-[0.06em] text-graf-700 shadow-sm sm:text-xs sm:normal-case sm:tracking-normal">
            {CONDICAO[produto.condition]}
          </span>
          <div className="flex items-center gap-1.5">
            {/* Guardar e comparar na mesma linha, no canto da foto: são o
                mesmo gesto para quem está decidindo, e é o par que o briefing
                pede no cartão. O formulário fica acima da camada que torna o
                cartão inteiro clicável — sem `relative`, o clique no coração
                abriria a ficha do produto. */}
            <form action={alternarFavorito} className="relative">
              <input type="hidden" name="produtoId" value={produto.id} />
              {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
              {/* 44px de alvo, 36px de desenho.

                  O botão nasceu com `size-9` — 36px em tudo — e virou o maior
                  grupo de alvos pequenos da loja: 16 de uma vez a 320px, um
                  por cartão. A regra de toque fala do ALVO, não da tinta,
                  então o círculo desceu para um `span` e o botão cresceu em
                  volta dele: o canto da foto continua com a mesma aparência e
                  o dedo ganha os 8px que faltavam. */}
              <button
                type="submit"
                aria-pressed={favoritado}
                aria-label={favoritado ? `Remover ${produto.name} dos favoritos` : `Guardar ${produto.name} nos favoritos`}
                title={favoritado ? "Remover dos favoritos" : "Guardar nos favoritos"}
                className="foco-jb flex size-11 items-center justify-center rounded-full"
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full border shadow-sm transition-colors ${
                    favoritado
                      ? "border-jb-300 bg-jb-50 text-jb-700"
                      : "border-graf-200 bg-white/95 text-graf-600 hover:border-graf-400 hover:text-jb-700"
                  }`}
                >
                  <Heart className={`size-4 ${favoritado ? "fill-current" : ""}`} aria-hidden />
                </span>
              </button>
            </form>

            <BotaoComparar slug={produto.slug} nome={produto.name} />
          </div>
        </div>

        {desconto >= 5 ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-md bg-jb-500 px-2 py-1 text-xs font-extrabold text-white sm:bottom-3 sm:left-3">
            −{desconto}%
          </span>
        ) : null}
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

          {/* O botão saiu.

              Era um `<span aria-hidden>` — decoração: quem leva à ficha é o
              link do título, que já cobre o cartão inteiro com
              `after:inset-0`. Só que era um retângulo vermelho sólido de
              largura inteira, e a grade mostra dezesseis deles de uma vez. O
              vermelho da JB é sinal de ação; repetido dezesseis vezes numa
              tela ele deixa de apontar para qualquer coisa, e a foto do
              equipamento — que é o que a pessoa está comparando — passa a
              disputar atenção com uma faixa de cor.

              O que ficou no lugar é o que as grades medidas como referência
              usam: nenhum CTA por cartão, o cartão inteiro clicável, e o
              hover/foco levantando a peça. São 56px a menos de altura em cada
              um dos dezesseis. O "Sob orçamento" que ele carregava já é o que
              a linha do preço escreve, logo acima. */}
        </div>
      </div>
    </article>
  );
}
