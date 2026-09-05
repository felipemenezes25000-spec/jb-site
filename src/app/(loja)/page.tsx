import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  Headset,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { GradeProdutos } from "@/components/loja/card-produto";
import { BuscaHero } from "@/components/loja/busca-hero";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Vazio } from "@/components/ui/data";
import { IconeCategoria } from "@/components/ui/icone";
import { Simbolo } from "@/components/ui/logo";
import { produtosEmDestaque, produtosPorCondicao } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { whatsappHref } from "@/lib/format";

export default async function HomePage() {
  const [s, categorias, destaques, seminovos, faqs] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 8,
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
      take: 6,
    }),
  ]);

  return (
    <>
      {/* ================================================================ HERO */}
      <section className="relative overflow-hidden border-b border-graf-200 bg-gradient-to-b from-graf-50 to-white">
        <div
          aria-hidden
          className="field-orbit pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_60%_at_70%_20%,#000,transparent)]"
        />

        <div className="container-jb relative grid gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-graf-600 shadow-xs">
              <span className="size-1.5 rounded-full bg-jb-500" aria-hidden />
              Assistência técnica odontológica · {s.endereco_cidade}
            </p>

            <h1 className="mt-6 text-hero leading-[1.05]">
              Equipamentos odontológicos com{" "}
              <span className="text-jb-600">assistência de quem entende</span>.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-graf-600">
              Compra, instalação, manutenção e suporte especializado em um único lugar.
              Da escolha do equipamento ao histórico de cada manutenção.
            </p>

            <div className="mt-8 max-w-xl">
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
          </div>

          {/* Composição do hero: o ciclo que a plataforma cobre */}
          <div className="relative">
            <div className="relative mx-auto max-w-md">
              <div className="absolute -inset-6 rounded-[2rem] bg-white/70 blur-2xl" aria-hidden />
              <Cartao className="relative p-6">
                <div className="flex items-center gap-3">
                  <Simbolo tamanho={40} />
                  <div>
                    <p className="text-sm font-bold text-graf-950">O ciclo completo</p>
                    <p className="text-xs text-graf-500">Tudo dentro da JB</p>
                  </div>
                </div>

                <ol className="mt-6 space-y-1">
                  {[
                    { icone: Search, titulo: "Escolha o equipamento", texto: "Novo, seminovo revisado ou recondicionado." },
                    { icone: ShieldCheck, titulo: "Compre com segurança", texto: "Pagamento confirmado pelo servidor, nunca pelo navegador." },
                    { icone: Wrench, titulo: "Instale com a JB", texto: "Instalação como serviço adicional no próprio pedido." },
                    { icone: ClipboardList, titulo: "Acompanhe na Minha JB", texto: "Garantia, histórico e documentos por equipamento." },
                    { icone: CalendarClock, titulo: "Mantenha em dia", texto: "Preventiva programada e chamado em dois cliques." },
                  ].map((passo, i, todos) => (
                    <li key={passo.titulo} className="relative flex gap-3.5 pb-4 last:pb-0">
                      {i < todos.length - 1 ? (
                        <span
                          aria-hidden
                          className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-graf-200"
                        />
                      ) : null}
                      <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
                        <passo.icone className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 pt-1">
                        <p className="text-sm font-bold text-graf-900">{passo.titulo}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-graf-500">
                          {passo.texto}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Cartao>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== CONFIANÇA */}
      <section className="border-b border-graf-200 bg-white">
        <ul className="container-jb grid grid-cols-2 divide-graf-200 py-8 sm:divide-x lg:grid-cols-4">
          {[
            {
              icone: Wrench,
              titulo: "Assistência especializada",
              texto: "Equipe própria, não terceirizada.",
            },
            {
              icone: BadgeCheck,
              titulo: "Seminovos revisados",
              texto: "Checklist e fotos reais de cada unidade.",
            },
            {
              icone: FileCheck2,
              titulo: "Orçamento antes da troca",
              texto: "Nenhuma peça é trocada sem o seu aval.",
            },
            {
              icone: Headset,
              titulo: "Atendimento direto",
              texto: s.horario,
            },
          ].map((item, i) => (
            <li
              key={item.titulo}
              className={i % 2 === 1 ? "border-l border-graf-200 pl-5 sm:border-l-0 sm:pl-0" : ""}
            >
              <div className="px-0 py-3 sm:px-5">
                <item.icone className="size-5 text-jb-600" aria-hidden />
                <p className="mt-3 text-sm font-bold text-graf-900">{item.titulo}</p>
                <p className="mt-1 text-xs leading-relaxed text-graf-500">{item.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ====================================================== CATEGORIAS */}
      {categorias.length > 0 ? (
        <section className="bg-white">
          <div className="container-jb py-16 lg:py-20">
            <TituloSecao
              sobretitulo="Catálogo"
              titulo="O que a JB atende"
              descricao="As frentes de equipamento em que a equipe é especializada — para comprar e para dar assistência."
              acao={
                <Link
                  href="/loja"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700 hover:text-jb-800"
                >
                  Ver catálogo completo
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
              className="mb-8"
            />

            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {categorias.map((categoria) => (
                <li key={categoria.slug}>
                  <Link
                    href={`/categoria/${categoria.slug}`}
                    className="group flex h-full flex-col justify-between gap-6 rounded-xl border border-graf-200 bg-white p-5 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised"
                  >
                    <span className="flex size-11 items-center justify-center rounded-lg bg-graf-100 text-graf-600 transition-colors group-hover:bg-jb-50 group-hover:text-jb-600">
                      {categoria.image ? (
                        <Image
                          src={categoria.image.url}
                          alt=""
                          width={44}
                          height={44}
                          className="size-full rounded-lg object-cover"
                        />
                      ) : (
                        <IconeCategoria nome={categoria.icon} className="size-5" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-graf-900 group-hover:text-jb-700">
                        {categoria.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-graf-500">
                        {categoria._count.products === 0
                          ? "Sob consulta"
                          : `${categoria._count.products} ${categoria._count.products === 1 ? "item" : "itens"}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ======================================================= DESTAQUES */}
      <section className="border-y border-graf-200 bg-graf-50">
        <div className="container-jb py-16 lg:py-20">
          <TituloSecao
            sobretitulo="Em destaque"
            titulo="Escolhidos pela equipe técnica"
            acao={
              <Link
                href="/loja"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700 hover:text-jb-800"
              >
                Ver tudo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            }
            className="mb-8"
          />

          {destaques.length > 0 ? (
            <GradeProdutos produtos={destaques} />
          ) : (
            <Vazio
              icone={Search}
              titulo="Catálogo em montagem"
              descricao="Os equipamentos ainda estão sendo cadastrados no painel. Enquanto isso, fale com a equipe e peça um orçamento."
              acao={<LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>}
              className="bg-white"
            />
          )}
        </div>
      </section>

      {/* ======================================================= SEMINOVOS */}
      {seminovos.length > 0 ? (
        <section className="bg-white">
          <div className="container-jb py-16 lg:py-20">
            <TituloSecao
              sobretitulo="Seminovo JB"
              titulo="Seminovos revisados pela JB"
              descricao="Cada unidade tem o próprio checklist de revisão, fotos reais e as condições registradas — você vê exatamente o que está levando."
              acao={
                <Link
                  href="/seminovos"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700 hover:text-jb-800"
                >
                  Ver seminovos
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
              className="mb-8"
            />
            <GradeProdutos produtos={seminovos} />
          </div>
        </section>
      ) : null}

      {/* ===================================================== ASSISTÊNCIA */}
      <section className="relative overflow-hidden bg-graf-950 text-graf-300">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[32rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #e0141b 0%, transparent 70%)" }}
        />
        <div className="container-jb relative grid gap-12 py-16 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-jb-400">
              Assistência técnica
            </p>
            <h2 className="mt-4 text-display leading-tight text-white">
              Seu equipamento apresentou problema?
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-graf-400">
              Abra um chamado descrevendo o que está acontecendo. A equipe faz a triagem,
              avalia e envia o orçamento antes de qualquer troca de peça.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </LinkBotao>
              {s.whatsapp ? (
                <a
                  href={whatsappHref(
                    s.whatsapp,
                    "Olá! Preciso de assistência técnica para um equipamento.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-13 items-center justify-center gap-2.5 rounded-lg border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:border-white/60"
                >
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div id="como-funciona">
            <p className="text-sm font-bold uppercase tracking-wider text-graf-400">
              Como funciona
            </p>
            <ol className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {[
                { n: "01", t: "Informe o equipamento", d: "Se ele já está na sua Minha JB, marca e modelo vêm preenchidos." },
                { n: "02", t: "Descreva o problema", d: "Anexe fotos ou vídeo do defeito — acelera muito a triagem." },
                { n: "03", t: "Receba a análise", d: "A equipe avalia e monta o orçamento com peças e mão de obra." },
                { n: "04", t: "Aprove o que fizer sentido", d: "Nada é executado sem a sua aprovação registrada." },
                { n: "05", t: "Acompanhe o atendimento", d: "Cada etapa aparece na linha do tempo do chamado." },
              ].map((passo) => (
                <li key={passo.n} className="flex gap-5 py-4">
                  <span className="label-mono pt-0.5 font-semibold text-jb-400">{passo.n}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{passo.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-graf-400">{passo.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ========================================================= MINHA JB */}
      <section className="bg-white">
        <div className="container-jb py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-jb-600">Minha JB</p>
              <h2 className="mt-4 text-display leading-tight">
                Todos os equipamentos da sua clínica em um só lugar.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-graf-600">
                Cada equipamento vira um prontuário: quando foi comprado, até quando tem
                garantia, o que já foi feito nele e quando é a próxima preventiva.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkBotao href="/cadastro">Criar minha conta</LinkBotao>
                <LinkBotao href="/entrar" variante="texto">
                  Já tenho conta
                </LinkBotao>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icone: ClipboardList, t: "Pedidos", d: "Da compra à instalação, com a linha do tempo de cada etapa." },
                { icone: Wrench, t: "Equipamentos", d: "Prontuário técnico com histórico e documentos." },
                { icone: CalendarClock, t: "Manutenções", d: "Preventiva programada, com aviso antes do vencimento." },
                { icone: FileCheck2, t: "Orçamentos e OS", d: "Aprove pelo site e acompanhe a execução." },
              ].map((item) => (
                <li key={item.t}>
                  <Cartao className="h-full p-5">
                    <item.icone className="size-5 text-jb-600" aria-hidden />
                    <p className="mt-3 text-sm font-bold text-graf-900">{item.t}</p>
                    <p className="mt-1 text-xs leading-relaxed text-graf-400">{item.d}</p>
                  </Cartao>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================================== FAQ */}
      {faqs.length > 0 ? (
        <section className="border-t border-graf-200 bg-graf-50">
          <div className="container-jb py-16 lg:py-20">
            <TituloSecao
              sobretitulo="Dúvidas frequentes"
              titulo="Perguntas que a gente mais recebe"
              className="mb-8"
              acao={
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700 hover:text-jb-800"
                >
                  Ver todas
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
            <ul className="grid gap-3 lg:grid-cols-2">
              {faqs.map((faq) => (
                <li key={faq.id}>
                  <details className="group rounded-xl border border-graf-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold text-graf-900">
                      {faq.question}
                      <span
                        aria-hidden
                        className="shrink-0 text-graf-400 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <div className="border-t border-graf-100 px-5 py-4 text-sm leading-relaxed text-graf-600">
                      {faq.answer}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ======================================================== CTA FINAL */}
      <section className="border-t border-graf-200 bg-white">
        <div className="container-jb py-16 lg:py-20">
          <Cartao className="overflow-hidden">
            <div className="grid items-center gap-8 p-8 lg:grid-cols-[1.3fr_1fr] lg:p-12">
              <div>
                <h2 className="text-title leading-tight">
                  Precisa de um equipamento, de um orçamento ou de um técnico?
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-graf-600">
                  Fale com a equipe da JB. Se preferir, descreva o que precisa e
                  retornamos com a proposta.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <LinkBotao href="/orcamento" tamanho="lg" larguraTotal>
                  Pedir orçamento
                </LinkBotao>
                <LinkBotao href="/contato" variante="secundario" tamanho="lg" larguraTotal>
                  Falar com a JB
                </LinkBotao>
              </div>
            </div>
          </Cartao>
        </div>
      </section>
    </>
  );
}
