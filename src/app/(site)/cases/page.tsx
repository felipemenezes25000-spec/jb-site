import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { ChamarWhatsapp } from "@/components/site/chamar-whatsapp";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha } from "@/components/ui/data";
import { colunasAte, Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { connection } from "next/server";

export const instant = false;

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Cases técnicos" }];

export async function generateMetadata(): Promise<Metadata> {
  await connection();
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

const ETAPAS = [
  {
    numero: "01",
    titulo: "O relato",
    texto:
      "O que a clínica descreveu, com as próprias palavras. É o ponto de partida e fica registrado como foi dito — não como o técnico interpretou.",
  },
  {
    numero: "02",
    titulo: "A avaliação",
    texto:
      "O equipamento é avaliado desenergizado e despressurizado, na bancada ou no local, com instrumento. Sintoma não é diagnóstico.",
  },
  {
    numero: "03",
    titulo: "O diagnóstico confirmado",
    texto:
      "O que a medição mostrou, não o que se suspeitou. Enquanto não há confirmação, o campo fica vazio — e um case sem diagnóstico confirmado não é publicado.",
  },
  {
    numero: "04",
    titulo: "O orçamento",
    texto:
      "Diagnóstico, peças, mão de obra e prazo, por escrito, antes de qualquer intervenção. A clínica aprova ou recusa.",
  },
  {
    numero: "05",
    titulo: "A intervenção",
    texto:
      "O que foi feito e com que peça. Peça original ou equivalente é informação que vai na ordem de serviço, não uma escolha silenciosa.",
  },
  {
    numero: "06",
    titulo: "O teste final",
    texto:
      "O equipamento é testado antes de voltar. O que foi testado fica registrado — é o que sustenta a garantia do serviço.",
  },
  {
    numero: "07",
    titulo: "O registro",
    texto:
      "Tudo entra no prontuário do equipamento. Da próxima vez, o histórico já está lá para a equipe começar com contexto.",
  },
] as const;

export default async function CasesPage() {
  await connection();
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

      <Secao espaco="md" className="jb-cases-premium jb-content-hub">
        <Trilha itens={TRILHA} className="mb-6" />
        <div className="jb-content-hero max-w-4xl">
          <TituloSecao
            como="h1"
            sobretitulo="Bancada"
            titulo="Cases técnicos"
            descricao="Atendimentos reais, publicados com autorização da clínica atendida. Cada um mostra o sintoma relatado, o diagnóstico confirmado na bancada, o que foi feito e como o equipamento foi testado antes de voltar."
          />
        </div>

        {cases.length > 0 ? (
          <Grade
            colunas={colunasAte(cases.length, { base: 1, sm: 2, lg: 3 })}
            como="ul"
            className="mt-9 gap-4 lg:gap-5"
          >
            {cases.map((caso) => (
              <li key={caso.slug}>
                <Cartao className="jb-case-card h-full overflow-hidden rounded-[1.35rem]">
                  <Link
                    href={`/cases/${caso.slug}`}
                    className="flex h-full flex-col gap-2 p-5 sm:p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    <span className="label-mono text-xs text-jb-700">{caso.equipmentLabel}</span>
                    <span className="text-[1.0625rem] font-extrabold leading-snug tracking-tight text-graf-950 sm:text-lg">
                      {caso.title}
                    </span>
                    <span className="text-corpo leading-relaxed text-graf-600">{caso.symptom}</span>
                    <span className="mt-auto flex items-center gap-1.5 border-t border-graf-100 pt-4 text-sm font-extrabold text-jb-700">
                      Ver o atendimento
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    {caso.publishedAt ? (
                      <span className="text-apoio text-graf-500">{formatarData(caso.publishedAt)}</span>
                    ) : null}
                  </Link>
                </Cartao>
              </li>
            ))}
          </Grade>
        ) : (
          <div className="jb-content-empty mt-9 rounded-[1.5rem] border border-graf-200 bg-graf-50 p-6 sm:p-8">
            <h2 className="flex items-center gap-2.5 text-title texto-forte">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-jb-600 shadow-xs ring-1 ring-graf-200">
                <ClipboardCheck className="size-5" aria-hidden />
              </span>
              Ainda não há case publicado
            </h2>
            <p className="mt-4 max-w-2xl text-corpo leading-relaxed text-graf-600">
              Um case só vai ao ar com autorização da clínica atendida, com diagnóstico
              confirmado na bancada e com técnico e revisor identificados. Enquanto nenhum
              atendimento reúne as três coisas, esta página mostra o que a JB pode afirmar sem
              depender de autorização de ninguém: <strong>como o atendimento funciona</strong>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ChamarWhatsapp tamanho="sm" />
              <LinkBotao href="/#como-funciona" variante="secundario" tamanho="sm">
                Como a assistência funciona
              </LinkBotao>
            </div>
          </div>
        )}
      </Secao>

      <Secao fundo="clara" espaco="md" className="jb-case-processo">
        <TituloSecao
          tamanho="titulo"
          sobretitulo="Método de atendimento"
          titulo="Como um atendimento acontece"
          descricao="As sete etapas, na ordem. É o mesmo processo em toda ordem de serviço, e é dele que sai o registro que fica no histórico do equipamento."
        />
        <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="sm" como="ol" className="mt-7">
          {ETAPAS.map((etapa) => (
            <li key={etapa.numero}>
              <Cartao className="jb-case-etapa relative h-full overflow-hidden rounded-[1.35rem] p-5 sm:p-6">
                <span className="label-mono text-jb-600">{etapa.numero}</span>
                <h3 className="mt-3 text-corpo font-extrabold text-graf-950">{etapa.titulo}</h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-graf-600">{etapa.texto}</p>
              </Cartao>
            </li>
          ))}
        </Grade>
      </Secao>

      <Secao espaco="md" className="jb-content-cta">
        <div className="flex flex-col gap-6 rounded-[1.5rem] border border-graf-200 bg-graf-50 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="sobretitulo">Seu caso começa pela triagem</p>
            <h2 className="text-title texto-forte mt-2">Seu equipamento está com algum sintoma?</h2>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              Chame no WhatsApp e mande foto ou vídeo do que está acontecendo.
            </p>
          </div>
          <ChamarWhatsapp />
        </div>
      </Secao>
    </>
  );
}
