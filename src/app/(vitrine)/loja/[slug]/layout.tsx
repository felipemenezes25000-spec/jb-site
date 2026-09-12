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
      className="scroll-mt-[var(--jb-topo-secoes)] border-t border-graf-200 py-9 lg:py-10"
    >
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <div>
          <p className="micro text-jb-700">
            Quem comprou conta
          </p>
          <h2
            id="avaliacoes-verificadas-titulo"
            className="text-bloco mt-2 text-graf-950"
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
          /* `placa` é a superfície de catálogo do design system — branca, com a
             borda, o canto e a sombra dele. Estas fichas usavam
             `rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.025)]`: o
             mesmo desenho reescrito à mão, com uma sombra em valor avulso e um
             canto que nenhum outro cartão da loja usa.

             O cartão fica, ao contrário do que aconteceu na ficha técnica: um
             depoimento é uma unidade fechada, com autor e data, e é assim que
             Mercado Livre e Amazon apresentam os seus. O que saiu foi a
             reinvenção da superfície, não a superfície. */
          <div className="grid gap-3 sm:grid-cols-2">
            {comentarios.map((avaliacao) => (
              <article
                key={avaliacao.id}
                className="placa flex flex-col p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Estrelas nota={avaliacao.score} />
                  <span className="inline-flex items-center gap-1.5 texto-apoio font-bold text-ok-700">
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
                  <p className="texto-apoio mt-0.5 text-graf-400">
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
          <div className="flex items-center border-t border-graf-200 py-6 text-sm leading-6 text-graf-600">
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
      {/* Painel claro, e não um bloco preto.

          `globals.css` abre dizendo que a interface é predominantemente clara e
          que preto é "faixa pontual, nunca a moldura do site" — e a pele preta
          do protótipo já tinha sido testada e cortada uma vez. Este painel
          ocupava 1360×385 na ficha do equipamento: não é pontual, é a maior
          superfície da página depois da foto, e com texto em branco a 55% de
          opacidade em cima.

          O que sustenta a hierarquia aqui é o mesmo que sustenta o resto da
          loja: superfície clara, filete fino e o vermelho da marca no sinal —
          o sobretítulo e o ícone de cada garantia. */}
      <div className="overflow-hidden rounded-3xl border border-graf-200 bg-surface-muted">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-12 lg:p-10">
          <div>
            <p className="sobretitulo">O diferencial não termina na entrega</p>
            <h2
              id="pos-venda-jb-titulo"
              className="text-bloco mt-3 text-graf-950"
            >
              O equipamento continua dentro do ecossistema JB
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-graf-600">
              Compra, documentos e assistência deixam de ser etapas soltas. A Área da Clínica mantém a continuidade do relacionamento com o equipamento.
            </p>
            <Link
              href="/minha-jb"
              className="foco-jb mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-jb-500 px-4 text-sm font-extrabold text-white transition-colors hover:bg-jb-600"
            >
              Conhecer a Área da Clínica
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Um nível de moldura a menos.

              Era `rounded-2xl border bg-graf-200` com quatro células `bg-surface`
              dentro — uma caixa com borda e canto dentro do painel que já tem
              borda e canto, dentro de uma seção com `border-t`. Três molduras
              para quatro frases curtas.

              As células agora dividem o fundo do painel e são separadas só por
              filete, que é a mesma gramática do resto da ficha. O painel claro
              continua: ele é a correção deliberada da pele preta que já tinha
              sido testada e cortada uma vez. */}
          <div className="grid border-graf-200 sm:grid-cols-2 [&>*:nth-child(n+2)]:border-t sm:[&>*:nth-child(2)]:border-t-0 sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(n+3)]:border-t">
            {itens.map((item) => {
              const Icone = item.icone;
              return (
                <div key={item.titulo} className="border-graf-200 p-5 sm:p-6">
                  <Icone className="size-5 text-jb-600" aria-hidden />
                  <h3 className="mt-4 text-sm font-extrabold text-graf-950">{item.titulo}</h3>
                  <p className="texto-apoio mt-1.5 text-graf-600">{item.texto}</p>
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
      {/* Mesma largura da página principal, e não a do cabeçalho.

          Esta camada usava `112rem` enquanto o topo da ficha usava `100rem`:
          da comparação para baixo o conteúdo ficava 192px mais largo que a
          galeria, e o eixo vertical da página quebrava na metade. `100rem` é a
          largura que a home e o resto da vitrine já usam — quem alinha por
          `112rem` é só o cabeçalho, por decisão própria. */}
      <div className="container-loja">
        <ComparacaoRapida produtos={comparaveis} />
        <AvaliacoesVerificadas
          resumo={resumoAvaliacoes}
          comentarios={comentariosAvaliacoes}
        />
        <CrossSellIntencional
          dados={crossSell}
          produto={{
            id: produto.id,
            nome: produto.name,
            precoCents:
              produto.allowDirectPurchase && produto.priceCents > 0 ? produto.priceCents : null,
            imagem: null,
            alt: produto.name,
          }}
        />
        {geraEquipamento ? <PosVendaJB garantiaMeses={produto.warrantyMonths} /> : null}
      </div>
    </>
  );
}
