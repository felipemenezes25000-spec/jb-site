import { ArrowRight, PackageCheck, ShoppingBag, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";

const ETAPAS = [
  {
    icone: ShoppingBag,
    titulo: "Escolha e compra",
    texto: "Compare produtos e confira preço, condição e disponibilidade antes de fechar o pedido.",
  },
  {
    icone: PackageCheck,
    titulo: "Entrega",
    texto: "Frete ou retirada ficam vinculados ao pedido e são conferidos antes do pagamento.",
  },
  {
    icone: Wrench,
    titulo: "Continuidade",
    texto: "Quando houver assistência técnica ou histórico de equipamento, a relação continua na JB.",
  },
] as const;

export function FechamentoHome() {
  return (
    <Secao fundo="clara" largura="loja" espaco="md" separador>
      <TituloSecao
        sobretitulo="Depois da compra"
        titulo="O pedido termina no checkout. O relacionamento com a JB, não."
        descricao="Compra, entrega e suporte ficam conectados sem transformar a página em uma sequência de promessas ou etapas que não se aplicam a todos os produtos."
        acao={
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <LinkBotao href="/loja" className="whitespace-nowrap">
              Explorar loja
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica" variante="secundario" className="whitespace-nowrap">
              Assistência técnica
            </LinkBotao>
          </div>
        }
      />

      <ol className="mt-8 grid overflow-hidden rounded-xl border border-graf-200 bg-white md:grid-cols-3">
        {ETAPAS.map(({ icone: Icone, titulo, texto }, indice) => (
          <li
            key={titulo}
            className="min-w-0 border-b border-graf-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
                <Icone className="size-4" aria-hidden />
              </span>
              <span className="micro text-graf-500">
                0{indice + 1}
              </span>
            </div>
            <h3 className="mt-4 text-base font-extrabold text-graf-950">{titulo}</h3>
            <p className="mt-2 text-sm leading-6 text-graf-600">{texto}</p>
          </li>
        ))}
      </ol>
    </Secao>
  );
}
