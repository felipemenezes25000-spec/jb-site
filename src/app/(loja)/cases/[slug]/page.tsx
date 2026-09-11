import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao, Trilha } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import { fraseDeDuracao } from "@/lib/cases";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

/**
 * A leitura pública de um case.
 *
 * O `select` é a projeção editorial autorizada, e ele é a peça de segurança
 * desta página: `workOrderId`, `consentNote` e `pendingNote` não estão aqui, e
 * não devem passar a estar. O vínculo com a OS serve para a JB comprovar
 * internamente o que publicou — ele não é conteúdo.
 */
async function casePublicado(slug: string) {
  return prisma.techCase.findFirst({
    where: { slug, status: "publicado" },
    select: {
      slug: true,
      title: true,
      symptom: true,
      equipmentLabel: true,
      modelLabel: true,
      diagnosis: true,
      intervention: true,
      parts: true,
      finalTests: true,
      durationLabel: true,
      result: true,
      publishedAt: true,
      technician: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caso = await casePublicado(slug);

  if (!caso) {
    return { title: "Case não encontrado", robots: { index: false, follow: false } };
  }

  return metadataDePagina({
    titulo: caso.title,
    descricao: caso.symptom,
    caminho: `/cases/${caso.slug}`,
  });
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-graf-200 pt-6">
      <h2 className="text-apoio font-bold uppercase tracking-wide text-graf-500">
        {titulo}
      </h2>
      <div className="mt-2 text-[1.0625rem] leading-relaxed text-graf-800">{children}</div>
    </section>
  );
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const caso = await casePublicado(slug);
  if (!caso) notFound();

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Cases técnicos", href: "/cases" },
    { rotulo: caso.title },
  ];

  const duracao = fraseDeDuracao(caso.durationLabel);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(trilha)} />

      <Secao espaco="sm" largura="estreita">
        <Trilha itens={trilha} className="mb-6" />

        <p className="label-mono text-xs text-jb-700">
          {[caso.equipmentLabel, caso.modelLabel].filter(Boolean).join(" · ")}
        </p>
        <h1 className="mt-2 text-display texto-forte">{caso.title}</h1>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-graf-200 py-4 text-sm">
          {caso.technician ? (
            <div>
              <dt className="text-graf-500">Executado por</dt>
              <dd className="font-semibold text-graf-900">{caso.technician.name}</dd>
            </div>
          ) : null}
          {caso.reviewer ? (
            <div>
              <dt className="text-graf-500">Revisão técnica</dt>
              <dd className="font-semibold text-graf-900">{caso.reviewer.name}</dd>
            </div>
          ) : null}
          {/* Duração só aparece quando foi medida. Sem ela, nenhuma frase
              ocupa o lugar — "resolvido rapidamente" promete um prazo que
              ninguém se comprometeu a cumprir. */}
          {duracao ? (
            <div>
              <dt className="text-graf-500">Tempo do atendimento</dt>
              <dd className="tabular font-semibold text-graf-900">{duracao}</dd>
            </div>
          ) : null}
          {caso.publishedAt ? (
            <div>
              <dt className="text-graf-500">Publicado em</dt>
              <dd className="tabular font-semibold text-graf-900">
                {formatarData(caso.publishedAt)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-8 space-y-6">
          <Bloco titulo="O que a clínica relatou">{caso.symptom}</Bloco>
          <Bloco titulo="Diagnóstico confirmado na bancada">{caso.diagnosis}</Bloco>
          <Bloco titulo="O que foi feito">{caso.intervention}</Bloco>

          {caso.parts.length > 0 ? (
            <Bloco titulo="Peças substituídas">
              <ul className="space-y-1.5">
                {caso.parts.map((peca) => (
                  <li key={peca} className="flex gap-2.5">
                    <span
                      aria-hidden
                      className="mt-2.5 size-1 shrink-0 rounded-full bg-graf-400"
                    />
                    <span>{peca}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          ) : null}

          <Bloco titulo="Testes finais">{caso.finalTests}</Bloco>
          {caso.result ? <Bloco titulo="Resultado">{caso.result}</Bloco> : null}
        </div>

        {/* A autorização é dita ao leitor, e não só guardada no banco. Ela é
            parte do que faz este case ser prova, e não anedota. */}
        <p className="mt-10 flex gap-2.5 rounded-lg border border-graf-200 bg-graf-50 p-4 text-[0.875rem] leading-relaxed text-graf-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>
            Este atendimento foi publicado com autorização da clínica atendida. Nenhum dado do
            cliente, valor ou número de ordem de serviço aparece aqui.
          </span>
        </p>
      </Secao>

      <Secao fundo="clara" espaco="sm">
        <TituloSecao
          tamanho="titulo"
          titulo="Sintoma parecido no seu equipamento?"
          descricao="Sintoma igual não significa causa igual — mas é um bom começo de conversa."
          acao={
            <LinkBotao href="/assistencia-tecnica/solicitar">Abrir chamado</LinkBotao>
          }
        />
      </Secao>
    </>
  );
}
