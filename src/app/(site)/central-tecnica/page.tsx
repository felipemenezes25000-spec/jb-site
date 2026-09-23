import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen } from "lucide-react";

import { ChamarWhatsapp } from "@/components/site/chamar-whatsapp";
import { TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { colunasAte, Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import {
  ROTULO_TEMA,
  dataEditorial,
  type TemaDoArtigo,
} from "@/lib/central-tecnica";
import { artigosPublicados, contagemPorTema, type ArtigoDaLista } from "@/lib/artigos";
import { formatarData } from "@/lib/format";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { connection } from "next/server";

export const instant = false;

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Central Técnica" }];

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const contagem = await contagemPorTema();
  const total = [...contagem.values()].reduce((soma, n) => soma + n, 0);

  return {
    ...metadataDePagina({
      titulo: "Central Técnica JB",
      descricao:
        "O que a bancada da JB aprendeu sobre autoclave, compressor e vácuo — escrito por quem conserta, revisado antes de publicar.",
      caminho: "/central-tecnica",
    }),
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

const TEMAS: TemaDoArtigo[] = ["autoclave", "compressor", "vacuo", "compra", "operacao"];

type Props = {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
};

function ehTema(valor: string): valor is TemaDoArtigo {
  return (TEMAS as string[]).includes(valor);
}

function CartaoArtigo({ artigo }: { artigo: ArtigoDaLista }) {
  const data = dataEditorial({
    publicadoEm: artigo.publishedAt,
    revisadoEm: artigo.reviewedAt,
  });

  return (
    <Link
      href={`/central-tecnica/${artigo.slug}`}
      className="jb-artigo-card group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      {artigo.cover ? (
        <span className="relative block aspect-[16/9] overflow-hidden bg-graf-100">
          <Image
            src={artigo.cover.url}
            alt=""
            width={640}
            height={360}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-graf-950/25 to-transparent" />
        </span>
      ) : (
        <span className="jb-artigo-sem-capa flex aspect-[16/7] items-end bg-graf-50 p-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white text-jb-600 shadow-xs ring-1 ring-graf-200">
            <BookOpen className="size-5" aria-hidden />
          </span>
        </span>
      )}

      <span className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
        <span className="label-mono text-xs text-jb-700">{ROTULO_TEMA[artigo.topic]}</span>
        <span className="text-[1.0625rem] font-extrabold leading-snug tracking-tight text-graf-950 sm:text-lg">
          {artigo.title}
        </span>
        {artigo.lead ? (
          <span className="text-corpo leading-relaxed text-graf-600">{artigo.lead}</span>
        ) : null}
        {data ? (
          <span className="mt-auto border-t border-graf-100 pt-3 text-apoio font-medium text-graf-500">
            {data.rotulo} {formatarData(data.data)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export default async function CentralTecnicaPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const bruto = Array.isArray(params.tema) ? params.tema[0] : params.tema;
  const tema = bruto && ehTema(bruto) ? bruto : undefined;

  const [artigos, contagem] = await Promise.all([
    artigosPublicados({ tema }),
    contagemPorTema(),
  ]);

  const total = [...contagem.values()].reduce((soma, n) => soma + n, 0);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Secao espaco="md" className="jb-central-premium jb-content-hub">
        <Trilha itens={TRILHA} className="mb-6" />
        <div className="jb-content-hero max-w-4xl">
          <TituloSecao
            como="h1"
            sobretitulo="Central Técnica JB"
            titulo="O que a bancada aprendeu"
            descricao="Sintomas, critérios de compra e rotina de manutenção — escritos por quem conserta estes equipamentos, e revisados antes de ir ao ar. Cada texto diz a que modelos se aplica e onde termina o que dá para fazer sem técnico."
          />
        </div>

        {contagem.size > 1 ? (
          <nav aria-label="Filtrar por tema" className="jb-filtros-premium mt-8">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href="/central-tecnica"
                  aria-current={tema ? undefined : "page"}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                    tema
                      ? "border-graf-200 bg-white text-graf-700 hover:border-graf-300 hover:bg-graf-50"
                      : "border-jb-600 bg-jb-600 text-white",
                  )}
                >
                  Todos
                  <span className="tabular text-xs opacity-70">{total}</span>
                </Link>
              </li>
              {TEMAS.filter((chave) => (contagem.get(chave) ?? 0) > 0).map((chave) => (
                <li key={chave}>
                  <Link
                    href={`/central-tecnica?tema=${chave}`}
                    aria-current={tema === chave ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                      tema === chave
                        ? "border-jb-600 bg-jb-600 text-white"
                        : "border-graf-200 bg-white text-graf-700 hover:border-graf-300 hover:bg-graf-50",
                    )}
                  >
                    {ROTULO_TEMA[chave]}
                    <span className="tabular text-xs opacity-70">{contagem.get(chave)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mt-9">
          {artigos.length > 0 ? (
            <Grade colunas={colunasAte(artigos.length, { base: 1, sm: 2, lg: 3 })} como="ul" className="gap-4 lg:gap-5">
              {artigos.map((artigo) => (
                <li key={artigo.slug}>
                  <CartaoArtigo artigo={artigo} />
                </li>
              ))}
            </Grade>
          ) : (
            <div className="jb-content-empty">
              <Vazio
                icone={BookOpen}
                titulo={
                  tema
                    ? "Nenhum texto publicado neste tema ainda"
                    : "Os primeiros textos estão em revisão técnica"
                }
                descricao="A Central Técnica só publica com autor e revisor identificados. Enquanto a revisão não acontece, o texto fica fora do ar — e o caminho mais rápido para uma resposta é falar com a equipe."
                acao={<ChamarWhatsapp tamanho="sm" />}
              />
            </div>
          )}
        </div>
      </Secao>

      <Secao fundo="clara" espaco="md" className="jb-content-cta">
        <div className="flex flex-col gap-6 rounded-[1.5rem] border border-graf-200 bg-white/85 p-6 shadow-[0_30px_70px_-52px_rgb(17_19_21/0.5)] backdrop-blur sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="sobretitulo">Leitura não substitui diagnóstico</p>
            <h2 className="text-title texto-forte mt-2">Seu equipamento já está com sintoma?</h2>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              Texto ajuda a entender o que está acontecendo. Diagnóstico é na bancada, e o
              primeiro passo é uma mensagem no WhatsApp.
            </p>
          </div>
          <ChamarWhatsapp />
        </div>
      </Secao>
    </>
  );
}
