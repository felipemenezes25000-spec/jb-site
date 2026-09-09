import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  History,
  Scale,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

import {
  CrossSellIntencional,
  type DadosCrossSell,
} from "@/components/loja/produto/cross-sell-intencional";
import { formatarPreco } from "@/lib/format";
import {
  carregarComentariosAvaliacoesProduto,
  carregarResumoAvaliacoesProduto,
  type ComentarioAvaliacaoProduto,
  type ResumoAvaliacoesProduto,
} from "@/lib/marketplace/avaliacoes-produto";
import {
  categoriaDaAlternativaAutomatica,
  decodificarOrdemRelacao,
} from "@/lib/marketplace/relacionamentos-produto";
import { prisma } from "@/lib/prisma";

/**
 * Camada complementar da PDP.
 *
 * A página principal cuida da decisão imediata (galeria, key specs, preço,
 * estoque, entrega e compra). Este layout entra depois dela com quatro tarefas:
 * comparar alternativas reais, provar confiança com avaliações verificadas,
 * oferecer cross-sell intencional e explicar a continuidade do pós-venda JB.
 *
 * ProductRelation com order < 1000 é alternativa. As faixas seguintes são
 * acessórios e complementos. Tudo é resolvido no servidor para a PDP nascer
 * pronta, sem um segundo fetch depois da hidratação.
 */
type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

type ProdutoComparavel = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  allowDirectPurchase: boolean;
  voltage: string | null;
  warrantyMonths: number | null;
  specs: { label: string; value: string; order: number }[];
};

const PRIORIDADE_ATRIBUTOS = [
  /intensidade|irradiancia|luminosidade/,
  /torque/,
  /capacidade|volume|litros/,
  /modos|programas|ciclos/,
  /rotacao|rpm|velocidade/,
  /pressao/,
  /potencia/,
  /ponteira|diametro|alcance/,
  /bateria|autonomia/,
  /frequencia/,
  /vazao/,
  /ruido/,
  /tensao|voltagem/,
];

function chave(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function prioridade(rotulo: string) {
  const indice = PRIORIDADE_ATRIBUTOS.findIndex((padrao) => padrao.test(chave(rotulo)));
  return indice < 0 ? PRIORIDADE_ATRIBUTOS.length : indice;
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

function linhasDaComparacao(produtos: ProdutoComparavel[]) {
  const candidatos = new Map<
    string,
    { rotulo: string; prioridade: number; ocorrencias: number; primeiraOrdem: number }
  >();

  for (const produto of produtos) {
    const vistos = new Set<string>();
    for (const spec of produto.specs) {
      if (!spec.label.trim() || !spec.value.trim()) continue;
      const id = chave(spec.label);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);

      const atual = candidatos.get(id);
      candidatos.set(id, {
        rotulo: atual?.rotulo ?? spec.label.trim(),
        prioridade: Math.min(atual?.prioridade ?? 999, prioridade(spec.label)),
        ocorrencias: (atual?.ocorrencias ?? 0) + 1,
        primeiraOrdem: Math.min(atual?.primeiraOrdem ?? 9999, spec.order),
      });
    }
  }

  const specs = [...candidatos.entries()]
    .sort(([, a], [, b]) =>
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
  return produto.specs.find((spec) => chave(spec.label) === id)?.value.trim() || "—";
}

function ComparacaoRapida({ produtos }: { produtos: ProdutoComparavel[] }) {
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
      className="scroll-mt-32 border-t border-graf-200 py-9 lg:py-10"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-jb-700">
            Compare sem sair da ficha
          </p>
          <h2
            id="comparacao-rapida-titulo"
            className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-graf-950 lg:text-[1.75rem]"
          >
            O que muda entre este modelo e as alternativas
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-graf-600">
            Aqui entram somente substitutos. Acessórios e produtos de uso conjunto ficam separados para não confundir a decisão.
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
            <article key={alternativa.id} className="overflow-hidden rounded-2xl border border-graf-200 bg-white">
              <div className="grid grid-cols-2 border-b border-graf-200">
                <div className="bg-jb-50/45 p-4">
                  <span className="text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-jb-800">
                    Este modelo
                  </span>
                  <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-graf-950">{atual.name}</p>
                  <p className="mt-2 text-sm font-extrabold tabular text-graf-950">{preco(atual)}</p>
                </div>
                <div className="p-4">
                  <span className="text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-graf-500">
                    Alternativa
                  </span>
                  <Link
                    href={`/loja/${alternativa.slug}`}
                    className="foco-jb mt-1 block line-clamp-2 text-sm font-extrabold leading-5 text-graf-950 hover:text-jb-700"
                  >
                    {alternativa.name}
                  </Link>
                  <p className="mt-2 text-sm font-extrabold tabular text-graf-950">{preco(alternativa)}</p>
                  {delta ? <p className="mt-1 text-[0.6875rem] font-bold text-graf-500">{delta}</p> : null}
                </div>
              </div>

              <dl className="divide-y divide-graf-100">
                {linhas.map((linha) => {
                  const valorAtual = valorDaLinha(atual, linha.id);
                  const valorAlternativa = valorDaLinha(alternativa, linha.id);
                  const diferente = chave(valorAtual) !== chave(valorAlternativa);
                  return (
                    <div key={linha.id} className="p-3.5">
                      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-graf-500">
                        {linha.rotulo}
                      </dt>
                      <dd className="mt-2 grid grid-cols-2 gap-3 text-sm font-semibold text-graf-800">
                        <span className="min-w-0 break-words">{valorAtual}</span>
                        <span className={`min-w-0 break-words ${diferente ? "font-extrabold text-graf-950" : ""}`}>
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

      <div className="hidden overflow-x-auto rounded-2xl border border-graf-200 bg-white md:block">
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
                      <span className="mb-2 inline-flex rounded-full bg-jb-100 px-2.5 py-1 text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-jb-800">
                        Você está vendo
                      </span>
                    ) : null}
                    <Link
                      href={`/loja/${produto.slug}`}
                      className="foco-jb block text-sm font-extrabold leading-5 text-graf-950 hover:text-jb-700"
                    >
                      {produto.name}
                    </Link>
                    <p className="mt-2 text-base font-extrabold tabular text-graf-950">{preco(produto)}</p>
                    {delta ? <p className="mt-1 text-[0.6875rem] font-bold text-graf-500">{delta}</p> : null}
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
                  <th className="bg-graf-50/55 px-5 py-3.5 text-xs font-semibold text-graf-600">{linha.rotulo}</th>
                  {produtos.slice(0, 3).map((produto, indice) => {
                    const valor = valorDaLinha(produto, linha.id);
                    const diferente = indice > 0 && chave(valor) !== chave(valorAtual);
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

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${nota} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, indice) => (
        <Star
          key={indice}
          className={`size-4 ${indice < nota ? "fill-current text-graf-900" : "text-graf-300"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

function AvaliacoesVerificadas({
  resumo,
  comentarios,
}: {
  resumo: ResumoAvaliacoesProduto | null;
  comentarios: ComentarioAvaliacaoProduto[];
}) {
  if (!resumo) return null;

  const { media, total, distribuicao } = resumo;

  return (
    <section
      id="avaliacoes-verificadas"
      aria-labelledby="avaliacoes-verificadas-titulo"
      className="scroll-mt-32 border-t border-graf-200 py-9 lg:py-10"
    >
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <div>
          <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-jb-700">Quem comprou conta</p>
          <h2 id="avaliacoes-verificadas-titulo" className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-graf-950">
            Avaliações verificadas
          </h2>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-5xl font-extrabold leading-none tracking-[-0.04em] tabular text-graf-950">
              {media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <div className="pb-0.5">
              <Estrelas nota={Math.round(media)} />
              <p className="mt-1 text-xs text-graf-500">
                {total} {total === 1 ? "avaliação publicada" : "avaliações publicadas"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2" aria-label="Distribuição das notas">
            {distribuicao.map(({ nota, quantidade }) => {
              const percentual = Math.round((quantidade / total) * 100);
              return (
                <div key={nota} className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-2 text-xs">
                  <span className="font-semibold text-graf-600">{nota}★</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-graf-100">
                    <span className="block h-full rounded-full bg-graf-800" style={{ width: `${percentual}%` }} />
                  </span>
                  <span className="text-right tabular text-graf-500">{quantidade}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-graf-500">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
            Só entram avaliações públicas ligadas a pedidos que continham este produto.
          </p>
        </div>

        {comentarios.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {comentarios.map((avaliacao) => (
              <article key={avaliacao.id} className="flex min-h-[13rem] flex-col rounded-2xl border border-graf-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Estrelas nota={avaliacao.score} />
                  <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-ok-700">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    Compra verificada
                  </span>
                </div>
                <p className="mt-4 line-clamp-5 text-sm leading-6 text-graf-700">“{avaliacao.comment.trim()}”</p>
                <div className="mt-auto border-t border-graf-100 pt-3">
                  <p className="text-xs font-bold text-graf-800">{avaliacao.displayName.trim() || "Cliente JB"}</p>
                  <p className="mt-0.5 text-[0.6875rem] text-graf-400">
                    {(avaliacao.publishedAt ?? avaliacao.createdAt).toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex items-center rounded-2xl border border-graf-200 bg-graf-50/60 p-6 text-sm leading-6 text-graf-600">
            As notas publicadas já entram na média. Os clientes ainda não deixaram comentários públicos sobre este modelo.
          </div>
        )}
      </div>
    </section>
  );
}

function PosVendaJB({ garantiaMeses }: { garantiaMeses: number | null }) {
  const itens = [
    {
      icone: FileText,
      titulo: "Documentos em um só lugar",
      texto: "Manual, nota e documentos vinculados ao equipamento ficam acessíveis pela Área da Clínica.",
    },
    {
      icone: ShieldCheck,
      titulo: garantiaMeses && garantiaMeses > 0 ? `Garantia de ${garantiaMeses} meses` : "Garantia acompanhada",
      texto: "O histórico da compra mantém origem e informações de garantia organizadas.",
    },
    {
      icone: Wrench,
      titulo: "Assistência conectada",
      texto: "Ao abrir um chamado, a JB já consegue relacionar atendimento e equipamento ao histórico técnico.",
    },
    {
      icone: History,
      titulo: "Histórico que continua",
      texto: "Manutenções, serviços e ocorrências passam a compor a trajetória do equipamento na clínica.",
    },
  ];

  return (
    <section className="border-t border-graf-200 py-9 lg:py-10" aria-labelledby="pos-venda-jb-titulo">
      <div className="overflow-hidden rounded-3xl border border-graf-200 bg-graf-950 text-white">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-12 lg:p-10">
          <div>
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-white/55">O diferencial não termina na entrega</p>
            <h2 id="pos-venda-jb-titulo" className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-white lg:text-3xl">
              O equipamento continua dentro do ecossistema JB
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Compra, documentos e assistência deixam de ser etapas soltas. A Área da Clínica mantém a continuidade do relacionamento com o equipamento.
            </p>
            <Link
              href="/minha-jb"
              className="foco-jb mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-graf-950 transition-transform hover:-translate-y-0.5"
            >
              Conhecer a Área da Clínica
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {itens.map((item) => {
              const Icone = item.icone;
              return (
                <div key={item.titulo} className="bg-graf-950 p-5 sm:p-6">
                  <Icone className="size-5 text-white/75" aria-hidden />
                  <h3 className="mt-4 text-sm font-extrabold text-white">{item.titulo}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-white/55">{item.texto}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const SELECT_COMPARAVEL = {
  id: true,
  slug: true,
  name: true,
  priceCents: true,
  allowDirectPurchase: true,
  voltage: true,
  warrantyMonths: true,
  specs: {
    orderBy: { order: "asc" as const },
    select: { label: true, value: true, order: true },
  },
};

export default async function ProdutoLayout({ children, params }: Props) {
  const { slug } = await params;

  const produto = await prisma.product.findUnique({
    where: { slug },
    select: {
      ...SELECT_COMPARAVEL,
      status: true,
      categoryId: true,
      condition: true,
      trackInventory: true,
      relatedFrom: {
        where: { order: { lt: 1_000 } },
        orderBy: { order: "asc" },
        take: 2,
        select: {
          target: {
            select: {
              ...SELECT_COMPARAVEL,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!produto || produto.status === "draft") return <>{children}</>;

  const alternativasManuais = produto.relatedFrom
    .map((relacao) => relacao.target)
    .filter((alvo) => alvo.status === "active")
    .slice(0, 2);

  /* A estatística e os comentários independem das relações comerciais. Começar
     as duas leituras agora evita uma etapa sequencial no fim do layout; `cache`
     no helper também permite que a página principal reutilize o mesmo resumo. */
  const resumoAvaliacoesPromise = carregarResumoAvaliacoesProduto(produto.id);
  const comentariosAvaliacoesPromise = carregarComentariosAvaliacoesProduto(produto.id);

  const todasRelacoes = await prisma.productRelation.findMany({
    where: { sourceId: produto.id },
    orderBy: { order: "asc" },
    select: {
      targetId: true,
      order: true,
      target: {
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          shortDescription: true,
          priceCents: true,
          allowDirectPurchase: true,
          trackInventory: true,
          stock: true,
          addons: {
            where: { required: true },
            take: 1,
            select: { id: true },
          },
          media: {
            orderBy: { order: "asc" },
            take: 1,
            select: {
              alt: true,
              media: { select: { url: true } },
            },
          },
        },
      },
    },
  });
  const relacionadosIds = todasRelacoes.map((relacao) => relacao.targetId);

  const crossSell: DadosCrossSell = { acessorios: [], complementos: [] };
  for (const relacao of todasRelacoes) {
    if (relacao.target.status !== "active") continue;
    const { tipo, ordem } = decodificarOrdemRelacao(relacao.order);
    if (tipo === "alternativa") continue;

    const item = {
      id: relacao.target.id,
      slug: relacao.target.slug,
      nome: relacao.target.name,
      descricao: relacao.target.shortDescription ?? "",
      precoCents:
        relacao.target.allowDirectPurchase && relacao.target.priceCents > 0
          ? relacao.target.priceCents
          : null,
      imagem: relacao.target.media[0]?.media.url ?? null,
      alt: relacao.target.media[0]?.alt || relacao.target.name,
      ordem,
      compraRapida:
        tipo === "acessorio" &&
        relacao.target.allowDirectPurchase &&
        relacao.target.priceCents > 0 &&
        (!relacao.target.trackInventory || relacao.target.stock > 0) &&
        relacao.target.addons.length === 0,
    };

    if (tipo === "acessorio") crossSell.acessorios.push(item);
    if (tipo === "complemento") crossSell.complementos.push(item);
  }

  crossSell.acessorios.sort((a, b) => a.ordem - b.ordem);
  crossSell.complementos.sort((a, b) => a.ordem - b.ordem);

  const faltam = 2 - alternativasManuais.length;
  const categoriaAlternativa = categoriaDaAlternativaAutomatica(produto.categoryId);
  const alternativasAutomaticas =
    faltam > 0 && categoriaAlternativa
      ? await prisma.product.findMany({
          where: {
            status: "active",
            id: { notIn: [produto.id, ...relacionadosIds] },
            categoryId: categoriaAlternativa,
          },
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          take: faltam,
          select: SELECT_COMPARAVEL,
        })
      : [];

  const [resumoAvaliacoes, comentariosAvaliacoes] = await Promise.all([
    resumoAvaliacoesPromise,
    comentariosAvaliacoesPromise,
  ]);

  const comparaveis: ProdutoComparavel[] = [
    produto,
    ...alternativasManuais,
    ...alternativasAutomaticas,
  ].slice(0, 3);

  const geraEquipamento = produto.condition !== "novo" || produto.trackInventory;

  return (
    <>
      {children}
      <div className="container-jb max-w-[112rem]">
        <ComparacaoRapida produtos={comparaveis} />
        <AvaliacoesVerificadas
          resumo={resumoAvaliacoes}
          comentarios={comentariosAvaliacoes}
        />
        <CrossSellIntencional dados={crossSell} />
        {geraEquipamento ? <PosVendaJB garantiaMeses={produto.warrantyMonths} /> : null}
      </div>
    </>
  );
}
