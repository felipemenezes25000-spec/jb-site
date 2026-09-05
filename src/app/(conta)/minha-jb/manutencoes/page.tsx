import type { Metadata } from "next";
import Link from "next/link";
import type { VisitStatus } from "@prisma/client";
import { CalendarCheck, CalendarClock, ShieldCheck, Wrench } from "lucide-react";

import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, Vazio } from "@/components/ui/data";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { exigirCliente } from "@/lib/auth-cliente";
import { distanciaEmDias, formatarData, formatarPreco, plural } from "@/lib/format";
import { ROTULO_CONTRATO, ROTULO_VISITA, proximasVisitas } from "@/lib/manutencao";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Manutenções",
  description: "Contratos de manutenção e visitas previstas.",
  robots: { index: false, follow: false },
};

type LinhaVisita = {
  id: string;
  equipamento: string;
  equipamentoId: string;
  quando: Date;
  status: VisitStatus;
  contrato: string;
  tecnico: string;
};

function tomDaVisita(status: VisitStatus, atrasada: boolean) {
  if (status === "concluida") return "ok" as const;
  if (status === "cancelada") return "neutro" as const;
  if (atrasada) return "alerta" as const;
  return status === "agendada" ? ("andamento" as const) : ("aguardando" as const);
}

export default async function ManutencoesPage() {
  const cliente = await exigirCliente("/minha-jb/manutencoes");
  const agora = new Date();

  const [contratos, previstas, concluidas] = await Promise.all([
    prisma.maintenanceContract.findMany({
      where: { customerId: cliente.id, status: { not: "rascunho" } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        plan: {
          select: {
            name: true,
            benefits: true,
            visitsIncluded: true,
            periodMonths: true,
            partsDiscountPercent: true,
          },
        },
        items: {
          select: { equipment: { select: { id: true, name: true } } },
        },
        _count: { select: { visits: true } },
      },
    }),
    proximasVisitas(cliente.id, 20),
    prisma.maintenanceVisit.findMany({
      where: { status: "concluida", equipment: { customerId: cliente.id } },
      orderBy: { doneAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        dueAt: true,
        doneAt: true,
        notes: true,
        equipment: { select: { id: true, name: true } },
        contract: { select: { number: true } },
        technician: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  const linhasPrevistas: LinhaVisita[] = previstas.map((visita) => ({
    id: visita.id,
    equipamento: visita.equipment.name,
    equipamentoId: visita.equipment.id,
    quando: visita.scheduledAt ?? visita.dueAt,
    status: visita.status,
    contrato: visita.contract?.number ?? "Avulsa",
    tecnico: visita.technician?.user.name ?? "A definir",
  }));

  const linhasConcluidas: LinhaVisita[] = concluidas.map((visita) => ({
    id: visita.id,
    equipamento: visita.equipment.name,
    equipamentoId: visita.equipment.id,
    quando: visita.doneAt ?? visita.dueAt,
    status: visita.status,
    contrato: visita.contract?.number ?? "Avulsa",
    tecnico: visita.technician?.user.name ?? "—",
  }));

  const colunasPrevistas: Coluna<LinhaVisita>[] = [
    { chave: "equipamento", rotulo: "Equipamento" },
    {
      chave: "quando",
      rotulo: "Data prevista",
      largura: "13rem",
      renderizar: (linha) => (
        <span className={linha.quando < agora ? "font-semibold text-jb-700" : undefined}>
          {formatarData(linha.quando)}
          <span className="ml-1.5 text-xs text-graf-500">
            ({distanciaEmDias(linha.quando)})
          </span>
        </span>
      ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "10rem",
      renderizar: (linha) => (
        <Etiqueta tom={tomDaVisita(linha.status, linha.quando < agora)}>
          {ROTULO_VISITA[linha.status]}
        </Etiqueta>
      ),
    },
    { chave: "tecnico", rotulo: "Técnico", largura: "12rem", esconderNoMobile: true },
    { chave: "contrato", rotulo: "Contrato", largura: "9rem", esconderNoMobile: true },
  ];

  const colunasConcluidas: Coluna<LinhaVisita>[] = [
    { chave: "equipamento", rotulo: "Equipamento" },
    {
      chave: "quando",
      rotulo: "Realizada em",
      largura: "11rem",
      renderizar: (linha) => formatarData(linha.quando),
    },
    { chave: "tecnico", rotulo: "Técnico", largura: "12rem", esconderNoMobile: true },
    { chave: "contrato", rotulo: "Contrato", largura: "9rem", esconderNoMobile: true },
  ];

  const semNada =
    contratos.length === 0 && previstas.length === 0 && concluidas.length === 0;

  return (
    <div>
      <Topo
        titulo="Manutenções"
        descricao="Contratos ativos, visitas previstas e o histórico do que já foi feito na sua clínica."
      />

      {semNada ? (
        <Vazio
          icone={Wrench}
          titulo="Nenhuma manutenção programada"
          descricao="A preventiva evita a parada no meio do atendimento. Conheça os planos de manutenção da JB ou peça uma visita avulsa pela assistência."
          acao={
            <div className="flex flex-wrap justify-center gap-3">
              <LinkBotao href="/planos-de-manutencao">Ver planos</LinkBotao>
              <LinkBotao href="/minha-jb/assistencia/novo" variante="secundario">
                Pedir visita
              </LinkBotao>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* -------------------------------------------------- contratos */}
          <section aria-labelledby="contratos">
            <h2 id="contratos" className="mb-3 text-base font-bold text-graf-950">
              Contratos
            </h2>

            {contratos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-graf-300 bg-graf-50/60 px-5 py-6 text-sm leading-relaxed text-graf-600">
                Você não tem contrato de manutenção ativo. As visitas abaixo são avulsas.{" "}
                <Link
                  href="/planos-de-manutencao"
                  className="font-semibold text-jb-700 underline underline-offset-4"
                >
                  Conheça os planos
                </Link>
                .
              </p>
            ) : (
              <ul className="grid gap-4 lg:grid-cols-2">
                {contratos.map((contrato) => (
                  <li key={contrato.id}>
                    <Cartao className="h-full">
                      <CabecalhoCartao
                        titulo={contrato.plan?.name ?? `Contrato ${contrato.number}`}
                        descricao={`Contrato ${contrato.number}`}
                        acao={
                          <Etiqueta
                            tom={
                              contrato.status === "ativo"
                                ? "ok"
                                : contrato.status === "suspenso"
                                  ? "aguardando"
                                  : "neutro"
                            }
                          >
                            {ROTULO_CONTRATO[contrato.status]}
                          </Etiqueta>
                        }
                      />
                      <div className="space-y-3 p-5 text-sm">
                        <dl className="space-y-2">
                          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <dt className="text-graf-500">Vigência</dt>
                            <dd className="text-graf-900">
                              {contrato.startsAt ? formatarData(contrato.startsAt) : "—"}
                              {contrato.endsAt ? ` a ${formatarData(contrato.endsAt)}` : ""}
                            </dd>
                          </div>
                          {contrato.priceCents > 0 ? (
                            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                              <dt className="text-graf-500">Valor</dt>
                              <dd className="tabular text-graf-900">
                                {formatarPreco(contrato.priceCents)}
                              </dd>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <dt className="text-graf-500">Equipamentos cobertos</dt>
                            <dd className="text-graf-900">
                              {plural(contrato.items.length, "equipamento", "equipamentos")}
                            </dd>
                          </div>
                          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                            <dt className="text-graf-500">Visitas registradas</dt>
                            <dd className="text-graf-900">{contrato._count.visits}</dd>
                          </div>
                        </dl>

                        {contrato.items.length > 0 ? (
                          <ul className="flex flex-wrap gap-1.5 border-t border-graf-100 pt-3">
                            {contrato.items.map((item) => (
                              <li key={item.equipment.id}>
                                <Link
                                  href={`/minha-jb/equipamentos/${item.equipment.id}`}
                                  className="inline-flex min-h-9 items-center rounded-lg bg-graf-100 px-3 text-xs font-semibold text-graf-700 transition-colors hover:bg-graf-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                                >
                                  {item.equipment.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {contrato.plan?.benefits.length ? (
                          <ul className="space-y-1.5 border-t border-graf-100 pt-3">
                            {contrato.plan.benefits.map((beneficio) => (
                              <li
                                key={beneficio}
                                className="flex items-start gap-2 text-graf-600"
                              >
                                <ShieldCheck
                                  className="mt-0.5 size-4 shrink-0 text-ok-700"
                                  aria-hidden
                                />
                                <span>{beneficio}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {contrato.notes ? (
                          <p className="border-t border-graf-100 pt-3 leading-relaxed text-graf-600">
                            {contrato.notes}
                          </p>
                        ) : null}
                      </div>
                    </Cartao>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------------------------------------------------- previstas */}
          <section aria-labelledby="previstas">
            <h2
              id="previstas"
              className="mb-3 flex items-center gap-2 text-base font-bold text-graf-950"
            >
              <CalendarClock className="size-4 text-graf-500" aria-hidden />
              Próximas visitas
            </h2>
            <Tabela
              colunas={colunasPrevistas}
              linhas={linhasPrevistas}
              chaveDaLinha={(linha) => linha.id}
              hrefDaLinha={(linha) => `/minha-jb/equipamentos/${linha.equipamentoId}`}
              legenda="Visitas de manutenção previstas e agendadas"
              vazio={{
                icone: CalendarClock,
                titulo: "Nenhuma visita prevista",
                descricao:
                  "Quando houver preventiva programada, ela aparece aqui com a data e o técnico responsável.",
                acao: (
                  <LinkBotao href="/minha-jb/assistencia/novo" variante="secundario">
                    Pedir visita técnica
                  </LinkBotao>
                ),
              }}
            />
          </section>

          {/* --------------------------------------------------- concluídas */}
          {linhasConcluidas.length > 0 ? (
            <section aria-labelledby="concluidas">
              <h2
                id="concluidas"
                className="mb-3 flex items-center gap-2 text-base font-bold text-graf-950"
              >
                <CalendarCheck className="size-4 text-graf-500" aria-hidden />
                Visitas concluídas
              </h2>
              <Tabela
                colunas={colunasConcluidas}
                linhas={linhasConcluidas}
                chaveDaLinha={(linha) => linha.id}
                hrefDaLinha={(linha) => `/minha-jb/equipamentos/${linha.equipamentoId}`}
                legenda="Últimas visitas de manutenção concluídas"
                densa
              />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
