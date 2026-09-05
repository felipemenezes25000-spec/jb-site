import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ContractStatus } from "@prisma/client";
import { CalendarPlus, MonitorCog } from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import { CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { EtiquetaContrato, EtiquetaVisita } from "@/components/admin/servico/etiquetas";
import { Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import {
  gerarVisitasPrevistas,
  mudarStatusDoContrato,
} from "@/app/acoes/admin-servico";
import { distanciaEmDias, formatarData, formatarDataHora, formatarPreco, plural } from "@/lib/format";
import { ROTULO_CONTRATO, STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Ficha do contrato de manutenção.
 *
 * "Gerar visitas" é idempotente: roda de novo depois de renovar a vigência e
 * só acrescenta o que falta. Equipamento sem periodicidade nenhuma (nem do
 * plano, nem própria, nem informada aqui) fica de fora e a mensagem diz o nome
 * dele — melhor avisar do que fingir agenda cheia.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const contrato = await prisma.maintenanceContract.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: contrato ? `Contrato ${contrato.number}` : "Contrato" };
}

export default async function PaginaContrato({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("manutencao");
  const { id } = await params;

  const contrato = await prisma.maintenanceContract.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      plan: {
        select: {
          id: true,
          name: true,
          periodMonths: true,
          visitsIncluded: true,
          partsDiscountPercent: true,
        },
      },
      items: {
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              brandName: true,
              modelName: true,
              serialNumber: true,
              status: true,
              maintenanceIntervalDays: true,
              nextMaintenanceAt: true,
            },
          },
        },
      },
      visits: {
        orderBy: { dueAt: "asc" },
        select: {
          id: true,
          status: true,
          dueAt: true,
          scheduledAt: true,
          doneAt: true,
          equipment: { select: { name: true } },
          technician: { select: { user: { select: { name: true } } } },
        },
      },
    },
  });

  if (!contrato) notFound();

  const editar = podeEditar(usuario, "manutencao");

  const emAberto = contrato.visits.filter((visita) =>
    STATUS_VISITA_ABERTOS.includes(visita.status),
  );
  const concluidas = contrato.visits.filter((visita) => visita.status === "concluida");

  const intervaloDoPlano =
    contrato.plan && contrato.plan.visitsIncluded > 0
      ? Math.max(1, Math.round(contrato.plan.periodMonths / contrato.plan.visitsIncluded))
      : null;

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Manutenção", href: "/admin/manutencao" },
          { rotulo: "Contratos", href: "/admin/manutencao/contratos" },
          { rotulo: contrato.number },
        ]}
        titulo={`Contrato ${contrato.number}`}
        descricao={`${contrato.customer.name} · ${plural(contrato.items.length, "equipamento coberto", "equipamentos cobertos")}`}
        etiquetas={<EtiquetaContrato status={contrato.status} />}
        acoes={
          editar ? (
            <>
              <PainelAcao
                rotulo="Gerar visitas"
                icone={<CalendarPlus className="size-4" aria-hidden />}
                variante="secundario"
                tamanho="md"
                titulo="Gerar as visitas previstas"
                descricao="Cria as visitas que faltam até o fim da vigência. Rodar de novo não duplica o que já existe."
                acao={gerarVisitasPrevistas}
                rotuloConfirmar="Gerar"
              >
                <Oculto nome="contratoId" valor={contrato.id} />
                <CampoAcao
                  rotulo="Intervalo entre visitas (meses)"
                  name="intervaloMeses"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  inputMode="numeric"
                  ajuda={
                    intervaloDoPlano
                      ? `Em branco, usa o intervalo do plano: uma visita a cada ${plural(intervaloDoPlano, "mês", "meses")}.`
                      : "Sem plano com visitas incluídas, em branco cai no intervalo próprio de cada equipamento."
                  }
                />
              </PainelAcao>

              <PainelAcao
                rotulo="Mudar situação"
                variante="secundario"
                tamanho="md"
                titulo="Situação do contrato"
                descricao="Encerrar cancela as visitas que ainda não aconteceram."
                acao={mudarStatusDoContrato}
                rotuloConfirmar="Gravar"
              >
                <Oculto nome="contratoId" valor={contrato.id} />
                <SelecaoAcao rotulo="Situação" name="status" defaultValue={contrato.status} required>
                  {(Object.keys(ROTULO_CONTRATO) as ContractStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {ROTULO_CONTRATO[status]}
                    </option>
                  ))}
                </SelecaoAcao>
              </PainelAcao>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao titulo="Contrato" />
            <div className="space-y-5 px-5 py-5">
              <Dados>
                <Dado rotulo="Cliente">
                  <Link
                    href={`/admin/clientes/${contrato.customer.id}`}
                    className="font-medium text-jb-700 hover:text-jb-500"
                  >
                    {contrato.customer.name}
                  </Link>
                </Dado>
                <Dado rotulo="Plano">{contrato.plan?.name}</Dado>
                <Dado rotulo="Início">{contrato.startsAt ? formatarData(contrato.startsAt) : null}</Dado>
                <Dado rotulo="Fim da vigência">
                  {contrato.endsAt ? (
                    <>
                      {formatarData(contrato.endsAt)}{" "}
                      <span className="text-xs text-graf-500">
                        ({distanciaEmDias(contrato.endsAt)})
                      </span>
                    </>
                  ) : null}
                </Dado>
                <Dado rotulo="Valor">
                  <span className="tabular font-semibold">
                    {formatarPreco(contrato.priceCents)}
                  </span>
                </Dado>
                <Dado rotulo="Periodicidade">
                  {intervaloDoPlano
                    ? `Uma visita a cada ${plural(intervaloDoPlano, "mês", "meses")}`
                    : null}
                </Dado>
                <Dado rotulo="Desconto em peças">
                  {contrato.plan && contrato.plan.partsDiscountPercent > 0
                    ? `${contrato.plan.partsDiscountPercent}%`
                    : null}
                </Dado>
                <Dado rotulo="Visitas">
                  {contrato.visits.length === 0
                    ? null
                    : `${concluidas.length} concluída(s) · ${emAberto.length} em aberto · ${contrato.visits.length} no total`}
                </Dado>
              </Dados>

              {contrato.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                    Observações
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-graf-800">
                    {contrato.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Agenda de visitas"
              descricao="Previstas, agendadas e concluídas deste contrato"
            />
            <div className="px-5 py-5">
              {contrato.visits.length === 0 ? (
                <Vazio
                  titulo="Nenhuma visita gerada"
                  descricao="Use “Gerar visitas” para montar a agenda até o fim da vigência."
                  className="border-graf-200 bg-transparent py-8"
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {contrato.visits.map((visita) => (
                    <li key={visita.id}>
                      <Link
                        href={`/admin/manutencao/${visita.id}`}
                        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-3 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-graf-900">
                            {visita.equipment.name}
                          </span>
                          <span className="block text-xs text-graf-500">
                            prevista para {formatarData(visita.dueAt)}
                            {visita.scheduledAt
                              ? ` · marcada para ${formatarDataHora(visita.scheduledAt)}`
                              : ""}
                            {visita.doneAt ? ` · feita em ${formatarData(visita.doneAt)}` : ""}
                            {visita.technician ? ` · ${visita.technician.user.name}` : ""}
                          </span>
                        </span>
                        <EtiquetaVisita status={visita.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao
              titulo="Equipamentos cobertos"
              descricao={plural(contrato.items.length, "equipamento", "equipamentos")}
            />
            <div className="px-5 py-5">
              {contrato.items.length === 0 ? (
                <p className="text-sm text-graf-500">Nenhum equipamento vinculado.</p>
              ) : (
                <ul className="space-y-2">
                  {contrato.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/equipamentos/${item.equipment.id}`}
                        className="flex min-h-11 items-start gap-2.5 rounded-lg border border-graf-200 px-3 py-2.5 transition-colors hover:border-graf-300 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <MonitorCog className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-graf-900">
                            {item.equipment.name}
                          </span>
                          <span className="block text-xs text-graf-500">
                            {[item.equipment.brandName, item.equipment.modelName]
                              .filter(Boolean)
                              .join(" ") || "Sem marca informada"}
                            {item.equipment.serialNumber
                              ? ` · série ${item.equipment.serialNumber}`
                              : ""}
                          </span>
                          <span className="block text-xs text-graf-500">
                            {item.equipment.nextMaintenanceAt
                              ? `Próxima preventiva: ${formatarData(item.equipment.nextMaintenanceAt)}`
                              : "Sem próxima preventiva calculada"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
