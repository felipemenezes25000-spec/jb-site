import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive, CheckCircle2, FileEdit, Send, ShieldCheck, ShieldOff, Upload } from "lucide-react";

import {
  mudarEstadoDoCase,
  publicarCase,
  registrarAutorizacao,
  registrarRevisaoDoCase,
  revogarAutorizacao,
  salvarCase,
} from "@/app/acoes/admin-cases";
import { FormularioAutorizacao } from "@/components/admin/cases/formulario-autorizacao";
import { FormularioCase } from "@/components/admin/cases/formulario-case";
import { BotaoAcao } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { ROTULO_ESTADO_CASE, impedimentoDoCase, type EstadoDoCase } from "@/lib/cases";
import { equipeQuePodeAssinar } from "@/lib/equipe-editorial";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const caso = await prisma.techCase.findUnique({ where: { id }, select: { title: true } });
  return { title: caso ? `${caso.title} · Cases` : "Case" };
}

const AVISOS: Record<string, string> = {
  criado: "Rascunho criado. Agora dá para registrar a autorização do cliente.",
};

const TOM: Record<EstadoDoCase, "ok" | "andamento" | "aguardando" | "neutro"> = {
  publicado: "ok",
  em_revisao: "aguardando",
  rascunho: "andamento",
  arquivado: "neutro",
};

export default async function PaginaEditarCase({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("cases");
  const { id } = await params;
  const { ok } = await searchParams;

  const caso = await prisma.techCase.findUnique({ where: { id } });
  if (!caso) notFound();

  const podeEscrever = podeEditar(usuario, "cases");
  const [equipe, ordens] = await Promise.all([
    equipeQuePodeAssinar(),
    prisma.workOrder.findMany({
      where: { status: "concluida" },
      orderBy: { closedAt: "desc" },
      take: 60,
      select: {
        id: true,
        number: true,
        equipment: { select: { name: true } },
      },
    }),
  ]);

  const estado = caso.status as EstadoDoCase;

  const impedimento = impedimentoDoCase({
    temTitulo: caso.title.trim().length > 2,
    temSintoma: caso.symptom.trim().length > 10,
    temDiagnostico: caso.diagnosis.trim().length > 10,
    temIntervencao: caso.intervention.trim().length > 10,
    temTesteFinal: caso.finalTests.trim().length > 5,
    tecnicoId: caso.technicianId,
    revisorId: caso.reviewerId,
    revisadoEm: caso.reviewedAt,
    autorizadoPeloCliente: caso.customerConsent,
  });

  const souORevisor = caso.reviewerId === usuario.id && caso.technicianId !== usuario.id;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Cases técnicos", href: "/admin/cases" },
          { rotulo: caso.title },
        ]}
        titulo={caso.title}
        descricao={
          <>
            <span className="label-mono">/cases/{caso.slug}</span> · alterado em{" "}
            {formatarDataHora(caso.updatedAt)}
            {caso.reviewedAt ? ` · revisado em ${formatarDataHora(caso.reviewedAt)}` : ""}
          </>
        }
        etiqueta={<Etiqueta tom={TOM[estado]}>{ROTULO_ESTADO_CASE[estado]}</Etiqueta>}
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {impedimento ? (
        <Aviso tom="atencao" titulo="Ainda não pode ir ao ar">
          <ul className="mt-1 space-y-1">
            {impedimento.falta.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-current" />
                <span>Falta {item}.</span>
              </li>
            ))}
          </ul>
        </Aviso>
      ) : null}

      {/* ------------------------------------------- a autorização --- */}
      <section
        className="rounded-xl border border-graf-200 bg-white p-5"
        aria-labelledby="autorizacao"
      >
        <h2 id="autorizacao" className="flex items-center gap-2 text-base font-bold text-graf-950">
          <ShieldCheck className="size-4 text-graf-500" aria-hidden />
          Autorização do cliente
        </h2>

        {caso.customerConsent ? (
          <>
            <p className="mt-2 text-corpo leading-relaxed text-graf-700">
              Registrada
              {caso.customerConsentAt
                ? ` em ${formatarDataHora(caso.customerConsentAt)}`
                : ""}
              .
            </p>
            {caso.consentNote ? (
              <p className="mt-1 text-[0.875rem] leading-relaxed text-graf-600">
                {caso.consentNote}
              </p>
            ) : null}
            {podeEscrever ? (
              <div className="mt-4">
                <BotaoAcao
                  acao={revogarAutorizacao}
                  valores={{ id: caso.id }}
                  rotulo="Revogar autorização"
                  variante="perigo"
                  icone={<ShieldOff className="size-4" aria-hidden />}
                />
                <p className="mt-2 text-apoio text-graf-500">
                  Revogar tira o case do ar na mesma operação.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              Sem autorização, este case não vai ao ar — mesmo completo e revisado. O vínculo com
              a ordem de serviço prova o que aconteceu para a JB; ele não autoriza publicar.
            </p>
            {podeEscrever ? (
              <FormularioAutorizacao
                acao={registrarAutorizacao}
                caseId={caso.id}
                className="mt-4"
              />
            ) : null}
          </>
        )}
      </section>

      {/* ------------------------------------------------- fluxo --- */}
      {podeEscrever ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-graf-200 bg-white p-4">
          {estado !== "em_revisao" && estado !== "publicado" ? (
            <BotaoAcao
              acao={mudarEstadoDoCase}
              valores={{ id: caso.id, status: "em_revisao" }}
              rotulo="Enviar para revisão"
              icone={<Send className="size-4" aria-hidden />}
            />
          ) : null}

          {estado === "em_revisao" && !caso.reviewedAt ? (
            <BotaoAcao
              acao={registrarRevisaoDoCase}
              valores={{ id: caso.id }}
              rotulo="Registrar minha revisão"
              icone={<CheckCircle2 className="size-4" aria-hidden />}
              desabilitado={!souORevisor}
            />
          ) : null}

          {estado !== "publicado" ? (
            <BotaoAcao
              acao={publicarCase}
              valores={{ id: caso.id }}
              rotulo="Publicar"
              variante="primario"
              icone={<Upload className="size-4" aria-hidden />}
              desabilitado={Boolean(impedimento)}
            />
          ) : (
            <BotaoAcao
              acao={mudarEstadoDoCase}
              valores={{ id: caso.id, status: "arquivado" }}
              rotulo="Arquivar"
              icone={<Archive className="size-4" aria-hidden />}
            />
          )}

          {estado === "arquivado" ? (
            <BotaoAcao
              acao={mudarEstadoDoCase}
              valores={{ id: caso.id, status: "rascunho" }}
              rotulo="Voltar para rascunho"
              icone={<FileEdit className="size-4" aria-hidden />}
            />
          ) : null}
        </div>
      ) : null}

      <FormularioCase
        acao={salvarCase}
        caso={{
          id: caso.id,
          title: caso.title,
          slug: caso.slug,
          symptom: caso.symptom,
          equipmentLabel: caso.equipmentLabel,
          modelLabel: caso.modelLabel,
          diagnosis: caso.diagnosis,
          intervention: caso.intervention,
          parts: caso.parts,
          finalTests: caso.finalTests,
          durationLabel: caso.durationLabel,
          result: caso.result,
          technicianId: caso.technicianId ?? "",
          reviewerId: caso.reviewerId ?? "",
          workOrderId: caso.workOrderId ?? "",
          pendingNote: caso.pendingNote,
        }}
        equipe={equipe}
        ordens={ordens.map((ordem) => ({
          id: ordem.id,
          number: ordem.number,
          rotulo: `${ordem.number}${ordem.equipment ? ` — ${ordem.equipment.name}` : ""}`,
        }))}
        somenteLeitura={!podeEscrever}
      />
    </div>
  );
}
