import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";

import { formatarPreco } from "@/lib/format";
import {
  normalizarAtributo,
  prioridadeAtributoDecisao,
} from "@/lib/marketplace/atributos-decisao";

export type ProdutoComparavel = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  allowDirectPurchase: boolean;
  voltage: string | null;
  warrantyMonths: number | null;
  specs: { label: string; value: string; order: number }[];
};

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

export function linhasDaComparacao(produtos: ProdutoComparavel[]) {
  if (produtos.length === 0) return [];

  const principal = produtos[0];
  const contexto = {
    nome: principal.name,
    rotulos: principal.specs.map((spec) => spec.label),
  };

  const candidatos = new Map<
    string,
    { rotulo: string; prioridade: number; ocorrencias: number; primeiraOrdem: number }
  >();

  for (const produto of produtos) {
    const vistos = new Set<string>();
    for (const spec of produto.specs) {
      if (!spec.label.trim() || !spec.value.trim()) continue;
      const id = normalizarAtributo(spec.label);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);

      const atual = candidatos.get(id);
      candidatos.set(id, {
        rotulo: atual?.rotulo ?? spec.label.trim(),
        prioridade: Math.min(
          atual?.prioridade ?? 9999,
          prioridadeAtributoDecisao(spec.label, contexto),
        ),
        ocorrencias: (atual?.ocorrencias ?? 0) + 1,
        primeiraOrdem: Math.min(atual?.primeiraOrdem ?? 9999, spec.order),
      });
    }
  }

  const specs = [...candidatos.entries()]
    .sort(
      ([, a], [, b]) =>
        a.prioridade - b.prioridade ||
        b.ocorrencias - a.ocorrencias ||
        a.primeiraOrdem - b.primeiraOrdem,
    )
    .slice(0, 4)
    .map(([id, dado]) => ({ id, rotulo: dado.rotulo }));

  return [
    ...specs,
    ...(produtos.some((produto) => produto.voltage?.trim())
      ? [{ id: "__voltagem", rotulo: "Voltagem" }]
      : []),
    ...(produtos.some((produto) => (produto.warrantyMonths ?? 0) > 0)
      ? [{ id: "__garantia", rotulo: "Garantia" }]
      : []),
  ].slice(0, 6);
}

function valorDaLinha(produto: ProdutoComparavel, id: string) {
  if (id === "__voltagem") return produto.voltage?.trim() || "—";
  if (id === "__garantia") {
    const meses = produto.warrantyMonths ?? 0;
    return meses > 0 ? `${meses} ${meses === 1 ? "mês" : "meses"}` : "—";
  }
  return (
    produto.specs.find((spec) => normalizarAtributo(spec.label) === id)?.value.trim() || "—"
  );
}

export function ComparacaoRapida({ produtos }: { produtos: ProdutoComparavel[] }) {
  if (produtos.length < 2) return null;

  const atual = produtos[0];
  const alternativas = produtos.slice(1, 3);
  const linhas = linhasDaComparacao(produtos);
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
        {alternativas.map((alternativa) => {
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
                  const valorAtual = valorDaLinha(atual, linha.id);
                  const valorAlternativa = valorDaLinha(alternativa, linha.id);
                  const diferente =
                    normalizarAtributo(valorAtual) !== normalizarAtributo(valorAlternativa);
                  return (
                    <div key={linha.id} className="p-3.5">
                      <dt className="micro text-graf-500">
                        {linha.rotulo}
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
              {produtos.slice(0, 3).map((produto, indice) => {
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
              const valorAtual = valorDaLinha(atual, linha.id);
              return (
                <tr key={linha.id}>
                  <th className="bg-graf-50/55 px-5 py-3.5 text-xs font-semibold text-graf-600">
                    {linha.rotulo}
                  </th>
                  {produtos.slice(0, 3).map((produto, indice) => {
                    const valor = valorDaLinha(produto, linha.id);
                    const diferente =
                      indice > 0 &&
                      normalizarAtributo(valor) !== normalizarAtributo(valorAtual);
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
