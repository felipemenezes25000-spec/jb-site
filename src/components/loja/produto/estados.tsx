import { Archive, PackageX } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";

export function ForaDeLinha({
  hrefOrcamento,
  hrefWhatsapp,
}: {
  hrefOrcamento: string;
  hrefWhatsapp: string;
}) {
  return (
    <div className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:p-6">
      <span aria-hidden className="flex size-9 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
        <Archive className="size-[18px]" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold tracking-[-0.02em] text-graf-950">
        Este produto saiu de linha
      </h2>
      <p className="mt-2 text-sm leading-6 text-graf-600">
        Ele não está mais à venda. A ficha continua disponível para consulta e a JB pode indicar uma alternativa equivalente.
      </p>
      <div className="mt-5 grid gap-2">
        <LinkBotao href="/loja" tamanho="lg" larguraTotal>
          Ver produtos disponíveis
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
            Pedir uma alternativa
          </LinkBotao>
        ) : (
          <LinkBotao href={hrefOrcamento} variante="secundario" tamanho="lg" larguraTotal>
            Pedir uma alternativa
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
  hrefAlternativas: string;
}) {
  return (
    <div className="flex gap-3 border-t border-hairline pt-3.5">
      <PackageX className="mt-0.5 size-[18px] shrink-0 text-graf-500" aria-hidden />
      <div className="min-w-0">
        {/* `p`, e não `h2`.

            Isto é o estado da compra dentro da caixa de preço, não uma seção da
            página. Como `h2` ele entrava no mesmo nível de "Especificações
            técnicas" e "Dúvidas" — e a 14px, contra os 22px das seções de
            verdade, o documento ficava com dois tamanhos de `h2` e o sumário
            de quem usa leitor de tela ganhava um item que não é seção nenhuma.

            O peso e a cor seguram o destaque sem prometer hierarquia que não
            existe. */}
        <p className="text-sm font-bold text-graf-950">
          {unico ? "Esta unidade já foi vendida" : "Sem estoque no momento"}
        </p>
        <p className="mt-1 text-xs leading-5 text-graf-600">
          {unico
            ? "Veja outras opções disponíveis ou fale com a JB para encontrar uma alternativa equivalente."
            : "A JB pode confirmar reposição e prazo para este produto."}
        </p>
        <LinkBotao href={hrefAlternativas} variante="texto" tamanho="sm" className="mt-2 px-0 text-jb-700">
          Ver alternativas
        </LinkBotao>
      </div>
    </div>
  );
}
