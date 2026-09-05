import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CaixaCompra, type AddonProduto } from "@/components/loja/caixa-compra";
import { GaleriaProduto, type FotoProduto } from "@/components/loja/galeria-produto";
import { GradeProdutos } from "@/components/loja/card-produto";
import { AjudaDaEquipe } from "@/components/loja/produto/ajuda-da-equipe";
import { AssistenciaRelacionada } from "@/components/loja/produto/assistencia-relacionada";
import { definicaoDaCondicao } from "@/components/loja/produto/condicao";
import { CondicoesDeCompra } from "@/components/loja/produto/condicoes-de-compra";
import {
  agruparEspecificacoes,
  Documentacao,
  FichaTecnica,
  MedidasEPeso,
  Regulatorio,
} from "@/components/loja/produto/especificacoes";
import { ForaDeLinha, SemEstoque } from "@/components/loja/produto/estados";
import { IdentidadeProduto } from "@/components/loja/produto/identidade";
import { MotivosJB } from "@/components/loja/produto/motivos-jb";
import { PerguntasDoProduto } from "@/components/loja/produto/perguntas";
import {
  ServicosDoProduto,
  type ServicoDoProduto,
} from "@/components/loja/produto/servicos-do-produto";
import { UnidadeFisica } from "@/components/loja/produto/unidade-fisica";
import { Trilha, TituloSecao } from "@/components/ui/data";
import { EsqueletoCartaoProduto } from "@/components/ui/esqueletos";
import { Secao } from "@/components/ui/secao";
import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import { paraCard, SELECAO_CARD } from "@/lib/catalogo";
import { paraCentavos, whatsappHref } from "@/lib/format";
import {
  faqJsonLd,
  JsonLd,
  metadataDePagina,
  produtoJsonLd,
  textoLimpo,
  trilhaJsonLd,
  type DadosJsonLd,
} from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Página de um equipamento.
 *
 * A tela é montada em faixas: identidade em largura inteira, depois galeria e
 * caixa de compra, e então os blocos que sustentam uma compra de cinco dígitos
 * — por que na JB, a unidade física quando existe, descrição, ficha técnica,
 * documentação, serviços da equipe, dúvidas, equipamentos relacionados e a
 * assistência que continua depois da entrega.
 *
 * A regra que atravessa o arquivo inteiro: campo vazio não vira linha. Não há
 * prazo, frete, certificação, nota nem depoimento que não esteja no banco.
 */

type Props = { params: Promise<{ slug: string }> };

/**
 * O cartão de um relacionado precisa de `id` e `status` além do que a vitrine
 * usa: `id` para não repetir o mesmo item no complemento automático, `status`
 * porque uma relação cadastrada pode apontar para algo despublicado.
 */
const SELECAO_RELACIONADO = {
  ...SELECAO_CARD,
  id: true,
  status: true,
} satisfies Prisma.ProductSelect;

type LinhaRelacionada = Prisma.ProductGetPayload<{ select: typeof SELECAO_RELACIONADO }>;

async function carregar(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: { include: { logo: true } },
      category: true,
      media: { orderBy: { order: "asc" }, include: { media: true } },
      specs: { orderBy: { order: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      faqs: { where: { published: true }, orderBy: { order: "asc" } },
      addons: { orderBy: { order: "asc" }, include: { service: true } },
      /**
       * Duas unidades, não uma: com mais de uma no estoque, mostrar "o número
       * de série" seria mostrar o de outra peça. `status` ordena pela ordem do
       * enum, então a disponível vem primeiro.
       */
      units: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 2,
        include: {
          checklist: { orderBy: { order: "asc" } },
          media: { orderBy: { order: "asc" }, include: { media: true } },
        },
      },
      shippingProfile: true,
      relatedFrom: {
        orderBy: { order: "asc" },
        take: 8,
        include: { target: { select: SELECAO_RELACIONADO } },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const produto = await carregar(slug);
  if (!produto) {
    return metadataDePagina({
      titulo: "Equipamento não encontrado",
      caminho: `/loja/${slug}`,
      noIndex: true,
    });
  }

  const base = metadataDePagina({
    titulo: produto.seoTitle?.trim() || produto.name,
    descricao: produto.seoDescription?.trim() || produto.shortDescription || produto.description,
    caminho: `/loja/${produto.slug}`,
    imagem: produto.media[0]?.media.url ?? null,
  });

  if (produto.status === "active") return base;

  /**
   * Fora de linha sai do índice, mas os links continuam valendo: a página só
   * existe para levar quem chegou até um substituto. `noIndex` do construtor
   * padrão desligaria o `follow` junto, e aí o buscador ignoraria justamente
   * os equipamentos indicados no lugar deste.
   */
  return { ...base, robots: { index: false, follow: true } };
}

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params;
  const [produto, s] = await Promise.all([carregar(slug), getSettings()]);

  if (!produto || produto.status === "draft") notFound();

  const caminho = `/loja/${produto.slug}`;

  /**
   * `archived` é produto que saiu de linha. A página continua de pé porque o
   * link pode estar salvo ou indexado — devolver 404 para quem tem o
   * equipamento é pior que explicar. O que não pode é continuar vendendo.
   */
  const arquivado = produto.status === "archived";
  const semEstoque = produto.trackInventory && produto.stock <= 0;

  /* ------------------------------------------------------ unidade física */

  // Só existe "a unidade" quando há uma única peça identificada. Com duas ou
  // mais no estoque, o número de série na tela seria o de outra peça.
  const unidade =
    produto.units.length === 1 && (produto.unique || produto.stock <= 1)
      ? produto.units[0]
      : undefined;

  const checklist =
    unidade?.checklist.map((item) => ({
      id: item.id,
      rotulo: item.label,
      resultado: item.result,
      nota: item.note,
    })) ?? [];

  const definicao = definicaoDaCondicao(produto.condition, {
    itensDeChecklist: checklist.length,
    temNotasDeEstado: Boolean(unidade?.conditionNotes.trim()),
  });

  /* ---------------------------------------------------------------- fotos */

  const fotos: FotoProduto[] = [
    ...produto.media.map((m) => ({
      url: m.media.url,
      alt: m.alt || m.media.alt || produto.name,
    })),
    ...(unidade?.media.map((m) => ({
      url: m.media.url,
      alt: m.media.alt || `${produto.name} — unidade à venda`,
      daUnidade: true,
    })) ?? []),
  ];

  /* -------------------------------------------------------------- compra */

  const addons: AddonProduto[] = produto.addons.map((a) => ({
    serviceId: a.serviceId,
    nome: a.service.name,
    descricao: a.service.description,
    // O produto sobrescreve o preço do serviço; sem sobrescrita vale o padrão.
    precoCents: a.priceCents ?? a.service.priceCents,
    obrigatorio: a.required,
  }));

  const servicos: ServicoDoProduto[] = produto.addons.map((a) => ({
    serviceId: a.serviceId,
    slug: a.service.slug,
    nome: a.service.name,
    descricao: a.service.description,
    tipo: a.service.kind,
    precoCents: a.priceCents ?? a.service.priceCents,
    obrigatorio: a.required,
  }));

  // O mesmo teto do checkout: prometer 12× aqui e oferecer 6× lá seria mentira
  // de vitrine. Os dois leem a configuração da loja.
  const maxParcelas = Math.min(12, Math.max(1, Number(s.parcelas_max) || 1));
  const minParcelaCents = paraCentavos(s.parcela_minima);

  const hrefOrcamento = `/orcamento?tipo=compra&item=${encodeURIComponent(produto.name)}`;
  const hrefWhatsapp = s.whatsapp
    ? whatsappHref(
        s.whatsapp,
        `Olá! Tenho uma dúvida sobre o equipamento ${produto.name} (SKU ${produto.sku}).`,
      )
    : "";

  const garantiaMeses = unidade?.warrantyMonths ?? produto.warrantyMonths ?? null;

  /* ------------------------------------------------------------- detalhes */

  const grupos = agruparEspecificacoes(produto.specs);
  const documentos = produto.documents.map((documento) => ({
    id: documento.id,
    titulo: documento.title,
    url: documento.url,
    tipo: documento.kind,
  }));

  const temMedidas = Boolean(
    produto.widthMm || produto.heightMm || produto.depthMm || produto.weightGrams,
  );
  const temRegulatorio = Boolean(
    produto.anvisaCode || produto.manufacturer || produto.regulatoryHolder || produto.regulatoryNote,
  );
  const descricao = produto.description.trim();
  // `<p></p>` vindo do editor tem comprimento, mas não tem conteúdo: sem tirar
  // a marcação, a página abriria um título "Sobre este equipamento" vazio.
  const temDescricao = textoLimpo(descricao, 4000).length > 0;
  const temFicha = grupos.length > 0 || temMedidas || temRegulatorio;
  const temColunaDeApoio = temFicha || documentos.length > 0;

  /* ---------------------------------------------------------------- trilha */

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Equipamentos", href: "/loja" },
    ...(produto.category
      ? [{ rotulo: produto.category.name, href: `/categoria/${produto.category.slug}` }]
      : []),
    { rotulo: produto.name },
  ];

  /* ------------------------------------------------------ dados estruturados */

  const dadosDoProduto: DadosJsonLd = produtoJsonLd({
    nome: produto.name,
    caminho,
    sku: produto.sku,
    modelo: produto.model,
    descricao: produto.shortDescription || descricao,
    imagens: fotos.map((foto) => foto.url),
    marca: produto.brand?.name,
    fabricante: produto.manufacturer,
    condicao: produto.condition,
    precoCents: produto.priceCents,
    aVenda: produto.allowDirectPurchase,
    disponivel: !semEstoque,
    garantiaMeses,
    vendedor: s.empresa_nome,
  });

  // Fora de linha é diferente de "sem estoque": o buscador precisa ler
  // Discontinued. O construtor genérico não conhece esse estado, então a oferta
  // é ajustada aqui — sem reescrever o resto do objeto na mão.
  if (arquivado) {
    const oferta = dadosDoProduto.offers;
    if (oferta && typeof oferta === "object" && !Array.isArray(oferta)) {
      dadosDoProduto.offers = {
        ...oferta,
        availability: "https://schema.org/Discontinued",
      };
    }
  }

  const estruturados: DadosJsonLd[] = [trilhaJsonLd(trilha), dadosDoProduto];
  if (produto.faqs.length > 0) {
    estruturados.push(
      faqJsonLd(produto.faqs.map((faq) => ({ pergunta: faq.question, resposta: faq.answer }))),
    );
  }

  return (
    <>
      {/* Tudo do próprio catálogo — nada de nota ou avaliação inventada.
          JsonLd escapa "<": nome de produto com "</script>" fecharia a tag. */}
      <JsonLd dados={estruturados} />

      {/* ======================================================= IDENTIDADE */}
      {/* `espaco="nenhum"` de propósito: o respiro é escrito aqui inteiro, para
          o `pb` não disputar com o `md:py` do preset e perder no desktop. */}
      <Secao como="div" espaco="nenhum" className="pt-6 pb-14 lg:pt-8 lg:pb-20">
        <Trilha itens={trilha} className="mb-6 lg:mb-8" />

        <IdentidadeProduto
          nome={produto.name}
          modelo={produto.model}
          sku={produto.sku}
          numeroDeSerie={unidade?.serialNumber ?? null}
          condicao={produto.condition}
          definicaoDaCondicao={definicao}
          marca={
            produto.brand
              ? {
                  nome: produto.brand.name,
                  slug: produto.brand.slug,
                  logo: produto.brand.logo
                    ? {
                        url: produto.brand.logo.url,
                        alt: produto.brand.logo.alt || produto.brand.name,
                        largura: produto.brand.logo.width,
                        altura: produto.brand.logo.height,
                      }
                    : null,
                }
              : null
          }
          categoria={
            produto.category
              ? { nome: produto.category.name, slug: produto.category.slug }
              : null
          }
          resumo={produto.shortDescription}
        />

        <div className="mt-10 grid gap-8 lg:mt-12 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-7">
            <GaleriaProduto fotos={fotos} nome={produto.name} />
          </div>

          <div className="min-w-0 space-y-5 lg:col-span-5">
            {arquivado ? (
              <ForaDeLinha hrefOrcamento={hrefOrcamento} hrefWhatsapp={hrefWhatsapp} />
            ) : (
              <CaixaCompra
                produtoId={produto.id}
                precoCents={produto.priceCents}
                compareAtCents={produto.compareAtCents}
                permiteCompra={produto.allowDirectPurchase}
                permiteOrcamento={produto.allowQuoteRequest}
                estoque={produto.stock}
                controlaEstoque={produto.trackInventory}
                unico={produto.unique}
                addons={addons}
                hrefOrcamento={hrefOrcamento}
                maxParcelas={maxParcelas}
                minParcelaCents={minParcelaCents}
              />
            )}

            {!arquivado && semEstoque ? (
              <SemEstoque
                unico={produto.unique}
                hrefAlternativas={
                  produto.condition === "novo"
                    ? "/loja"
                    : produto.condition === "seminovo"
                      ? "/seminovos"
                      : produto.condition === "recondicionado"
                        ? "/recondicionados"
                        : "/usados"
                }
              />
            ) : null}

            <CondicoesDeCompra
              garantiaMeses={garantiaMeses}
              garantiaDaUnidade={Boolean(unidade?.warrantyMonths)}
              frete={
                produto.shippingProfile
                  ? {
                      nome: produto.shippingProfile.name,
                      tipo: produto.shippingProfile.kind,
                      descricao: produto.shippingProfile.description,
                      gratisAcimaCents: produto.shippingProfile.freeAboveCents,
                    }
                  : null
              }
              retirada={
                ligado(s.retirada_disponivel)
                  ? s.retirada_instrucoes.trim() || null
                  : null
              }
              voltagem={produto.voltage}
            />

            <AjudaDaEquipe
              nomeDoProduto={produto.name}
              sku={produto.sku}
              telefone={s.telefone}
              whatsapp={s.whatsapp}
              email={s.email}
              horario={s.horario}
            />
          </div>
        </div>
      </Secao>

      {/* ================================================ POR QUE NA JB */}
      {arquivado ? null : (
        <MotivosJB
          desde={s.empresa_desde}
          cidade={s.endereco_cidade}
          uf={s.endereco_uf}
          garantiaMeses={garantiaMeses}
          temServicos={servicos.length > 0}
        />
      )}

      {/* ==================================================== UNIDADE FÍSICA */}
      {unidade ? (
        <Secao espaco="lg" separador>
          <UnidadeFisica
            condicao={produto.condition}
            numeroDeSerie={unidade.serialNumber}
            anoDeFabricacao={unidade.manufactureYear}
            horasDeUso={unidade.usageHours}
            ciclos={unidade.usageCycles}
            garantiaMeses={unidade.warrantyMonths}
            notasDeEstado={unidade.conditionNotes}
            notasDeInspecao={unidade.inspectionNotes}
            checklist={checklist}
            vendida={unidade.status === "vendido"}
          />
        </Secao>
      ) : null}

      {/* ========================================= DESCRIÇÃO E FICHA TÉCNICA */}
      {temDescricao || temColunaDeApoio ? (
        <Secao espaco="lg" separador>
          <div
            className={cn(
              "grid gap-12 lg:gap-16",
              temDescricao && temColunaDeApoio && "lg:grid-cols-12",
            )}
          >
            {temDescricao ? (
              <div className={temColunaDeApoio ? "min-w-0 lg:col-span-7" : "max-w-3xl"}>
                <TituloSecao como="h2" tamanho="titulo" titulo="Sobre este equipamento" />
                <div
                  /* `max-w-full` na imagem do editor: conteúdo migrado do site
                     antigo traz `width` fixo, que estouraria a coluna no
                     celular e daria rolagem horizontal na página. */
                  className="prose-jb mt-5 [&_img]:h-auto [&_img]:max-w-full"
                  /* Saneado na exibição além da gravação: descrição migrada do
                     site antigo nunca passou pela lista branca, e esta é a
                     única página pública que renderiza HTML de editor. */
                  dangerouslySetInnerHTML={{ __html: sanitizarHtml(produto.description) }}
                />
              </div>
            ) : null}

            {temColunaDeApoio ? (
              <div className={temDescricao ? "min-w-0 lg:col-span-5" : "max-w-3xl"}>
                {temFicha ? (
                  <>
                    <TituloSecao
                      como="h2"
                      tamanho="titulo"
                      titulo="Ficha técnica"
                      className="mb-5"
                    />
                    <div className="space-y-4">
                      <FichaTecnica grupos={grupos} />
                      <MedidasEPeso
                        larguraMm={produto.widthMm}
                        alturaMm={produto.heightMm}
                        profundidadeMm={produto.depthMm}
                        pesoG={produto.weightGrams}
                      />
                      <Regulatorio
                        codigoAnvisa={produto.anvisaCode}
                        fabricante={produto.manufacturer}
                        detentor={produto.regulatoryHolder}
                        observacao={produto.regulatoryNote}
                      />
                    </div>
                  </>
                ) : null}

                {documentos.length > 0 ? (
                  <div className={temFicha ? "mt-8" : undefined}>
                    <Documentacao documentos={documentos} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </Secao>
      ) : null}

      {/* ================================================== SERVIÇOS DA JB */}
      {servicos.length > 0 && !arquivado ? (
        <Secao fundo="clara" espaco="lg" separador>
          <TituloSecao
            sobretitulo="Equipe técnica JB"
            titulo="O que a JB faz neste equipamento"
            descricao="Cada serviço é executado pela equipe da própria JB e entra no mesmo pedido do equipamento — é só marcar antes de adicionar ao carrinho."
          />
          <div className="mt-8 lg:mt-10">
            <ServicosDoProduto servicos={servicos} />
          </div>
        </Secao>
      ) : null}

      {/* ============================================================= FAQ */}
      {produto.faqs.length > 0 ? (
        <Secao espaco="lg" largura="estreita" separador>
          <TituloSecao como="h2" titulo="Dúvidas sobre este equipamento" />
          <div className="mt-8">
            <PerguntasDoProduto
              perguntas={produto.faqs.map((faq) => ({
                id: faq.id,
                pergunta: faq.question,
                resposta: faq.answer,
              }))}
            />
          </div>
        </Secao>
      ) : null}

      {/* ==================================================== RELACIONADOS */}
      <Secao fundo="clara" espaco="lg" separador>
        {/* Título neutro de propósito: a lista mistura relação cadastrada com
            complemento por categoria e marca. Chamar tudo de "substituto"
            afirmaria uma equivalência técnica que ninguém registrou. */}
        <TituloSecao como="h2" titulo="Equipamentos relacionados" />
        <div className="mt-8 lg:mt-10">
          <Suspense fallback={<EsqueletoRelacionados />}>
            <Relacionados
              produtoId={produto.id}
              categoriaId={produto.categoryId}
              marcaId={produto.brandId}
              escolhidos={produto.relatedFrom
                .map((relacao) => relacao.target)
                .filter((alvo) => alvo.status === "active")}
            />
          </Suspense>
        </div>
      </Secao>

      {/* ==================================================== ASSISTÊNCIA */}
      <AssistenciaRelacionada desde={s.empresa_desde} cidade={s.endereco_cidade} />
    </>
  );
}

/* ==========================================================================
   Relacionados

   As relações cadastradas à mão vêm primeiro — foi a JB que disse que um
   equipamento substitui o outro. Só o que faltar para fechar quatro cartões é
   completado por categoria e marca.
   ========================================================================== */

async function Relacionados({
  produtoId,
  categoriaId,
  marcaId,
  escolhidos,
}: {
  produtoId: string;
  categoriaId: string | null;
  marcaId: string | null;
  escolhidos: LinhaRelacionada[];
}) {
  const manuais = escolhidos.slice(0, 4);
  const faltam = 4 - manuais.length;

  const complemento =
    faltam > 0 && (categoriaId || marcaId)
      ? await prisma.product.findMany({
          where: {
            status: "active",
            id: { notIn: [produtoId, ...manuais.map((item) => item.id)] },
            OR: [
              ...(categoriaId ? [{ categoryId: categoriaId }] : []),
              ...(marcaId ? [{ brandId: marcaId }] : []),
            ],
          },
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
          take: faltam,
          select: SELECAO_CARD,
        })
      : [];

  const produtos = [...manuais.map(paraCard), ...complemento.map(paraCard)];

  if (produtos.length === 0) {
    return (
      <p className="text-base leading-relaxed text-graf-600">
        Ainda não há outro equipamento parecido publicado.{" "}
        <Link
          href="/loja"
          className="foco-jb font-semibold text-jb-700 underline underline-offset-4 hover:text-jb-500"
        >
          Ver o catálogo completo
        </Link>
        .
      </p>
    );
  }

  return <GradeProdutos produtos={produtos} />;
}

function EsqueletoRelacionados() {
  return (
    <div
      role="status"
      aria-label="Carregando equipamentos relacionados"
      className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, indice) => (
        <EsqueletoCartaoProduto key={indice} />
      ))}
    </div>
  );
}
