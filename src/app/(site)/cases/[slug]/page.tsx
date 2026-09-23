import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { ChamarWhatsapp } from "@/components/site/chamar-whatsapp";
import { TituloSecao, Trilha } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import { fraseDeDuracao } from "@/lib/cases";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { connection } from "next/server";

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

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
  await connection();
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
    <section className="jb-case-bloco rounded-[1.25rem] border border-graf-200 bg-white p-5 sm:p-6">
      <h2 className="text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-jb-700">{titulo}</h2>
      <div className="mt-3 text-[1.0625rem] leading-relaxed text-graf-800">{children}</div>
    </section>
  );
}

export default async function CasePage({ params }: Props) {
  await connection();
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

      <Secao espaco="md" largura="estreita" className="jb-case-detail">
        <Trilha itens={trilha} className="mb-6" />

        <header className="jb-case-head">
          <p className="label-mono inline-flex rounded-full border border-jb-100 bg-jb-50 px-3 py-1.5 text-xs font-bold text-jb-700">
            {[caso.equipmentLabel, caso.modelLabel].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mt-4 text-display texto-forte">{caso.title}</h1>

          <dl className="jb-case-meta mt-6 grid gap-3 rounded-[1.2rem] border border-graf-200 bg-white p-4 text-sm sm:grid-cols-2 sm:p-5">
            {caso.technician ? (
              <div>
                <dt className="text-graf-500">Executado por</dt>
                <dd className="font-extrabold text-graf-900">{caso.technician.name}</dd>
              </div>
            ) : null}
            {caso.reviewer ? (
              <div>
                <dt className="text-graf-500">Revisão técnica</dt>
                <dd className="font-extrabold text-graf-900">{caso.reviewer.name}</dd>
              </div>
            ) : null}
            {duracao ? (
              <div>
                <dt className="text-graf-500">Tempo do atendimento</dt>
                <dd className="tabular font-extrabold text-graf-900">{duracao}</dd>
              </div>
            ) : null}
            {caso.publishedAt ? (
              <div>
                <dt className="text-graf-500">Publicado em</dt>
                <dd className="tabular font-extrabold text-graf-900">{formatarData(caso.publishedAt)}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <div className="mt-8 grid gap-3 sm:gap-4">
          <Bloco titulo="O que a clínica relatou">{caso.symptom}</Bloco>
          <Bloco titulo="Diagnóstico confirmado na bancada">{caso.diagnosis}</Bloco>
          <Bloco titulo="O que foi feito">{caso.intervention}</Bloco>

          {caso.parts.length > 0 ? (
            <Bloco titulo="Peças substituídas">
              <ul className="space-y-2">
                {caso.parts.map((peca) => (
                  <li key={peca} className="flex gap-2.5">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-jb-500" />
                    <span>{peca}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          ) : null}

          <Bloco titulo="Testes finais">{caso.finalTests}</Bloco>
          {caso.result ? <Bloco titulo="Resultado">{caso.result}</Bloco> : null}
        </div>

        <p className="jb-case-consent mt-8 flex gap-3 rounded-xl border border-graf-200 bg-graf-50 p-4 text-[0.875rem] leading-relaxed text-graf-600 sm:p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-jb-600" aria-hidden />
          <span>
            Este atendimento foi publicado com autorização da clínica atendida. Nenhum dado do
            cliente, valor ou número de ordem de serviço aparece aqui.
          </span>
        </p>
      </Secao>

      <Secao fundo="clara" espaco="md" className="jb-content-cta">
        <div className="rounded-[1.5rem] border border-graf-200 bg-white p-6 shadow-[0_30px_70px_-52px_rgb(17_19_21/0.5)] sm:p-8">
          <TituloSecao
            tamanho="titulo"
            sobretitulo="Triagem técnica"
            titulo="Sintoma parecido no seu equipamento?"
            descricao="Sintoma igual não significa causa igual — mas é um bom começo de conversa."
            acao={<ChamarWhatsapp />}
          />
        </div>
      </Secao>
    </>
  );
}
