import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CaixaCompra, type AddonProduto } from "@/components/loja/caixa-compra";
import { GaleriaProduto, type FotoProduto } from "@/components/loja/galeria-produto";
import { GradeMarketplace } from "@/components/loja/marketplace/grade-marketplace";
import {
  AcoesDoProduto,
  AcoesDoProdutoEsqueleto,
} from "@/components/loja/produto/acoes-do-produto";
import { AjudaDaEquipe } from "@/components/loja/produto/ajuda-da-equipe";
import {
  AntesDeComprar,
  DepoisDaCompraNoProduto,
  Instalacao,
  OQueVemNaCaixa,
} from "@/components/loja/produto/antes-e-depois";
import { BlocoDecisao } from "@/components/loja/produto/bloco-decisao";
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
import { FaixaConfianca } from "@/components/loja/produto/faixa-confianca";
import { ResumoTecnicoProduto } from "@/components/loja/produto/resumo-tecnico";
import { TopoMarketplace } from "@/components/loja/produto/topo-marketplace";
import {
  BarraCompraMobile,
  NavegacaoDoProduto,
  type AncoraDoProduto,
} from "@/components/loja/produto/navegacao-do-produto";
import { PerguntarSobreProduto } from "@/components/loja/produto/perguntar";
import { PerguntasDoProduto } from "@/components/loja/produto/perguntas";
import {
  ServicosDoProduto,
  type ServicoDoProduto,
} from "@/components/loja/produto/servicos-do-produto";
import type { CertificadoDaUnidade } from "@/components/loja/produto/selo-certificado";
import { SeloCertificado } from "@/components/loja/produto/selo-certificado";
import { UnidadeFisica } from "@/components/loja/produto/unidade-fisica";
import {
  RegistrarVisita,
  VistosRecentemente,
} from "@/components/loja/vistos-recentemente";
import { Trilha } from "@/components/ui/data";
import { EsqueletoCartaoProduto } from "@/components/ui/esqueletos";
import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import { paraCardMarketplace, SELECAO_CARD_MARKETPLACE } from "@/lib/catalogo";
import {
  certificacaoPublicada,
  contarChecklist,
  frasedaVerificacao,
} from "@/lib/certificacao";
import { calcularParcelas, paraCentavos, whatsappHref } from "@/lib/format";
import {
  faqJsonLd,
  JsonLd,
  metadataDePagina,
  politicaDeDevolucao,
  produtoJsonLd,
  textoLimpo,
  trilhaJsonLd,
  type DadosJsonLd,
} from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";
import { destaquesDaPdp } from "@/lib/marketplace/resumo-produto";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

/**
 * Página de um equipamento.
 *
 * A primeira dobra é a compra: galeria à esquerda em cima, a coluna que decide
 * à direita atravessando as duas linhas — marca, nome, identificadores, preço,
 * disponibilidade e botão — e, fechando o vão debaixo da foto, as condições da
 * compra e o caminho para falar com a equipe. Essa divisão não é estética: com
 * tudo empilhado à direita, a coluna media quase o dobro da imagem e sobrava
 * meia tela branca embaixo dela em toda ficha.
 *
 * Abaixo da dobra a ordem segue a decisão de quem compra equipamento caro:
 * o que é (descrição), quanto entrega (ficha técnica), o que preciso ter e o
 * que vem depois (antes e depois da compra), por que aqui (motivos), o que a
 * equipe faz junto (serviços), o que ainda ficou em dúvida, o que mais existe
 * e a assistência que continua depois da entrega.
 *
 * Confiança vem DEPOIS da ficha técnica, de propósito: "por que comprar na JB"
 * antes de a pessoa saber o que o equipamento faz é argumento no vazio.
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
  ...SELECAO_CARD_MARKETPLACE,
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
      /* As faixas entram porque o dado estruturado declara preço e prazo POR
         faixa de CEP. Sem elas só restaria a alternativa que o escopo proíbe:
         publicar um valor único de frete que na verdade depende do CEP. */
      shippingProfile: { include: { zones: { orderBy: { order: "asc" } } } },
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

  /* ------------------------------------------------------ certificação

     A certificação é da UNIDADE, não do produto: duas autoclaves do mesmo
     modelo têm desgastes diferentes, e um selo no SKU afirmaria sobre a
     segunda o que só foi verificado na primeira. Por isso a leitura só
     acontece quando existe uma unidade identificada — e só o estado
     "publicada" aparece, que é o que `certificacaoPublicada` filtra.

     A contagem NÃO é recontada aqui: `itemsTotal` e `itemsApproved` foram
     carimbados no fechamento da inspeção, e recontar agora daria outro número
     se o checklist tivesse mudado de versão desde então. */
  const certificacao = unidade ? await certificacaoPublicada(unidade.id) : null;

  const certificado: CertificadoDaUnidade | null = certificacao
    ? {
        codigoPublico: certificacao.publicCode,
        /* A contagem sai do MESMO lugar que /verificar usa — os itens do
           checklist da unidade. As duas telas precisam dizer o mesmo número:
           ler o carimbo aqui e recontar lá faria a ficha e o certificado
           discordarem se o checklist tivesse mudado de versão. */
        frase: frasedaVerificacao(contarChecklist(unidade?.checklist ?? [])),
        itensAprovados: certificacao.itemsApproved,
        itensTotal: certificacao.itemsTotal,
        resumo: certificacao.summary,
        inspecionadoEm: certificacao.inspectedAt,
        tecnico: certificacao.technician?.name ?? null,
      }
    : null;

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

  /* O valor da instalação sai do adicional cadastrado, e não de um número
     escrito na página: `ProductAddon.priceCents` sobrepõe o preço do serviço
     quando definido, e é essa a regra que o carrinho também usa. */
  const adicionalDeInstalacao = produto.addons.find(
    (adicional) => adicional.service.kind === "instalacao",
  );
  const precoDaInstalacao =
    adicionalDeInstalacao?.priceCents ?? adicionalDeInstalacao?.service.priceCents ?? null;
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
  const tamanhoDaDescricao = textoLimpo(descricao, 4000).length;
  const temDescricao = tamanhoDaDescricao > 0;
  // A faixa da ficha técnica tem duas colunas — especificações à esquerda,
  // medidas, regulatório e documentos à direita. Quando só um dos lados tem
  // conteúdo, a faixa vira coluna única em vez de deixar metade da tela vazia.
  const temEspecificacoes = grupos.length > 0;
  const temApoioTecnico = temMedidas || temRegulatorio || documentos.length > 0;
  const temFichaTecnica = temEspecificacoes || temApoioTecnico;
  const duasColunasNaFicha = temEspecificacoes && temApoioTecnico;

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
    gtin: produto.gtin,
    mpn: produto.mpn,
    /* Perfil sob orçamento não declara entrega nenhuma: o preço dele não
       existe ainda. Faixa sem preço também fica de fora — zero real é outra
       coisa, e o perfil "grátis" tem tipo próprio. */
    entrega:
      produto.shippingProfile && produto.shippingProfile.kind !== "sob_orcamento"
        ? produto.shippingProfile.zones.map((faixa) => ({
            cepInicio: faixa.zipStart,
            cepFim: faixa.zipEnd,
            valorCents: produto.shippingProfile?.kind === "gratis" ? 0 : faixa.priceCents,
            prazoDias: faixa.etaDays,
          }))
        : undefined,
    devolucao: politicaDeDevolucao(s),
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

  /* ------------------------------------------------------------- âncoras

     A faixa de navegação só lista o que a página realmente tem. Uma âncora
     para uma seção que não foi renderizada leva a lugar nenhum — e é
     exatamente o defeito que o menu de abas costuma esconder. A ordem aqui é
     a ordem do documento, porque é ela que o destaque da seção ativa segue. */
  const ancoras: AncoraDoProduto[] = [
    { id: "visao-geral", rotulo: "Visão geral" },
    ...(unidade ? [{ id: "unidade", rotulo: "Esta unidade" }] : []),
    ...(temDescricao ? [{ id: "sobre", rotulo: "Sobre" }] : []),
    ...(temFichaTecnica ? [{ id: "ficha-tecnica", rotulo: "Ficha técnica" }] : []),
    { id: "preparo", rotulo: "Preparo" },
    { id: "entrega-e-garantia", rotulo: "Entrega e suporte" },
    ...(arquivado ? [] : [{ id: "duvidas", rotulo: "Dúvidas" }]),
    { id: "relacionados", rotulo: "Relacionados" },
  ];

  const temFrete = Boolean(
    produto.shippingProfile && produto.shippingProfile.kind !== "nao_aplicavel",
  );
  const temInstalacao = !["nao_informada", "nao_oferecida"].includes(
    produto.installationPolicy,
  );

  /* A barra do celular repete o preço, então repete a MESMA conta de
     parcelamento da caixa de compra — dois números diferentes para a mesma
     compra, na mesma tela, seria erro de confiança e não de layout. */
  const parcelasDaBarra =
    produto.allowDirectPurchase && produto.priceCents > 0
      ? calcularParcelas(produto.priceCents, maxParcelas, minParcelaCents)
      : null;

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

      {/* ==================================================== PRIMEIRA DOBRA */}
      <TopoMarketplace
        trilha={<Trilha itens={trilha} />}
        galeria={<GaleriaProduto fotos={fotos} nome={produto.name} />}
        resumo={
          <ResumoTecnicoProduto
            nome={produto.name}
            resumo={produto.shortDescription}
            modelo={produto.model}
            sku={produto.sku}
            codigoDoFabricante={produto.mpn}
            gtin={produto.gtin}
            numeroDeSerie={unidade?.serialNumber ?? null}
            condicao={produto.condition}
            definicao={definicao}
            marca={produto.brand ? { nome: produto.brand.name, slug: produto.brand.slug } : null}
            categoria={
              produto.category
                ? { nome: produto.category.name, slug: produto.category.slug }
                : null
            }
            destaques={destaquesDaPdp({
              specs: produto.specs,
              voltage: produto.voltage,
              warrantyMonths: garantiaMeses,
              anvisaCode: produto.anvisaCode,
            })}
          />
        }
        acoes={
          arquivado ? null : (
            <Suspense fallback={<AcoesDoProdutoEsqueleto />}>
              <AcoesDoProduto
                produtoId={produto.id}
                nome={produto.name}
                slug={produto.slug}
              />
            </Suspense>
          )
        }
        compra={
          <>
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
                garantia={
                  garantiaMeses && garantiaMeses > 0
                    ? { meses: garantiaMeses, daUnidade: Boolean(unidade?.warrantyMonths) }
                    : null
                }
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

            {certificado ? <SeloCertificado certificado={certificado} /> : null}
          </>
        }
      />

      <FaixaConfianca
        certificado={Boolean(certificado)}
        garantiaMeses={garantiaMeses}
        temFrete={temFrete}
        temInstalacao={temInstalacao}
      />

      {/* ============================================ NAVEGAÇÃO DAS SEÇÕES */}
      {/* Fora de qualquer `Secao`: o `sticky` precisa de um pai que atravesse
          o resto da página, e cada faixa termina no fim de si mesma. */}
      <NavegacaoDoProduto ancoras={ancoras} />

      {/* ==================================================== UNIDADE FÍSICA */}
      {/* A faixa vem montada de dentro do componente: sem nenhum campo da
          unidade preenchido ela some inteira, em vez de sobrar uma tira vazia. */}
      {unidade ? (
        <UnidadeFisica
          id="unidade"
          condicao={produto.condition}
          numeroDeSerie={unidade.serialNumber}
          anoDeFabricacao={unidade.manufactureYear}
          horasDeUso={unidade.usageHours}
          ciclos={unidade.usageCycles}
          garantiaMeses={unidade.warrantyMonths}
          notasDeEstado={unidade.conditionNotes}
          notasDeInspecao={unidade.inspectionNotes}
          checklist={checklist}
          certificado={certificado}
          vendida={unidade.status === "vendido"}
        />
      ) : null}

      <div className="container-jb max-w-[112rem]">
        {/* ======================================================== DESCRIÇÃO */}
        {temDescricao ? (
          <BlocoDecisao
            id="sobre"
            titulo="Sobre este equipamento"
            resumo="Uma visão direta do uso e da proposta deste modelo."
          >
            <div
              className="prose-jb max-w-[68ch] [&_img]:h-auto [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitizarHtml(produto.description) }}
            />
          </BlocoDecisao>
        ) : null}

        {/* ==================================================== FICHA TÉCNICA */}
        {temFichaTecnica ? (
          <BlocoDecisao
            id="ficha-tecnica"
            titulo="Ficha técnica"
            resumo="Dados para comparar compatibilidade, instalação e operação."
          >
            <div className={duasColunasNaFicha ? "grid gap-8 xl:grid-cols-2" : "max-w-3xl"}>
              {temEspecificacoes ? <FichaTecnica grupos={grupos} /> : null}

              {temApoioTecnico ? (
                <div className="min-w-0 space-y-7">
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
                  <Documentacao documentos={documentos} />
                </div>
              ) : null}
            </div>
          </BlocoDecisao>
        ) : null}

        {/* ================================================ PREPARO DA CLÍNICA */}
        <BlocoDecisao
          id="preparo"
          titulo="Antes de instalar"
          resumo="Espaço, infraestrutura, itens inclusos e o que acontece depois da compra."
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <AntesDeComprar
              dados={{
                voltagem: produto.voltage,
                pesoGramas: produto.weightGrams,
                larguraMm: produto.widthMm,
                alturaMm: produto.heightMm,
                profundidadeMm: produto.depthMm,
                requisitos: produto.infrastructureNotes,
              }}
            />
            <OQueVemNaCaixa itens={produto.boxContents} />
            <Instalacao
              politica={produto.installationPolicy}
              observacao={produto.installationNote}
              precoCents={precoDaInstalacao}
            />
            <DepoisDaCompraNoProduto
              garantiaMeses={produto.warrantyMonths}
              geraEquipamento={produto.condition !== "novo" || produto.trackInventory}
            />
          </div>
        </BlocoDecisao>

        {/* =========================================== ENTREGA, GARANTIA, SUPORTE */}
        <BlocoDecisao
          id="entrega-e-garantia"
          titulo="Entrega e suporte"
          resumo="Condições objetivas e acesso direto à equipe que conhece o equipamento."
        >
          <div className="grid gap-5 xl:grid-cols-2">
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
                ligado(s.retirada_disponivel) ? s.retirada_instrucoes.trim() || null : null
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

          {servicos.length > 0 && !arquivado ? (
            <div className="mt-7 border-t border-graf-200 pt-7">
              <h3 className="text-lg font-extrabold text-graf-950">
                Serviços disponíveis para este equipamento
              </h3>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-graf-600">
                Podem entrar no mesmo pedido, sempre com valores separados e execução pela JB.
              </p>
              <div className="mt-5">
                <ServicosDoProduto servicos={servicos} />
              </div>
            </div>
          ) : null}
        </BlocoDecisao>

        {/* ============================================================= FAQ */}
        {arquivado ? null : (
          <BlocoDecisao
            id="duvidas"
            titulo="Dúvidas"
            resumo="Respostas técnicas e um canal para perguntar sobre este modelo."
          >
            <div className={produto.faqs.length > 0 ? "grid gap-6 xl:grid-cols-2" : "max-w-3xl"}>
              {produto.faqs.length > 0 ? (
                <PerguntasDoProduto
                  perguntas={produto.faqs.map((faq) => ({
                    id: faq.id,
                    pergunta: faq.question,
                    resposta: faq.answer,
                  }))}
                />
              ) : null}
              <PerguntarSobreProduto produtoId={produto.id} nomeDoProduto={produto.name} />
            </div>
          </BlocoDecisao>
        )}

        {/* ===================================================== RELACIONADOS */}
        <BlocoDecisao
          id="relacionados"
          titulo="Equipamentos relacionados"
          resumo="Outras opções da mesma categoria ou marca para comparar."
        >
          <Suspense fallback={<EsqueletoRelacionados />}>
            <Relacionados
              produtoId={produto.id}
              categoriaId={produto.categoryId}
              marcaId={produto.brandId}
              maxParcelas={maxParcelas}
              minParcelaCents={minParcelaCents}
              escolhidos={produto.relatedFrom
                .map((relacao) => relacao.target)
                .filter((alvo) => alvo.status === "active")}
            />
          </Suspense>
        </BlocoDecisao>
      </div>

      {/* ================================================ VISTOS RECENTEMENTE */}
      {/* Registro da visita e a tira do que já foi visto. Os dois só existem no
          navegador de quem está lendo — nenhum histórico de navegação de
          visitante entra no banco. */}
      <RegistrarVisita slug={produto.slug} />
      <VistosRecentemente excluir={produto.slug} />

      {/* ============================================ BARRA DE COMPRA (CELULAR) */}
      {/* No desktop a caixa de compra fica grudada e nunca sai da tela; no
          celular ela sobe com a rolagem. Esta barra devolve preço e caminho de
          volta — sem duplicar a escolha de serviço e quantidade. */}
      <BarraCompraMobile
        precoCents={produto.priceCents}
        parcelas={parcelasDaBarra}
        soOrcamento={!produto.allowDirectPurchase || produto.priceCents <= 0}
        indisponivel={arquivado || semEstoque}
      />
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
  maxParcelas,
  minParcelaCents,
  escolhidos,
}: {
  produtoId: string;
  categoriaId: string | null;
  marcaId: string | null;
  maxParcelas: number;
  minParcelaCents: number;
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
          select: SELECAO_CARD_MARKETPLACE,
        })
      : [];

  const produtos = [
    ...manuais.map(paraCardMarketplace),
    ...complemento.map(paraCardMarketplace),
  ];

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

  return (
    <GradeMarketplace
      produtos={produtos}
      parcelamento={{ max: maxParcelas, minimoCents: minParcelaCents }}
      className={
        produtos.length === 1
          ? "max-w-[18rem] !grid-cols-1"
          : produtos.length === 2
            ? "max-w-[38rem] !grid-cols-2"
            : produtos.length === 3
              ? "max-w-5xl xl:!grid-cols-3"
              : undefined
      }
    />
  );
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
