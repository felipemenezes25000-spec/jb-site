import type { Parcelamento, ProdutoCard } from "@/components/loja/card-produto";
import { FaixaVitrine } from "@/components/loja/home/faixa-vitrine";

/* ============================================================================
   As duas coleções da home

   Seminovos e mais procurados são a mesma faixa de vitrine com outro texto —
   e por um tempo cada uma teve o seu próprio cabeçalho copiado, com o rótulo
   em 11px e uma régua de respiro diferente da faixa de ofertas logo acima.
   Aqui elas só escolhem o que dizem.
   ============================================================================ */

export function SeminovosHome({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
}) {
  return (
    <FaixaVitrine
      fundo="clara"
      sobretitulo="Seminovos JB"
      titulo="Unidades seminovas disponíveis"
      descricao="Cada anúncio representa uma unidade específica. Veja condição, identificação e informações registradas antes de decidir."
      href="/seminovos"
      rotuloDoLink="Ver todos os seminovos"
      produtos={produtos.slice(0, 4)}
      parcelamento={parcelamento}
    />
  );
}

export function ProcuradosHome({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoCard[];
  parcelamento?: Parcelamento;
}) {
  return (
    <FaixaVitrine
      sobretitulo="Mais procurados"
      titulo="Produtos em destaque no catálogo"
      descricao="Uma seleção para continuar explorando a loja sem sair da mesma linguagem de preço, condição e disponibilidade."
      href="/loja"
      rotuloDoLink="Ver catálogo completo"
      produtos={produtos.slice(0, 4)}
      parcelamento={parcelamento}
    />
  );
}
