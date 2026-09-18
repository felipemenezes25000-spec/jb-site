import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Camera,
  ClipboardList,
  FileCheck2,
  FileText,
  History,
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
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { prisma } from "@/lib/prisma";
import {
  JsonLd,
  faqJsonLd,
  metadataDePagina,
  servicoJsonLd,
  trilhaJsonLd,
} from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

export const instant = false;

const CAMINHO = "/assistencia-tecnica";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Assistência técnica" },
];

const COMBINADO = [
  {
    icone: FileCheck2,
    titulo: "Orçamento antes da troca",
    texto: "Nenhuma peça é substituída sem aprovação registrada no chamado.",
  },
  {
    icone: ClipboardList,
    titulo: "Chamado com número",
    texto: "Cada atendimento nasce com protocolo e histórico próprio.",
  },
  {
    icone: ShieldCheck,
    titulo: "Histórico por equipamento",
    texto: "O próximo atendimento começa sabendo o que já foi feito no aparelho.",
  },
  {
    icone: CalendarCheck,
    titulo: "Visita combinada",
    texto: "Data e período são acertados conforme a rotina da clínica.",
  },
];

const PRONTUARIO = [
  {
    icone: Activity,
    titulo: "Chamados e andamento",
    texto: "Situação atual, urgência e conversa com a equipe no mesmo lugar.",
  },
  {
    icone: Wrench,
    titulo: "Ordens de serviço",
    texto: "Diagnóstico, execução, peças e registro do trabalho realizado.",
  },
  {
    icone: CalendarCheck,
    titulo: "Preventivas",
    texto: "Última manutenção e próxima preventiva ligadas ao próprio equipamento.",
  },
  {
    icone: ShieldCheck,
    titulo: "Garantia",
    texto: "Cobertura e vencimento visíveis sem precisar procurar papelada.",
  },
  {
    icone: FileText,
    titulo: "Documentos",
    texto: "Arquivos e registros técnicos associados ao prontuário do aparelho.",
  },
  {
    icone: History,
    titulo: "Histórico técnico",
    texto: "Chamados, visitas, manutenções e documentos em uma linha do tempo única.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return metadataDePagina({
    titulo: "Assistência técnica odontológica",
    descricao: `Assistência técnica para equipamentos odontológicos em ${s.endereco_cidade} e região. Abra um chamado, acompanhe as etapas e mantenha o histórico técnico do equipamento organizado na JB.`,
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

  const mensagemWhatsapp =
    "Olá! Preciso de assistência técnica para um equipamento odontológico.";
  const whatsapp = whatsappHref(s.whatsapp, mensagemWhatsapp);
  const temContatoDireto = s.telefone.trim() !== "" || s.whatsapp.trim() !== "";

  return (
    <div data-assistencia-premium>
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

      <Secao
        fundo="clara"
        espaco="nenhum"
        padraoDeFundo
        como="header"
        className="relative overflow-hidden border-b border-graf-200"
        classNameInterno="relative py-10 lg:py-16"
      >
        <span
          aria-hidden
          data-assistencia-orbita
          className="pointer-events-none absolute -right-24 top-8 size-80 rounded-full border border-jb-500/15 lg:size-[28rem]"
        />
        <span
          aria-hidden
          data-assistencia-orbita="2"
          className="pointer-events-none absolute -right-4 top-28 size-52 rounded-full border border-jb-500/10 lg:size-72"
        />

        <Trilha itens={TRILHA} className="mb-7" />

        <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16">
          <div data-assistencia-hero-copy>
            <p className="inline-flex items-center gap-2 rounded-full border border-jb-200 bg-white px-3.5 py-1.5 text-apoio font-semibold text-graf-700 shadow-xs">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-jb-500 opacity-25" />
                <span className="relative inline-flex size-2 rounded-full bg-jb-600" />
              </span>
              Central de assistência JB · {s.endereco_cidade} e região
            </p>

            <h1 className="text-hero texto-forte mt-6 max-w-3xl">
              Seu equipamento parou? <span className="text-jb-600">A JB assume daqui.</span>
            </h1>

            <p className="texto-guia mt-6 max-w-2xl text-graf-600">
              Abra o chamado, identifique o equipamento, envie fotos e acompanhe o atendimento
              até o teste final. Depois, tudo continua no prontuário técnico do aparelho —
              histórico, manutenção, documentos e próximos atendimentos.
            </p>

            <div className="mt-9 flex flex-wrap gap-3" data-assistencia-cta>
              <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
                Abrir chamado técnico
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/minha-jb/assistencia" variante="secundario" tamanho="lg">
                <LayoutDashboard className="size-4" aria-hidden />
                Acompanhar atendimento
              </LinkBotao>
            </div>

            <ul className="mt-8 grid max-w-2xl gap-3 text-sm text-graf-600 sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <ClipboardList className="size-4 shrink-0 text-jb-600" aria-hidden />
                Chamado numerado
              </li>
              <li className="flex items-center gap-2">
                <Camera className="size-4 shrink-0 text-jb-600" aria-hidden />
                Fotos e vídeo no chamado
              </li>
              <li className="flex items-center gap-2">
                <History className="size-4 shrink-0 text-jb-600" aria-hidden />
                Histórico por equipamento
              </li>
            </ul>
          </div>

          <div data-assistencia-command className="relative">
            <div className="relative overflow-hidden rounded-3xl border border-graf-200 bg-graf-950 p-2 shadow-2xl shadow-graf-950/15">
              <div className="relative overflow-hidden rounded-[1.15rem] bg-white">
                {foto ? (
                  <div className="relative aspect-[5/4] bg-gradient-to-b from-white via-white to-graf-50">
                    <Image
                      src={imagemProdutoSemFundo(foto)}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 92vw, 44vw"
                      className="object-contain p-8 sm:p-12"
                      priority
                    />
                    <span
                      aria-hidden
                      data-assistencia-scan
                      className="pointer-events-none absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-jb-500 to-transparent shadow-[0_0_18px_rgba(224,20,27,.65)]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[5/4] items-center justify-center bg-graf-50">
                    <Wrench className="size-20 text-graf-200" aria-hidden />
                  </div>
                )}

                <div className="border-t border-graf-200 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="label-mono uppercase text-graf-500">Fluxo de atendimento</p>
                      <p className="mt-1 text-base font-bold text-graf-950">
                        Você sabe o que está acontecendo
                      </p>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-700">
                      <Activity className="size-4" aria-hidden />
                    </span>
                  </div>

                  <ol className="mt-5 grid gap-2 sm:grid-cols-2">
                    {ETAPAS_PUBLICAS.slice(0, 4).map((etapa, indice) => (
                      <li
                        key={etapa.titulo}
                        className="flex items-center gap-2.5 rounded-xl border border-graf-200 bg-graf-50/70 px-3 py-2.5"
                      >
                        <span className="tabular font-mono text-[0.6875rem] font-bold text-jb-700">
                          {String(indice + 1).padStart(2, "0")}
                        </span>
                        <span className="text-xs font-semibold text-graf-800">{etapa.titulo}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 hidden max-w-[15rem] rounded-2xl border border-graf-200 bg-white p-4 shadow-xl lg:block">
              <p className="label-mono uppercase text-graf-500">Depois do reparo</p>
              <p className="mt-1.5 text-sm font-bold text-graf-950">O histórico não desaparece.</p>
              <p className="mt-1 text-xs leading-relaxed text-graf-500">
                O próximo atendimento começa do ponto em que o anterior terminou.
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-16 grid gap-x-10 gap-y-9 border-t border-graf-200 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {COMBINADO.map((item) => (
            <li key={item.titulo} data-assistencia-proof>
              <item.icone className="size-5 text-jb-600" aria-hidden />
              <p className="mt-3.5 text-corpo font-bold text-graf-950">{item.titulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-graf-600">{item.texto}</p>
            </li>
          ))}
        </ul>
      </Secao>

      {categorias.length > 0 ? (
        <Secao espaco="lg" className="overflow-hidden">
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <TituloSecao
              sobretitulo="Comece pelo equipamento"
              titulo="O que precisa de assistência?"
              descricao="Escolha a família do aparelho ou abra o chamado direto. Marca e modelo podem ser preenchidos depois — inclusive pela leitura da etiqueta com a câmera."
            />
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" className="lg:shrink-0">
              Não encontrei meu equipamento
            </LinkBotao>
          </div>

          <Grade como="ul" colunas={{ base: 1, sm: 2, lg: 4 }} espaco="md">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <Link
                  href="/assistencia-tecnica/solicitar"
                  data-assistencia-categoria
                  className="group flex h-full min-h-52 flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-xs transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-jb-200 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  {categoria.image ? (
                    <div className="relative aspect-[16/8] overflow-hidden bg-graf-50">
                      <Image
                        src={imagemProdutoSemFundo(categoria.image.url)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 24vw"
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 items-center px-5 pt-5">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-graf-100 text-graf-700 transition-colors group-hover:bg-jb-50 group-hover:text-jb-700">
                        <IconeCategoria nome={categoria.icon} className="size-5" />
                      </span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col border-t border-graf-100 p-5">
                    <p className="text-base font-bold text-graf-950">{categoria.name}</p>
                    {textoDeHtml(categoria.description) ? (
                      <p className="line-2 mt-1.5 text-sm leading-relaxed text-graf-500">
                        {textoDeHtml(categoria.description)}
                      </p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-jb-700">
                      Abrir chamado
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </Grade>

          {servicos > 0 ? (
            <p className="mt-9 text-corpo leading-relaxed text-graf-600">
              Precisa de instalação, revisão, treinamento ou outro serviço técnico?{" "}
              <Link
                href="/servicos"
                className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Veja todos os serviços da JB
              </Link>
              .
            </p>
          ) : null}
        </Secao>
      ) : null}

      <Secao fundo="afundada" espaco="lg" padraoDeFundo id="como-funciona" className="scroll-mt-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:h-max">
            <TituloSecao
              sobretitulo="Sem caixa-preta"
              titulo="Do chamado ao equipamento funcionando"
              descricao="O cliente não precisa telefonar para descobrir em que pé está. O fluxo fica visível, e cada mudança importante entra no histórico."
            />
            <div className="mt-9">
              <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="lg">
                Abrir chamado técnico
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
            </div>
          </div>

          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-y-2 left-[3.5rem] w-px bg-white/15 sm:left-[4.5rem]"
            />
            <ol aria-label="Etapas do atendimento técnico">
              {ETAPAS_PUBLICAS.map((etapa, indice) => (
                <li
                  key={etapa.titulo}
                  data-assistencia-etapa
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
                    <p className="texto-suave mt-2.5 max-w-xl text-corpo leading-relaxed">
                      {etapa.texto}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Secao>

      <Secao espaco="lg" fundo="clara" separador>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
          <div>
            <p className="label-mono uppercase text-jb-700">Depois que a máquina volta</p>
            <h2 className="text-display texto-forte mt-3">
              O atendimento termina. O <span className="text-jb-600">prontuário continua.</span>
            </h2>
            <p className="texto-guia mt-5 max-w-xl text-graf-600">
              Na Área da Clínica, cada equipamento ganha contexto próprio. Em vez de começar do
              zero a cada defeito, a JB consegue consultar o que já aconteceu naquela unidade.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBotao href="/minha-jb/equipamentos">
                Ver meus equipamentos
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/manutencao-preventiva" variante="secundario">
                Manutenção preventiva
              </LinkBotao>
            </div>
          </div>

          <div data-assistencia-prontuario className="grid gap-3 sm:grid-cols-2">
            {PRONTUARIO.map((item) => (
              <Cartao key={item.titulo} className="p-5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-card">
                <span className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                  <item.icone className="size-4.5" aria-hidden />
                </span>
                <h3 className="mt-4 text-corpo font-bold text-graf-950">{item.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-graf-600">{item.texto}</p>
              </Cartao>
            ))}
          </div>
        </div>
      </Secao>

      <Secao espaco="lg">
        <TituloSecao
          sobretitulo="Urgência e cobertura"
          titulo="Prioridade clara, sem prometer prazo no chute"
          descricao="A urgência informada organiza a triagem. O prazo do reparo depende do diagnóstico, disponibilidade de peça e tipo de atendimento."
          className="mb-10"
        />

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div>
            <h3 className="text-[1.0625rem] font-bold text-graf-950">
              Como o impacto na clínica entra na triagem
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
                  <span className="flex-1 text-corpo text-graf-600">{opcao.descricao}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-corpo leading-relaxed text-graf-600">
              Se o equipamento está fora de uso, isso fica explícito no chamado e entra como
              sinal de prioridade para a equipe técnica.
            </p>
          </div>

          <Cartao className="p-6 lg:p-7">
            <p className="label-mono uppercase text-graf-500">Falar com a equipe</p>
            {temContatoDireto ? (
              <>
                <p className="mt-4 text-corpo leading-relaxed text-graf-700">
                  Prefere explicar o defeito falando? A equipe pode orientar a abertura do
                  chamado com você.
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
                  ? "mt-6 space-y-6 border-t border-graf-200 pt-6 text-corpo"
                  : "mt-6 space-y-6 text-corpo"
              }
            >
              <li className="flex gap-3.5">
                <CalendarCheck className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">{s.horario}</span>
              </li>
              <li className="flex gap-3.5">
                <MapPin className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">
                  Atendimento na clínica em {s.endereco_cidade} e região, e bancada na própria
                  JB para o que precisa sair do consultório.
                  <span className="mt-1 block text-graf-500">{enderecoCompleto(s)}</span>
                </span>
              </li>
              <li className="flex gap-3.5">
                <Search className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                <span className="leading-relaxed text-graf-700">
                  Fora da área? Abra o chamado: a triagem confirma a possibilidade de
                  atendimento antes de qualquer deslocamento.
                </span>
              </li>
            </ul>
          </Cartao>
        </div>
      </Secao>

      {marcas.length > 0 ? (
        <Secao fundo="clara" espaco="md" separador>
          <TituloSecao
            sobretitulo="Marcas"
            titulo="Marcas presentes no ecossistema JB"
            descricao="Equipamento de marca fora da lista também pode ser avaliado. Informe marca e modelo ao abrir o chamado para a triagem confirmar o atendimento."
            className="mb-9"
          />
          <Grade como="ul" colunas={{ base: 2, sm: 3, lg: 6 }} espaco="sm">
            {marcas.map((marca) => (
              <li key={marca.slug}>
                <Link
                  href={`/marcas/${marca.slug}`}
                  className="flex h-24 items-center justify-center rounded-xl border border-graf-200 bg-white px-4 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-jb-200 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
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
                    <span className="text-center text-sm font-bold text-graf-700">{marca.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </Grade>
        </Secao>
      ) : null}

      {faqs.length > 0 ? (
        <Secao espaco="lg">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <TituloSecao
              sobretitulo="Antes de abrir o chamado"
              titulo="Perguntas sobre a assistência"
              descricao="Dúvidas recorrentes da triagem, respondidas sem esconder como o atendimento funciona."
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

      <Secao fundo="marca" espaco="lg" separador className="overflow-hidden">
        <div className="mx-auto max-w-3xl text-center" data-assistencia-fechamento>
          <p className="label-mono uppercase text-jb-700">Seu próximo passo</p>
          <h2 className="text-display texto-forte mt-3">
            Conte o que aconteceu. A JB organiza o resto do atendimento.
          </h2>
          <p className="texto-guia mx-auto mt-5 max-w-xl text-graf-600">
            Identifique o equipamento, descreva o sintoma e, se puder, envie fotos. O chamado
            recebe um número e passa a ser acompanhado pela plataforma.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg">
              Abrir chamado agora
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/minha-jb/assistencia" variante="secundario" tamanho="lg">
              Acompanhar um chamado
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
                WhatsApp
              </LinkBotao>
            ) : null}
          </div>
        </div>
      </Secao>
    </div>
  );
}
