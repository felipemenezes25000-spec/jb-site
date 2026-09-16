import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";

import { compararProdutos } from "@/domain/specs/comparar";
import { paraFicha, type ProdutoDaFicha } from "@/lib/ficha-do-produto";
import { formatarPreco } from "@/lib/format";

/* ============================================================================
   Mini-comparador da ficha

   Este bloco tinha um esquema de atributos próprio — o terceiro do site para
   os mesmos dois produtos. Comparava "Capacidade, Ciclo, Secagem, Bandejas,
   Voltagem, Garantia" enquanto a ficha logo acima mostrava outros nove campos
   e o comparador completo mostrava outros dez. Na mesma coluna saíam "220" e
   "bivolt"; na linha da garantia, "6 meses" ao lado de "1 ano".

   Agora ele lê `compararProdutos`, que é a mesma ficha de todo o resto do
   site. Ele não escolhe mais o que comparar: escolhe quantas linhas cabem.
   ============================================================================ */

/* O que a ficha lê vem de `ProdutoDaFicha`; aqui em cima entra só o que ESTE
   bloco usa a mais — link, preço e se dá para comprar direto. Repetir os vinte
   campos da ficha criava uma segunda declaração para manter em dia. */
export type ProdutoComparavel = ProdutoDaFicha & {
  id: string;
  slug: string;
  priceCents: number;
  allowDirectPurchase: boolean;
};

/** Quantas linhas cabem antes de a tabela virar a ficha inteira de novo. */
const LINHAS_NA_FICHA = 6;


function preco(produto: ProdutoComparavel) {
  if (!produto.allowDirectPurchase || produto.priceCents <= 0) return "Sob orçamento";
  return formatarPreco(produto.priceCents);
}

function diferencaDePreco(atual: ProdutoComparavel, alternativa: ProdutoComparavel) {
  if (
    !atual.allowDirectPurchase ||
    !alternativa.allowDirectPurchase ||
    atual.priceCents <= 0 ||
    alternativa.priceCents <= 0
  ) {
    return null;
  }

  const diferenca = alternativa.priceCents - atual.priceCents;
  if (diferenca === 0) return "Mesmo preço";
  return `${formatarPreco(Math.abs(diferenca))} ${diferenca < 0 ? "a menos" : "a mais"}`;
}

export function ComparacaoRapida({ produtos }: { produtos: ProdutoComparavel[] }) {
  if (produtos.length < 2) return null;

  const atual = produtos[0];
  const visiveis = produtos.slice(0, 3);
  const comparacao = compararProdutos(visiveis.map((produto) => paraFicha(produto)));

  /* Quando há divergência, ela vem primeiro: uma tabela que abre por seis
     linhas idênticas não responde "o que muda entre os dois". */
  const linhas = [
    ...comparacao.linhas.filter((linha) => linha.diverge),
    ...comparacao.linhas.filter((linha) => !linha.diverge),
  ].slice(0, LINHAS_NA_FICHA);
  const hrefCompleto = `/comparar?${produtos
    .slice(0, 3)
    .map((produto) => `p=${encodeURIComponent(produto.slug)}`)
    .join("&")}`;

  return (
    <section
      id="comparacao-rapida"
      aria-labelledby="comparacao-rapida-titulo"
      className="scroll-mt-[var(--jb-topo-secoes)] border-t border-graf-200 py-9 lg:py-10"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="comparacao-rapida-titulo"
            className="text-bloco text-graf-950"
          >
            O que muda entre este modelo e as alternativas
          </h2>
        </div>

        <Link
          href={hrefCompleto}
          className="foco-jb inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-graf-300 px-4 text-sm font-bold text-graf-900 transition-colors hover:border-graf-500 hover:bg-graf-50 sm:self-auto"
        >
          <Scale className="size-4" aria-hidden />
          Comparar completo
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      {/* Uma tabela, em qualquer largura.

          Aqui existiam DUAS: uma lista de cartões `md:hidden` para o celular e
          esta tabela `hidden md:block` para o desktop, com os mesmos seis
          atributos dos mesmos três produtos escritos duas vezes no documento.
          Era o defeito que já tinha saído da ficha técnica, reaparecendo na
          comparação — e aqui ele custava mais caro, porque a versão do celular
          não comparava três produtos: comparava o atual contra cada
          alternativa, em blocos separados, que é justamente o que uma
          comparação não deve fazer.

          Agora é uma só, e ela rola na horizontal quando não cabe. A primeira
          coluna fica grudada (`sticky left-0`): sem ela, arrastar a tabela para
          ver a terceira alternativa levava embora o nome do atributo, e a
          pessoa ficava olhando "12 L · 18 L · 21 L" sem saber do que se trata.

          Sem a moldura de cartão: a tabela já se desenha sozinha — filete por
          linha, faixa clara no cabeçalho — e estava dentro de um
          `rounded-2xl border bg-white` que por sua vez estava numa seção com
          `border-t`, no container branco da página. */}
      <div className="overflow-x-auto border-t border-graf-200">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          {/* Sem legenda, quem navega por tabela ouvia "tabela, 4 colunas, 7
              linhas" e mais nada — e esta é a tabela que decide a compra. */}
          <caption className="sr-only">
            {`Comparação entre ${atual.name} e ${
              visiveis.length - 1 === 1 ? "uma alternativa" : `${visiveis.length - 1} alternativas`
            }, atributo a atributo`}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 w-[26%] min-w-[7.5rem] border-b border-r border-graf-200 bg-graf-50 px-4 py-4 text-xs font-bold uppercase tracking-[0.08em] text-graf-500 sm:w-[22%] sm:px-5 sm:py-5"
              >
                Comparação
              </th>
              {visiveis.map((produto, indice) => {
                const delta = indice > 0 ? diferencaDePreco(atual, produto) : null;
                return (
                  <th
                    key={produto.id}
                    scope="col"
                    className={`border-b border-graf-200 px-4 py-4 align-top sm:px-5 sm:py-5 ${indice === 0 ? "bg-jb-50/45" : "bg-white"}`}
                  >
                    {indice === 0 ? (
                      <span className="mb-2 inline-flex rounded-full bg-jb-100 px-2.5 py-1 micro text-jb-800">
                        Você está vendo
                      </span>
                    ) : null}
                    <Link
                      href={`/loja/${produto.slug}`}
                      className="foco-jb block min-h-11 text-sm font-extrabold leading-5 text-graf-950 hover:text-jb-700"
                    >
                      {produto.name}
                    </Link>
                    <p className="mt-2 text-base font-extrabold tabular text-graf-950">
                      {preco(produto)}
                    </p>
                    {delta ? (
                      <p className="texto-apoio mt-1 font-bold text-graf-500">{delta}</p>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-graf-100">
            {linhas.map((linha) => {
              const valorAtual = linha.valores[0] ?? "—";
              return (
                <tr key={linha.key}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-graf-200 bg-graf-50 px-4 py-3.5 text-left text-xs font-semibold text-graf-600 sm:px-5"
                  >
                    {linha.label}
                  </th>
                  {visiveis.map((produto, indice) => {
                    const valor = linha.valores[indice] ?? "—";
                    const diferente = indice > 0 && valor !== valorAtual;
                    return (
                      <td
                        key={produto.id}
                        className={`px-4 py-3.5 text-sm text-graf-800 sm:px-5 ${
                          indice === 0
                            ? "bg-jb-50/20 font-semibold"
                            : diferente
                              ? "font-extrabold text-graf-950"
                              : "font-semibold"
                        }`}
                      >
                        {valor}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
