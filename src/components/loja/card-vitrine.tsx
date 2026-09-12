import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, ShoppingCart } from "lucide-react";

import { adicionarAoCarrinhoDoCartao } from "@/app/acoes/carrinho";
import { BotaoComparar } from "@/components/loja/comparador-cliente";
import type { ProdutoCard, Parcelamento } from "@/components/loja/card-produto";
import { TrilhoOuGrade, colunasAte, type ColunasPorTela } from "@/components/ui/grade";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

/* ============================================================================
   Cartão de vitrine

   O mesmo dado do `CardProduto`, com a apresentação da vitrine: foto em
   fundo branco chapado, etiqueta de condição no canto, preço tabular e o
   convite com peso de botão.

   O que este cartão NÃO mostra, de propósito: nota e número de avaliações. A
   referência que inspirou o desenho exibe "4.9 · 38 avaliações" em todo
   produto, e aquilo é dado inventado do protótipo. Aqui a avaliação só entra
   quando existir avaliação de verdade no banco — foi exatamente por anunciar
   o que não se tem que o catálogo já precisou ser consertado uma vez.

   Modelo e preço anterior usam `graf-500`, e não `graf-400`. O próprio design
   system escreve em `globals.css` que graf-400 é borda, ícone decorativo e
   divisor — nunca texto: sobre branco ele dá 2,6:1, abaixo do 4,5:1 que a
   WCAG pede. A auditoria de acessibilidade acusava esses dois campos em toda
   fileira da home e do catálogo, 66 ocorrências.
   ============================================================================ */

const CONDICAO_ETIQUETA = {
  novo: { rotulo: "Novo", classe: "bg-white text-graf-700 ring-1 ring-graf-200" },
  seminovo: { rotulo: "Seminovo JB", classe: "bg-white text-jb-600 ring-1 ring-jb-500" },
  usado: { rotulo: "Usado", classe: "bg-white text-graf-700 ring-1 ring-graf-200" },
  recondicionado: { rotulo: "Recondicionado JB", classe: "bg-white text-warn-700 ring-1 ring-warn-500" },
} as const;

function disponibilidade(produto: ProdutoCard) {
  if (!produto.trackInventory) return null;
  if (produto.stock <= 0) {
    return {
      texto: produto.unique ? "Unidade vendida" : "Indisponível",
      classe: "text-graf-500",
      ponto: "bg-graf-400",
    };
  }
  if (produto.unique) return { texto: "Unidade única", classe: "text-jb-700", ponto: "bg-jb-500" };
  if (produto.stock <= 3) {
    return {
      texto: `Últimas ${produto.stock} un`,
      classe: "text-warn-700",
      ponto: "bg-warn-500",
    };
  }
  return { texto: `${produto.stock} em estoque`, classe: "text-ok-700", ponto: "bg-ok-500" };
}

export function CardVitrine({
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
  const condicao = CONDICAO_ETIQUETA[produto.condition];
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
        "placa group relative isolate flex flex-col overflow-hidden",
        "transition-[border-color,box-shadow,transform] duration-200 ease-out-quint",
        "hover:-translate-y-0.5 hover:border-graf-400 hover:shadow-raised",
        "has-[a:focus-visible]:border-jb-500 has-[a:focus-visible]:shadow-raised",
        className,
      )}
    >
      {/* Em coluna única de 390px, a moldura 4:3 dava 268px só de foto e o
          cartão passava de 450px: dois equipamentos por tela inteira. O 3:2 do
          celular tira ~30px por cartão sem apertar a fotografia, e do `sm`
          para cima — onde a grade tem duas ou três colunas — a proporção
          cheia volta. */}
      <div
        data-palco-imagem-produto
        /* Branco chapado, como nos outros dois cartões da loja. Era `#fff9f9`,
           um rosa de 1% que só este componente usava — e que aparecia por
           baixo de recortes já transparentes. */
        className="relative aspect-3/2 max-h-72 overflow-hidden bg-surface sm:aspect-4/3"
      >
        {produto.imageUrl ? (
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(produto.imageUrl)}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            loading={prioridade ? undefined : "lazy"}
            sizes="(max-width: 640px) 94vw, (max-width: 1024px) 46vw, 24vw"
            className={cn(
              "object-contain p-3 transition-transform duration-500 ease-out-quint",
              "group-hover:scale-[1.03]",
              semEstoque && "opacity-60 grayscale",
            )}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-graf-500">
            <ImageOff className="size-6" aria-hidden />
            <span className="micro text-graf-500">Foto em cadastro</span>
          </div>
        )}

        {/* Etiquetas em coluna, sempre no mesmo canto: condição primeiro,
            desconto embaixo. Quem varre a grade lê as duas na vertical. */}
        <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          <span className={cn("micro rounded-lg px-2 py-1.5", condicao.classe)}>
            {condicao.rotulo}
          </span>
          {desconto >= 5 ? (
            <span className="micro rounded-lg bg-jb-500 px-2 py-1.5 text-white">−{desconto}%</span>
          ) : null}
        </div>

        {semEstoque ? (
          <p
            aria-hidden
            className="micro absolute inset-x-0 bottom-0 z-10 bg-graf-950/90 py-2.5 text-center text-white"
          >
            {produto.unique ? "Vendido" : "Indisponível"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-hairline p-4">
        {produto.brandName ? (
          <p className="micro truncate text-graf-500">{produto.brandName}</p>
        ) : null}

        <h3 className="mt-2 line-2 min-h-10 text-corpo font-semibold leading-snug text-graf-950">
          <Link
            href={`/loja/${produto.slug}`}
            className="rounded-lg after:absolute after:inset-0 after:content-['']"
          >
            {produto.name}
          </Link>
        </h3>

        {produto.model ? (
          <p className="micro mt-1.5 truncate text-graf-500">{produto.model}</p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex h-4 items-center gap-2">
            {precoAnterior ? (
              <span className="micro text-graf-500 line-through">
                {formatarPreco(precoAnterior)}
              </span>
            ) : null}
          </div>

          {soOrcamento ? (
            <p className="numero text-xl text-graf-950">Sob orçamento</p>
          ) : (
            <p className="numero text-[1.5rem] leading-8 text-graf-950">
              {formatarPreco(produto.priceCents)}
            </p>
          )}

          <div className="flex h-4 items-center">
            {parcelas ? (
              <span className="micro text-graf-500">
                {parcelas.parcelas}x {formatarPreco(parcelas.valorCents)}
              </span>
            ) : soOrcamento ? (
              <span className="micro truncate text-graf-500">A equipe responde com prazo</span>
            ) : null}
          </div>

          <div className="mt-3 flex h-4 items-center">
            {estado ? (
              <span className={cn("micro flex items-center gap-1.5", estado.classe)}>
                <span aria-hidden className={cn("size-1.5 rounded-full", estado.ponto)} />
                {estado.texto}
              </span>
            ) : null}
          </div>

          {/* Linha de ações — a mesma gramática do cartão do catálogo.

              Este cartão trazia o convite como retângulo vermelho de largura
              inteira. Numa home com nove equipamentos isso são nove faixas de
              vermelho, e o cartão do catálogo já tinha feito o caminho de
              volta pelo mesmo motivo, escrito lá: o vermelho da JB é sinal de
              ação, e repetido a cada cartão deixa de apontar para coisa
              nenhuma. Dois cartões que mostram o MESMO produto não podiam
              continuar discordando sobre isso.

              O destino segue sendo o cartão inteiro — o `after:inset-0` do
              título cobre tudo. O que muda: o convite vira contorno, o
              vermelho fica só no ícone do carrinho, e os três controles sobem
              para `z-10` para o clique não cair na camada do cartão. */}
          {/* `flex-wrap` + `shrink-0`: a 320px o cartão do trilho mede 250px,
              e três controles numa linha só espremiam o botão de comparar de
              44 para 18px — abaixo do alvo mínimo da WCAG 2.5.8, que o portão
              `responsivo` pega. Agora o convite segura a primeira linha e os
              dois ícones descem para a segunda quando não cabem. */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {/* Decorativo: quem navega por teclado ou leitor de tela usa o
                link do título, que cobre o cartão inteiro. Repetir o destino
                aqui como âncora só duplicaria o mesmo item na lista de links. */}
            <span
              aria-hidden
              className={cn(
                "inline-flex h-11 min-w-[8.5rem] flex-1 items-center justify-center gap-2 whitespace-nowrap px-3",
                "rounded-lg border border-graf-200 text-apoio font-bold text-graf-950",
                "transition-colors group-hover:border-jb-500 group-hover:text-jb-700",
                semEstoque && "text-graf-500 group-hover:border-graf-200 group-hover:text-graf-500",
              )}
            >
              {chamada}
              <ArrowRight className="size-3.5 transition-transform duration-200 ease-out-quint group-hover:translate-x-0.5" />
            </span>

            {!soOrcamento && !semEstoque ? (
              <form action={adicionarAoCarrinhoDoCartao} className="relative z-10">
                <input type="hidden" name="produtoId" value={produto.id} />
                <input type="hidden" name="quantidade" value="1" />
                <button
                  type="submit"
                  aria-label={`Adicionar ${produto.name} ao carrinho`}
                  className="foco-jb grid size-11 shrink-0 place-items-center rounded-lg border border-jb-500 bg-jb-500 text-white transition-colors hover:bg-jb-600"
                >
                  <ShoppingCart className="size-4" aria-hidden />
                </button>
              </form>
            ) : null}

            <BotaoComparar
              slug={produto.slug}
              nome={produto.name}
              className="relative z-10 size-11 shrink-0 rounded-lg border-graf-200 bg-white"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================================================================
   A grade da vitrine

   Fecha a fileira pela quantidade, como a do catálogo — e, abaixo de `sm`,
   deixa de ser grade.

   Em coluna única de 390px cada cartão mede ~430px de altura. Quatro deles,
   numa faixa só, são 1.720px de rolagem para mostrar quatro equipamentos; a
   home tem quatro dessas faixas, e o total passava de 18.000px. Quem chega
   pelo celular desiste antes de ver a assistência técnica, que é o argumento
   comercial da JB.

   `TrilhoOuGrade` existia no sistema para exatamente isto, escrito e
   documentado, e nenhuma tela o usava. No trilho o cartão continua largo, a
   foto continua grande, e o pedaço do próximo cartão aparecendo na borda é o
   convite para arrastar. É rolagem nativa com encaixe: sem biblioteca, sem
   botão, sem estado, e o foco do teclado leva o trilho junto.
   ============================================================================ */
export function GradeVitrine({
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

  /* Coleção curta não vira cartaz.

     `colunasAte` fecha a fileira quando há menos itens que colunas — sem ele,
     um seminovo só numa grade de quatro deixa um cartão e três buracos. Só
     que fechar a fileira em UMA coluna faz o cartão ocupar os 1600px da
     faixa: a foto do equipamento vai para o centro de um retângulo de tela
     inteira e o preço fica sozinho a meio metro do nome. Foi o que a home
     mostrou no dia em que o catálogo tinha um seminovo publicado.

     O teto por célula devolve a proporção de cartão. A fileira continua
     fechada, alinhada à esquerda, e quem olha entende que há um item — não
     que o desenho quebrou. */
  const alvo = teto.xl ?? teto.lg ?? teto.sm ?? teto.base ?? 1;

  return (
    <TrilhoOuGrade
      como="ul"
      espaco="sm"
      colunas={colunasAte(celulas, teto)}
      className={cn(celulas < alvo && "sm:[&>li]:max-w-[24rem]", className)}
    >
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex">
          <CardVitrine
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            className="w-full"
          />
        </li>
      ))}
      {extra ? <li className="flex">{extra}</li> : null}
    </TrilhoOuGrade>
  );
}
