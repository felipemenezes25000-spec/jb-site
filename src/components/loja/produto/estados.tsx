import { Archive, PackageX } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";

/* ============================================================================
   Quando não dá para comprar

   Duas situações diferentes, com saídas diferentes:

   · fora de linha (`archived`) — o link continua de pé porque pode estar
     salvo ou indexado, mas a venda acabou. Nada de botão de compra;
   · sem estoque — o modelo existe, só não há unidade agora.

   Nenhum dos dois deixa a pessoa numa tela morta: sempre há um próximo passo.
   ============================================================================ */

export function ForaDeLinha({
  hrefOrcamento,
  hrefWhatsapp,
}: {
  hrefOrcamento: string;
  hrefWhatsapp: string;
}) {
  return (
    <div className="rounded-xl border border-graf-200 bg-white p-5 shadow-card sm:p-6">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-lg bg-graf-100 text-graf-700"
      >
        <Archive className="size-5" />
      </span>
      <h2 className="mt-4 text-title texto-forte">Este equipamento saiu de linha</h2>
      <p className="mt-2.5 text-sm leading-relaxed text-graf-600">
        A JB não vende mais este item. A ficha continua no ar para quem já tem o equipamento
        consultar — e a equipe ajuda a encontrar um substituto equivalente.
      </p>
      <div className="mt-5 space-y-2.5">
        <LinkBotao href="/loja" tamanho="lg" larguraTotal>
          Ver equipamentos disponíveis
        </LinkBotao>
        {hrefWhatsapp ? (
          <LinkBotao
            href={hrefWhatsapp}
            variante="secundario"
            tamanho="lg"
            larguraTotal
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar com a equipe
          </LinkBotao>
        ) : (
          <LinkBotao href={hrefOrcamento} variante="secundario" tamanho="lg" larguraTotal>
            Pedir indicação de substituto
          </LinkBotao>
        )}
      </div>
    </div>
  );
}

export function SemEstoque({
  unico,
  hrefAlternativas,
}: {
  unico: boolean;
  /** Vitrine mais próxima: os seminovos, quando é o caso, ou a loja inteira. */
  hrefAlternativas: string;
}) {
  return (
    <div className="rounded-xl border border-graf-200 bg-graf-50 p-5 sm:p-6">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-lg bg-white text-graf-700 shadow-card"
      >
        <PackageX className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-bold text-graf-950">
        {unico ? "Esta unidade já foi vendida" : "Sem unidade disponível agora"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-graf-600">
        {unico
          ? "Era uma unidade só, e ela saiu. Peça um orçamento e a equipe procura um equipamento equivalente para a sua clínica."
          : "Peça um orçamento: a equipe retorna com prazo e condições para este equipamento."}
      </p>
      <div className="mt-4">
        <LinkBotao href={hrefAlternativas} variante="secundario" tamanho="sm">
          Ver o que está disponível
        </LinkBotao>
      </div>
    </div>
  );
}
