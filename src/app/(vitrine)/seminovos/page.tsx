import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  NotebookPen,
  PackageCheck,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { PUBLICADO, dadosDaColecao } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 */
export const instant = false;

const CAMINHO = "/seminovos";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Seminovos revisados pela JB" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Seminovos revisados pela JB",
  descricao:
    "Cada anúncio é uma unidade específica: passa pela bancada da JB antes de entrar no catálogo e é publicada com o que a equipe verificou.",
  caminho: CAMINHO,
});

type Fato = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
};

/**
 * O que a JB de fato registra nas unidades seminovas que estão publicadas.
 *
 * Nenhuma linha desta faixa é escrita à mão: cada uma só entra se existir ao
 * menos uma unidade no catálogo com aquele campo preenchido. Sem seminovo
 * cadastrado, a lista volta vazia e a faixa inteira desaparece — é melhor não
 * falar de revisão nenhuma do que prometer um cuidado que não está anotado
 * em lugar algum.
 */
async function fatosDaRevisao(): Promise<Fato[]> {
  try {
    const unidades = await prisma.inventoryUnit.findMany({
      where: { product: { ...PUBLICADO, condition: "seminovo" } },
      take: 200,
      select: {
        serialNumber: true,
        manufactureYear: true,
        usageHours: true,
        usageCycles: true,
        conditionNotes: true,
        inspectionNotes: true,
        warrantyMonths: true,
        _count: { select: { checklist: true, media: true } },
      },
    });

    if (unidades.length === 0) return [];

    const fatos: Fato[] = [
      {
        icone: PackageCheck,
        titulo: "Uma unidade por anúncio",
        texto:
          "Seminovo não é lote. O equipamento da página é aquele equipamento — com a história dele, e não a de um modelo genérico.",
      },
    ];

    if (unidades.some((u) => (u.serialNumber ?? "").trim() !== "")) {
      fatos.push({
        icone: ScanLine,
        titulo: "Número de série",
        texto:
          "A unidade entra no catálogo identificada pelo número de série, e é a mesma que sai daqui para a sua clínica.",
      });
    }

    if (unidades.some((u) => u.manufactureYear !== null)) {
      fatos.push({
        icone: CalendarClock,
        titulo: "Ano de fabricação",
        texto:
          "Confirmado no próprio equipamento, o ano de fabricação vai para a ficha da unidade. Não confirmado, ele não é publicado.",
      });
    }

    if (unidades.some((u) => u.usageHours !== null || u.usageCycles !== null)) {
      fatos.push({
        icone: Gauge,
        titulo: "Uso acumulado",
        texto:
          "Nos equipamentos que contam horas ou ciclos de trabalho, o número lido na revisão é publicado junto com a unidade.",
      });
    }

    if (unidades.some((u) => u._count.checklist > 0)) {
      fatos.push({
        icone: ClipboardCheck,
        titulo: "Checklist da revisão",
        texto:
          "Item a item: o que foi verificado, o que foi reparado e o que foi substituído antes de o equipamento voltar a ser vendido.",
      });
    }

    if (
      unidades.some(
        (u) => u.conditionNotes.trim() !== "" || u.inspectionNotes.trim() !== "",
      )
    ) {
      fatos.push({
        icone: NotebookPen,
        titulo: "Estado descrito por escrito",
        texto:
          "Marcas de uso, detalhes de acabamento e observações da inspeção, escritos por quem revisou a unidade.",
      });
    }

    if (unidades.some((u) => u._count.media > 0)) {
      fatos.push({
        icone: Camera,
        titulo: "Fotos da unidade",
        texto:
          "Além das imagens do modelo, a página mostra fotos da própria unidade que está à venda.",
      });
    }

    if (unidades.some((u) => u.warrantyMonths !== null && u.warrantyMonths > 0)) {
      fatos.push({
        icone: ShieldCheck,
        titulo: "Garantia da unidade",
        texto:
          "Quando a unidade sai com prazo de garantia da JB, o prazo fica escrito na ficha dela antes da compra.",
      });
    }

    return fatos;
  } catch {
    return [];
  }
}

/** O mesmo apoio da /loja: a saída de quem chegou com equipamento parado. */
function ApoioDaAssistencia() {
  return (
    <div className="mt-4 rounded-lg border border-jb-200 bg-jb-50/60 p-5">
      <p className="micro text-jb-700">Assistência JB</p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-700">
        Tem um equipamento parado para dar de entrada ou consertar? A equipe técnica faz a
        triagem antes de qualquer orçamento.
      </p>
      <Link
        href="/assistencia-tecnica/solicitar"
        className="micro mt-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-jb-500 text-white transition-colors hover:bg-jb-600"
      >
        <Wrench className="size-3.5" aria-hidden />
        Abrir chamado
      </Link>
    </div>
  );
}

function AbaDeColecao({
  href,
  ativa,
  icone: Icone,
  rotulo,
  quantidade,
}: {
  href: string;
  ativa: boolean;
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  quantidade: number;
}) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={cn(
        "micro flex h-11 items-center gap-2 rounded-lg px-4 transition-colors",
        ativa
          ? "bg-jb-500 text-white"
          : "border border-hairline bg-white text-graf-600 hover:border-graf-400 hover:text-graf-950",
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {rotulo}
      {/* Na pastilha ativa o número é branco cheio: branco a 50% sobre o
          vermelho da marca dá 2,2:1 e a 70% dá 2,9:1 — os dois reprovam o
          4,5:1 da WCAG para texto de 12px. A hierarquia continua existindo
          pelo peso, que é o do rótulo ao lado. */}
      <span className={cn("tabular font-normal", ativa ? "text-white" : "text-graf-500")}>
        {quantidade}
      </span>
    </Link>
  );
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, colecao, fatos] = await Promise.all([
    searchParams,
    dadosDaColecao("seminovo"),
    fatosDaRevisao(),
  ]);

  /* A linha técnica do topo é montada com o que a apuração encontrou nas
     unidades publicadas — não é promessa escrita à mão. Sem seminovo no
     catálogo, sobra só a contagem. */
  const promessas = fatos.slice(0, 3).map((fato) => fato.titulo.toLowerCase());

  return (
    <div className="vitrine">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <div className="container-jb pt-2 lg:pt-3">
        {/* Trilha em lista de verdade, como a do componente `Trilha`
            compartilhado: os links soltos dentro do `<nav>` não eram só um
            deslize semântico — eram 42x16px de alvo de toque, reprovados pelo
            portão de responsividade em 320, 360, 390 e 768. Em `<li>`, com
            44px de altura, a fileira fica tocável e o respiro em volta
            encolhe na mesma medida, sem empurrar o catálogo para baixo. */}
        <nav aria-label="Trilha" className="micro text-graf-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-graf-700"
              >
                Início
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="size-3" aria-hidden />
              <Link
                href="/loja"
                className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-graf-700"
              >
                Equipamentos
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <ChevronRight className="size-3" aria-hidden />
              <span className="text-graf-700" aria-current="page">
                Seminovos
              </span>
            </li>
          </ol>
        </nav>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 border-b border-hairline pb-4 lg:mt-3 lg:gap-y-5 lg:pb-5">
          <div className="max-w-3xl">
            <h1 className="manchete text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] text-graf-950">
              Seminovos revisados pela JB
            </h1>
            <p className="micro mt-3 text-graf-500">
              {colecao.totalSeminovos}{" "}
              {colecao.totalSeminovos === 1 ? "unidade disponível" : "unidades disponíveis"}
              {promessas.length > 0 ? ` · ${promessas.join(" · ")}` : ""}
            </p>

            {/* A unidade vendida saiu da lista, e a página diz isso em vez de
                deixar a contagem encolher em silêncio. O histórico continua
                a um clique: é prova de bancada, não estoque. */}
            {colecao.vendidos > 0 ? (
              <p className="mt-2 text-[0.8125rem] text-graf-500">
                {colecao.vendidos}{" "}
                {colecao.vendidos === 1
                  ? "unidade já foi vendida e saiu da lista."
                  : "unidades já foram vendidas e saíram da lista."}{" "}
                <Link
                  href="/seminovos?vendidos=1"
                  className="font-semibold text-jb-600 underline-offset-4 transition-colors hover:text-jb-700 hover:underline"
                >
                  Ver o que a JB já revisou e vendeu
                </Link>
              </p>
            ) : null}
            {/* Some no celular: a linha técnica logo acima já diz o essencial,
                e três linhas de apoio antes do primeiro cartão são o pedágio
                que a auditoria pediu para tirar do topo do catálogo. O texto
                continua no HTML para leitor de tela e busca. */}
            <p className="mt-4 hidden max-w-2xl text-[0.9375rem] leading-relaxed text-graf-600 sm:block">
              Aqui cada anúncio é uma unidade específica, não um modelo de catálogo. O
              equipamento passa pela bancada da JB antes de ser publicado, e o que a equipe
              verificou fica escrito na página dele.
            </p>
          </div>

          <nav aria-label="Escolher coleção por condição" className="flex gap-2">
            <AbaDeColecao
              href="/loja"
              ativa={false}
              icone={PackageCheck}
              rotulo="Novos"
              quantidade={colecao.totalNovos}
            />
            <AbaDeColecao
              href="/seminovos"
              ativa
              icone={RefreshCcw}
              rotulo="Seminovo JB"
              quantidade={colecao.totalSeminovos}
            />
          </nav>
        </div>

        {colecao.categorias.length > 0 ? (
          <nav
            aria-label="Categorias desta coleção"
            className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {colecao.categorias.map((categoria) => (
              <Link
                key={categoria.slug}
                href={categoria.href}
                className="micro flex h-11 shrink-0 items-center gap-2 rounded-lg border border-hairline bg-white px-4 text-graf-700 transition-colors hover:border-graf-400 hover:text-graf-950"
              >
                {categoria.nome}
                <span className="tabular text-graf-500">{categoria.quantidade}</span>
              </Link>
            ))}
            <Link
              href="/marcas"
              className="micro flex h-11 shrink-0 items-center gap-1.5 px-2 text-jb-600 transition-colors hover:text-jb-700"
            >
              Ver marcas
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </nav>
        ) : null}
      </div>

      <Vitrine
        titulo="Seminovos revisados pela JB"
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "seminovo" }}
        travarCondicao
        variante="vitrine"
        semCabecalho
        apoioNoFiltro={<ApoioDaAssistencia />}
      />

      {/* A faixa só existe quando há o que mostrar: ela é montada a partir dos
          campos realmente preenchidos nas unidades publicadas. */}
      {fatos.length >= 2 ? (
        <section className="border-t border-graf-200 bg-surface-muted">
          <div className="container-jb py-14 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div className="max-w-2xl">
                <p className="micro text-jb-600">Antes de entrar no catálogo</p>
                <h2 className="manchete mt-4 text-[clamp(1.75rem,1.3rem+1.9vw,2.5rem)] text-graf-950">
                  O que fica registrado em cada unidade
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-graf-600">
                  Comprar seminovo é uma decisão técnica, e decisão técnica precisa de
                  informação por escrito. É por isso que a revisão de cada equipamento vira
                  registro — e o que não foi registrado não vira promessa.
                </p>
              </div>

              <Link
                href="/assistencia-tecnica"
                className="micro flex h-12 items-center gap-2 rounded-lg border border-graf-300 bg-white px-5 text-graf-800 transition-colors hover:border-graf-450 hover:bg-graf-50"
              >
                Conheça a assistência técnica
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {fatos.map((fato) => (
                <li key={fato.titulo} className="border-t border-graf-200 pt-5">
                  <fato.icone className="size-5 text-jb-600" aria-hidden />
                  <h3 className="mt-4 text-base font-bold text-graf-950">{fato.titulo}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
                    {fato.texto}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
