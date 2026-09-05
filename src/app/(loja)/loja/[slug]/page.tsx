import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  FileText,
  MessageCircle,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

import { CaixaCompra, type AddonProduto } from "@/components/loja/caixa-compra";
import { GaleriaProduto } from "@/components/loja/galeria-produto";
import { GradeProdutos } from "@/components/loja/card-produto";
import { CONDICAO } from "@/components/loja/card-produto";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, Trilha, TituloSecao } from "@/components/ui/data";
import { paraCard, SELECAO_CARD } from "@/lib/catalogo";
import { formatarPreco, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

const RESULTADO_CHECK: Record<string, { rotulo: string; tom: "ok" | "alerta" | "neutro" }> = {
  verificado: { rotulo: "Verificado", tom: "ok" },
  substituido: { rotulo: "Substituído", tom: "alerta" },
  reparado: { rotulo: "Reparado", tom: "alerta" },
  nao_aplicavel: { rotulo: "Não se aplica", tom: "neutro" },
};

async function carregar(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      media: { orderBy: { order: "asc" }, include: { media: true } },
      specs: { orderBy: { order: "asc" } },
      documents: true,
      faqs: { where: { published: true }, orderBy: { order: "asc" } },
      addons: {
        orderBy: { order: "asc" },
        include: { service: true },
      },
      units: {
        where: { status: "disponivel" },
        take: 1,
        include: {
          checklist: { orderBy: { order: "asc" } },
          media: { orderBy: { order: "asc" }, include: { media: true } },
        },
      },
      shippingProfile: true,
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const produto = await carregar(slug);
  if (!produto) return {};

  const imagem = produto.media[0]?.media.url;
  return {
    title: produto.seoTitle ?? produto.name,
    description: produto.seoDescription ?? (produto.shortDescription || undefined),
    alternates: { canonical: `/loja/${produto.slug}` },
    openGraph: {
      title: produto.name,
      description: produto.shortDescription || undefined,
      images: imagem ? [imagem] : undefined,
    },
    // produto fora do ar não deve ser indexado
    robots: produto.status === "active" ? undefined : { index: false, follow: true },
  };
}

export default async function ProdutoPage({ params }: Props) {
  const { slug } = await params;
  const [produto, s] = await Promise.all([carregar(slug), getSettings()]);

  if (!produto || produto.status === "draft") notFound();

  const relacionados = await prisma.product.findMany({
    where: {
      status: "active",
      id: { not: produto.id },
      OR: [{ categoryId: produto.categoryId }, { brandId: produto.brandId }],
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: 4,
    select: SELECAO_CARD,
  });

  const unidade = produto.units[0];
  const fotos = [
    ...produto.media.map((m) => ({ url: m.media.url, alt: m.alt || m.media.alt })),
    ...(unidade?.media.map((m) => ({ url: m.media.url, alt: m.media.alt })) ?? []),
  ];

  const addons: AddonProduto[] = produto.addons.map((a) => ({
    serviceId: a.serviceId,
    nome: a.service.name,
    descricao: a.service.description,
    precoCents: a.priceCents ?? a.service.priceCents,
    obrigatorio: a.required,
  }));

  const condicao = CONDICAO[produto.condition];
  const revisado = produto.condition === "seminovo" || produto.condition === "recondicionado";
  const semEstoque = produto.trackInventory && produto.stock <= 0;

  const dadosEstruturados = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produto.name,
    sku: produto.sku,
    description: produto.shortDescription || undefined,
    image: fotos.map((f) => f.url),
    brand: produto.brand ? { "@type": "Brand", name: produto.brand.name } : undefined,
    offers:
      produto.allowDirectPurchase && produto.priceCents > 0
        ? {
            "@type": "Offer",
            priceCurrency: "BRL",
            price: (produto.priceCents / 100).toFixed(2),
            availability: semEstoque
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            itemCondition:
              produto.condition === "novo"
                ? "https://schema.org/NewCondition"
                : "https://schema.org/UsedCondition",
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // dados do próprio catálogo; nada de avaliação ou nota fictícia
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }}
      />

      <div className="container-jb py-6 lg:py-10">
        <Trilha
          itens={[
            { rotulo: "Início", href: "/" },
            { rotulo: "Equipamentos", href: "/loja" },
            ...(produto.category
              ? [{ rotulo: produto.category.name, href: `/categoria/${produto.category.slug}` }]
              : []),
            { rotulo: produto.name },
          ]}
          className="mb-6"
        />

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <GaleriaProduto fotos={fotos} nome={produto.name} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
              {produto.brand ? (
                <Link
                  href={`/marcas/${produto.brand.slug}`}
                  className="text-sm font-semibold text-graf-600 hover:text-jb-700"
                >
                  {produto.brand.name}
                </Link>
              ) : null}
            </div>

            <h1 className="mt-3 text-title leading-tight">{produto.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-graf-500">
              {produto.model ? <span>Modelo: {produto.model}</span> : null}
              <span className="label-mono">SKU {produto.sku}</span>
            </div>

            {produto.shortDescription ? (
              <p className="mt-4 text-base leading-relaxed text-graf-600">
                {produto.shortDescription}
              </p>
            ) : null}

            <div className="mt-6">
              <CaixaCompra
                produtoId={produto.id}
                nome={produto.name}
                precoCents={produto.priceCents}
                compareAtCents={produto.compareAtCents}
                permiteCompra={produto.allowDirectPurchase}
                permiteOrcamento={produto.allowQuoteRequest}
                estoque={produto.stock}
                controlaEstoque={produto.trackInventory}
                unico={produto.unique}
                addons={addons}
              />
            </div>

            {/* Garantia, entrega e assistência — só o que está cadastrado */}
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {produto.warrantyMonths ? (
                <li className="flex gap-3 rounded-lg border border-graf-200 p-3.5">
                  <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-graf-900">
                      Garantia de {produto.warrantyMonths} meses
                    </span>
                    <span className="text-xs text-graf-500">Conforme cadastro do equipamento</span>
                  </span>
                </li>
              ) : null}

              {produto.shippingProfile ? (
                <li className="flex gap-3 rounded-lg border border-graf-200 p-3.5">
                  <Truck className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-graf-900">
                      {produto.shippingProfile.kind === "sob_orcamento"
                        ? "Frete calculado após análise"
                        : produto.shippingProfile.name}
                    </span>
                    <span className="text-xs text-graf-500">
                      {produto.shippingProfile.description}
                    </span>
                  </span>
                </li>
              ) : null}

              <li className="flex gap-3 rounded-lg border border-graf-200 p-3.5">
                <Wrench className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-graf-900">
                    Assistência própria
                  </span>
                  <span className="text-xs text-graf-500">
                    A mesma equipe que vende dá manutenção
                  </span>
                </span>
              </li>

              {produto.voltage ? (
                <li className="flex gap-3 rounded-lg border border-graf-200 p-3.5">
                  <BadgeCheck className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-graf-900">
                      {produto.voltage === "bivolt" ? "Bivolt" : `${produto.voltage} V`}
                    </span>
                    <span className="text-xs text-graf-500">Confira a rede da sua clínica</span>
                  </span>
                </li>
              ) : null}
            </ul>

            {s.whatsapp ? (
              <div className="mt-5 rounded-xl border border-graf-200 bg-graf-50 p-4">
                <p className="text-sm font-bold text-graf-900">
                  Tem alguma dúvida sobre este equipamento?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={whatsappHref(
                      s.whatsapp,
                      `Olá! Tenho uma dúvida sobre: ${produto.name} (${produto.sku}).`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Falar no WhatsApp
                  </a>
                  <Link
                    href={`/contato?assunto=${encodeURIComponent(produto.name)}`}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400"
                  >
                    Enviar pergunta
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ============================================ REVISADO PELA JB */}
        {revisado && unidade ? (
          <section className="mt-14">
            <Cartao className="overflow-hidden">
              <div className="border-b border-graf-200 bg-jb-50/50 px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-jb-500 text-white">
                    <BadgeCheck className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-graf-950">Revisado pela JB</h2>
                    <p className="text-sm text-graf-600">
                      O que foi inspecionado nesta unidade específica.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <ul className="divide-y divide-graf-100">
                    {unidade.checklist.map((item) => {
                      const resultado = RESULTADO_CHECK[item.result] ?? RESULTADO_CHECK.verificado;
                      return (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <span className="text-sm text-graf-800">{item.label}</span>
                          <Etiqueta tom={resultado.tom}>{resultado.rotulo}</Etiqueta>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <dl className="space-y-3 rounded-lg bg-graf-50 p-5 text-sm">
                  {unidade.manufactureYear ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-graf-500">Ano de fabricação</dt>
                      <dd className="font-semibold text-graf-900">{unidade.manufactureYear}</dd>
                    </div>
                  ) : null}
                  {unidade.usageCycles ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-graf-500">Ciclos registrados</dt>
                      <dd className="font-semibold tabular text-graf-900">
                        {unidade.usageCycles.toLocaleString("pt-BR")}
                      </dd>
                    </div>
                  ) : null}
                  {unidade.warrantyMonths ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-graf-500">Garantia da unidade</dt>
                      <dd className="font-semibold text-graf-900">
                        {unidade.warrantyMonths} meses
                      </dd>
                    </div>
                  ) : null}
                  {unidade.conditionNotes ? (
                    <div>
                      <dt className="text-graf-500">Estado de conservação</dt>
                      <dd className="mt-1 leading-relaxed text-graf-700">
                        {unidade.conditionNotes}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </Cartao>
          </section>
        ) : null}

        {/* ==================================== DESCRIÇÃO E FICHA TÉCNICA */}
        <section className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          {produto.description ? (
            <div>
              <h2 className="text-lg font-bold text-graf-950">Sobre este equipamento</h2>
              <div
                className="prose-jb mt-4"
                dangerouslySetInnerHTML={{ __html: produto.description }}
              />
            </div>
          ) : null}

          {produto.specs.length > 0 ? (
            <div>
              <h2 className="text-lg font-bold text-graf-950">Ficha técnica</h2>
              <dl className="mt-4 divide-y divide-graf-200 rounded-xl border border-graf-200">
                {produto.specs.map((spec) => (
                  <div key={spec.id} className="flex flex-wrap justify-between gap-3 px-4 py-3">
                    <dt className="text-sm text-graf-500">{spec.label}</dt>
                    <dd className="text-sm font-semibold text-graf-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>

              {produto.anvisaCode || produto.manufacturer || produto.regulatoryNote ? (
                <div className="mt-5 rounded-xl border border-graf-200 p-4">
                  <h3 className="text-sm font-bold text-graf-900">Informações regulatórias</h3>
                  <dl className="mt-2.5 space-y-1.5 text-sm">
                    {produto.anvisaCode ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-graf-500">Registro/notificação</dt>
                        <dd className="label-mono text-graf-800">{produto.anvisaCode}</dd>
                      </div>
                    ) : null}
                    {produto.manufacturer ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-graf-500">Fabricante</dt>
                        <dd className="text-graf-800">{produto.manufacturer}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {produto.regulatoryNote ? (
                    <p className="mt-2 text-xs leading-relaxed text-graf-500">
                      {produto.regulatoryNote}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {produto.documents.length > 0 ? (
                <ul className="mt-5 space-y-2">
                  {produto.documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg border border-graf-200 px-4 py-3 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400"
                      >
                        <FileText className="size-4 text-graf-400" aria-hidden />
                        {doc.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* ==================================================== FAQ do item */}
        {produto.faqs.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-lg font-bold text-graf-950">Dúvidas sobre este equipamento</h2>
            <ul className="mt-4 space-y-3">
              {produto.faqs.map((faq) => (
                <li key={faq.id}>
                  <details className="group rounded-xl border border-graf-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-sm font-bold text-graf-900">
                      {faq.question}
                      <span aria-hidden className="text-graf-400 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="border-t border-graf-100 px-4 py-3 text-sm leading-relaxed text-graf-600">
                      {faq.answer}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ==================================================== RELACIONADOS */}
        {relacionados.length > 0 ? (
          <section className="mt-16">
            <TituloSecao titulo="Quem viu este, também olhou" className="mb-6" />
            <GradeProdutos produtos={relacionados.map(paraCard)} />
          </section>
        ) : null}

        {semEstoque ? (
          <section className="mt-12">
            <Cartao className="p-6 text-center">
              <p className="text-base font-bold text-graf-900">
                {produto.unique ? "Esta unidade já foi vendida." : "Item indisponível no momento."}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-graf-600">
                A JB recebe equipamentos com frequência. Veja o que está disponível agora ou
                peça um orçamento — conseguimos atender boa parte sob consulta.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <LinkBotao href={produto.condition === "seminovo" ? "/seminovos" : "/loja"}>
                  Ver outros equipamentos
                </LinkBotao>
                <LinkBotao href="/orcamento" variante="secundario">
                  Pedir orçamento
                </LinkBotao>
              </div>
            </Cartao>
          </section>
        ) : null}
      </div>
    </>
  );
}
