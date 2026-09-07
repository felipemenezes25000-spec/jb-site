import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  CabecalhoPagina,
  subnavServico,
  SubNavegacao,
} from "@/components/admin/servico/cabecalho";
import {
  Calendario,
  LegendaDaAgenda,
  chaveDoDia,
  intervaloDaVisao,
  primeiroDiaDoMes,
  somarDias,
  somarMeses,
  tituloDaVisao,
  type Compromisso,
} from "@/components/admin/servico/calendario";
import { Botao } from "@/components/ui/button";
import { Cartao } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "Agenda",
};

/**
 * Agenda técnica — visitas, preventivas e instalações no mesmo calendário.
 *
 * As três coisas disputam a mesma pessoa e o mesmo dia, então mostrá-las em
 * telas separadas é o caminho mais curto para marcar duas em cima da outra.
 *
 * A visita preventiva aparece na data marcada quando existe uma; sem data
 * marcada, aparece na data prevista — e o cartão diz "prevista" em vez de uma
 * hora que ninguém combinou.
 *
 * `InstallationTask` não tem técnico no banco. Por isso, ao filtrar por
 * técnico, as instalações somem da grade: seria adivinhação incluí-las.
 */

type Busca = { visao?: string; data?: string; tecnico?: string };

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("agenda");
  const busca = await searchParams;

  const hoje = chaveDoDia(new Date());
  const visao = busca.visao === "semana" ? "semana" : "mes";
  const ancora = /^\d{4}-\d{2}-\d{2}$/.test(busca.data ?? "") ? (busca.data as string) : hoje;
  const tecnicoId = busca.tecnico?.trim() || "";

  const { inicio, fim } = intervaloDaVisao(visao, ancora);

  const [agendamentos, visitas, instalacoes, tecnicos] = await Promise.all([
    prisma.serviceAppointment.findMany({
      where: {
        startsAt: { gte: inicio, lt: fim },
        ...(tecnicoId ? { technicianId: tecnicoId } : {}),
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        status: true,
        addressSummary: true,
        request: { select: { id: true, number: true, customer: { select: { name: true } }, contactName: true } },
        installTask: { select: { orderId: true } },
        technician: { select: { colorTag: true, user: { select: { name: true } } } },
      },
    }),
    prisma.maintenanceVisit.findMany({
      where: {
        OR: [
          { scheduledAt: { gte: inicio, lt: fim } },
          { scheduledAt: null, dueAt: { gte: inicio, lt: fim } },
        ],
        ...(tecnicoId ? { technicianId: tecnicoId } : {}),
      },
      orderBy: { dueAt: "asc" },
      select: {
        id: true,
        status: true,
        dueAt: true,
        scheduledAt: true,
        equipment: { select: { name: true, customer: { select: { name: true } } } },
        technician: { select: { colorTag: true, user: { select: { name: true } } } },
      },
    }),
    tecnicoId
      ? Promise.resolve([])
      : prisma.installationTask.findMany({
          where: { scheduledAt: { gte: inicio, lt: fim } },
          orderBy: { scheduledAt: "asc" },
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            order: {
              select: {
                id: true,
                number: true,
                buyerName: true,
                shipCity: true,
                shipState: true,
              },
            },
          },
        }),
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { user: { name: "asc" } },
      select: { id: true, colorTag: true, user: { select: { name: true } } },
    }),
  ]);

  const compromissos: Compromisso[] = [
    ...agendamentos.map((item) => ({
      id: `visita-${item.id}`,
      tipo: "visita" as const,
      titulo:
        item.request?.customer?.name ?? item.request?.contactName ?? item.title,
      detalhe: item.request ? `Chamado ${item.request.number}` : item.addressSummary,
      quando: item.startsAt,
      temHora: true,
      href: item.request
        ? `/admin/assistencia/${item.request.id}`
        : item.installTask
          ? `/admin/pedidos/${item.installTask.orderId}`
          : "/admin/agenda",
      tecnico: item.technician?.user.name ?? null,
      corDoTecnico: item.technician?.colorTag ?? null,
      status: item.status,
      cancelado: item.status === "cancelado",
    })),
    ...visitas.map((item) => ({
      id: `manutencao-${item.id}`,
      tipo: "manutencao" as const,
      titulo: item.equipment.name,
      detalhe: item.equipment.customer.name,
      quando: item.scheduledAt ?? item.dueAt,
      temHora: item.scheduledAt !== null,
      href: `/admin/manutencao/${item.id}`,
      tecnico: item.technician?.user.name ?? null,
      corDoTecnico: item.technician?.colorTag ?? null,
      status: item.status,
      cancelado: item.status === "cancelada",
    })),
    ...instalacoes.flatMap((item) =>
      item.scheduledAt
        ? [
            {
              id: `instalacao-${item.id}`,
              tipo: "instalacao" as const,
              titulo: item.order.buyerName,
              detalhe: `Pedido ${item.order.number}${
                item.order.shipCity ? ` · ${item.order.shipCity}/${item.order.shipState}` : ""
              }`,
              quando: item.scheduledAt,
              temHora: true,
              href: `/admin/pedidos/${item.order.id}`,
              tecnico: null,
              corDoTecnico: null,
              status: item.status,
              cancelado: item.status === "cancelada",
            },
          ]
        : [],
    ),
  ];

  const parametros = (mudancas: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const juntos = { visao, data: ancora, tecnico: tecnicoId, ...mudancas };
    for (const [chave, valor] of Object.entries(juntos)) {
      if (!valor) continue;
      if (chave === "visao" && valor === "mes") continue;
      if (chave === "data" && valor === hoje) continue;
      query.set(chave, valor);
    }
    const texto = query.toString();
    return texto ? `/admin/agenda?${texto}` : "/admin/agenda";
  };

  const anterior =
    visao === "mes" ? somarMeses(primeiroDiaDoMes(ancora), -1) : somarDias(ancora, -7);
  const proximo =
    visao === "mes" ? somarMeses(primeiroDiaDoMes(ancora), 1) : somarDias(ancora, 7);

  const nomeDoTecnico = tecnicos.find((tecnico) => tecnico.id === tecnicoId)?.user.name;

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Agenda técnica"
        descricao="Visitas de assistência, manutenções preventivas e instalações no mesmo calendário."
      />

      <SubNavegacao itens={subnavServico(usuario)} atual="/admin/agenda" />

      <Cartao className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Sem `flex-wrap` aqui, seta + título de 12rem + seta + "Hoje"
              somavam 357px numa faixa de 296 em 360px e a página inteira
              rolava de lado. Agora o "Hoje" desce para a linha de baixo. */}
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={parametros({ data: anterior })}
              aria-label={visao === "mes" ? "Mês anterior" : "Semana anterior"}
              className="inline-flex size-11 items-center justify-center rounded-lg text-graf-600 transition-colors hover:bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Link>

            <p className="min-w-48 px-2 text-center text-base font-bold text-graf-950">
              {tituloDaVisao(visao, ancora)}
            </p>

            <Link
              href={parametros({ data: proximo })}
              aria-label={visao === "mes" ? "Próximo mês" : "Próxima semana"}
              className="inline-flex size-11 items-center justify-center rounded-lg text-graf-600 transition-colors hover:bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Link>

            <Link
              href={parametros({ data: hoje })}
              className="ml-1 inline-flex min-h-11 items-center rounded-lg border border-graf-300 px-3.5 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              Hoje
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-graf-300 p-0.5" role="group" aria-label="Visão do calendário">
              {(["mes", "semana"] as const).map((opcao) => (
                <Link
                  key={opcao}
                  href={parametros({ visao: opcao })}
                  aria-current={visao === opcao ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-md px-3.5 text-sm font-semibold transition-colors pointer-coarse:min-h-11",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                    visao === opcao
                      ? "bg-jb-500 text-white"
                      : "text-graf-600 hover:bg-graf-100",
                  )}
                >
                  {opcao === "mes" ? "Mês" : "Semana"}
                </Link>
              ))}
            </div>

            <form method="get" action="/admin/agenda" className="flex items-center gap-2">
              <input type="hidden" name="visao" value={visao} />
              <input type="hidden" name="data" value={ancora} />
              <label htmlFor="agenda-tecnico" className="sr-only">
                Filtrar por técnico
              </label>
              <select
                id="agenda-tecnico"
                name="tecnico"
                defaultValue={tecnicoId}
                className="h-11 rounded-lg border border-graf-450 bg-white px-3 pr-8 text-base sm:text-sm text-graf-900 hover:border-graf-500 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
              >
                <option value="">Todos os técnicos</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.user.name}
                  </option>
                ))}
              </select>
              <Botao type="submit" variante="secundario">
                Filtrar
              </Botao>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-graf-200 pt-3">
          <LegendaDaAgenda />
          <p className="text-sm text-graf-600" aria-live="polite">
            {plural(compromissos.length, "compromisso", "compromissos")} no período
            {nomeDoTecnico ? ` · ${nomeDoTecnico}` : ""}
            {tecnicoId ? " · instalações não entram no filtro por técnico" : ""}
          </p>
        </div>
      </Cartao>

      <Calendario visao={visao} ancora={ancora} compromissos={compromissos} hoje={hoje} />

      <p className="text-[0.8125rem] text-graf-500">
        A bolinha colorida é a cor cadastrada na ficha do técnico. Compromisso sem técnico — ou
        com técnico sem cor definida — aparece sem bolinha; o nome continua escrito no cartão.
      </p>
    </div>
  );
}
