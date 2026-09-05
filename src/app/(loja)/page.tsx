import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Headphones,
  HeartHandshake,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Wrench,
} from "lucide-react";

import { GradeProdutos } from "@/components/loja/card-produto";
import { BuscaHero } from "@/components/loja/busca-hero";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { IconeCategoria } from "@/components/ui/icone";
import { Simbolo } from "@/components/ui/logo";
import { produtosEmDestaque, produtosPorCondicao } from "@/lib/catalogo";
import { formatarPreco, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

function CabecalhoSecao({
  eyebrow,
  titulo,
  descricao,
  href,
  link,
}: {
  eyebrow: string;
  titulo: string;
  descricao?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="mb-9 flex flex-col gap-5 lg:mb-12 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">{eyebrow}</p>
        <h2 className="mt-3 text-display leading-[1.06]">{titulo}</h2>
        {descricao ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-graf-600 lg:text-lg">{descricao}</p>
        ) : null}
      </div>
      {href && link ? (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-jb-700 transition-colors hover:text-jb-500"
        >
          {link}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [s, categorias, destaques, seminovos, faqs, marcas] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
      take: 7,
      select: {
        slug: true,
        name: true,
        icon: true,
        image: { select: { url: true, alt: true } },
        _count: { select: { products: { where: { status: "active" } } } },
      },
    }),
    produtosEmDestaque(8),
    produtosPorCondicao("seminovo", 4),
    prisma.faq.findMany({
      where: { published: true, group: "geral", productId: null },
      orderBy: { order: "asc" },
      take: 5,
    }),
    prisma.brand.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 10,
      select: {
        slug: true,
        name: true,
        logo: { select: { url: true, alt: true } },
        _count: { select: { products: { where: { status: "active" } } } },
      },
    }),
  ]);

  const heroProduto = destaques.find((produto) => produto.imageUrl) ?? destaques[0];
  const marcasComProduto = marcas.filter((marca) => marca._count.products > 0);

  return (
    <>
      {/* HERO */}
      <section className="hero-glow relative overflow-hidden border-b border-graf-200 bg-white">
        <div className="absolute inset-y-0 right-0 hidden w-[47%] bg-graf-50 lg:block" aria-hidden />
        <div className="premium-grid pointer-events-none absolute inset-y-0 right-0 hidden w-[47%] opacity-35 lg:block" aria-hidden />

        <div className="container-jb relative grid min-h-[660px] gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:py-16 xl:min-h-[720px]">
          <div className="relative z-10 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-jb-100 bg-jb-50 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-jb-700">
              <span className="size-2 rounded-full bg-jb-500" aria-hidden />
              Da compra à manutenção
            </p>

            <h1 className="mt-7 max-w-4xl text-hero leading-[0.98] tracking-[-0.055em]">
              Equipamentos odontológicos.
              <br />
              <span className="text-jb-600">Com quem entende.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-graf-600 lg:text-xl">
              Novos, seminovos e recondicionados, assistência técnica especializada e o histórico
              dos equipamentos da sua clínica em um só lugar.
            </p>

            <div className="mt-8 max-w-2xl">
              <BuscaHero />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <LinkBotao href="/loja" tamanho="lg">
                Comprar equipamentos
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="lg">
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </LinkBotao>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-graf-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-jb-600" aria-hidden />
                Equipe técnica própria
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-jb-600" aria-hidden />
                Seminovos revisados
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-jb-600" aria-hidden />
                Atendimento em {s.endereco_cidade || "São Paulo"}
              </li>
            </ul>
          </div>

          <div className="relative flex min-h-[420px] items-center justify-center lg:min-h-[560px]">
            <div className="absolute inset-x-[8%] bottom-[4%] top-[8%] rounded-[2.25rem] border border-graf-200 bg-white shadow-pop" aria-hidden />
            <div className="absolute -right-4 top-12 hidden w-52 rounded-2xl border border-graf-200 bg-white p-4 shadow-raised xl:block">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                  <Wrench className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs text-graf-500">Pós-venda</p>
                  <p className="text-sm font-extrabold text-graf-950">Assistência própria</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-2 bottom-16 z-20 hidden w-56 rounded-2xl border border-graf-200 bg-white p-4 shadow-raised xl:block">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ok-50 text-ok-700">
                  <BadgeCheck className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-graf-950">Compra acompanhada</p>
                  <p className="mt-1 text-xs leading-5 text-graf-500">Produto, instalação e histórico técnico conectados.</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex h-[390px] w-[78%] items-center justify-center lg:h-[520px]">
              {heroProduto?.imageUrl ? (
                <Image
                  src={heroProduto.imageUrl}
                  alt={heroProduto.imageAlt || heroProduto.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 80vw, 42vw"
                  className="object-contain p-8 drop-shadow-[0_24px_28px_rgba(23,25,27,0.16)] lg:p-12"
                />
              ) : (
                <div className="flex size-40 items-center justify-center rounded-full bg-jb-50">
                  <Simbolo tamanho={110} />
                </div>
              )}
            </div>

            {heroProduto ? (
              <Link
                href={`/loja/${heroProduto.slug}`}
                className="absolute bottom-2 right-[8%] z-20 max-w-[78%] rounded-2xl border border-graf-200 bg-white/95 p-4 shadow-raised backdrop-blur transition-transform hover:-translate-y-1 sm:max-w-sm lg:bottom-0"
              >
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-jb-600">
                  Destaque da JB
                </p>
                <p className="mt-1 line-2 text-sm font-extrabold leading-5 text-graf-950">
                  {heroProduto.name}
                </p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-graf-800">
                    {heroProduto.priceCents > 0 ? formatarPreco(heroProduto.priceCents) : "Sob orçamento"}
                  </span>
                  <ChevronRight className="size-4 text-jb-600" aria-hidden />
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* TRÊS CAMINHOS */}
      <section className="bg-white">
        <div className="container-jb section-jb">
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                href: "/loja",
                icone: ShoppingBag,
                titulo: "Comprar equipamentos",
                texto: "Novos, seminovos e recondicionados com suporte antes e depois da compra.",
                acao: "Explorar catálogo",
              },
              {
                href: "/assistencia-tecnica/solicitar",
                icone: Wrench,
                titulo: "Preciso de assistência",
                texto: "Abra um chamado, envie detalhes do problema e acompanhe cada etapa do atendimento.",
                acao: "Solicitar agora",
              },
              {
                href: "/minha-jb",
                icone: ClipboardList,
                titulo: "Área da Clínica",
                texto: "Pedidos, equipamentos, garantias, manutenções, documentos e ordens de serviço em um só lugar.",
                acao: "Acessar área",
              },
            ].map((item) => (
              <Link
                key={item.titulo}
                href={item.href}
                className="hover-lift group relative overflow-hidden rounded-2xl border border-graf-200 bg-white p-7 lg:p-8"
              >
                <div className="absolute right-0 top-0 size-32 translate-x-10 -translate-y-10 rounded-full bg-jb-50 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                <span className="relative flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
                  <item.icone className="size-5" aria-hidden />
                </span>
                <h2 className="relative mt-6 text-xl font-extrabold tracking-[-0.03em]">{item.titulo}</h2>
                <p className="relative mt-3 min-h-14 text-sm leading-6 text-graf-600">{item.texto}</p>
                <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-bold text-jb-700">
                  {item.acao}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      {categorias.length > 0 ? (
        <section className="border-y border-graf-200 bg-graf-50/70">
          <div className="container-jb section-jb">
            <CabecalhoSecao
              eyebrow="Catálogo"
              titulo="Encontre o equipamento ideal para a sua clínica"
              descricao="Navegue pelas principais frentes atendidas pela JB — para compra e para assistência técnica."
              href="/loja"
              link="Ver catálogo completo"
            />

            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
              {categorias.map((categoria) => (
                <li key={categoria.slug}>
                  <Link
                    href={`/categoria/${categoria.slug}`}
                    className="hover-lift group flex h-full min-h-48 flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white"
                  >
                    <span className="relative flex min-h-28 flex-1 items-center justify-center overflow-hidden bg-white p-5">
                      {categoria.image ? (
                        <Image
                          src={categoria.image.url}
                          alt={categoria.image.alt || categoria.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 14vw"
                          className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="flex size-16 items-center justify-center rounded-2xl bg-graf-100 text-graf-600 transition-colors group-hover:bg-jb-50 group-hover:text-jb-600">
                          <IconeCategoria nome={categoria.icon} className="size-7" />
                        </span>
                      )}
                    </span>
                    <span className="border-t border-graf-100 px-4 py-4">
                      <span className="block text-sm font-extrabold text-graf-950 group-hover:text-jb-700">{categoria.name}</span>
                      <span className="mt-1 block text-xs text-graf-500">
                        {categoria._count.products > 0
                          ? `${categoria._count.products} ${categoria._count.products === 1 ? "produto" : "produtos"}`
                          : "Consulte a JB"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* DESTAQUES */}
      <section className="bg-white">
        <div className="container-jb section-jb">
          <CabecalhoSecao
            eyebrow="Equipamentos em destaque"
            titulo="Escolhas da equipe técnica"
            descricao="Produtos que merecem atenção agora — com informações de condição, estoque e compra sem esconder o que importa."
            href="/loja"
            link="Ver todos os produtos"
          />
          {destaques.length > 0 ? (
            <GradeProdutos produtos={destaques} />
          ) : (
            <Vazio
              icone={Search}
              titulo="Catálogo em montagem"
              descricao="Os equipamentos ainda estão sendo cadastrados. Enquanto isso, peça um orçamento diretamente para a equipe."
              acao={<LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>}
            />
          )}
        </div>
      </section>

      {/* SEMINOVOS */}
      <section className="relative overflow-hidden bg-graf-950 text-white">
        <div className="field-orbit pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="pointer-events-none absolute -left-48 top-0 size-[38rem] rounded-full bg-jb-600/15 blur-3xl" aria-hidden />
        <div className="container-jb relative section-jb">
          <div className="grid gap-12 xl:grid-cols-[0.75fr_1.25fr] xl:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-400">Seminovo JB</p>
              <h2 className="mt-4 text-display leading-[1.05] text-white">Qualidade, procedência e preço justo.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-graf-400 lg:text-lg">
                Cada unidade passa por inspeção técnica antes de ser colocada à venda. Você vê o estado do equipamento e o que foi revisado.
              </p>
              <ul className="mt-7 space-y-3 text-sm text-graf-300">
                {["Checklist técnico por unidade", "Fotos e condição registradas", "Componentes avaliados", "Garantia informada quando aplicável"].map((texto) => (
                  <li key={texto} className="flex items-center gap-3">
                    <CheckCircle2 className="size-4 shrink-0 text-jb-400" aria-hidden />
                    {texto}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <LinkBotao href="/seminovos" tamanho="lg">Ver seminovos <ArrowRight className="size-4" aria-hidden /></LinkBotao>
              </div>
            </div>

            {seminovos.length > 0 ? (
              <GradeProdutos
                produtos={seminovos}
                className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 [&_article]:border-white/10 [&_article]:shadow-none"
              />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-graf-300">
                Novas unidades revisadas aparecem aqui assim que entram no catálogo.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ASSISTÊNCIA */}
      <section className="bg-white">
        <div className="container-jb section-jb">
          <div className="grid overflow-hidden rounded-[2rem] border border-graf-200 bg-graf-50 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative overflow-hidden bg-white p-8 lg:p-12 xl:p-14">
              <div className="absolute -right-24 -top-24 size-64 rounded-full bg-jb-50" aria-hidden />
              <p className="relative text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Assistência técnica</p>
              <h2 className="relative mt-4 text-display leading-[1.06]">Seu equipamento em boas mãos.</h2>
              <p className="relative mt-5 max-w-xl text-base leading-7 text-graf-600 lg:text-lg">
                Abra um chamado com as informações do equipamento. A JB faz a triagem, apresenta o orçamento e você acompanha o atendimento.
              </p>
              <div className="relative mt-8 flex flex-wrap gap-3">
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
                  Solicitar assistência <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
                {s.whatsapp ? (
                  <a
                    href={whatsappHref(s.whatsapp, "Olá! Preciso de assistência técnica para um equipamento.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-13 items-center justify-center rounded-lg border border-graf-300 bg-white px-6 text-sm font-bold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50"
                  >
                    Falar no WhatsApp
                  </a>
                ) : null}
              </div>
            </div>

            <ol className="grid gap-px bg-graf-200 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                { n: "01", icon: ClipboardCheck, t: "Abra seu chamado", d: "Conte o que aconteceu e identifique o equipamento." },
                { n: "02", icon: Search, t: "Receba a triagem", d: "Fotos, vídeos e histórico ajudam a acelerar a análise." },
                { n: "03", icon: FileCheck2, t: "Aprove o orçamento", d: "Nenhuma execução começa sem a sua aprovação." },
                { n: "04", icon: CalendarClock, t: "Acompanhe até concluir", d: "Tenha a linha do tempo do atendimento na Área da Clínica." },
              ].map((passo) => (
                <li key={passo.n} className="bg-graf-50 p-7 lg:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white text-jb-600 shadow-card">
                      <passo.icon className="size-5" aria-hidden />
                    </span>
                    <span className="label-mono text-graf-400">{passo.n}</span>
                  </div>
                  <p className="mt-5 text-base font-extrabold text-graf-950">{passo.t}</p>
                  <p className="mt-2 text-sm leading-6 text-graf-600">{passo.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ÁREA DA CLÍNICA */}
      <section className="border-y border-graf-200 bg-graf-50/70">
        <div className="container-jb section-jb">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Área da Clínica</p>
              <h2 className="mt-4 text-display leading-[1.06]">O pós-venda não termina na compra.</h2>
              <p className="mt-5 text-base leading-7 text-graf-600 lg:text-lg">
                Tudo o que acontece com seus equipamentos continua organizado: pedidos, garantias, manutenções, assistência, documentos e orçamentos.
              </p>
              <ul className="mt-7 grid gap-3 text-sm text-graf-700 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[
                  [PackageCheck, "Equipamentos e garantias"],
                  [Wrench, "Histórico de manutenções"],
                  [ClipboardList, "Ordens de serviço"],
                  [FileCheck2, "Orçamentos e documentos"],
                ].map(([Icon, texto]) => {
                  const I = Icon as typeof PackageCheck;
                  return (
                    <li key={String(texto)} className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-white text-jb-600 shadow-card"><I className="size-4" aria-hidden /></span>
                      {String(texto)}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkBotao href="/minha-jb" tamanho="lg">Conhecer a Área da Clínica <ArrowRight className="size-4" aria-hidden /></LinkBotao>
                <LinkBotao href="/entrar" variante="secundario" tamanho="lg">Entrar</LinkBotao>
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-graf-200 bg-white p-3 shadow-pop sm:p-5">
              <div className="overflow-hidden rounded-2xl border border-graf-200 bg-graf-50">
                <div className="flex items-center gap-3 border-b border-graf-200 bg-white px-5 py-4">
                  <Simbolo tamanho={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-graf-950">Área da Clínica</p>
                    <p className="text-xs text-graf-500">Visão central do pós-venda</p>
                  </div>
                  <span className="hidden rounded-full bg-ok-50 px-3 py-1 text-xs font-bold text-ok-700 sm:inline">Tudo organizado</span>
                </div>
                <div className="grid min-h-[360px] sm:grid-cols-[12rem_1fr]">
                  <aside className="hidden border-r border-graf-200 bg-graf-950 p-4 text-white sm:block">
                    <p className="mb-4 px-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-graf-500">Minha clínica</p>
                    {["Visão geral", "Equipamentos", "Assistência", "Manutenções", "Pedidos", "Documentos"].map((item, i) => (
                      <div key={item} className={`mb-1 rounded-lg px-3 py-2.5 text-xs font-bold ${i === 1 ? "bg-white/10 text-white" : "text-graf-400"}`}>{item}</div>
                    ))}
                  </aside>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-graf-500">Meus equipamentos</p>
                        <h3 className="mt-1 text-xl font-extrabold">Tudo que pertence à clínica</h3>
                      </div>
                      <span className="hidden text-xs font-bold text-jb-700 sm:inline">Ver todos</span>
                    </div>
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {[
                        [ShieldCheck, "Garantias", "Cobertura registrada"],
                        [CalendarClock, "Preventivas", "Próximas datas"],
                        [Wrench, "Assistência", "Histórico técnico"],
                      ].map(([Icon, t, d]) => {
                        const I = Icon as typeof ShieldCheck;
                        return <div key={String(t)} className="rounded-xl border border-graf-200 bg-white p-4"><I className="size-4 text-jb-600" aria-hidden /><p className="mt-3 text-sm font-extrabold">{String(t)}</p><p className="mt-1 text-xs leading-5 text-graf-500">{String(d)}</p></div>;
                      })}
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-graf-200 bg-white">
                      {["Autoclave", "Compressor", "Ultrassom"].map((nome, i) => (
                        <div key={nome} className="flex items-center gap-4 border-b border-graf-100 px-4 py-3 last:border-0">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-graf-100"><Stethoscope className="size-4 text-graf-500" aria-hidden /></span>
                          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-graf-900">{nome}</p><p className="text-xs text-graf-500">Histórico e documentos vinculados</p></div>
                          <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline ${i === 1 ? "bg-warn-50 text-warn-700" : "bg-ok-50 text-ok-700"}`}>{i === 1 ? "Revisão próxima" : "Em dia"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARCAS */}
      {marcasComProduto.length > 0 ? (
        <section className="bg-white">
          <div className="container-jb py-12 lg:py-16">
            <p className="text-center text-xs font-extrabold uppercase tracking-[0.16em] text-graf-500">Marcas presentes no catálogo</p>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {marcasComProduto.map((marca) => (
                <li key={marca.slug}>
                  <Link href={`/marcas/${marca.slug}`} className="group flex h-20 items-center justify-center rounded-xl border border-graf-200 bg-white px-5 transition-colors hover:border-graf-300 hover:bg-graf-50">
                    {marca.logo ? (
                      <span className="relative h-10 w-full"><Image src={marca.logo.url} alt={marca.logo.alt || marca.name} fill sizes="180px" className="object-contain grayscale transition group-hover:grayscale-0" /></span>
                    ) : (
                      <span className="text-center text-sm font-extrabold text-graf-700 group-hover:text-graf-950">{marca.name}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* DIFERENCIAIS */}
      <section className="border-y border-graf-200 bg-graf-50/70">
        <div className="container-jb py-12 lg:py-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              [HeartHandshake, "Atendimento próximo", "Compra e assistência tratadas pela mesma empresa."],
              [ShieldCheck, "Informação transparente", "Condição, garantia e disponibilidade sem esconder o essencial."],
              [Headphones, "Suporte pós-venda", "O relacionamento continua depois que o equipamento chega."],
              [ClipboardCheck, "Histórico centralizado", "O equipamento mantém sua trajetória organizada na Área da Clínica."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={String(t)} className="rounded-2xl border border-graf-200 bg-white p-6">
                  <I className="size-5 text-jb-600" aria-hidden />
                  <p className="mt-4 text-base font-extrabold text-graf-950">{String(t)}</p>
                  <p className="mt-2 text-sm leading-6 text-graf-600">{String(d)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 ? (
        <section className="bg-white">
          <div className="container-jb section-jb">
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Dúvidas frequentes</p>
                <h2 className="mt-4 text-display leading-[1.06]">O que a gente mais responde.</h2>
                <p className="mt-4 text-base leading-7 text-graf-600">Compra, assistência e pós-venda explicados sem enrolação.</p>
                <Link href="/faq" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-jb-700">Ver todas as dúvidas <ArrowRight className="size-4" aria-hidden /></Link>
              </div>
              <div className="divide-y divide-graf-200 border-y border-graf-200">
                {faqs.map((faq) => (
                  <details key={faq.id} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-extrabold text-graf-950 lg:py-6">
                      {faq.question}
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-graf-200 text-graf-500 transition group-open:rotate-45 group-open:border-jb-200 group-open:bg-jb-50 group-open:text-jb-700">+</span>
                    </summary>
                    <div className="max-w-3xl pb-6 text-sm leading-7 text-graf-600">{faq.answer}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA FINAL */}
      <section className="bg-jb-600 text-white">
        <div className="container-jb py-9 lg:py-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-white lg:text-3xl">O que sua clínica precisa hoje?</h2>
              <p className="mt-2 text-sm text-white/75 lg:text-base">Compre, peça assistência ou fale diretamente com a equipe.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/loja" className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-extrabold text-jb-700 transition hover:bg-jb-50"><ShoppingBag className="size-4" aria-hidden /> Comprar equipamento</Link>
              <Link href="/assistencia-tecnica/solicitar" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 text-sm font-extrabold text-white transition hover:bg-white/15"><Wrench className="size-4" aria-hidden /> Solicitar assistência</Link>
              <Link href="/orcamento" className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 text-sm font-extrabold text-white transition hover:bg-white/15"><FileCheck2 className="size-4" aria-hidden /> Pedir orçamento</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
