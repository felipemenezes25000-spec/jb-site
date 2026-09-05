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
import { Acordeao } from "@/components/ui/acordeao";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, TituloSecao, Trilha } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { IconeCategoria } from "@/components/ui/icone";
import { Secao } from "@/components/ui/secao";
import { telHref, whatsappHref } from "@/lib/format";
import { textoDeHtml } from "@/lib/html";
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

/** O que fica combinado com quem abre um chamado — cada linha é uma regra do sistema. */
const COMBINADO = [
  {
    icone: FileCheck2,
    titulo: "Orçamento antes da troca",
    texto: "Nenhuma peça é substituída sem aprovação sua registrada no chamado.",
  },
  {
    icone: ClipboardList,
    titulo: "Chamado com número",
    texto: "Cada atendimento vira um AT com linha do tempo. O que foi feito fica escrito.",
  },
  {
    icone: ShieldCheck,
    titulo: "Histórico por equipamento",
    texto: "Peça trocada hoje aparece na ficha do aparelho no próximo atendimento.",
  },
  {
    icone: CalendarCheck,
    titulo: "Visita combinada com você",
    texto: "Dia e período acertados conforme a agenda da clínica.",
  },
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
      <Secao
        fundo="clara"
        espaco="nenhum"
        padraoDeFundo
        como="header"
        className="border-b border-graf-200"
        classNameInterno="py-10 lg:py-16"
      >
        <Trilha itens={TRILHA} className="mb-7" />

        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-graf-600 shadow-xs">
              <Wrench className="size-3.5 text-jb-600" aria-hidden />
              Equipe técnica própria · {s.endereco_cidade} e região
            </p>

            <h1 className="text-hero texto-forte mt-6">
              Seu equipamento parado é <span className="text-jb-600">cadeira vazia</span>.
            </h1>

            <p className="texto-guia mt-6 max-w-xl text-graf-600">
              A JB conserta o que vende e o que não vendeu. Você abre o chamado, recebe um
              número e acompanha cada etapa — do diagnóstico ao teste final — sem precisar
              ligar para saber em que pé está.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
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

            <p className="mt-6 text-sm leading-relaxed text-graf-500">
              Já tem um chamado aberto?{" "}
              <Link
                href="/minha-jb/assistencia"
                className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Acompanhe pela sua conta
              </Link>{" "}
              ou pelo número que recebeu por e-mail.
            </p>
          </div>

          <Cartao className="p-6 lg:p-8">
            <p className="label-mono uppercase text-graf-500">O que está combinado</p>
            <ul className="mt-6 space-y-6">
              {COMBINADO.map((item) => (
                <li key={item.titulo} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
                    <item.icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-bold text-graf-950">{item.titulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-graf-600">{item.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      </Secao>

      {/* ======================================================= O QUE ATENDE */}
      {categorias.length > 0 ? (
        <Secao espaco="lg">
          <TituloSecao
            sobretitulo="Cobertura técnica"
            titulo="O que a JB conserta"
            descricao="As frentes em que a equipe é especializada. Não achou o seu equipamento na lista? Abra o chamado descrevendo marca e modelo — a triagem responde se atendemos."
            className="mb-10"
          />

          <Grade como="ul" colunas={{ base: 1, sm: 2, lg: 3 }} espaco="md">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <Cartao className="h-full p-5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
                    <IconeCategoria nome={categoria.icon} className="size-5" />
                  </span>
                  <p className="mt-4 text-[0.9375rem] font-bold text-graf-950">
                    {categoria.name}
                  </p>
                  {textoDeHtml(categoria.description) ? (
                    <p className="line-2 mt-1.5 text-sm leading-relaxed text-graf-500">
                      {textoDeHtml(categoria.description)}
                    </p>
                  ) : null}
                </Cartao>
              </li>
            ))}
          </Grade>

          {servicos > 0 ? (
            <p className="mt-9 text-[0.9375rem] leading-relaxed text-graf-600">
              Também trabalhamos com serviços avulsos, de instalação a treinamento.{" "}
              <Link
                href="/servicos"
                className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Ver todos os serviços
              </Link>
              .
            </p>
          ) : null}
        </Secao>
      ) : null}

      {/* ====================================================== COMO FUNCIONA */}
      {/* A única faixa grafite da página. É aqui que a assistência se separa da
          loja: o lado de quem conserta, escrito na ordem em que acontece. */}
      <Secao
        id="como-funciona"
        fundo="grafite"
        espaco="lg"
        padraoDeFundo
        className="scroll-mt-24"
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:h-max">
            <TituloSecao
              sobretitulo="Como funciona"
              titulo="Do chamado ao equipamento funcionando"
              descricao="Seis etapas, na ordem em que acontecem. É o caminho que o seu chamado percorre — e você acompanha cada uma delas pelo número que recebe na abertura."
            />

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <LinkBotao href="/assistencia-tecnica/solicitar" variante="claro" tamanho="lg">
                Começar pelo passo 1
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
            </div>
            <p className="texto-suave mt-4 text-sm leading-relaxed">
              Leva poucos minutos e o rascunho fica salvo se você precisar sair.
            </p>
          </div>

          <ComoFunciona />
        </div>
      </Secao>

      {/* ==================================================== PRAZO E COBERTURA */}
      <Secao espaco="lg">
        <TituloSecao
          sobretitulo="Prazo e cobertura"
          titulo="O que dá para prometer — e o que não dá"
          descricao="Prazo de conserto depende do diagnóstico e da peça, e quem disser um número antes de olhar o equipamento está chutando. O que a JB garante é outra coisa: ordem de atendimento clara e nenhuma surpresa no meio do caminho."
          className="mb-10"
        />

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div>
            <h3 className="text-[1.0625rem] font-bold text-graf-950">
              A urgência que você informa define a fila
            </h3>
            <ul className="mt-5 divide-y divide-graf-200 border-y border-graf-200">
              {OPCOES_URGENCIA.map((opcao) => (
                <li
                  key={opcao.valor}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 py-4"
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
                  <span className="flex-1 text-[0.9375rem] text-graf-600">
                    {opcao.descricao}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-graf-600">
              Equipamento parado sobe na fila de triagem. Isso não é promessa de hora
              marcada: é a ordem com que a equipe olha os chamados do dia.
            </p>
          </div>

          <Cartao className="p-6 lg:p-7">
            <p className="label-mono uppercase text-graf-500">Onde atendemos</p>

            <ul className="mt-6 space-y-6 text-[0.9375rem]">
              <li className="flex gap-3.5">
                <MapPin className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">
                  Atendimento na clínica em {s.endereco_cidade} e região, e bancada na
                  própria JB para o que precisa sair do consultório.
                  <span className="mt-1 block text-graf-500">{enderecoCompleto(s)}</span>
                </span>
              </li>
              <li className="flex gap-3.5">
                <CalendarCheck className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">{s.horario}</span>
              </li>
              {s.telefone ? (
                <li className="flex gap-3.5">
                  <Phone className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                  <a
                    href={telHref(s.telefone)}
                    /* Ligar é ação de toque: o `py` sobe a área tocável para
                       47px e o `-my` devolve o espaço, então a linha continua
                       alinhada com as irmãs da lista. */
                    className="-my-3 inline-flex items-center py-3 font-semibold text-graf-900 underline underline-offset-2 hover:text-jb-700"
                  >
                    {s.telefone}
                  </a>
                </li>
              ) : null}
              <li className="flex gap-3.5">
                <Search className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">
                  Fora da área de atendimento? Abra o chamado assim mesmo: a triagem
                  responde se conseguimos atender antes de qualquer deslocamento.
                </span>
              </li>
            </ul>
          </Cartao>
        </div>
      </Secao>

      {/* ============================================================= MARCAS */}
      {marcas.length > 0 ? (
        <Secao fundo="clara" espaco="md" separador>
          <TituloSecao
            sobretitulo="Marcas"
            titulo="Marcas que a JB trabalha"
            descricao="As marcas presentes no catálogo e na bancada. Equipamento de marca fora desta lista também pode ser avaliado — informe marca e modelo ao abrir o chamado."
            className="mb-9"
          />

          <Grade como="ul" colunas={{ base: 2, sm: 3, lg: 6 }} espaco="sm">
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
          </Grade>
        </Secao>
      ) : null}

      {/* ================================================================ FAQ */}
      {faqs.length > 0 ? (
        <Secao espaco="lg">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <TituloSecao
              sobretitulo="Dúvidas"
              titulo="Perguntas sobre a assistência"
              descricao="As dúvidas que mais chegam na triagem, respondidas pela própria equipe."
              className="lg:sticky lg:top-24 lg:h-max"
            />

            <Acordeao
              nome="faq-assistencia"
              itens={faqs.map((faq) => ({
                titulo: faq.question,
                resposta: <p className="whitespace-pre-line">{faq.answer}</p>,
              }))}
            />
          </div>
        </Secao>
      ) : null}

      {/* =============================================================== CTA */}
      <Secao fundo="marca" espaco="lg" separador>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-display texto-forte">
            Conte o que está acontecendo. A triagem responde com o próximo passo.
          </h2>
          <p className="texto-guia mx-auto mt-5 max-w-xl text-graf-600">
            Abrir o chamado leva poucos minutos e não compromete você a nada — o orçamento
            vem depois do diagnóstico.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
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
      </Secao>
    </>
  );
}
