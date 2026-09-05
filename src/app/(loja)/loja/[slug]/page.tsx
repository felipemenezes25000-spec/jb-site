import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

import { CaixaCompra, type AddonProduto } from "@/components/loja/caixa-compra";
import { GaleriaProduto } from "@/components/loja/galeria-produto";
import { GradeProdutos, CONDICAO } from "@/components/loja/card-produto";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Trilha } from "@/components/ui/data";
import { paraCard, SELECAO_CARD } from "@/lib/catalogo";
import { whatsappHref } from "@/lib/format";
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
      addons: { orderBy: { order: "asc" }, include: { service: true } },
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
            availability: semEstoque ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            itemCondition: produto.condition === "novo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          }
        : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }} />

      <section className="border-b border-graf-200 bg-graf-50/50">
        <div className="container-jb py-5 lg:py-6">
          <Trilha
            itens={[
              { rotulo: "Início", href: "/" },
              { rotulo: "Equipamentos", href: "/loja" },
              ...(produto.category ? [{ rotulo: produto.category.name, href: `/categoria/${produto.category.slug}` }] : []),
              { rotulo: produto.name },
            ]}
          />
        </div>
      </section>

      <section className="bg-white">
        <div className="container-jb py-8 lg:py-12 xl:py-14">
          <div className="grid gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 xl:gap-16">
            <div className="min-w-0">
              <GaleriaProduto fotos={fotos} nome={produto.name} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
                {produto.brand ? (
                  <Link href={`/marcas/${produto.brand.slug}`} className="text-xs font-extrabold uppercase tracking-[0.12em] text-graf-500 hover:text-jb-700">
                    {produto.brand.name}
                  </Link>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.45rem)] font-extrabold leading-[1.03] tracking-[-0.055em] text-graf-950">
                {produto.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-graf-500">
                {produto.model ? <span className="font-semibold">Modelo {produto.model}</span> : null}
                <span className="label-mono">SKU {produto.sku}</span>
                {produto.voltage ? <span className="inline-flex items-center gap-1.5"><Zap className="size-3.5 text-graf-400" aria-hidden />{produto.voltage === "bivolt" ? "Bivolt" : `${produto.voltage} V`}</span> : null}
              </div>

              {produto.shortDescription ? <p className="mt-5 max-w-2xl text-base leading-7 text-graf-600 lg:text-lg">{produto.shortDescription}</p> : null}

              <div className="mt-7">
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

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {produto.warrantyMonths ? <Beneficio icone={ShieldCheck} titulo={`Garantia de ${produto.warrantyMonths} meses`} texto="Conforme cadastro deste equipamento." /> : null}
                {produto.shippingProfile ? <Beneficio icone={Truck} titulo={produto.shippingProfile.kind === "sob_orcamento" ? "Logística confirmada na compra" : produto.shippingProfile.name} texto={produto.shippingProfile.description || "Condições informadas antes da conclusão."} /> : null}
                <Beneficio icone={Wrench} titulo="Assistência própria" texto="Venda e manutenção continuam conectadas à JB." />
                <Beneficio icone={PackageCheck} titulo="Pós-venda organizado" texto="O equipamento pode seguir para a Área da Clínica." />
              </div>

              {s.whatsapp ? (
                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-graf-200 bg-graf-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-extrabold text-graf-950">Ainda ficou alguma dúvida?</p><p className="mt-1 text-xs leading-5 text-graf-500">Fale com a equipe citando este equipamento e o SKU.</p></div>
                  <a href={whatsappHref(s.whatsapp, `Olá! Tenho uma dúvida sobre ${produto.name} (${produto.sku}).`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-graf-300 bg-white px-4 text-xs font-extrabold text-graf-800 hover:border-graf-400">
                    <MessageCircle className="size-4" aria-hidden />WhatsApp
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {revisado && unidade ? (
        <section className="border-y border-graf-200 bg-graf-950 text-white">
          <div className="container-jb section-jb">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
              <div>
                <span className="flex size-12 items-center justify-center rounded-xl bg-jb-600 text-white"><BadgeCheck className="size-6" aria-hidden /></span>
                <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-jb-400">Revisado pela JB</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-white">Você vê o que aconteceu com esta unidade.</h2>
                <p className="mt-4 text-sm leading-7 text-graf-400">O checklist abaixo pertence ao equipamento disponível, não a uma descrição genérica da categoria.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5">
                  {unidade.checklist.length ? <ul className="divide-y divide-white/10">{unidade.checklist.map((item) => { const resultado = RESULTADO_CHECK[item.result] ?? RESULTADO_CHECK.verificado; return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><span className="text-sm font-semibold text-graf-200">{item.label}</span><Etiqueta tom={resultado.tom}>{resultado.rotulo}</Etiqueta></li>; })}</ul> : <p className="py-8 text-sm text-graf-400">Checklist ainda não publicado para esta unidade.</p>}
                </div>
                <dl className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm">
                  {unidade.manufactureYear ? <Info escuro label="Ano de fabricação" value={String(unidade.manufactureYear)} /> : null}
                  {unidade.usageCycles ? <Info escuro label="Ciclos registrados" value={unidade.usageCycles.toLocaleString("pt-BR")} /> : null}
                  {unidade.warrantyMonths ? <Info escuro label="Garantia da unidade" value={`${unidade.warrantyMonths} meses`} /> : null}
                  {unidade.conditionNotes ? <div><dt className="text-xs font-bold text-graf-500">Estado de conservação</dt><dd className="mt-2 text-sm leading-6 text-graf-300">{unidade.conditionNotes}</dd></div> : null}
                </dl>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {(produto.description || produto.specs.length > 0) ? (
        <section className="bg-white">
          <div className="container-jb section-jb">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              {produto.description ? (
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Detalhes</p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-graf-950">Sobre este equipamento</h2>
                  <div className="prose-jb mt-6" dangerouslySetInnerHTML={{ __html: produto.description }} />
                </div>
              ) : <div />}

              <div>
                {produto.specs.length > 0 ? (
                  <>
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Especificações</p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em] text-graf-950">Ficha técnica</h2>
                    <dl className="mt-6 divide-y divide-graf-100 overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
                      {produto.specs.map((spec) => <div key={spec.id} className="flex flex-wrap justify-between gap-3 px-5 py-4"><dt className="text-sm text-graf-500">{spec.label}</dt><dd className="text-right text-sm font-extrabold text-graf-900">{spec.value}</dd></div>)}
                    </dl>
                  </>
                ) : null}

                {produto.anvisaCode || produto.manufacturer || produto.regulatoryNote ? (
                  <div className="mt-5 rounded-2xl border border-graf-200 bg-graf-50 p-5">
                    <h3 className="text-sm font-extrabold text-graf-950">Informações regulatórias cadastradas</h3>
                    <dl className="mt-4 space-y-3 text-sm">
                      {produto.anvisaCode ? <Info label="Registro/notificação" value={produto.anvisaCode} /> : null}
                      {produto.manufacturer ? <Info label="Fabricante" value={produto.manufacturer} /> : null}
                    </dl>
                    {produto.regulatoryNote ? <p className="mt-4 text-xs leading-6 text-graf-500">{produto.regulatoryNote}</p> : null}
                  </div>
                ) : null}

                {produto.documents.length > 0 ? (
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-graf-400">Documentos do produto</p>
                    <ul className="space-y-2">{produto.documents.map((doc) => <li key={doc.id}><a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-graf-200 bg-white px-4 py-3.5 text-sm font-bold text-graf-800 hover:border-graf-400"><span className="flex items-center gap-2.5"><FileText className="size-4 text-jb-600" aria-hidden />{doc.title}</span><ArrowRight className="size-3.5 text-graf-400" aria-hidden /></a></li>)}</ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {produto.faqs.length > 0 ? (
        <section className="border-y border-graf-200 bg-graf-50/70">
          <div className="container-jb section-jb">
            <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Dúvidas do produto</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-graf-950">Antes de comprar, vale saber.</h2></div>
              <div className="divide-y divide-graf-200 border-y border-graf-200">{produto.faqs.map((faq) => <details key={faq.id} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-extrabold text-graf-950 lg:text-base">{faq.question}<span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-500 transition group-open:rotate-45 group-open:bg-jb-50 group-open:text-jb-700">+</span></summary><div className="pb-6 text-sm leading-7 text-graf-600">{faq.answer}</div></details>)}</div>
            </div>
          </div>
        </section>
      ) : null}

      {relacionados.length > 0 ? (
        <section className="bg-white">
          <div className="container-jb section-jb">
            <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Continue comparando</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] text-graf-950">Outros equipamentos que podem fazer sentido</h2></div><Link href="/loja" className="inline-flex items-center gap-2 text-sm font-extrabold text-jb-700">Ver catálogo <ArrowRight className="size-4" aria-hidden /></Link></div>
            <GradeProdutos produtos={relacionados.map(paraCard)} />
          </div>
        </section>
      ) : null}

      {semEstoque ? (
        <section className="border-t border-graf-200 bg-graf-50/70">
          <div className="container-jb py-12">
            <div className="mx-auto max-w-4xl rounded-2xl border border-graf-200 bg-white p-7 text-center shadow-card lg:p-9">
              <BadgeCheck className="mx-auto size-7 text-jb-600" aria-hidden />
              <p className="mt-4 text-xl font-extrabold text-graf-950">{produto.unique ? "Esta unidade já foi vendida." : "Item indisponível no momento."}</p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-graf-600">Veja alternativas disponíveis ou peça um orçamento para a equipe procurar a melhor opção.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3"><LinkBotao href={produto.condition === "seminovo" ? "/seminovos" : "/loja"}>Ver alternativas</LinkBotao><LinkBotao href="/orcamento" variante="secundario">Pedir orçamento</LinkBotao></div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Beneficio({ icone: Icon, titulo, texto }: { icone: typeof ShieldCheck; titulo: string; texto: string }) {
  return <div className="flex gap-3 rounded-xl border border-graf-200 bg-white p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600"><Icon className="size-4" aria-hidden /></span><div><p className="text-xs font-extrabold text-graf-950">{titulo}</p><p className="mt-1 text-[11px] leading-5 text-graf-500">{texto}</p></div></div>;
}

function Info({ label, value, escuro }: { label: string; value: string; escuro?: boolean }) {
  return <div className="flex justify-between gap-4"><dt className={`text-xs font-bold ${escuro ? "text-graf-500" : "text-graf-500"}`}>{label}</dt><dd className={`text-right text-sm font-extrabold ${escuro ? "text-white" : "text-graf-900"}`}>{value}</dd></div>;
}
