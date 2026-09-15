import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import { CaixaCompra, type AddonProduto } from "@/components/loja/caixa-compra";
import { GaleriaProduto, type FotoProduto } from "@/components/loja/galeria-produto";
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
import { Documentacao } from "@/components/loja/produto/especificacoes";
import { SpecSheet } from "@/components/specs/spec-sheet";
import { ForaDeLinha, SemEstoque } from "@/components/loja/produto/estados";
import { FaixaConfianca } from "@/components/loja/produto/faixa-confianca";
import { DetalhesDoProduto, ResumoTecnicoProduto } from "@/components/loja/produto/resumo-tecnico";
import { TopoMarketplace } from "@/components/loja/produto/topo-marketplace";
import { VendidoPelaJB } from "@/components/loja/produto/vendido-pela-jb";
import {
  BarraCompraMobile,
  NavegacaoDoProduto,
  type AncoraDoProduto,
  type CompraDaBarra,
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
import { RegistrarVisita } from "@/components/loja/vistos-recentemente";
import { Trilha } from "@/components/ui/data";
import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import {
  certificacaoPublicada,
  contarChecklist,
  frasedaVerificacao,
} from "@/lib/certificacao";
import { fichaDoProduto } from "@/lib/ficha-do-produto";
import { calcularParcelas, paraCentavos, plural, whatsappHref } from "@/lib/format";
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

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

const carregar = cache(async (slug: string) =>
  prisma.product.findUnique({
    where: { slug },
    include: {
      brand: { include: { logo: true } },
      category: true,
      media: { orderBy: { order: "asc" }, include: { media: true } },
      specs: { orderBy: { order: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      faqs: { where: { published: true }, orderBy: { order: "asc" } },
      addons: { orderBy: { order: "asc" }, include: { service: true } },
      units: {
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 2,
        include: {
          checklist: { orderBy: { order: "asc" } },
          media: { orderBy: { order: "asc" }, include: { media: true } },
        },
      },
      shippingProfile: { include: { zones: { orderBy: { order: "asc" } } } },
    },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const produto = await carregar(slug);
  if (!produto) {
    return metadataDePagina({
      titulo: "Produto não encontrado",
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
  return { ...base, robots: { index: false, follow: true } };
}

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params;
  const [produto, s] = await Promise.all([carregar(slug), getSettings()]);

  if (!produto || produto.status === "draft") notFound();

  const caminho = `/loja/${produto.slug}`;
  const arquivado = produto.status === "archived";
  const semEstoque = produto.trackInventory && produto.stock <= 0;

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

  const certificacao = unidade ? await certificacaoPublicada(unidade.id) : null;
  const certificado: CertificadoDaUnidade | null = certificacao
    ? {
        codigoPublico: certificacao.publicCode,
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

  const addons: AddonProduto[] = produto.addons.map((a) => ({
    serviceId: a.serviceId,
    nome: a.service.name,
    descricao: a.service.description,
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

  const maxParcelas = Math.min(12, Math.max(1, Number(s.parcelas_max) || 1));
  const minParcelaCents = paraCentavos(s.parcela_minima);
  const hrefOrcamento = `/orcamento?tipo=compra&item=${encodeURIComponent(produto.name)}`;
  const hrefWhatsapp = s.whatsapp
    ? whatsappHref(
        s.whatsapp,
        `Olá! Tenho uma dúvida sobre o produto ${produto.name} (SKU ${produto.sku}).`,
      )
    : "";
  const garantiaMeses = unidade?.warrantyMonths ?? produto.warrantyMonths ?? null;

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

  /* ------------------------------------------------------------- a ficha

     Um objeto, cinco grupos, e todas as telas lendo dele.

     Antes desta linha o dado técnico da página vinha de sete lugares:
     `agruparEspecificacoes` para a tabela, `destaquesDaPdp` para a prévia,
     `MedidasEPeso` para as dimensões, `Regulatorio` para o registro,
     `AntesDeComprar` para a compatibilidade, `CondicoesDeCompra` para a
     garantia e o mini-comparador para o resto. O resultado medido na
     auditoria: "220 V" aparecia cinco vezes, com três rótulos e dois
     formatos, e o contador dizia "6 especificações" numa página com nove
     atributos. `construirFicha` unifica as colunas estruturadas e o texto
     livre do cadastro num objeto tipado — e daqui para baixo nada é digitado
     duas vezes. */
  const ficha = fichaDoProduto(
    { ...produto, warrantyMonths: garantiaMeses },
    unidade
      ? {
          serialNumber: unidade.serialNumber,
          manufactureYear: unidade.manufactureYear,
          usageHours: unidade.usageHours,
          usageCycles: unidade.usageCycles,
          warrantyMonths: unidade.warrantyMonths,
          acquiredFrom: unidade.acquiredFrom,
        }
      : null,
  );

  const descricao = produto.description.trim();
  const tamanhoDaDescricao = textoLimpo(descricao, 4000).length;
  const temDescricao = tamanhoDaDescricao > 0;

  /* O que diferencia o modelo sobe para a dobra, ao lado do preço.

     A descrição de todo produto do catálogo tem entre 96 e 265 caracteres — um
     parágrafo e quatro ou cinco tópicos. Isso ocupava uma seção de largura
     inteira, 375px de altura, a 1.100px de rolagem do preço. É o argumento de
     venda longe de onde a decisão acontece, e é justamente o bloco que Amazon e
     Mercado Livre põem na primeira dobra.

     O parágrafo de abertura costuma ser o MESMO texto de `shortDescription`,
     que a identidade já mostra logo acima do preço. Repetir a frase a 3cm dela
     é ruído: quando for igual, entra só a lista. */
  const resumoCurto = produto.shortDescription.trim();
  const aberturaRepetida = resumoCurto ? `<p>${resumoCurto}</p>` : "";
  const descricaoNaDobra =
    aberturaRepetida && descricao.startsWith(aberturaRepetida)
      ? descricao.slice(aberturaRepetida.length).trim()
      : descricao;

  /* A seção de largura inteira só se justifica com texto de verdade. Abaixo
     deste tamanho ela seria uma moldura em volta de cinco linhas que já estão
     na dobra — e, como o corte é o mesmo para todo produto, a ficha não muda
     de forma de um item para o outro. */
  const DESCRICAO_LONGA = 900;
  const descricaoMereceSecao = tamanhoDaDescricao > DESCRICAO_LONGA;
  /* Identidade sozinha não é ficha técnica.

     `construirFicha` sempre devolve pelo menos SKU e condição — eles existem
     em todo cadastro. Se a seção aparecesse por causa deles, um produto sem
     nenhuma especificação ganharia uma "Ficha técnica" com duas linhas de
     identificação, que é exatamente a âncora sem conteúdo que a PDP evita
     fabricar. A seção existe quando há dado técnico: desempenho, instalação,
     o que vem junto ou a unidade física. */
  const linhasTecnicas = ficha.grupos
    .filter((grupo) => grupo.id !== "identidade")
    .reduce((soma, grupo) => soma + grupo.linhas.length, 0);
  const temEspecificacoes = linhasTecnicas > 0;
  /* Contador derivado. Nunca literal: foi um "6 especificações" escrito à mão
     numa página com nove atributos que expôs a falta de fonte única. */
  const totalEspecificacoes = ficha.total;

  /* No topo ficam TRÊS atributos, não seis.

     A prévia de seis linhas repetia a ficha inteira 600 px acima dela — e o
     link "Ficha completa" levava a um bloco cujo conteúdo principal era
     idêntico ao que a pessoa acabara de ler. Três atributos respondem "é este
     o equipamento?"; a ficha responde "serve na minha sala?". São perguntas
     diferentes, e só a segunda precisa da tabela inteira.

     Quais três não é escolha de layout: vêm de `decisive` no registro da
     família. Para autoclave, capacidade, ciclo e bandejas; para seladora, a
     barra de selagem. */
  const temFichaTecnica = temEspecificacoes || documentos.length > 0;

  const temInfraestrutura = Boolean(
    produto.voltage?.trim() ||
      (produto.weightGrams ?? 0) > 0 ||
      ((produto.widthMm ?? 0) > 0 &&
        (produto.heightMm ?? 0) > 0 &&
        (produto.depthMm ?? 0) > 0) ||
      produto.infrastructureNotes.length > 0,
  );
  const temConteudoDaCaixa = produto.boxContents.length > 0;
  const temBlocoDeInstalacao = produto.installationPolicy !== "nao_informada";
  const geraEquipamentoNoPosCompra = produto.isEquipment;
  const temPreparo =
    temInfraestrutura ||
    temConteudoDaCaixa ||
    temBlocoDeInstalacao ||
    geraEquipamentoNoPosCompra;

  const temFrete = Boolean(
    produto.shippingProfile && produto.shippingProfile.kind !== "nao_aplicavel",
  );
  const retirada = ligado(s.retirada_disponivel) ? s.retirada_instrucoes.trim() || null : null;
  const temCondicoesDeCompra = Boolean(
    (garantiaMeses ?? 0) > 0 || temFrete || retirada || produto.voltage?.trim(),
  );
  const temAjudaDaEquipe = Boolean(s.telefone.trim() || s.whatsapp.trim() || s.email.trim());
  const temServicos = servicos.length > 0 && !arquivado;
  const temEntregaESuporte = temCondicoesDeCompra || temAjudaDaEquipe || temServicos;

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Loja", href: "/loja" },
    ...(produto.category
      ? [{ rotulo: produto.category.name, href: `/categoria/${produto.category.slug}` }]
      : []),
    { rotulo: produto.name },
  ];

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

  if (arquivado) {
    const oferta = dadosDoProduto.offers;
    if (oferta && typeof oferta === "object" && !Array.isArray(oferta)) {
      dadosDoProduto.offers = {
        ...oferta,
        availability: "https://schema.org/Discontinued",
      };
    }
  }

  const ancoras: AncoraDoProduto[] = [
    { id: "visao-geral", rotulo: "Visão geral" },
    ...(produto.condition !== "novo" ? [{ id: "laudo", rotulo: "Laudo de inspeção" }] : []),
    ...(temFichaTecnica
      ? [{ id: "ficha-tecnica", rotulo: "Especificações" }]
      : []),
    ...(temPreparo ? [{ id: "preparo", rotulo: "Antes de comprar" }] : []),
    ...(temEntregaESuporte
      ? [{ id: "entrega-e-garantia", rotulo: "Entrega e garantia" }]
      : []),
    ...(arquivado ? [] : [{ id: "duvidas", rotulo: "Dúvidas" }]),
  ];

  const temInstalacao = !["nao_informada", "nao_oferecida"].includes(
    produto.installationPolicy,
  );
  const parcelasDaBarra =
    produto.allowDirectPurchase && produto.priceCents > 0
      ? calcularParcelas(produto.priceCents, maxParcelas, minParcelaCents)
      : null;

  const compraDaBarra: CompraDaBarra = {
    precoCents: produto.priceCents,
    parcelas: parcelasDaBarra,
    soOrcamento: !produto.allowDirectPurchase || produto.priceCents <= 0,
    indisponivel: arquivado || semEstoque,
  };

  const estruturados: DadosJsonLd[] = [trilhaJsonLd(trilha), dadosDoProduto];
  if (produto.faqs.length > 0) {
    estruturados.push(
      faqJsonLd(produto.faqs.map((faq) => ({ pergunta: faq.question, resposta: faq.answer }))),
    );
  }

  return (
    <>
      <JsonLd dados={estruturados} />

      <TopoMarketplace
        trilha={<Trilha itens={trilha} />}
        galeria={<GaleriaProduto fotos={fotos} nome={produto.name} />}
        resumo={
          <ResumoTecnicoProduto
            nome={produto.name}
            resumo={produto.shortDescription}
            sku={produto.sku}
            condicao={produto.condition}
            definicao={definicao}
            marca={produto.brand ? { nome: produto.brand.name, slug: produto.brand.slug } : null}
            categoria={
              produto.category
                ? { nome: produto.category.name, slug: produto.category.slug }
                : null
            }
          />
        }
        detalhes={
          <DetalhesDoProduto
            descricaoHtml={
              descricaoNaDobra ? sanitizarHtml(descricaoNaDobra) : undefined
            }
            modelo={produto.model}
            sku={produto.sku}
            codigoDoFabricante={produto.mpn}
            gtin={produto.gtin}
            numeroDeSerie={unidade?.serialNumber ?? null}
            categoria={
              produto.category
                ? { nome: produto.category.name, slug: produto.category.slug }
                : null
            }
            ficha={ficha}
          />
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

            <VendidoPelaJB
              empresa={s.empresa_nome}
              desde={s.empresa_desde}
              cidade={s.endereco_cidade}
              uf={s.endereco_uf}
              garantiaMeses={produto.warrantyMonths}
            />
          </>
        }
      />

      <FaixaConfianca
        certificado={Boolean(certificado)}
        garantiaMeses={garantiaMeses}
        temFrete={temFrete}
        temInstalacao={temInstalacao}
      />

      <NavegacaoDoProduto ancoras={ancoras} compra={compraDaBarra} />

      {/* O laudo é seção fixa de todo equipamento que não é novo — com ou sem
          registro publicado. A condição anterior (`unidade ? ... : null`) é o
          que fazia a página prometer o laudo na caixa de condição e no FAQ e
          não entregar nada: sem unidade cadastrada, a seção inteira sumia e as
          duas frases continuavam no ar. Sem registro, agora a seção diz que
          não há e oferece o caminho. */}
      <UnidadeFisica
        id="laudo"
        condicao={produto.condition}
        numeroDeSerie={unidade?.serialNumber ?? null}
        anoDeFabricacao={unidade?.manufactureYear ?? null}
        horasDeUso={unidade?.usageHours ?? null}
        ciclos={unidade?.usageCycles ?? null}
        garantiaMeses={unidade?.warrantyMonths ?? null}
        notasDeEstado={unidade?.conditionNotes ?? ""}
        notasDeInspecao={unidade?.inspectionNotes ?? ""}
        checklist={checklist}
        certificado={certificado}
        vendida={unidade?.status === "vendido"}
        hrefAjuda={hrefWhatsapp || "/contato"}
      />

      <div className="container-loja">
        {temDescricao && descricaoMereceSecao ? (
          <BlocoDecisao
            id="sobre"
            titulo="Sobre o produto"
            resumo="O que vale saber sobre uso, proposta e aplicação deste modelo."
          >
            <div
              className="prose-jb max-w-[68ch] [&_img]:h-auto [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: sanitizarHtml(produto.description) }}
            />
          </BlocoDecisao>
        ) : null}

        {temFichaTecnica ? (
          <BlocoDecisao
            id="ficha-tecnica"
            titulo="Especificações técnicas"
            resumo="Dados organizados para conferir compatibilidade e comparar o que realmente importa."
            contador={
              totalEspecificacoes > 0
                ? plural(totalEspecificacoes, "especificação", "especificações")
                : undefined
            }
            /* A única que nasce aberta.

               Num equipamento de clínica a tabela de especificação é o que
               decide a compra — voltagem, capacidade, ciclo, medida de
               bancada. Com as cinco seções fechadas, a metade de baixo da
               ficha virava quatro gavetas iguais e a informação que mais pesa
               ficava a um clique de distância de quem já decidiu comparar. */
            aberto
          >
            <div className="min-w-0 space-y-8">
              <SpecSheet
                ficha={ficha}
                fonte={
                  ficha.procedencias.includes("inspecao-jb")
                    ? "cadastro do fabricante e inspeção da JB nesta unidade"
                    : "cadastro do fabricante"
                }
              />

              {produto.regulatoryNote?.trim() ? (
                <p className="texto-apoio max-w-[70ch] text-graf-600">
                  <span className="font-semibold text-graf-800">Observação regulatória:</span>{" "}
                  {produto.regulatoryNote.trim()}
                </p>
              ) : null}

              <Documentacao documentos={documentos} />
            </div>
          </BlocoDecisao>
        ) : null}

        {temPreparo ? (
          <BlocoDecisao
            id="preparo"
            titulo="Antes de comprar"
            resumo="Confira infraestrutura, itens inclusos, instalação e o que acontece depois da compra."
            /* Aberta, como a ficha técnica: requisito de instalação —
               voltagem, ponto de água, espaço de bancada — é justamente o que
               o cliente precisa descobrir ANTES de comprar, e é o que o
               contrato medido em 11/09 contra dez fichas de referência
               registra como visível no desktop. */
            aberto
          >
            <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
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
                geraEquipamento={geraEquipamentoNoPosCompra}
              />
            </div>
          </BlocoDecisao>
        ) : null}

        {temEntregaESuporte ? (
          <BlocoDecisao
            id="entrega-e-garantia"
            titulo="Entrega, garantia e suporte"
            resumo="Condições de compra e acesso direto à equipe JB, sem repetir informação da caixa de compra."
          >
            <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
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
                retirada={retirada}
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

            {temServicos ? (
              <div className="mt-8 border-t border-graf-200 pt-6">
                <h3 className="text-base font-extrabold text-graf-950">
                  Serviços disponíveis para este produto
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-graf-600">
                  Podem entrar no mesmo pedido, com valores separados e execução pela JB.
                </p>
                <div className="mt-4">
                  <ServicosDoProduto servicos={servicos} />
                </div>
              </div>
            ) : null}
          </BlocoDecisao>
        ) : null}

        {arquivado ? null : (
          <BlocoDecisao
            id="duvidas"
            titulo="Dúvidas"
            resumo="Respostas técnicas e um canal direto para perguntar sobre este produto."
            contador={
              produto.faqs.length > 0
                ? plural(produto.faqs.length, "pergunta respondida", "perguntas respondidas")
                : undefined
            }
          >
            <div className={produto.faqs.length > 0 ? "grid gap-x-10 gap-y-8 xl:grid-cols-2" : "max-w-3xl"}>
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
      </div>

      <RegistrarVisita slug={produto.slug} />

      <BarraCompraMobile
        precoCents={compraDaBarra.precoCents}
        parcelas={compraDaBarra.parcelas}
        soOrcamento={compraDaBarra.soOrcamento}
        indisponivel={compraDaBarra.indisponivel}
      />
    </>
  );
}
