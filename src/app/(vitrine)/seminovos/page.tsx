import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  ClipboardCheck,
  Gauge,
  NotebookPen,
  PackageCheck,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";
import { PUBLICADO, dadosDaColecao } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

export const instant = false;

const CAMINHO = "/seminovos";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Loja", href: "/loja" },
  { rotulo: "Seminovos JB" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Seminovos JB",
  descricao:
    "Unidades seminovas anunciadas individualmente, com os dados que a equipe registrou para cada unidade.",
  caminho: CAMINHO,
});

type Fato = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
};

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
          "Cada anúncio representa uma unidade específica. As informações da página pertencem àquela unidade, não a um lote genérico.",
      },
    ];

    if (unidades.some((u) => (u.serialNumber ?? "").trim() !== "")) {
      fatos.push({
        icone: ScanLine,
        titulo: "Número de série",
        texto:
          "Quando o número de série está registrado, ele aparece na identificação da unidade antes da compra.",
      });
    }

    if (unidades.some((u) => u.manufactureYear !== null)) {
      fatos.push({
        icone: CalendarClock,
        titulo: "Ano de fabricação",
        texto:
          "O ano só aparece quando está confirmado no cadastro da unidade. Sem confirmação, a informação não é exibida.",
      });
    }

    if (unidades.some((u) => u.usageHours !== null || u.usageCycles !== null)) {
      fatos.push({
        icone: Gauge,
        titulo: "Uso acumulado",
        texto:
          "Nos equipamentos que registram horas ou ciclos, o dado cadastrado pode acompanhar a unidade na página.",
      });
    }

    if (unidades.some((u) => u._count.checklist > 0)) {
      fatos.push({
        icone: ClipboardCheck,
        titulo: "Checklist da revisão",
        texto:
          "Quando existe checklist cadastrado, a página da unidade mostra o que foi verificado durante a revisão.",
      });
    }

    if (
      unidades.some(
        (u) => u.conditionNotes.trim() !== "" || u.inspectionNotes.trim() !== "",
      )
    ) {
      fatos.push({
        icone: NotebookPen,
        titulo: "Condição descrita",
        texto:
          "Marcas de uso e observações da inspeção ficam registradas por escrito quando foram informadas pela equipe.",
      });
    }

    if (unidades.some((u) => u._count.media > 0)) {
      fatos.push({
        icone: Camera,
        titulo: "Fotos da unidade",
        texto:
          "Quando há mídia própria cadastrada, a página mostra imagens da unidade que está à venda.",
      });
    }

    if (unidades.some((u) => u.warrantyMonths !== null && u.warrantyMonths > 0)) {
      fatos.push({
        icone: ShieldCheck,
        titulo: "Garantia da unidade",
        texto:
          "Se houver prazo de garantia cadastrado para a unidade, ele aparece na página antes da compra.",
      });
    }

    return fatos;
  } catch {
    return [];
  }
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

  const destaques = fatos.slice(0, 3).map((fato) => fato.titulo.toLowerCase());

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Seminovos JB"
        titulo="Seminovos revisados"
        descricao={`${colecao.totalSeminovos} ${
          colecao.totalSeminovos === 1 ? "unidade disponível" : "unidades disponíveis"
        }. Cada anúncio representa uma unidade específica${
          destaques.length ? `, com ${destaques.join(", ")}` : ""
        }.`}
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "seminovo" }}
        atalhos={[
          ...colecao.categorias.map((categoria) => ({
            rotulo: categoria.nome,
            href: categoria.href,
            quantidade: categoria.quantidade,
          })),
          { rotulo: "Produtos novos", href: "/loja", quantidade: colecao.totalNovos },
          ...(colecao.vendidos
            ? [
                {
                  rotulo: "Unidades já vendidas",
                  href: "/seminovos?vendidos=1",
                  quantidade: colecao.vendidos,
                },
              ]
            : []),
        ]}
        rotuloAtalhos="Categorias e atalhos desta coleção"
        /* Os mesmos fatos do bloco de baixo, reduzidos a ícone e título, antes
           da grade. O bloco completo continua embaixo com a explicação de cada
           um: aqui o papel é dizer, antes de a pessoa olhar preço, que cada
           anúncio é uma unidade com procedência registrada — que é o que separa
           "seminovo revisado" de classificado. */
        faixaDeConfianca={
          fatos.length >= 3 ? (
            <ul
              aria-label="O que a JB registra de cada unidade"
              /* `tabIndex` porque no celular a faixa rola na horizontal e
                 nenhum item é focável: sem isto, quem navega por teclado não
                 alcança o que passa da borda (axe `scrollable-region-focusable`,
                 grave — pego pela varredura a 390px). Mesma correção que a
                 faixa de confiança da ficha de produto já tinha recebido. */
              tabIndex={0}
              className="foco-jb scrollbar-none flex gap-0 overflow-x-auto border-y border-hairline py-2 sm:justify-start"
            >
              {fatos.slice(0, 4).map((fato, indice) => {
                const Icone = fato.icone;
                return (
                  <li
                    key={fato.titulo}
                    className={`texto-apoio flex min-h-10 shrink-0 items-center gap-2 px-3 font-semibold text-graf-700 sm:px-5 ${
                      indice > 0 ? "border-l border-graf-200" : ""
                    }`}
                  >
                    <Icone className="size-4 shrink-0 text-jb-600" aria-hidden />
                    <span className="whitespace-nowrap">{fato.titulo}</span>
                  </li>
                );
              })}
            </ul>
          ) : null
        }
        travarCondicao
      />

      {fatos.length >= 2 ? (
        <section className="border-t border-graf-200 bg-white">
          <div className="container-loja py-10 lg:py-12">
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-graf-200 pb-5">
              <div className="max-w-2xl">
                <p className="sobretitulo">
                  Transparência da unidade
                </p>
                <h2 className="text-title mt-2 text-graf-950">
                  O que pode acompanhar cada seminovo
                </h2>
                <p className="mt-2 text-sm leading-6 text-graf-600 sm:text-corpo">
                  A página mostra somente os dados realmente registrados para aquela unidade.
                </p>
              </div>

              <Link
                href="/assistencia-tecnica"
                className="foco-jb inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700"
              >
                Conhecer a assistência técnica
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {fatos.map((fato) => (
                <li key={fato.titulo} className="flex items-start gap-3 border-b border-graf-100 pb-5 lg:border-b-0 lg:pb-0">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-jb-700">
                    <fato.icone className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-graf-950">{fato.titulo}</h3>
                    <p className="mt-1 text-sm leading-6 text-graf-600">{fato.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
