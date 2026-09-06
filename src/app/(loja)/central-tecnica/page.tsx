import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
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

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation").
 */
export const instant = false;

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Central Técnica" }];

/**
 * A listagem só é indexada quando tem o que listar.
 *
 * O escopo proíbe indexar resultado vazio, e essa é exatamente a situação
 * enquanto os textos esperam revisão técnica: a página existe, o menu leva até
 * ela, e ela não tem conteúdo para oferecer a quem chegasse pela busca.
 */
export async function generateMetadata(): Promise<Metadata> {
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

/**
 * Cartão de artigo.
 *
 * A data aparece só quando existe data real. Um artigo sem data publicada não
 * ganha "hoje" nem "recente": ele aparece sem a linha, que é o que a base
 * sustenta.
 */
function CartaoArtigo({ artigo }: { artigo: ArtigoDaLista }) {
  const data = dataEditorial({
    publicadoEm: artigo.publishedAt,
    revisadoEm: artigo.reviewedAt,
  });

  return (
    <Link
      href={`/central-tecnica/${artigo.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      {artigo.cover ? (
        <span className="block aspect-[16/9] overflow-hidden bg-graf-100">
          <Image
            src={artigo.cover.url}
            alt=""
            width={640}
            height={360}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </span>
      ) : null}

      <span className="flex flex-1 flex-col gap-2 p-5">
        <span className="label-mono text-xs text-jb-700">{ROTULO_TEMA[artigo.topic]}</span>
        <span className="text-[1.0625rem] font-bold leading-snug text-graf-950">
          {artigo.title}
        </span>
        {artigo.lead ? (
          <span className="text-[0.9375rem] leading-relaxed text-graf-600">{artigo.lead}</span>
        ) : null}
        {data ? (
          <span className="mt-auto pt-2 text-[0.8125rem] text-graf-500">
            {data.rotulo} {formatarData(data.data)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export default async function CentralTecnicaPage({ searchParams }: Props) {
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

      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Central Técnica JB"
          titulo="O que a bancada aprendeu"
          descricao="Sintomas, critérios de compra e rotina de manutenção — escritos por quem conserta estes equipamentos, e revisados antes de ir ao ar. Cada texto diz a que modelos se aplica e onde termina o que dá para fazer sem técnico."
        />

        {/* O filtro só existe quando há mais de um tema publicado. Uma barra
            de filtros com um botão é um controle que não separa nada. */}
        {contagem.size > 1 ? (
          <nav aria-label="Filtrar por tema" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href="/central-tecnica"
                  aria-current={tema ? undefined : "page"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                    tema
                      ? "border-graf-200 text-graf-700 hover:border-graf-300 hover:bg-graf-50"
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
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                      tema === chave
                        ? "border-jb-600 bg-jb-600 text-white"
                        : "border-graf-200 text-graf-700 hover:border-graf-300 hover:bg-graf-50",
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

        <div className="mt-8">
          {artigos.length > 0 ? (
            <Grade colunas={{ base: 1, sm: 2, lg: 3 }} como="ul">
              {artigos.map((artigo) => (
                /* `Grade como="ul"` não embrulha sozinha: o `li` é
                   responsabilidade de quem chama, e sem ele a lista tem filho
                   `div` — que o axe reprova, com razão. */
                <li key={artigo.slug}>
                  <CartaoArtigo artigo={artigo} />
                </li>
              ))}
            </Grade>
          ) : (
            /* Estado vazio honesto: os textos existem em rascunho e não vão ao
               ar sem revisão técnica. Dizer "em breve" sem dizer o que falta
               transformaria uma decisão editorial em desculpa. */
            <Vazio
              icone={BookOpen}
              titulo={
                tema
                  ? "Nenhum texto publicado neste tema ainda"
                  : "Os primeiros textos estão em revisão técnica"
              }
              descricao="A Central Técnica só publica com autor e revisor identificados. Enquanto a revisão não acontece, o texto fica fora do ar — e o caminho mais rápido para uma resposta é falar com a equipe."
              acao={
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="sm">
                  <Wrench className="size-4" aria-hidden />
                  Falar com a assistência
                </LinkBotao>
              }
            />
          )}
        </div>
      </Secao>

      <Secao fundo="clara" espaco="sm">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-title texto-forte">Seu equipamento já está com sintoma?</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
              Texto ajuda a entender o que está acontecendo. Diagnóstico é na bancada — e a JB
              abre chamado sem exigir cadastro.
            </p>
          </div>
          <LinkBotao href="/assistencia-tecnica/solicitar">
            Abrir chamado
            <ArrowRight className="size-4" aria-hidden />
          </LinkBotao>
        </div>
      </Secao>
    </>
  );
}
