import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing, MonitorCog } from "lucide-react";

import { AcoesDaVisita } from "@/components/admin/servico/acoes-visita";
import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import { CampoAcao } from "@/components/admin/servico/campos";
import { EtiquetaContrato, EtiquetaVisita } from "@/components/admin/servico/etiquetas";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { LinkBotao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao } from "@/components/ui/data";
import { enviarLembreteDeVisita } from "@/app/acoes/admin-servico";
import { distanciaEmDias, formatarData, formatarDataHora, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Ficha de uma visita de manutenção preventiva.
 *
 * Concluir aqui não é só mudar o status: o domínio carimba a data no
 * prontuário do equipamento, calcula a próxima manutenção pelo intervalo dele,
 * avisa o cliente e, quando o técnico encontrou pendência, abre a OS do
 * conserto já ligada ao equipamento.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const visita = await prisma.maintenanceVisit.findUnique({
    where: { id },
    select: { equipment: { select: { name: true } } },
  });
  return { title: visita ? `Visita — ${visita.equipment.name}` : "Visita de manutenção" };
}

export default async function PaginaVisita({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirArea("manutencao");
  const { id } = await params;

  const visita = await prisma.maintenanceVisit.findUnique({
    where: { id },
    include: {
      equipment: {
        select: {
          id: true,
          name: true,
          brandName: true,
          modelName: true,
          serialNumber: true,
          room: true,
          maintenanceIntervalDays: true,
          lastMaintenanceAt: true,
          nextMaintenanceAt: true,
          location: { select: { name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
      contract: {
        select: {
          id: true,
          number: true,
          status: true,
          endsAt: true,
          plan: { select: { name: true } },
        },
      },
      technician: { select: { id: true, user: { select: { name: true } } } },
      reminders: { orderBy: { sentAt: "desc" } },
    },
  });

  if (!visita) notFound();

  const editar = podeEditar(usuario, "manutencao");
  const encerrada = visita.status === "concluida" || visita.status === "cancelada";
  const diasAteAVisita = Math.max(
    0,
    Math.round((visita.dueAt.getTime() - Date.now()) / 86_400_000),
  );

  const tecnicos = await prisma.technician.findMany({
    where: { active: true },
    orderBy: { user: { name: "asc" } },
    select: { id: true, user: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Manutenção", href: "/admin/manutencao" },
          { rotulo: visita.equipment.name },
        ]}
        titulo={`Preventiva — ${visita.equipment.name}`}
        descricao={`${visita.equipment.customer.name} · prevista para ${formatarData(visita.dueAt)} (${distanciaEmDias(visita.dueAt)})`}
        etiquetas={<EtiquetaVisita status={visita.status} />}
        acoes={
          editar && !encerrada ? (
            <AcoesDaVisita
              visitaId={visita.id}
              equipamento={visita.equipment.name}
              status={visita.status}
              tecnicoAtual={visita.technicianId}
              tecnicos={tecnicos.map((tecnico) => ({ id: tecnico.id, nome: tecnico.user.name }))}
              tamanho="md"
            />
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao titulo="Visita" />
            <div className="px-5 py-5">
              <Dados>
                <Dado rotulo="Prevista para">{formatarData(visita.dueAt)}</Dado>
                <Dado rotulo="Agendada para">
                  {visita.scheduledAt ? formatarDataHora(visita.scheduledAt) : null}
                </Dado>
                <Dado rotulo="Concluída em">
                  {visita.doneAt ? formatarDataHora(visita.doneAt) : null}
                </Dado>
                <Dado rotulo="Técnico">{visita.technician?.user.name}</Dado>
              </Dados>

              {visita.notes ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                    Observações
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-graf-800">{visita.notes}</p>
                </div>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Equipamento"
              acao={
                <LinkBotao
                  href={`/admin/equipamentos/${visita.equipment.id}`}
                  variante="secundario"
                  tamanho="sm"
                >
                  <MonitorCog className="size-4" aria-hidden />
                  Abrir prontuário
                </LinkBotao>
              }
            />
            <div className="px-5 py-5">
              <Dados>
                <Dado rotulo="Cliente">
                  <Link
                    href={`/admin/clientes/${visita.equipment.customer.id}`}
                    className="font-medium text-jb-700 hover:text-jb-500"
                  >
                    {visita.equipment.customer.name}
                  </Link>
                </Dado>
                <Dado rotulo="Marca / modelo">
                  {[visita.equipment.brandName, visita.equipment.modelName]
                    .filter(Boolean)
                    .join(" ")}
                </Dado>
                <Dado rotulo="Número de série">{visita.equipment.serialNumber}</Dado>
                <Dado rotulo="Local">
                  {[visita.equipment.location?.name, visita.equipment.room]
                    .filter(Boolean)
                    .join(" · ")}
                </Dado>
                <Dado rotulo="Intervalo de preventiva">
                  {visita.equipment.maintenanceIntervalDays
                    ? plural(visita.equipment.maintenanceIntervalDays, "dia", "dias")
                    : null}
                  {!visita.equipment.maintenanceIntervalDays ? (
                    <span className="text-graf-500">
                      Não definido — a próxima data sai do contrato
                    </span>
                  ) : null}
                </Dado>
                <Dado rotulo="Última manutenção">
                  {visita.equipment.lastMaintenanceAt
                    ? formatarData(visita.equipment.lastMaintenanceAt)
                    : null}
                </Dado>
              </Dados>
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          {visita.contract ? (
            <Cartao>
              <CabecalhoCartao titulo="Contrato" />
              <div className="px-5 py-5">
                <p className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/manutencao/contratos/${visita.contract.id}`}
                    className="label-mono font-semibold text-jb-700 hover:text-jb-500"
                  >
                    {visita.contract.number}
                  </Link>
                  <EtiquetaContrato status={visita.contract.status} />
                </p>
                <p className="mt-2 text-sm text-graf-600">
                  {visita.contract.plan?.name ?? "Sem plano vinculado"}
                </p>
                {visita.contract.endsAt ? (
                  <p className="mt-1 text-xs text-graf-500">
                    Vigência até {formatarData(visita.contract.endsAt)}
                  </p>
                ) : null}
              </div>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao
              titulo="Avisos ao cliente"
              descricao="Lembretes já registrados para esta visita"
            />
            <div className="space-y-4 px-5 py-5">
              {visita.reminders.length === 0 ? (
                <p className="text-sm text-graf-500">Nenhum lembrete enviado ainda.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-graf-700">
                  {visita.reminders.map((lembrete) => (
                    <li key={lembrete.id} className="flex items-center justify-between gap-3">
                      <span>{plural(lembrete.daysBefore, "dia antes", "dias antes")}</span>
                      <span className="text-xs text-graf-500">
                        {formatarDataHora(lembrete.sentAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {editar && !encerrada ? (
                <FormularioAcao
                  acao={enviarLembreteDeVisita}
                  rotulo="Avisar o cliente agora"
                  variante="secundario"
                  tamanho="sm"
                  icone={<BellRing className="size-4" aria-hidden />}
                >
                  <Oculto nome="visitaId" valor={visita.id} />
                  <CampoAcao
                    rotulo="Antecedência registrada (dias)"
                    name="diasAntes"
                    type="number"
                    min={0}
                    max={90}
                    step={1}
                    inputMode="numeric"
                    defaultValue={diasAteAVisita}
                    ajuda="Trava o reenvio do mesmo lembrete nesta antecedência."
                  />
                </FormularioAcao>
              ) : null}
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
