import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Wrench } from "lucide-react";

import { CaixaCompra, type AddonProduto } from "@/components/loja/caixa-compra";
import { GaleriaProduto, type FotoProduto } from "@/components/loja/galeria-produto";
import { GradeProdutos } from "@/components/loja/card-produto";
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
import { Trilha, TituloSecao } from "@/components/ui/data";
import { EsqueletoCartaoProduto } from "@/components/ui/esqueletos";
import { Secao } from "@/components/ui/secao";
import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import { paraCard, SELECAO_CARD } from "@/lib/catalogo";
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
import { colunasAte } from "@/components/ui/grade";

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
 * A primeira dobra é a compra: galeria grande à esquerda, e à direita a coluna
 * que decide — marca, nome, identificadores, preço, disponibilidade, botão,
 * condições e o caminho para falar com a equipe. Essa coluna tem UMA moldura
 * (a caixa de compra); o resto corre em fio fino, para a página não abrir com
 * quatro cartões empilhados.
 *
 * Abaixo da dobra a página vira faixa, não pilha de cartão: por que na JB, a
 * unidade física quando existe, a descrição em coluna de leitura, a ficha
 * técnica, os serviços da equipe, as dúvidas, os equipamentos relacionados e a
 * assistência que continua depois da entrega. Cada faixa alterna o fundo e tem
 * título próprio.
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
  /* O espaçamento grande foi feito para uma descrição de verdade. Com uma ou
     duas frases — que é o que boa parte do catálogo tem hoje — sobravam 224px
     de respiro para 105px de conteúdo, e a seção virava um vão no meio da
     página. Descrição curta usa o passo menor da mesma escala. */
  const descricaoLonga = tamanhoDaDescricao >= 400;

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
    { id: "antes-de-comprar", rotulo: "Antes de comprar" },
    ...(temFichaTecnica ? [{ id: "ficha-tecnica", rotulo: "Ficha técnica" }] : []),
    ...(servicos.length > 0 && !arquivado
      ? [{ id: "servicos-jb", rotulo: "Serviços da JB" }]
      : []),
    ...(arquivado ? [] : [{ id: "duvidas", rotulo: "Dúvidas" }]),
    { id: "relacionados", rotulo: "Relacionados" },
  ];

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
      {/* `espaco="nenhum"` de propósito: o respiro é escrito aqui inteiro, para
          o `pb` não disputar com o `md:py` do preset e perder no desktop. */}
      <Secao
        como="div"
        id="visao-geral"
        espaco="nenhum"
        className="scroll-mt-36 pt-6 pb-16 lg:pt-8 lg:pb-24"
      >
        <Trilha itens={trilha} className="mb-6 lg:mb-8" />

        {/* A ordem do DOM é a do celular: nome e condição, depois a foto,
            depois o preço. No desktop as posições explícitas montam o outro
            desenho — galeria à esquerda ocupando as duas linhas, identidade e
            compra empilhadas na coluna da direita. */}
        <div className="grid gap-y-8 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10 xl:gap-x-16">
          <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-start-1">
            <IdentidadeProduto
              nome={produto.name}
              modelo={produto.model}
              sku={produto.sku}
              codigoDoFabricante={produto.mpn}
              gtin={produto.gtin}
              codigoAnvisa={produto.anvisaCode}
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

            {/* Guardar e comparar ficam com a identidade, não com o preço: são
                gestos de quem ainda está decidindo, e a caixa de compra é de
                quem já decidiu. O `<Suspense>` mantém a casca prerenderizada —
                só o estado do favorito depende de sessão. */}
            {arquivado ? null : (
              <div className="mt-5">
                <Suspense fallback={<AcoesDoProdutoEsqueleto />}>
                  <AcoesDoProduto
                    produtoId={produto.id}
                    nome={produto.name}
                    slug={produto.slug}
                  />
                </Suspense>
              </div>
            )}
          </div>

          {/* NADA gruda nesta página.

              A galeria já foi `sticky`, com o argumento de que a foto deve
              acompanhar cada decisão que a coluna de compra pede. O argumento é
              bom no papel e ruim na tela: a pessoa rola, o texto anda e a foto
              não, e a página inteira dá a impressão de estar travada. Foi a
              primeira coisa que apareceu na revisão, duas vezes.

              `self-start` fica: sem ele o `stretch` padrão de item de grade
              estica a célula da foto até a altura da coluna da direita, e sobra
              meia tela branca embaixo da imagem. */}
          <div className="min-w-0 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
            <GaleriaProduto fotos={fotos} nome={produto.name} />
          </div>

          <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-start-2">
            {/* Esta coluna também rola. Antes as duas grudavam, e a primeira
                dobra inteira parecia congelada; depois só a galeria grudou, e
                a foto continuava parada enquanto o texto andava. As duas
                rolando, a página se move como página. */}
            <div id="caixa-de-compra" className="scroll-mt-32 space-y-8">
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

              {/* O selo fica na coluna que decide, não só na faixa lá
                  embaixo: quem está olhando o preço de um seminovo está
                  pesando exatamente o risco que ele responde. */}
              {certificado ? <SeloCertificado certificado={certificado} /> : null}

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

              {/* Atalho para quem já tem o equipamento e caiu aqui procurando
                  conserto — sem virar mais um cartão na coluna. */}
              <Link
                href="/assistencia-tecnica"
                className="foco-jb group inline-flex min-h-11 items-center gap-2 rounded-md text-[0.9375rem] font-semibold text-jb-700 transition-colors duration-150 hover:text-jb-500"
              >
                <Wrench className="size-4 shrink-0" aria-hidden />
                Já tem este equipamento? Ver assistência técnica
                <ArrowRight
                  className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </div>
      </Secao>

      {/* ============================================ NAVEGAÇÃO DAS SEÇÕES */}
      {/* Fora de qualquer `Secao`: o `sticky` precisa de um pai que atravesse
          o resto da página, e cada faixa termina no fim de si mesma. */}
      <NavegacaoDoProduto ancoras={ancoras} />

      {/* ====================================================== POR QUE NA JB */}
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

      {/* ========================================================== DESCRIÇÃO */}
      {temDescricao ? (
        <Secao
          id="sobre"
          fundo="afundada"
          espaco={descricaoLonga ? "lg" : "md"}
          separador
          className="scroll-mt-32"
        >
          {/* Título de um lado, texto do outro em medida curta: texto corrido
              em 1400px de largura ninguém lê. */}
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="text-section texto-forte">Sobre este equipamento</h2>
            </div>
            <div className="min-w-0 lg:col-span-8">
              <div
                /* `max-w-full` na imagem do editor: conteúdo migrado do site
                   antigo traz `width` fixo, que estouraria a coluna no
                   celular e daria rolagem horizontal na página. */
                className="prose-jb max-w-[68ch] [&_img]:h-auto [&_img]:max-w-full"
                /* Saneado na exibição além da gravação: descrição migrada do
                   site antigo nunca passou pela lista branca, e esta é a
                   única página pública que renderiza HTML de editor. */
                dangerouslySetInnerHTML={{ __html: sanitizarHtml(produto.description) }}
              />
            </div>
          </div>
        </Secao>
      ) : null}

      {/* ============================================ ANTES E DEPOIS DA COMPRA

          Estas quatro seções respondem, nesta ordem, às perguntas que fazem
          alguém desistir quando ficam sem resposta: cabe na minha sala, preciso
          comprar mais alguma coisa, quem instala, e o que acontece depois.

          Cada uma some inteira quando o cadastro está vazio. Uma ficha cheia
          de "não informado" é pior que a ausência da seção — ela ocupa espaço
          para dizer que a JB não sabe. */}
      <Secao id="antes-de-comprar" espaco="lg" separador className="scroll-mt-32">
        <div className="grid max-w-4xl gap-12">
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
            /* Só produto vira equipamento no prontuário. Serviço, peça e
               acessório não — dizer que viram encheria a Área da Clínica de
               linhas que não são máquina nenhuma. */
            geraEquipamento={produto.condition !== "novo" || produto.trackInventory}
          />
        </div>
      </Secao>

      {/* ====================================================== FICHA TÉCNICA */}
      {temFichaTecnica ? (
        <Secao id="ficha-tecnica" espaco="lg" separador className="scroll-mt-32">
          <TituloSecao como="h2" titulo="Ficha técnica" />

          <div
            className={
              duasColunasNaFicha
                ? "mt-10 grid gap-12 lg:mt-12 lg:grid-cols-12 lg:gap-16"
                : "mt-10 max-w-3xl lg:mt-12"
            }
          >
            {temEspecificacoes ? (
              <div className={duasColunasNaFicha ? "min-w-0 lg:col-span-7" : "min-w-0"}>
                <FichaTecnica grupos={grupos} />
              </div>
            ) : null}

            {temApoioTecnico ? (
              <div
                className={
                  duasColunasNaFicha
                    ? "min-w-0 space-y-10 lg:col-span-5"
                    : "min-w-0 space-y-10"
                }
              >
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
        </Secao>
      ) : null}

      {/* ==================================================== SERVIÇOS DA JB */}
      {servicos.length > 0 && !arquivado ? (
        <Secao id="servicos-jb" fundo="clara" espaco="lg" separador className="scroll-mt-32">
          <TituloSecao
            sobretitulo="Equipe técnica JB"
            titulo="O que a JB faz neste equipamento"
            descricao="Cada serviço é executado pela equipe da própria JB e entra no mesmo pedido do equipamento — é só marcar antes de adicionar ao carrinho."
          />
          <div className="mt-10 lg:mt-12">
            <ServicosDoProduto servicos={servicos} />
          </div>
        </Secao>
      ) : null}

      {/* ================================================================ FAQ */}
      {/* A faixa existe mesmo sem pergunta publicada: sem ela, o equipamento
          que ainda não acumulou dúvidas seria justamente o que não oferece
          para onde mandar a sua. Fora de linha é exceção — não faz sentido
          abrir canal de dúvida sobre o que a JB não vende mais. */}
      {arquivado ? null : (
        /* `largura="padrao"` e não "estreita": a medida estreita centrava a
           faixa e fazia este título começar 190px à direita de todos os
           outros da ficha. A leitura confortável continua garantida pelo
           `max-w` do miolo, que é onde ela pertence. */
        <Secao id="duvidas" espaco="lg" separador className="scroll-mt-32">
          <TituloSecao
            como="h2"
            titulo="Dúvidas sobre este equipamento"
            descricao={
              produto.faqs.length > 0
                ? "As perguntas que a equipe da JB já respondeu sobre este equipamento."
                : undefined
            }
          />

          {/* Medida de leitura no miolo, não na faixa: pergunta e resposta em
              1400px de largura ninguém lê, mas a borda da seção precisa bater
              com a das outras. */}
          {produto.faqs.length > 0 ? (
            <div className="mt-8 max-w-3xl">
              <PerguntasDoProduto
                perguntas={produto.faqs.map((faq) => ({
                  id: faq.id,
                  pergunta: faq.question,
                  resposta: faq.answer,
                }))}
              />
            </div>
          ) : null}

          <div className="mt-8 max-w-3xl">
            <PerguntarSobreProduto produtoId={produto.id} nomeDoProduto={produto.name} />
          </div>
        </Secao>
      )}

      {/* ======================================================= RELACIONADOS */}
      <Secao id="relacionados" fundo="clara" espaco="lg" separador className="scroll-mt-32">
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

      {/* ================================================ VISTOS RECENTEMENTE */}
      {/* Registro da visita e a tira do que já foi visto. Os dois só existem no
          navegador de quem está lendo — nenhum histórico de navegação de
          visitante entra no banco. */}
      <RegistrarVisita slug={produto.slug} />
      <VistosRecentemente excluir={produto.slug} />

      {/* ========================================================= ASSISTÊNCIA */}
      <AssistenciaRelacionada desde={s.empresa_desde} cidade={s.endereco_cidade} />

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

  /* Com um relacionado só, o grid de quatro colunas deixava o cartão sozinho
     ao lado de três buracos. As colunas acompanham a quantidade, e abaixo de
     três a faixa para de esticar — cartão de produto com a largura da seção
     inteira não parece destaque, parece erro. */
  return (
    <GradeProdutos
      produtos={produtos}
      colunas={colunasAte(produtos.length, { base: 1, sm: 2, lg: 3, xl: 4 })}
      className={produtos.length < 3 ? "max-w-3xl" : undefined}
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
