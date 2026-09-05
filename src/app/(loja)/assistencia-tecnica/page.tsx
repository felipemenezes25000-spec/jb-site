import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { ComoFunciona } from "@/components/assistencia/como-funciona";
import { OPCOES_URGENCIA } from "@/components/assistencia/rotulos";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, TituloSecao, Trilha } from "@/components/ui/data";
import { IconeCategoria } from "@/components/ui/icone";
import { telHref, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  JsonLd,
  faqJsonLd,
  metadataDePagina,
  servicoJsonLd,
  trilhaJsonLd,
} from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

const CAMINHO = "/assistencia-tecnica";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Assistência técnica" },
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return metadataDePagina({
    titulo: "Assistência técnica de equipamentos odontológicos",
    descricao: `Conserto, diagnóstico e manutenção de equipamentos odontológicos em ${s.endereco_cidade} e região. Chamado com número, orçamento antes da troca de peça e acompanhamento do começo ao fim.`,
    caminho: CAMINHO,
  });
}

export default async function AssistenciaTecnicaPage() {
  const [s, categorias, marcas, faqs, servicos] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 8,
      select: { slug: true, name: true, icon: true, description: true },
    }),
    prisma.brand.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 18,
      select: { slug: true, name: true, logo: { select: { url: true, alt: true } } },
    }),
    prisma.faq.findMany({
      where: { published: true, group: "assistencia", productId: null },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, question: true, answer: true },
    }),
    prisma.service.count({ where: { published: true } }),
  ]);

  const whatsapp = whatsappHref(
    s.whatsapp,
    "Olá! Preciso de assistência técnica para um equipamento odontológico.",
  );

  return (
    <>
      <JsonLd
        dados={[
          servicoJsonLd({
            nome: "Assistência técnica de equipamentos odontológicos",
            caminho: CAMINHO,
            descricao:
              "Diagnóstico, conserto e manutenção de equipamentos odontológicos, com chamado numerado, orçamento antes da troca de peça e histórico por equipamento.",
            prestador: s.empresa_nome,
            area: s.endereco_cidade,
            tipo: "Assistência técnica odontológica",
          }),
          trilhaJsonLd(TRILHA),
          ...(faqs.length > 0
            ? [faqJsonLd(faqs.map((f) => ({ pergunta: f.question, resposta: f.answer })))]
            : []),
        ]}
      />

      {/* ================================================================ HERO */}
      <section className="relative overflow-hidden border-b border-graf-200 bg-gradient-to-b from-graf-50 to-white">
        <div
          aria-hidden
          className="field-orbit pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(70%_60%_at_75%_15%,#000,transparent)]"
        />

        <div className="container-jb relative py-10 lg:py-14">
          <Trilha itens={TRILHA} className="mb-6" />

          <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-graf-600 shadow-xs">
                <Wrench className="size-3.5 text-jb-600" aria-hidden />
                Equipe própria · {s.endereco_cidade} e região
              </p>

              <h1 className="mt-6 text-hero leading-[1.05]">
                Seu equipamento parado é{" "}
                <span className="text-jb-600">cadeira vazia</span>.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-graf-600">
                A JB conserta o que vende e o que não vendeu. Você abre o chamado, recebe um
                número e acompanha cada etapa — do diagnóstico ao teste final — sem precisar
                ligar para saber em que pé está.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
                  Abrir chamado
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>

                {whatsapp ? (
                  <LinkBotao
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    variante="secundario"
                    tamanho="lg"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Falar no WhatsApp
                  </LinkBotao>
                ) : null}
              </div>

              <p className="mt-5 text-sm text-graf-500">
                Já tem um chamado aberto?{" "}
                <Link
                  href="/minha-jb/assistencia"
                  className="font-semibold text-jb-700 underline underline-offset-2"
                >
                  Acompanhe pela sua conta
                </Link>{" "}
                ou pelo número que recebeu por e-mail.
              </p>
            </div>

            {/* O que a JB garante — cada linha é uma regra do próprio sistema */}
            <Cartao className="relative p-6 lg:p-7">
              <p className="label-mono uppercase text-graf-500">O que está combinado</p>
              <ul className="mt-5 space-y-5">
                {[
                  {
                    icone: FileCheck2,
                    titulo: "Orçamento antes da troca",
                    texto:
                      "Nenhuma peça é substituída sem aprovação sua registrada no chamado.",
                  },
                  {
                    icone: ClipboardList,
                    titulo: "Chamado com número",
                    texto:
                      "Cada atendimento vira um AT com linha do tempo. O que foi feito fica escrito.",
                  },
                  {
                    icone: ShieldCheck,
                    titulo: "Histórico por equipamento",
                    texto:
                      "Peça trocada hoje aparece na ficha do aparelho no próximo atendimento.",
                  },
                  {
                    icone: CalendarCheck,
                    titulo: "Visita combinada com você",
                    texto: "Dia e período acertados conforme a agenda da clínica.",
                  },
                ].map((item) => (
                  <li key={item.titulo} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
                      <item.icone className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-graf-900">{item.titulo}</p>
                      <p className="mt-1 text-sm leading-relaxed text-graf-600">
                        {item.texto}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Cartao>
          </div>
        </div>
      </section>

      {/* ======================================================= O QUE ATENDE */}
      {categorias.length > 0 ? (
        <section className="bg-white">
          <div className="container-jb py-16 lg:py-20">
            <TituloSecao
              sobretitulo="Cobertura técnica"
              titulo="O que a JB conserta"
              descricao="As frentes em que a equipe é especializada. Não achou o seu equipamento na lista? Abra o chamado descrevendo marca e modelo — a triagem responde se atendemos."
              className="mb-8"
            />

            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {categorias.map((categoria) => (
                <li key={categoria.slug}>
                  <Cartao className="h-full p-5">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
                      <IconeCategoria nome={categoria.icon} className="size-5" />
                    </span>
                    <p className="mt-4 text-sm font-bold text-graf-950">{categoria.name}</p>
                    {categoria.description ? (
                      <p className="line-2 mt-1.5 text-xs leading-relaxed text-graf-500">
                        {categoria.description}
                      </p>
                    ) : null}
                  </Cartao>
                </li>
              ))}
            </ul>

            {servicos > 0 ? (
              <p className="mt-8 text-sm text-graf-600">
                Também trabalhamos com serviços avulsos, de instalação a treinamento.{" "}
                <Link
                  href="/servicos"
                  className="font-semibold text-jb-700 underline underline-offset-2"
                >
                  Ver todos os serviços
                </Link>
                .
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ====================================================== COMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-24 border-y border-graf-200 bg-graf-50">
        <div className="container-jb py-16 lg:py-20">
          <TituloSecao
            sobretitulo="Como funciona"
            titulo="Do chamado ao equipamento funcionando"
            descricao="Seis etapas, na ordem em que acontecem. É o mesmo caminho que o número do seu chamado percorre dentro do sistema."
            className="mb-10"
          />

          <ComoFunciona />

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <LinkBotao href="/assistencia-tecnica/solicitar">
              Começar pelo passo 1
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <p className="text-sm text-graf-600">
              Leva poucos minutos e o rascunho fica salvo se você precisar sair.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================== PRAZO E COBERTURA */}
      <section className="bg-white">
        <div className="container-jb py-16 lg:py-20">
          <TituloSecao
            sobretitulo="Prazo e cobertura"
            titulo="O que dá para prometer — e o que não dá"
            descricao="Prazo de conserto depende do diagnóstico e da peça, e quem disser um número antes de olhar o equipamento está chutando. O que a JB garante é outra coisa: ordem de atendimento clara e nenhuma surpresa no meio do caminho."
            className="mb-10"
          />

          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <h3 className="text-base font-bold text-graf-950">
                A urgência que você informa define a fila
              </h3>
              <ul className="mt-4 divide-y divide-graf-200 border-y border-graf-200">
                {OPCOES_URGENCIA.map((opcao) => (
                  <li
                    key={opcao.valor}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3.5"
                  >
                    <Etiqueta
                      tom={
                        opcao.valor === "parado"
                          ? "alerta"
                          : opcao.valor === "alta"
                            ? "aguardando"
                            : opcao.valor === "normal"
                              ? "andamento"
                              : "neutro"
                      }
                      ponto
                    >
                      {opcao.rotulo}
                    </Etiqueta>
                    <span className="flex-1 text-sm text-graf-600">{opcao.descricao}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-graf-600">
                Equipamento parado sobe na fila de triagem. Isso não é promessa de hora
                marcada: é a ordem com que a equipe olha os chamados do dia.
              </p>
            </div>

            <Cartao className="p-6">
              <p className="label-mono uppercase text-graf-500">Onde atendemos</p>

              <ul className="mt-5 space-y-5 text-sm">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  <span className="leading-relaxed text-graf-700">
                    Atendimento na clínica em {s.endereco_cidade} e região, e bancada na
                    própria JB para o que precisa sair do consultório.
                    <span className="mt-1 block text-graf-500">{enderecoCompleto(s)}</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <CalendarCheck className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  <span className="leading-relaxed text-graf-700">{s.horario}</span>
                </li>
                {s.telefone ? (
                  <li className="flex gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                    <a
                      href={telHref(s.telefone)}
                      className="font-semibold text-graf-900 underline underline-offset-2 hover:text-jb-700"
                    >
                      {s.telefone}
                    </a>
                  </li>
                ) : null}
                <li className="flex gap-3">
                  <Search className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  <span className="leading-relaxed text-graf-700">
                    Fora da área de atendimento? Abra o chamado assim mesmo: a triagem
                    responde se conseguimos atender antes de qualquer deslocamento.
                  </span>
                </li>
              </ul>
            </Cartao>
          </div>
        </div>
      </section>

      {/* ============================================================= MARCAS */}
      {marcas.length > 0 ? (
        <section className="border-t border-graf-200 bg-graf-50">
          <div className="container-jb py-14 lg:py-16">
            <TituloSecao
              sobretitulo="Marcas"
              titulo="Marcas que a JB trabalha"
              descricao="As marcas presentes no catálogo e na bancada. Equipamento de marca fora desta lista também pode ser avaliado — informe marca e modelo ao abrir o chamado."
              className="mb-8"
            />

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {marcas.map((marca) => (
                <li key={marca.slug}>
                  <Link
                    href={`/marcas/${marca.slug}`}
                    className="flex h-20 items-center justify-center rounded-xl border border-graf-200 bg-white px-4 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-card"
                  >
                    {marca.logo ? (
                      <Image
                        src={marca.logo.url}
                        alt={marca.logo.alt || marca.name}
                        width={110}
                        height={36}
                        className="h-9 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-center text-sm font-bold text-graf-700">
                        {marca.name}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ================================================================ FAQ */}
      {faqs.length > 0 ? (
        <section className="border-t border-graf-200 bg-white">
          <div className="container-jb py-16 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
              <TituloSecao
                sobretitulo="Dúvidas"
                titulo="Perguntas sobre a assistência"
                descricao="As dúvidas que mais chegam na triagem, respondidas pela própria equipe."
              />

              <ul className="divide-y divide-graf-200 border-y border-graf-200">
                {faqs.map((faq) => (
                  <li key={faq.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-graf-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500">
                        {faq.question}
                        <span
                          aria-hidden
                          className="grid size-6 shrink-0 place-items-center rounded-full border border-graf-300 text-graf-500 transition-transform group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="whitespace-pre-line pb-5 text-sm leading-relaxed text-graf-600">
                        {faq.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* =============================================================== CTA */}
      <section className="border-t border-graf-200 bg-graf-950">
        <div className="container-jb py-14 text-center lg:py-16">
          <h2 className="mx-auto max-w-2xl text-title leading-tight text-white">
            Conte o que está acontecendo. A triagem responde com o próximo passo.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-graf-300">
            Abrir o chamado leva poucos minutos e não compromete você a nada — o orçamento
            vem depois do diagnóstico.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
              Abrir chamado agora
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            {whatsapp ? (
              <LinkBotao
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                variante="secundario"
                tamanho="lg"
              >
                <MessageCircle className="size-4" aria-hidden />
                Prefiro o WhatsApp
              </LinkBotao>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
