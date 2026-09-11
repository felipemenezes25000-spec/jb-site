import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha } from "@/components/ui/data";
import { colunasAte, Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Cases técnicos" }];

export async function generateMetadata(): Promise<Metadata> {
  const total = await prisma.techCase.count({ where: { status: "publicado" } });

  return {
    ...metadataDePagina({
      titulo: "Cases técnicos",
      descricao:
        "Atendimentos reais da bancada da JB — sintoma, diagnóstico confirmado, intervenção e teste final.",
      caminho: "/cases",
    }),
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * As sete etapas de um atendimento.
 *
 * Este bloco é a prova pública enquanto não houver case autorizado. É o que o
 * escopo pede: sem caso autorizado, use a explicação do processo como prova —
 * e não invente uma "Dra. Maria" com número de ciclos.
 *
 * Ele descreve o que a JB de fato faz, e continua na página depois de haver
 * cases: quem lê um case quer saber como se chega àquele resultado.
 */
const ETAPAS = [
  {
    titulo: "1. O relato",
    texto:
      "O que a clínica descreveu, com as próprias palavras. É o ponto de partida e fica registrado como foi dito — não como o técnico interpretou.",
  },
  {
    titulo: "2. A avaliação",
    texto:
      "O equipamento é avaliado desenergizado e despressurizado, na bancada ou no local, com instrumento. Sintoma não é diagnóstico.",
  },
  {
    titulo: "3. O diagnóstico confirmado",
    texto:
      "O que a medição mostrou, não o que se suspeitou. Enquanto não há confirmação, o campo fica vazio — e um case sem diagnóstico confirmado não é publicado.",
  },
  {
    titulo: "4. O orçamento",
    texto:
      "Diagnóstico, peças, mão de obra e prazo, por escrito, antes de qualquer intervenção. A clínica aprova ou recusa.",
  },
  {
    titulo: "5. A intervenção",
    texto:
      "O que foi feito e com que peça. Peça original ou equivalente é informação que vai na ordem de serviço, não uma escolha silenciosa.",
  },
  {
    titulo: "6. O teste final",
    texto:
      "O equipamento é testado antes de voltar. O que foi testado fica registrado — é o que sustenta a garantia do serviço.",
  },
  {
    titulo: "7. O registro",
    texto:
      "Tudo entra no prontuário do equipamento, na Área da Clínica. Da próxima vez, o histórico já está lá — inclusive para comparar com o orçamento de outra empresa.",
  },
];

export default async function CasesPage() {
  const cases = await prisma.techCase.findMany({
    where: { status: "publicado" },
    orderBy: { publishedAt: "desc" },
    select: {
      slug: true,
      title: true,
      symptom: true,
      equipmentLabel: true,
      publishedAt: true,
    },
  });

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Bancada"
          titulo="Cases técnicos"
          descricao="Atendimentos reais, publicados com autorização da clínica atendida. Cada um mostra o sintoma relatado, o diagnóstico confirmado na bancada, o que foi feito e como o equipamento foi testado antes de voltar."
        />

        {cases.length > 0 ? (
          <Grade colunas={colunasAte(cases.length, { base: 1, sm: 2, lg: 3 })} como="ul" className="mt-8">
            {cases.map((caso) => (
              <li key={caso.slug}>
                <Cartao className="h-full">
                <Link
                  href={`/cases/${caso.slug}`}
                  className="flex h-full flex-col gap-2 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="label-mono text-xs text-jb-700">{caso.equipmentLabel}</span>
                  <span className="text-[1.0625rem] font-bold leading-snug text-graf-950">
                    {caso.title}
                  </span>
                  <span className="text-corpo leading-relaxed text-graf-600">
                    {caso.symptom}
                  </span>
                  <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-semibold text-jb-700">
                    Ver o atendimento
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                  {caso.publishedAt ? (
                    <span className="text-apoio text-graf-500">
                      {formatarData(caso.publishedAt)}
                    </span>
                  ) : null}
                </Link>
                </Cartao>
              </li>
            ))}
          </Grade>
        ) : (
          /* Sem case autorizado, a prova pública é o processo. Não há aqui um
             "em breve", nem um exemplo ilustrativo com nome inventado: o que
             a JB pode afirmar hoje é como ela trabalha, e é isso que está
             escrito. */
          <div className="mt-8 rounded-xl border border-graf-200 bg-graf-50 p-6 sm:p-8">
            <h2 className="flex items-center gap-2.5 text-title texto-forte">
              <ClipboardCheck className="size-5 shrink-0 text-graf-500" aria-hidden />
              Ainda não há case publicado
            </h2>
            <p className="mt-3 max-w-2xl text-corpo leading-relaxed text-graf-600">
              Um case só vai ao ar com autorização da clínica atendida, com diagnóstico
              confirmado na bancada e com técnico e revisor identificados. Enquanto nenhum
              atendimento reúne as três coisas, esta página mostra o que a JB pode afirmar sem
              depender de autorização de ninguém: <strong>como o atendimento funciona</strong>.
            </p>

            {/* Página vazia precisa de saída, não só de explicação. As outras
                duas áreas sem publicação — Central Técnica e depoimentos — já
                ofereciam o próximo passo; esta terminava no ponto final. */}
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="sm">
                Abrir chamado
              </LinkBotao>
              <LinkBotao href="/assistencia-tecnica" variante="secundario" tamanho="sm">
                Conhecer a assistência
              </LinkBotao>
            </div>
          </div>
        )}
      </Secao>

      <Secao fundo="clara" espaco="sm">
        <TituloSecao
          tamanho="titulo"
          titulo="Como um atendimento acontece"
          descricao="As sete etapas, na ordem. É o mesmo processo em toda ordem de serviço, e é dele que sai o registro que fica no prontuário do equipamento."
        />
        <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="sm" como="ol" className="mt-6">
          {ETAPAS.map((etapa) => (
            <li key={etapa.titulo}>
              <Cartao className="h-full p-5">
              <h3 className="text-corpo font-bold text-graf-950">{etapa.titulo}</h3>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-graf-600">
                {etapa.texto}
              </p>
              </Cartao>
            </li>
          ))}
        </Grade>
      </Secao>

      <Secao espaco="sm">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-graf-200 bg-graf-50 p-6">
          <div className="max-w-xl">
            <h2 className="text-title texto-forte">Seu equipamento está com algum sintoma?</h2>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              A JB abre chamado sem exigir cadastro, e você pode anexar foto ou vídeo.
            </p>
          </div>
          <LinkBotao href="/assistencia-tecnica/solicitar">
            <Wrench className="size-4" aria-hidden />
            Abrir chamado
          </LinkBotao>
        </div>
      </Secao>
    </>
  );
}
