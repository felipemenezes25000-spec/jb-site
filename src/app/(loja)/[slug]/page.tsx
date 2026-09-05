import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Headphones,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Wrench,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatarPreco, telHref, whatsappHref } from "@/lib/format";
import { enderecoCompleto, getSettings } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

const FALLBACK: Record<string, { eyebrow: string; title: string; lead: string }> = {
  "assistencia-tecnica": {
    eyebrow: "Assistência técnica",
    title: "Seu equipamento em boas mãos, do chamado à conclusão.",
    lead: "Abra a solicitação, informe o equipamento e acompanhe o atendimento com diagnóstico, orçamento e histórico organizados.",
  },
  "manutencao-preventiva": {
    eyebrow: "Manutenção preventiva",
    title: "Evite que o equipamento pare no pior momento.",
    lead: "A manutenção preventiva ajuda a organizar revisões periódicas e manter o histórico técnico de cada equipamento da clínica.",
  },
  "planos-de-manutencao": {
    eyebrow: "Planos de manutenção",
    title: "Preventiva planejada para a rotina da sua clínica.",
    lead: "Conheça os planos publicados pela JB e escolha a cobertura que fizer sentido para os seus equipamentos.",
  },
  servicos: {
    eyebrow: "Serviços JB",
    title: "Da instalação à manutenção, com a mesma equipe acompanhando o equipamento.",
    lead: "Serviços técnicos vinculados ao ciclo de vida dos equipamentos odontológicos.",
  },
  orcamento: {
    eyebrow: "Orçamento",
    title: "Conte o que sua clínica precisa. A JB ajuda a montar a solução.",
    lead: "Equipamento, peça, instalação ou manutenção: fale com a equipe para receber uma proposta adequada à sua necessidade.",
  },
  sobre: {
    eyebrow: "Sobre a JB",
    title: "Equipamentos odontológicos com relacionamento que continua depois da venda.",
    lead: "A JB reúne fornecimento de equipamentos, assistência técnica e pós-venda em uma experiência única para clínicas e consultórios.",
  },
  estrutura: {
    eyebrow: "Nossa estrutura",
    title: "Uma operação feita para atender o equipamento antes, durante e depois da compra.",
    lead: "Conheça a estrutura da JB e a forma como o atendimento comercial e técnico se conectam.",
  },
  contato: {
    eyebrow: "Contato",
    title: "Fale diretamente com a JB.",
    lead: "Escolha o canal mais conveniente para falar sobre equipamentos, assistência, orçamento ou pós-venda.",
  },
  faq: {
    eyebrow: "Dúvidas frequentes",
    title: "Respostas rápidas antes de você precisar perguntar.",
    lead: "Reunimos as dúvidas mais comuns sobre compra, entrega, assistência e relacionamento com a JB.",
  },
  entrega: {
    eyebrow: "Entrega e retirada",
    title: "Informações sobre entrega, retirada e logística.",
    lead: "Consulte as condições publicadas pela JB para saber como cada equipamento pode ser entregue ou retirado.",
  },
  "trocas-e-devolucoes": {
    eyebrow: "Trocas e devoluções",
    title: "Condições de troca e devolução.",
    lead: "Consulte as regras aplicáveis aos pedidos realizados pela plataforma da JB.",
  },
  privacidade: {
    eyebrow: "Privacidade",
    title: "Como a JB trata os dados usados na plataforma.",
    lead: "Informações sobre privacidade, cadastro e uso de dados no relacionamento com a JB.",
  },
  termos: {
    eyebrow: "Termos de uso",
    title: "Regras para utilização da plataforma JB.",
    lead: "Condições gerais aplicáveis ao uso do site, da loja e da Área da Clínica.",
  },
};

async function carregar(slug: string) {
  return prisma.page.findUnique({
    where: { slug },
    include: { cover: true, gallery: { orderBy: { order: "asc" }, include: { media: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await carregar(slug);
  const fallback = FALLBACK[slug];
  if (!page && !fallback) return {};
  return {
    title: page?.seoTitle ?? page?.title ?? fallback?.title,
    description: page?.seoDescription ?? page?.lead ?? fallback?.lead,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function ConteudoPage({ params }: Props) {
  const { slug } = await params;
  const [page, s] = await Promise.all([carregar(slug), getSettings()]);
  const fallback = FALLBACK[slug];
  if (!page && !fallback) notFound();

  const eyebrow = page?.eyebrow || fallback?.eyebrow || "JB Soluções Odontológicas";
  const titulo = page?.title || fallback?.title || "JB Soluções Odontológicas";
  const lead = page?.lead || fallback?.lead || "";

  const [faqs, planos, servicos] = await Promise.all([
    slug === "faq"
      ? prisma.faq.findMany({ where: { published: true, productId: null }, orderBy: [{ group: "asc" }, { order: "asc" }] })
      : Promise.resolve([]),
    slug === "planos-de-manutencao"
      ? prisma.maintenancePlan.findMany({ where: { published: true }, orderBy: [{ order: "asc" }, { name: "asc" }] })
      : Promise.resolve([]),
    slug === "servicos"
      ? prisma.service.findMany({ where: { published: true }, orderBy: [{ order: "asc" }, { name: "asc" }] })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-graf-200 bg-graf-50/70">
        <div className="field-orbit pointer-events-none absolute inset-0 opacity-25" aria-hidden />
        <div className="container-jb relative py-14 lg:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">{eyebrow}</p>
          <h1 className="mt-4 max-w-5xl text-display leading-[1.03]">{titulo}</h1>
          {lead ? <p className="mt-5 max-w-3xl text-base leading-7 text-graf-600 lg:text-lg">{lead}</p> : null}
          {slug === "assistencia-tecnica" ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">Abrir chamado <ArrowRight className="size-4" aria-hidden /></LinkBotao>
              <LinkBotao href="/manutencao-preventiva" variante="secundario" tamanho="lg">Manutenção preventiva</LinkBotao>
            </div>
          ) : slug === "orcamento" ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {s.whatsapp ? <a href={whatsappHref(s.whatsapp, "Olá! Gostaria de solicitar um orçamento com a JB.")} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 items-center gap-2 rounded-lg bg-jb-600 px-7 text-base font-extrabold text-white hover:bg-jb-500"><MessageCircle className="size-4" aria-hidden /> Pedir pelo WhatsApp</a> : null}
              <LinkBotao href="/loja" variante="secundario" tamanho="lg">Ver equipamentos</LinkBotao>
            </div>
          ) : null}
        </div>
      </section>

      {slug === "assistencia-tecnica" ? <Assistencia /> : null}
      {slug === "manutencao-preventiva" ? <Preventiva /> : null}

      {slug === "planos-de-manutencao" ? (
        <section className="container-jb section-jb">
          {planos.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {planos.map((plano) => (
                <article key={plano.id} className="hover-lift rounded-2xl border border-graf-200 bg-white p-7">
                  <CalendarClock className="size-6 text-jb-600" aria-hidden />
                  <h2 className="mt-5 text-xl font-extrabold">{plano.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-graf-600">{plano.description}</p>
                  {plano.benefits.length > 0 ? <ul className="mt-5 space-y-2.5 text-sm text-graf-700">{plano.benefits.map((b) => <li key={b} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />{b}</li>)}</ul> : null}
                  <div className="mt-6 border-t border-graf-200 pt-5">
                    <p className="text-lg font-extrabold text-graf-950">{plano.priceCents ? formatarPreco(plano.priceCents) : "Sob orçamento"}</p>
                    <p className="mt-1 text-xs text-graf-500">Período de {plano.periodMonths} meses</p>
                  </div>
                </article>
              ))}
            </div>
          ) : <EstadoVazio texto="Os planos serão exibidos aqui quando forem publicados pela equipe da JB." />}
        </section>
      ) : null}

      {slug === "servicos" ? (
        <section className="container-jb section-jb">
          {servicos.length > 0 ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{servicos.map((servico) => <article key={servico.id} className="rounded-2xl border border-graf-200 bg-white p-7"><Wrench className="size-5 text-jb-600" aria-hidden /><h2 className="mt-5 text-lg font-extrabold">{servico.name}</h2><p className="mt-3 text-sm leading-6 text-graf-600">{servico.description}</p><p className="mt-5 text-sm font-extrabold text-graf-950">{servico.priceCents ? formatarPreco(servico.priceCents) : "Sob orçamento"}</p></article>)}</div> : <EstadoVazio texto="Os serviços publicados pela JB aparecerão aqui." />}
        </section>
      ) : null}

      {slug === "faq" ? (
        <section className="container-jb section-jb">
          <div className="mx-auto max-w-4xl divide-y divide-graf-200 border-y border-graf-200">
            {faqs.map((faq) => <details key={faq.id} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-extrabold text-graf-950 lg:py-6">{faq.question}<span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-graf-200 text-graf-500 transition group-open:rotate-45 group-open:bg-jb-50 group-open:text-jb-700">+</span></summary><div className="pb-6 text-sm leading-7 text-graf-600">{faq.answer}</div></details>)}
          </div>
        </section>
      ) : null}

      {slug === "contato" ? <Contato s={s} /> : null}
      {slug === "orcamento" ? <Orcamento s={s} /> : null}

      {page?.body ? (
        <section className="container-jb section-jb">
          <div className="mx-auto max-w-4xl rounded-2xl border border-graf-200 bg-white p-6 shadow-card sm:p-9 lg:p-11">
            <div className="prose-jb" dangerouslySetInnerHTML={{ __html: page.body }} />
          </div>
        </section>
      ) : null}

      {!page?.body && ["sobre", "estrutura", "entrega", "trocas-e-devolucoes", "privacidade", "termos"].includes(slug) ? (
        <section className="container-jb section-jb">
          <div className="mx-auto max-w-4xl rounded-2xl border border-graf-200 bg-white p-7 text-sm leading-7 text-graf-600 shadow-card sm:p-10">
            <p>Este conteúdo é administrado pela JB e será exibido aqui assim que a página correspondente estiver publicada no painel.</p>
          </div>
        </section>
      ) : null}
    </>
  );
}

function Assistencia() {
  const passos = [
    [ClipboardCheck, "Abra o chamado", "Informe o equipamento e descreva o problema."],
    [Headphones, "Triagem da JB", "A equipe analisa o cenário e pode pedir detalhes adicionais."],
    [FileCheck2, "Receba o orçamento", "Peças, mão de obra e próximos passos ficam registrados."],
    [BadgeCheck, "Aprove antes de executar", "Nada começa sem a aprovação necessária."],
    [Wrench, "Acompanhe o serviço", "O atendimento passa a fazer parte do histórico do equipamento."],
  ];
  return <section className="container-jb section-jb"><div className="grid gap-5 lg:grid-cols-5">{passos.map(([Icon, t, d], i) => { const I = Icon as typeof Wrench; return <article key={String(t)} className="rounded-2xl border border-graf-200 bg-white p-6"><span className="label-mono text-jb-600">0{i + 1}</span><I className="mt-5 size-5 text-jb-600" aria-hidden /><h2 className="mt-4 text-base font-extrabold">{String(t)}</h2><p className="mt-2 text-sm leading-6 text-graf-600">{String(d)}</p></article>; })}</div></section>;
}

function Preventiva() {
  return <section className="container-jb section-jb"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"><div><CalendarClock className="size-7 text-jb-600" aria-hidden /><h2 className="mt-5 text-2xl font-extrabold tracking-[-0.035em]">Manutenção que vira histórico, não papel perdido.</h2><p className="mt-4 text-base leading-7 text-graf-600">Quando o equipamento está vinculado à Área da Clínica, revisões e atendimentos podem ser consultados junto do próprio equipamento.</p></div><div className="grid gap-4 sm:grid-cols-2">{[[ShieldCheck,"Organização preventiva","Acompanhe datas e histórico técnico."],[PackageCheck,"Por equipamento","Cada item mantém sua própria trajetória."],[ClipboardCheck,"Registro do serviço","O que foi feito fica documentado."],[Wrench,"Assistência conectada","Corretiva e preventiva no mesmo ecossistema."]].map(([Icon,t,d])=>{const I=Icon as typeof ShieldCheck;return <article key={String(t)} className="rounded-2xl border border-graf-200 bg-white p-6"><I className="size-5 text-jb-600" aria-hidden/><h3 className="mt-4 text-base font-extrabold">{String(t)}</h3><p className="mt-2 text-sm leading-6 text-graf-600">{String(d)}</p></article>})}</div></div><div className="mt-10"><LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">Solicitar assistência <ArrowRight className="size-4" aria-hidden /></LinkBotao></div></section>;
}

function Contato({ s }: { s: Awaited<ReturnType<typeof getSettings>> }) {
  return <section className="container-jb section-jb"><div className="grid gap-5 md:grid-cols-3">{s.whatsapp ? <a href={whatsappHref(s.whatsapp,"Olá! Vim pelo site da JB.")} target="_blank" rel="noopener noreferrer" className="hover-lift rounded-2xl border border-graf-200 bg-white p-7"><MessageCircle className="size-6 text-jb-600" aria-hidden/><h2 className="mt-5 text-lg font-extrabold">WhatsApp</h2><p className="mt-2 text-sm text-graf-600">{s.whatsapp}</p></a> : null}<a href={telHref(s.telefone)} className="hover-lift rounded-2xl border border-graf-200 bg-white p-7"><Headphones className="size-6 text-jb-600" aria-hidden/><h2 className="mt-5 text-lg font-extrabold">Telefone</h2><p className="mt-2 text-sm text-graf-600">{s.telefone}</p></a><a href={`mailto:${s.email}`} className="hover-lift rounded-2xl border border-graf-200 bg-white p-7"><FileCheck2 className="size-6 text-jb-600" aria-hidden/><h2 className="mt-5 text-lg font-extrabold">E-mail</h2><p className="mt-2 break-all text-sm text-graf-600">{s.email}</p></a></div><div className="mt-5 rounded-2xl border border-graf-200 bg-graf-50 p-6"><p className="text-sm font-extrabold text-graf-950">Endereço</p><p className="mt-2 text-sm leading-6 text-graf-600">{enderecoCompleto(s)}</p><p className="mt-2 text-xs text-graf-500">{s.horario}</p></div></section>;
}

function Orcamento({ s }: { s: Awaited<ReturnType<typeof getSettings>> }) {
  return <section className="container-jb section-jb"><div className="grid gap-5 lg:grid-cols-3">{[[ShoppingBag,"Equipamentos","Novo, seminovo, usado ou recondicionado."],[Wrench,"Assistência","Diagnóstico, manutenção e serviços técnicos."],[PackageCheck,"Peças e acessórios","Itens para reposição e necessidades específicas."]].map(([Icon,t,d])=>{const I=Icon as typeof ShoppingBag;return <article key={String(t)} className="rounded-2xl border border-graf-200 bg-white p-7"><I className="size-6 text-jb-600" aria-hidden/><h2 className="mt-5 text-lg font-extrabold">{String(t)}</h2><p className="mt-2 text-sm leading-6 text-graf-600">{String(d)}</p></article>})}</div>{s.whatsapp ? <div className="mt-8 rounded-2xl bg-graf-950 p-7 text-white lg:flex lg:items-center lg:justify-between"><div><h2 className="text-xl font-extrabold text-white">Fale com a equipe comercial</h2><p className="mt-2 text-sm text-graf-400">Descreva o que procura para a JB entender a necessidade.</p></div><a href={whatsappHref(s.whatsapp,"Olá! Gostaria de pedir um orçamento à JB.")} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-jb-600 px-5 text-sm font-extrabold text-white hover:bg-jb-500 lg:mt-0"><MessageCircle className="size-4" aria-hidden/>Pedir orçamento</a></div> : null}</section>;
}

function EstadoVazio({ texto }: { texto: string }) {
  return <div className="rounded-2xl border border-dashed border-graf-300 bg-graf-50 p-10 text-center text-sm leading-6 text-graf-600">{texto}</div>;
}
