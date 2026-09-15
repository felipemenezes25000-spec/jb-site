import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";

import { compararProdutos } from "@/domain/specs/comparar";
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

export type ProdutoComparavel = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  model: string;
  condition: string;
  priceCents: number;
  allowDirectPurchase: boolean;
  voltage: string | null;
  warrantyMonths: number | null;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  manufacturer: string | null;
  regulatoryHolder: string | null;
  anvisaCode: string | null;
  installationPolicy: string;
  boxContents: string[];
  infrastructureNotes: string[];
  brand: { name: string } | null;
  category: { slug: string; name: string } | null;
  specs: { label: string; value: string; order: number }[];
};

/** Quantas linhas cabem antes de a tabela virar a ficha inteira de novo. */
const LINHAS_NA_FICHA = 6;

export function paraFicha(produto: ProdutoComparavel) {
  return {
    nome: produto.name,
    sku: produto.sku,
    modelo: produto.model,
    condicao: produto.condition,
    marca: produto.brand?.name ?? null,
    categoria: produto.category
      ? { slug: produto.category.slug, nome: produto.category.name }
      : null,
    fabricante: produto.manufacturer,
    detentor: produto.regulatoryHolder,
    anvisa: produto.anvisaCode,
    voltagem: produto.voltage,
    pesoGramas: produto.weightGrams,
    larguraMm: produto.widthMm,
    alturaMm: produto.heightMm,
    profundidadeMm: produto.depthMm,
    garantiaMeses: produto.warrantyMonths,
    requisitos: produto.infrastructureNotes,
    itensInclusos: produto.boxContents,
    politicaDeInstalacao: produto.installationPolicy,
    specs: produto.specs,
  };
}

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
  const comparacao = compararProdutos(visiveis.map(paraFicha));

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
          <p className="micro text-jb-700">
            Compare sem sair da ficha
          </p>
          <h2
            id="comparacao-rapida-titulo"
            className="text-bloco mt-2 text-graf-950"
          >
            O que muda entre este modelo e as alternativas
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-graf-600">
            Os atributos abaixo são priorizados pelo tipo de equipamento. Acessórios e produtos de uso conjunto ficam fora desta comparação.
          </p>
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

      <div className="space-y-3 md:hidden">
        {visiveis.slice(1).map((alternativa, posicao) => {
          const indiceAlternativa = posicao + 1;
          const delta = diferencaDePreco(atual, alternativa);
          return (
            <article
              key={alternativa.id}
              className="overflow-hidden rounded-2xl border border-graf-200 bg-white"
            >
              <div className="grid grid-cols-2 border-b border-graf-200">
                <div className="bg-jb-50/45 p-4">
                  <span className="micro text-jb-800">
                    Este modelo
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-graf-950">
                    {atual.name}
                  </p>
                  <p className="mt-2 text-sm font-extrabold tabular text-graf-950">
                    {preco(atual)}
                  </p>
                </div>
                <div className="p-4">
                  <span className="micro text-graf-500">
                    Alternativa
                  </span>
                  <Link
                    href={`/loja/${alternativa.slug}`}
                    className="foco-jb mt-1 block min-h-11 line-clamp-2 text-sm font-extrabold leading-5 text-graf-950 hover:text-jb-700"
                  >
                    {alternativa.name}
                  </Link>
                  <p className="mt-2 text-sm font-extrabold tabular text-graf-950">
                    {preco(alternativa)}
                  </p>
                  {delta ? (
                    <p className="texto-apoio mt-1 font-bold text-graf-500">{delta}</p>
                  ) : null}
                </div>
              </div>

              <dl className="divide-y divide-graf-100">
                {linhas.map((linha) => {
                  const valorAtual = linha.valores[0] ?? "—";
                  const valorAlternativa = linha.valores[indiceAlternativa] ?? "—";
                  const diferente = valorAtual !== valorAlternativa;
                  return (
                    <div key={linha.key} className="p-3.5">
                      <dt className="micro text-graf-500">
                        {linha.label}
                      </dt>
                      <dd className="mt-2 grid grid-cols-2 gap-3 text-sm font-semibold text-graf-800">
                        <span className="min-w-0 break-words">{valorAtual}</span>
                        <span
                          className={`min-w-0 break-words ${diferente ? "font-extrabold text-graf-950" : ""}`}
                        >
                          {valorAlternativa}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <Link
                href={`/loja/${alternativa.slug}`}
                className="foco-jb flex min-h-11 items-center justify-center gap-2 border-t border-graf-200 px-4 text-sm font-bold text-jb-700 hover:bg-graf-50"
              >
                Ver alternativa
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </article>
          );
        })}
      </div>

      {/* Sem a moldura de cartão. A tabela já se desenha sozinha — filete por
          linha, faixa clara no cabeçalho — e estava dentro de um
          `rounded-2xl border bg-white` que por sua vez estava numa seção com
          `border-t`, no container branco da página. É a mesma caixa dentro de
          caixa que saiu da ficha técnica e da coluna de resumo.

          `overflow-x-auto` continua: a tabela tem largura mínima de 720px e
          precisa rolar sozinha antes de empurrar a página. */}
      <div className="hidden overflow-x-auto border-t border-graf-200 md:block">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-[22%] border-b border-graf-200 bg-graf-50/80 px-5 py-5 text-xs font-bold uppercase tracking-[0.08em] text-graf-500">
                Comparação
              </th>
              {visiveis.map((produto, indice) => {
                const delta = indice > 0 ? diferencaDePreco(atual, produto) : null;
                return (
                  <th
                    key={produto.id}
                    className={`border-b border-graf-200 px-5 py-5 align-top ${indice === 0 ? "bg-jb-50/45" : "bg-white"}`}
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
                  <th className="bg-graf-50/55 px-5 py-3.5 text-xs font-semibold text-graf-600">
                    {linha.label}
                  </th>
                  {visiveis.map((produto, indice) => {
                    const valor = linha.valores[indice] ?? "—";
                    const diferente = indice > 0 && valor !== valorAtual;
                    return (
                      <td
                        key={produto.id}
                        className={`px-5 py-3.5 text-sm text-graf-800 ${
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
