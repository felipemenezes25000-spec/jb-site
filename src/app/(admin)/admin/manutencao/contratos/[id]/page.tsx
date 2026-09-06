import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ContractStatus } from "@prisma/client";
import { CalendarPlus, MonitorCog, Pencil } from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import {
  AreaAcao,
  CampoAcao,
  MoedaAcao,
  SelecaoAcao,
} from "@/components/admin/servico/campos";
import { EtiquetaContrato, EtiquetaVisita } from "@/components/admin/servico/etiquetas";
import { Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import {
  editarContratoDeManutencao,
  gerarVisitasPrevistas,
  mudarStatusDoContrato,
} from "@/app/acoes/admin-servico";
import {
  distanciaEmDias,
  formatarData,
  formatarDataHora,
  formatarPreco,
  paraInputDate,
  plural,
} from "@/lib/format";
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
 *
 * "Editar contrato" muda vigência, valor, plano e cobertura. Mexer na vigência
 * ou na periodicidade refaz as visitas ainda só PREVISTAS; as já agendadas
 * ficam de pé, porque têm dia combinado com o cliente, e as concluídas nunca
 * são tocadas — são o histórico do equipamento. O campo escondido `versao`
 * carrega o `updatedAt` que esta tela leu: é ele que impede duas pessoas de
 * salvarem vigências diferentes sem saber uma da outra.
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

  /*
   * O parque do cliente inteiro, não só o coberto: a edição precisa poder
   * ACRESCENTAR equipamento à cobertura, e para isso a lista tem de mostrar o
   * que ainda está de fora. Só é buscado para quem edita.
   */
  const [planos, equipamentosDoCliente] = editar
    ? await Promise.all([
        prisma.maintenancePlan.findMany({
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            priceCents: true,
            periodMonths: true,
            visitsIncluded: true,
            published: true,
          },
        }),
        prisma.equipment.findMany({
          where: { customerId: contrato.customerId },
          orderBy: [{ status: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            brandName: true,
            modelName: true,
            serialNumber: true,
            maintenanceIntervalDays: true,
            location: { select: { name: true } },
            room: true,
          },
        }),
      ])
    : [[], []];

  const cobertos = new Set(contrato.items.map((item) => item.equipmentId));

  const emAberto = contrato.visits.filter((visita) =>
    STATUS_VISITA_ABERTOS.includes(visita.status),
  );
  const concluidas = contrato.visits.filter((visita) => visita.status === "concluida");

  const intervaloDoPlano =
    contrato.plan && contrato.plan.visitsIncluded > 0
      ? Math.max(1, Math.round(contrato.plan.periodMonths / contrato.plan.visitsIncluded))
      : null;

  /*
   * A periodicidade combinada não é coluna: vive nas observações desde a
   * criação, porque `MaintenanceContract` não tem onde guardá-la. É relida aqui
   * para o campo já abrir com o valor em vigor, em vez de vazio — campo vazio
   * seria lido como "voltar para a periodicidade do plano".
   */
  const intervaloCombinado = (() => {
    const linha = contrato.notes
      .split("\n")
      .find((texto) => texto.trim().startsWith("Intervalo combinado entre visitas:"));
    if (!linha) return null;
    const numero = Number(linha.replace(/\D/g, ""));
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  })();

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
                rotulo="Editar contrato"
                icone={<Pencil className="size-4" aria-hidden />}
                variante="primario"
                tamanho="md"
                titulo={`Editar o contrato ${contrato.number}`}
                descricao="Mudar a vigência, o plano ou a periodicidade refaz as visitas ainda previstas. Visita concluída nunca é apagada, e a já agendada continua de pé."
                acao={editarContratoDeManutencao}
                rotuloConfirmar="Salvar contrato"
                tamanhoPainel="xl"
              >
                <Oculto nome="contratoId" valor={contrato.id} />
                {/* guarda de concorrência: o UPDATE só acerta a linha que esta
                    tela leu — quem salvou primeiro é quem vale */}
                <Oculto nome="versao" valor={contrato.updatedAt.toISOString()} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelecaoAcao
                    rotulo="Plano"
                    name="planoId"
                    defaultValue={contrato.planId ?? ""}
                    ajuda="Define preço e periodicidade padrão."
                  >
                    <option value="">Sem plano (contrato avulso)</option>
                    {planos.map((plano) => (
                      <option key={plano.id} value={plano.id}>
                        {plano.name}
                        {plano.priceCents === null
                          ? " — sob orçamento"
                          : ` — ${formatarPreco(plano.priceCents)}`}
                        {plano.visitsIncluded > 0
                          ? ` · ${plural(plano.visitsIncluded, "visita", "visitas")} em ${plural(plano.periodMonths, "mês", "meses")}`
                          : ""}
                        {plano.published ? "" : " (não publicado)"}
                      </option>
                    ))}
                  </SelecaoAcao>

                  <MoedaAcao
                    rotulo="Valor do contrato"
                    nome="precoCents"
                    valorInicialCents={contrato.priceCents}
                  />

                  <CampoAcao
                    rotulo="Início da vigência"
                    name="inicio"
                    type="date"
                    defaultValue={paraInputDate(contrato.startsAt)}
                    ajuda="É a data de onde a agenda de visitas é contada."
                  />

                  <CampoAcao
                    rotulo="Fim da vigência"
                    name="fim"
                    type="date"
                    defaultValue={paraInputDate(contrato.endsAt)}
                    ajuda="Em branco, usa a vigência do plano escolhido."
                  />

                  <CampoAcao
                    rotulo="Intervalo entre visitas (meses)"
                    name="intervaloMeses"
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    inputMode="numeric"
                    defaultValue={intervaloCombinado ?? ""}
                    ajuda={
                      intervaloDoPlano
                        ? `Em branco, volta ao intervalo do plano: uma visita a cada ${plural(intervaloDoPlano, "mês", "meses")}.`
                        : "Em branco, cai no intervalo próprio de cada equipamento."
                    }
                  />
                </div>

                <fieldset>
                  <legend className="mb-1 text-sm font-semibold text-graf-800">
                    Equipamentos cobertos
                  </legend>
                  <p className="mb-3 text-[0.8125rem] leading-relaxed text-graf-500">
                    Desmarcar um equipamento tira a cobertura e cancela as visitas dele
                    que ainda não aconteceram — as concluídas continuam no histórico.
                  </p>

                  {equipamentosDoCliente.length === 0 ? (
                    <p className="text-sm text-graf-500">
                      Este cliente não tem equipamento no prontuário.
                    </p>
                  ) : (
                    <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                      {equipamentosDoCliente.map((equipamento) => {
                        const campoId = `cobre-${equipamento.id}`;
                        const detalhe = [
                          [equipamento.brandName, equipamento.modelName]
                            .filter(Boolean)
                            .join(" "),
                          equipamento.serialNumber
                            ? `série ${equipamento.serialNumber}`
                            : "",
                          [equipamento.location?.name, equipamento.room]
                            .filter(Boolean)
                            .join(" · "),
                        ]
                          .filter(Boolean)
                          .join(" — ");

                        return (
                          <li key={equipamento.id}>
                            <label
                              htmlFor={campoId}
                              className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-3"
                            >
                              <input
                                id={campoId}
                                type="checkbox"
                                name="equipamentoIds"
                                value={equipamento.id}
                                defaultChecked={cobertos.has(equipamento.id)}
                                className="mt-0.5 size-[18px] shrink-0 rounded border-graf-450 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-graf-900">
                                  {equipamento.name}
                                </span>
                                {detalhe ? (
                                  <span className="block text-[0.8125rem] text-graf-500">
                                    {detalhe}
                                  </span>
                                ) : null}
                                <span className="block text-[0.8125rem] text-graf-500">
                                  {equipamento.maintenanceIntervalDays
                                    ? `Intervalo próprio: ${plural(equipamento.maintenanceIntervalDays, "dia", "dias")}`
                                    : "Sem intervalo próprio — depende do plano ou do campo acima"}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </fieldset>

                <AreaAcao
                  rotulo="Observações do contrato"
                  name="notas"
                  rows={3}
                  defaultValue={contrato.notes}
                />
              </PainelAcao>

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
                      <span className="text-[0.8125rem] text-graf-500">
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
                          <span className="block text-[0.8125rem] text-graf-500">
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
                          <span className="block text-[0.8125rem] text-graf-500">
                            {[item.equipment.brandName, item.equipment.modelName]
                              .filter(Boolean)
                              .join(" ") || "Sem marca informada"}
                            {item.equipment.serialNumber
                              ? ` · série ${item.equipment.serialNumber}`
                              : ""}
                          </span>
                          <span className="block text-[0.8125rem] text-graf-500">
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
