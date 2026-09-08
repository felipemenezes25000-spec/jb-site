import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { CanaisDiretos } from "@/components/assistencia/apoio";
import { ETAPAS_PUBLICAS, OPCOES_URGENCIA } from "@/components/assistencia/rotulos";
import { Acordeao } from "@/components/ui/acordeao";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, TituloSecao, Trilha } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { IconeCategoria } from "@/components/ui/icone";
import { Secao } from "@/components/ui/secao";
import { whatsappHref } from "@/lib/format";
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
    texto:
      "Cada atendimento nasce com um número e um histórico próprio. O que foi feito fica escrito.",
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
    titulo: "Assistência técnica odontológica",
    descricao: `Conserto, diagnóstico e manutenção de equipamentos odontológicos em ${s.endereco_cidade} e região. Chamado com número, orçamento antes da troca de peça e acompanhamento do começo ao fim.`,
    caminho: CAMINHO,
  });
}

export default async function AssistenciaTecnicaPage() {
  const [s, categorias, marcas, faqs, servicos, vitrine] = await Promise.all([
    getSettings(),
    prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 8,
      select: {
        slug: true,
        name: true,
        icon: true,
        description: true,
        image: { select: { url: true } },
      },
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
    /* A foto do topo é de equipamento de verdade, do catálogo da própria JB —
       é o argumento da página inteira: quem vende é quem conserta. Sem
       equipamento com foto publicada, o hero fica só com o texto, em coluna
       única, em vez de abrir espaço para uma imagem que não existe.

       Duas candidatas, e não uma: a consulta era idêntica à do destaque da
       home, então a assistência abria com EXATAMENTE a mesma autoclave da
       primeira dobra da vitrine. Compra e serviço ficavam com a mesma cara, e
       a página que fala de bancada não mostrava nada de bancada. A escolha
       abaixo prefere um seminovo — unidade que de fato passou pela revisão da
       JB — e, na falta dele, pega a segunda foto do catálogo em vez da
       primeira.

       Isto reduz a repetição; não a resolve. A correção completa é
       fotografia própria de diagnóstico e manutenção, que está registrada na
       auditoria de 08/09/2026 como produção de conteúdo. */
    prisma.product.findMany({
      where: { status: "active", media: { some: {} } },
      orderBy: [
        { condition: "asc" },
        { featured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 2,
      select: {
        condition: true,
        media: {
          orderBy: { order: "asc" },
          take: 1,
          select: { media: { select: { url: true } } },
        },
      },
    }),
  ]);

  const daBancada = vitrine.find((produto) => produto.condition === "seminovo");
  const escolhida = daBancada ?? vitrine[1] ?? vitrine[0];
  const foto = escolhida?.media[0]?.media.url ?? null;

  /* Cartão com foto e cartão sem foto na mesma grade viram uma fileira
     desalinhada. Ou a JB cadastrou imagem em todas as frentes e a seção é
     fotográfica, ou ela é uma lista tipográfica — nunca meio a meio. */
  const ilustradas = categorias.flatMap((categoria) =>
    categoria.image ? [{ ...categoria, foto: categoria.image.url }] : [],
  );
  const coberturaFotografica =
    ilustradas.length === categorias.length ? ilustradas : null;

  const mensagemWhatsapp = "Olá! Preciso de assistência técnica para um equipamento odontológico.";
  const whatsapp = whatsappHref(s.whatsapp, mensagemWhatsapp);
  const temContatoDireto = s.telefone.trim() !== "" || s.whatsapp.trim() !== "";

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

        <div
          className={
            foto
              ? "grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16"
              : "max-w-3xl"
          }
        >
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 py-1.5 text-[0.8125rem] font-semibold text-graf-600 shadow-xs">
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
                Acompanhe pela Área da Clínica
              </Link>{" "}
              ou pelo número que recebeu por e-mail.
            </p>
          </div>

          {foto ? (
            <figure className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
              <div className="relative aspect-[4/3] bg-gradient-to-b from-white to-graf-50">
                <Image
                  src={foto}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 92vw, 44vw"
                  /* Moldura enxuta de propósito: quem tem de crescer é o
                     equipamento, não a margem em volta dele. */
                  className="object-contain p-5 sm:p-8"
                  priority
                />
              </div>
              <figcaption className="flex items-start gap-3 border-t border-graf-200 px-5 py-4 text-sm leading-relaxed text-graf-600 sm:px-6">
                <Wrench className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                Atendemos o equipamento que saiu da nossa loja e o que a clínica comprou de
                outro fornecedor.
              </figcaption>
            </figure>
          ) : null}
        </div>

        {/* O que a JB assume ao receber um chamado. Sem cartão em volta: são
            quatro compromissos, não quatro produtos numa vitrine. */}
        <ul className="mt-14 grid gap-x-10 gap-y-9 border-t border-graf-200 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {COMBINADO.map((item) => (
            <li key={item.titulo}>
              <item.icone className="size-5 text-jb-600" aria-hidden />
              <p className="mt-3.5 text-[0.9375rem] font-bold text-graf-950">{item.titulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-graf-600">{item.texto}</p>
            </li>
          ))}
        </ul>
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

          {coberturaFotografica ? (
            <Grade como="ul" colunas={{ base: 1, sm: 2, lg: 4 }} espaco="md">
              {coberturaFotografica.map((categoria) => (
                <li key={categoria.slug}>
                  <Cartao className="flex h-full flex-col overflow-hidden">
                    <div className="relative aspect-[5/4] bg-graf-50">
                      <Image
                        src={categoria.foto}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 24vw"
                        className="object-contain p-4"
                      />
                    </div>
                    <div className="border-t border-graf-200 p-5">
                      <p className="text-[0.9375rem] font-bold text-graf-950">
                        {categoria.name}
                      </p>
                      {textoDeHtml(categoria.description) ? (
                        <p className="line-2 mt-1.5 text-sm leading-relaxed text-graf-500">
                          {textoDeHtml(categoria.description)}
                        </p>
                      ) : null}
                    </div>
                  </Cartao>
                </li>
              ))}
            </Grade>
          ) : (
            <ul className="grid border-b border-graf-200 sm:grid-cols-2 sm:gap-x-14">
              {categorias.map((categoria) => (
                <li
                  key={categoria.slug}
                  className="flex gap-4 border-t border-graf-200 py-6"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
                    <IconeCategoria nome={categoria.icon} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-graf-950">{categoria.name}</p>
                    {textoDeHtml(categoria.description) ? (
                      <p className="line-2 mt-1 text-sm leading-relaxed text-graf-500">
                        {textoDeHtml(categoria.description)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {servicos > 0 ? (
            <p className="mt-9 text-[0.9375rem] leading-relaxed text-graf-600">
              Além do conserto, a equipe também instala, revisa e treina.{" "}
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
          loja: o caminho do chamado escrito na ordem em que acontece, com o
          número de cada etapa pendurado fora do fio que liga uma à outra. */}
      <Secao
        id="como-funciona"
        fundo="afundada"
        espaco="lg"
        padraoDeFundo
        className="scroll-mt-24"
      >
        <div className="grid gap-14 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:h-max">
            <TituloSecao
              sobretitulo="Como funciona"
              titulo="Do chamado ao equipamento funcionando"
              descricao="Seis etapas, na ordem em que acontecem. É o caminho que o seu chamado percorre — e você acompanha todas elas pelo número que recebe na abertura."
            />

            <div className="mt-9">
              <LinkBotao href="/assistencia-tecnica/solicitar" variante="primario" tamanho="lg">
                Começar pela etapa 1
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
            </div>
            <p className="texto-suave mt-4 text-sm leading-relaxed">
              Leva poucos minutos, e o que você preencher fica salvo se precisar sair no
              meio.
            </p>
          </div>

          <div>
            {/* O fio que liga as etapas passa entre o número e o texto — mora
                fora do <ol> porque lista só aceita <li> como filho. */}
            <div className="relative">
              <span
                aria-hidden
                /* left casa com a largura da coluna do número, abaixo. */
                className="absolute inset-y-2 left-[3.5rem] w-px bg-white/15 sm:left-[4.5rem]"
              />

              <ol aria-label="Etapas do atendimento técnico">
                {ETAPAS_PUBLICAS.map((etapa, indice) => (
                  <li
                    key={etapa.titulo}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-7 pb-10 last:pb-0 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-9"
                  >
                    <span
                      aria-hidden
                      className="tabular pr-4 text-right font-mono text-2xl font-extrabold leading-none text-graf-300 sm:pr-5 sm:text-[1.75rem]"
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold leading-tight text-graf-950 sm:text-xl">
                        {etapa.titulo}
                      </h3>
                      <p className="texto-suave mt-2.5 max-w-xl text-[0.9375rem] leading-relaxed">
                        {etapa.texto}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Onde o histórico da última etapa fica guardado. */}
            <div className="mt-12 flex flex-col gap-5 rounded-2xl border border-white/15 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="max-w-md">
                <h3 className="flex items-center gap-2.5 text-base font-bold text-graf-950">
                  <LayoutDashboard className="size-4.5 shrink-0 text-jb-300" aria-hidden />
                  O histórico fica na Área da Clínica
                </h3>
                <p className="texto-suave mt-2 text-sm leading-relaxed">
                  Chamados, visitas e peças trocadas ficam na ficha de cada aparelho. No
                  atendimento seguinte, o técnico já chega sabendo o que foi feito antes.
                </p>
              </div>
              <LinkBotao
                href="/minha-jb"
                variante="secundario"
                className="sm:shrink-0"
              >
                Entrar na Área da Clínica
              </LinkBotao>
            </div>
          </div>
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

          {/* Contato direto e área de atendimento. Telefone e WhatsApp saem das
              configurações — nunca escritos aqui. */}
          <Cartao className="p-6 lg:p-7">
            <p className="label-mono uppercase text-graf-500">Falar com a equipe</p>

            {temContatoDireto ? (
              <>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-graf-700">
                  Prefere explicar o defeito falando? A equipe abre o chamado com você.
                </p>
                <CanaisDiretos
                  className="mt-4"
                  telefone={s.telefone}
                  whatsapp={s.whatsapp}
                  mensagem={mensagemWhatsapp}
                />
              </>
            ) : null}

            <ul
              className={
                temContatoDireto
                  ? "mt-6 space-y-6 border-t border-graf-200 pt-6 text-[0.9375rem]"
                  : "mt-6 space-y-6 text-[0.9375rem]"
              }
            >
              <li className="flex gap-3.5">
                <CalendarCheck className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">{s.horario}</span>
              </li>
              <li className="flex gap-3.5">
                <MapPin className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">
                  Atendimento na clínica em {s.endereco_cidade} e região, e bancada na
                  própria JB para o que precisa sair do consultório.
                  <span className="mt-1 block text-graf-500">{enderecoCompleto(s)}</span>
                </span>
              </li>
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
                  className="flex h-24 items-center justify-center rounded-xl border border-graf-200 bg-white px-4 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
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
