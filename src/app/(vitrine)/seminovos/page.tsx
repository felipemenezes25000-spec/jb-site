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
    <div className="on-dark mt-4 rounded-xs bg-chrome p-5 text-white">
      <p className="micro text-jb-400">Assistência JB</p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/75">
        Tem um equipamento parado para dar de entrada ou consertar? A equipe técnica faz a
        triagem antes de qualquer orçamento.
      </p>
      <Link
        href="/assistencia-tecnica/solicitar"
        className="micro mt-4 flex h-11 items-center justify-center gap-2 rounded-xs bg-jb-500 text-white transition-colors hover:bg-jb-600"
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
        "micro flex h-11 items-center gap-2 rounded-xs px-4 transition-colors",
        ativa
          ? "bg-graf-950 text-white"
          : "border border-hairline bg-white text-graf-600 hover:border-graf-400 hover:text-graf-950",
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      {rotulo}
      <span className={cn("tabular", ativa ? "text-white/50" : "text-graf-400")}>{quantidade}</span>
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

      <div className="container-jb pt-6">
        <nav aria-label="Trilha" className="micro flex items-center gap-2 text-graf-400">
          <Link href="/" className="transition-colors hover:text-graf-700">
            Início
          </Link>
          <ChevronRight className="size-3" aria-hidden />
          <Link href="/loja" className="transition-colors hover:text-graf-700">
            Equipamentos
          </Link>
          <ChevronRight className="size-3" aria-hidden />
          <span className="text-graf-700">Seminovos</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 border-b border-hairline pb-5">
          <div className="max-w-3xl">
            <h1 className="manchete text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] text-graf-950">
              Seminovos revisados pela JB
            </h1>
            <p className="micro mt-3 text-graf-500">
              {colecao.totalSeminovos}{" "}
              {colecao.totalSeminovos === 1 ? "unidade publicada" : "unidades publicadas"}
              {promessas.length > 0 ? ` · ${promessas.join(" · ")}` : ""}
            </p>
            <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-graf-600">
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
                className="micro flex h-11 shrink-0 items-center gap-2 rounded-xs border border-hairline bg-white px-4 text-graf-700 transition-colors hover:border-graf-400 hover:text-graf-950"
              >
                {categoria.nome}
                <span className="tabular text-graf-400">{categoria.quantidade}</span>
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
        apoioNoFiltro={<ApoioDaAssistencia />}
      />

      {/* A faixa só existe quando há o que mostrar: ela é montada a partir dos
          campos realmente preenchidos nas unidades publicadas. */}
      {fatos.length >= 2 ? (
        <section className="on-dark relative isolate overflow-hidden bg-chrome text-white">
          <div
            aria-hidden
            className="malha-escura pointer-events-none absolute inset-0 -z-10 opacity-60"
          />
          <div className="container-jb py-14 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <div className="max-w-2xl">
                <p className="micro text-jb-400">Antes de entrar no catálogo</p>
                <h2 className="manchete mt-4 text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)] text-white">
                  O que fica registrado em cada unidade
                </h2>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/65">
                  Comprar seminovo é uma decisão técnica, e decisão técnica precisa de
                  informação por escrito. É por isso que a revisão de cada equipamento vira
                  registro — e o que não foi registrado não vira promessa.
                </p>
              </div>

              <Link
                href="/assistencia-tecnica"
                className="micro flex h-12 items-center gap-2 rounded-xs border border-white/25 px-5 text-white transition-colors hover:bg-white/10"
              >
                Conheça a assistência técnica
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>

            <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {fatos.map((fato) => (
                <li key={fato.titulo} className="border-t border-white/15 pt-5">
                  <fato.icone className="size-5 text-jb-400" aria-hidden />
                  <h3 className="mt-4 text-base font-bold text-white">{fato.titulo}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/65">
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
