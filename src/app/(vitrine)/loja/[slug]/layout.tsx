import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  History,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

import {
  ComparacaoRapida,
  type ProdutoComparavel,
} from "@/components/loja/produto/comparacao-rapida";
import {
  CrossSellIntencional,
  type DadosCrossSell,
} from "@/components/loja/produto/cross-sell-intencional";
import { mesmoPerfilParaAlternativaAutomatica } from "@/lib/marketplace/atributos-decisao";
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
 * A página principal cuida da decisão imediata. Este layout entra depois dela
 * com comparação, prova social, cross-sell e continuidade JB. A comparação
 * tem componente próprio e compartilha a mesma matriz de atributos usada nos
 * Key Specs da primeira dobra.
 */
type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

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
          <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-jb-700">
            Quem comprou conta
          </p>
          <h2
            id="avaliacoes-verificadas-titulo"
            className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-graf-950"
          >
            Avaliações verificadas
          </h2>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-5xl font-extrabold leading-none tracking-[-0.04em] tabular text-graf-950">
              {media.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
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
                <div
                  key={nota}
                  className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-2 text-xs"
                >
                  <span className="font-semibold text-graf-600">{nota}★</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-graf-100">
                    <span
                      className="block h-full rounded-full bg-graf-800"
                      style={{ width: `${percentual}%` }}
                    />
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
              <article
                key={avaliacao.id}
                className="flex min-h-[13rem] flex-col rounded-2xl border border-graf-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Estrelas nota={avaliacao.score} />
                  <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-ok-700">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    Compra verificada
                  </span>
                </div>
                <p className="mt-4 line-clamp-5 text-sm leading-6 text-graf-700">
                  “{avaliacao.comment.trim()}”
                </p>
                <div className="mt-auto border-t border-graf-100 pt-3">
                  <p className="text-xs font-bold text-graf-800">
                    {avaliacao.displayName.trim() || "Cliente JB"}
                  </p>
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
      titulo:
        garantiaMeses && garantiaMeses > 0
          ? `Garantia de ${garantiaMeses} meses`
          : "Garantia acompanhada",
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
    <section
      className="border-t border-graf-200 py-9 lg:py-10"
      aria-labelledby="pos-venda-jb-titulo"
    >
      <div className="overflow-hidden rounded-3xl border border-graf-200 bg-graf-950 text-white">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-12 lg:p-10">
          <div>
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.12em] text-white/55">
              O diferencial não termina na entrega
            </p>
            <h2
              id="pos-venda-jb-titulo"
              className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-white lg:text-3xl"
            >
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
      isEquipment: true,
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
  const candidatosAutomaticos =
    faltam > 0 && categoriaAlternativa
      ? await prisma.product.findMany({
          where: {
            status: "active",
            id: { notIn: [produto.id, ...relacionadosIds] },
            categoryId: categoriaAlternativa,
          },
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          // Categoria é só o primeiro filtro. A janela maior permite descartar
          // subtipos incompatíveis sem exigir classificação nova no banco.
          take: Math.max(12, faltam * 6),
          select: SELECT_COMPARAVEL,
        })
      : [];

  const contextoAtual = {
    nome: produto.name,
    rotulos: produto.specs.map((spec) => spec.label),
  };
  const alternativasAutomaticas = candidatosAutomaticos
    .filter((candidato) =>
      mesmoPerfilParaAlternativaAutomatica(contextoAtual, {
        nome: candidato.name,
        rotulos: candidato.specs.map((spec) => spec.label),
      }),
    )
    .slice(0, faltam);

  const [resumoAvaliacoes, comentariosAvaliacoes] = await Promise.all([
    resumoAvaliacoesPromise,
    comentariosAvaliacoesPromise,
  ]);

  const comparaveis: ProdutoComparavel[] = [
    produto,
    ...alternativasManuais,
    ...alternativasAutomaticas,
  ].slice(0, 3);

  const geraEquipamento = produto.isEquipment;

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
