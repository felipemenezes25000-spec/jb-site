import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, VisitStatus } from "@prisma/client";
import { BellRing, CalendarClock } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import {
  CabecalhoPagina,
  Contador,
  subnavServico,
  SubNavegacao,
} from "@/components/admin/servico/cabecalho";
import { AcoesDaVisita } from "@/components/admin/servico/acoes-visita";
import { EtiquetaVisita } from "@/components/admin/servico/etiquetas";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { LinkBotao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao, Esqueleto } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { enviarLembreteDeVisita } from "@/app/acoes/admin-servico";
import { distanciaEmDias, formatarData, formatarDataHora, plural } from "@/lib/format";
import { ROTULO_VISITA, STATUS_VISITA_ABERTOS, lembretesPendentes } from "@/lib/manutencao";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Manutenção",
};

/**
 * Agenda da manutenção preventiva.
 *
 * A tela abre no que está em aberto e ordenada pela data prevista: a visita
 * mais atrasada é a primeira da lista, porque preventiva atrasada é a forma
 * mais cara de virar corretiva.
 *
 * O bloco de lembretes usa `lembretesPendentes` do domínio, que já exclui quem
 * recebeu aviso naquela antecedência — clicar duas vezes não manda duas vezes.
 */

const POR_PAGINA = 25;

type Busca = {
  q?: string;
  status?: string;
  tecnico?: string;
  periodo_de?: string;
  periodo_ate?: string;
  pagina?: string;
};

function montarHref(atual: Busca, mudancas: Record<string, string | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atual, ...mudancas })) {
    if (valor) busca.set(chave, valor);
  }
  busca.delete("pagina");
  const texto = busca.toString();
  return texto ? `/admin/manutencao?${texto}` : "/admin/manutencao";
}

type LinhaVisita = {
  id: string;
  status: VisitStatus;
  dueAt: Date;
  scheduledAt: Date | null;
  technicianId: string | null;
  equipment: { id: string; name: string; customer: { name: string } };
  contract: { id: string; number: string } | null;
  technician: { user: { name: string } } | null;
};

export default async function PaginaManutencao({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("manutencao");
  const busca = await searchParams;
  const editar = podeEditar(usuario, "manutencao");

  const pagina = Math.max(1, Number(busca.pagina) || 1);
  const agora = new Date();

  const condicoes: Prisma.MaintenanceVisitWhereInput[] = [];

  const texto = busca.q?.trim();
  if (texto) {
    condicoes.push({
      OR: [
        { equipment: { name: { contains: texto, mode: "insensitive" } } },
        { equipment: { serialNumber: { contains: texto, mode: "insensitive" } } },
        { equipment: { customer: { name: { contains: texto, mode: "insensitive" } } } },
        { contract: { number: { contains: texto, mode: "insensitive" } } },
      ],
    });
  }

  if (busca.tecnico) condicoes.push({ technicianId: busca.tecnico });

  if (busca.periodo_de || busca.periodo_ate) {
    condicoes.push({
      dueAt: {
        ...(busca.periodo_de ? { gte: new Date(`${busca.periodo_de}T00:00:00-03:00`) } : {}),
        ...(busca.periodo_ate ? { lte: new Date(`${busca.periodo_ate}T23:59:59-03:00`) } : {}),
      },
    });
  }

  const semStatus: Prisma.MaintenanceVisitWhereInput =
    condicoes.length > 0 ? { AND: condicoes } : {};

  const filtroDeStatus: Prisma.MaintenanceVisitWhereInput =
    !busca.status
      ? { status: { in: STATUS_VISITA_ABERTOS } }
      : busca.status === "todos"
        ? {}
        : busca.status === "atrasadas"
          ? { status: { in: STATUS_VISITA_ABERTOS }, dueAt: { lt: agora } }
          : { status: busca.status as VisitStatus };

  const where: Prisma.MaintenanceVisitWhereInput = { AND: [semStatus, filtroDeStatus] };

  const [total, visitas, porStatus, atrasadas, tecnicos, lembretes, totalGeral] =
    await Promise.all([
      prisma.maintenanceVisit.count({ where }),
      prisma.maintenanceVisit.findMany({
        where,
        orderBy: [{ dueAt: "asc" }],
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        select: {
          id: true,
          status: true,
          dueAt: true,
          scheduledAt: true,
          technicianId: true,
          equipment: {
            select: { id: true, name: true, customer: { select: { name: true } } },
          },
          contract: { select: { id: true, number: true } },
          technician: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.maintenanceVisit.groupBy({
        by: ["status"],
        where: semStatus,
        _count: { _all: true },
      }),
      prisma.maintenanceVisit.count({
        where: { AND: [semStatus, { status: { in: STATUS_VISITA_ABERTOS }, dueAt: { lt: agora } }] },
      }),
      prisma.technician.findMany({
        where: { active: true },
        orderBy: { user: { name: "asc" } },
        select: { id: true, user: { select: { name: true } } },
      }),
      lembretesPendentes(),
      prisma.maintenanceVisit.count({ where: semStatus }),
    ]);

  const contagem = new Map(porStatus.map((linha) => [linha.status, linha._count._all]));
  const emAberto = STATUS_VISITA_ABERTOS.reduce(
    (soma, status) => soma + (contagem.get(status) ?? 0),
    0,
  );

  const destaques = [
    { chave: "", rotulo: "Em aberto", valor: emAberto },
    { chave: "atrasadas", rotulo: "Vencidas", valor: atrasadas },
    { chave: "prevista", rotulo: ROTULO_VISITA.prevista, valor: contagem.get("prevista") ?? 0 },
    { chave: "agendada", rotulo: ROTULO_VISITA.agendada, valor: contagem.get("agendada") ?? 0 },
    { chave: "concluida", rotulo: ROTULO_VISITA.concluida, valor: contagem.get("concluida") ?? 0 },
    { chave: "todos", rotulo: "Todas", valor: totalGeral },
  ];

  const listaDeTecnicos = tecnicos.map((tecnico) => ({
    id: tecnico.id,
    nome: tecnico.user.name,
  }));

  const colunas: Coluna<LinhaVisita>[] = [
    {
      chave: "equipamento",
      rotulo: "Equipamento",
      renderizar: (linha) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-graf-900">
            {linha.equipment.name}
          </span>
          <span className="block truncate text-[0.8125rem] text-graf-500">
            {linha.equipment.customer.name}
          </span>
        </span>
      ),
    },
    {
      chave: "contrato",
      rotulo: "Contrato",
      largura: "10rem",
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha.contract ? (
          <span className="label-mono text-graf-600">{linha.contract.number}</span>
        ) : (
          <span className="text-graf-500">Avulsa</span>
        ),
    },
    {
      chave: "dueAt",
      rotulo: "Prevista",
      largura: "10rem",
      renderizar: (linha) => (
        <span className="block">
          <span className="block">{formatarData(linha.dueAt)}</span>
          <span
            className={
              linha.dueAt < agora && linha.status !== "concluida"
                ? "block text-[0.8125rem] font-semibold text-jb-700"
                : "block text-[0.8125rem] text-graf-500"
            }
          >
            {distanciaEmDias(linha.dueAt)}
          </span>
        </span>
      ),
    },
    {
      chave: "scheduledAt",
      rotulo: "Agendada",
      largura: "11rem",
      renderizar: (linha) =>
        linha.scheduledAt ? (
          formatarDataHora(linha.scheduledAt)
        ) : (
          <span className="text-graf-500">Sem data marcada</span>
        ),
    },
    {
      chave: "tecnico",
      rotulo: "Técnico",
      largura: "10rem",
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha.technician ? (
          linha.technician.user.name
        ) : (
          <span className="text-graf-500">Sem técnico</span>
        ),
    },
    {
      chave: "status",
      rotulo: "Status",
      largura: "9rem",
      renderizar: (linha) => <EtiquetaVisita status={linha.status} />,
    },
    ...(editar
      ? [
          {
            chave: "acoes",
            rotulo: "Ações",
            largura: "16rem",
            renderizar: (linha: LinhaVisita) => (
              <AcoesDaVisita
                visitaId={linha.id}
                equipamento={linha.equipment.name}
                status={linha.status}
                tecnicoAtual={linha.technicianId}
                tecnicos={listaDeTecnicos}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Manutenção preventiva"
        descricao="Visitas previstas pelos contratos, agendamento e conclusão."
      />

      <SubNavegacao itens={subnavServico(usuario)} atual="/admin/manutencao" />

      <div className="flex flex-wrap gap-2">
        {destaques.map((item) => (
          <Contador
            key={item.chave || "abertas"}
            rotulo={item.rotulo}
            valor={item.valor}
            href={montarHref(busca, { status: item.chave || undefined })}
            ativo={(busca.status ?? "") === item.chave}
          />
        ))}
      </div>

      {/* ------------------------------------------------------ lembretes */}
      {lembretes.length > 0 ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Lembretes a enviar"
            descricao={`${plural(lembretes.length, "visita chegando", "visitas chegando")} sem aviso registrado`}
          />
          <ul className="divide-y divide-graf-100">
            {lembretes.slice(0, 8).map(({ visita, diasAntes }) => (
              <li
                key={`${visita.id}-${diasAntes}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
              >
                {/* Largura mínima para o botão de avisar descer no celular em
                    vez de espremer o nome do equipamento até virar "Au…". */}
                <span className="min-w-[13rem] flex-1">
                  <Link
                    href={`/admin/manutencao/${visita.id}`}
                    className="block truncate text-sm font-semibold text-graf-900 hover:text-jb-700"
                  >
                    {visita.equipment.name}
                  </Link>
                  <span className="block truncate text-[0.8125rem] text-graf-500">
                    {visita.equipment.customer.name} · prevista para{" "}
                    {formatarData(visita.dueAt)} ({distanciaEmDias(visita.dueAt)})
                  </span>
                </span>

                {editar ? (
                  <FormularioAcao
                    acao={enviarLembreteDeVisita}
                    rotulo={`Avisar (${diasAntes}d)`}
                    variante="secundario"
                    tamanho="sm"
                    icone={<BellRing className="size-4" aria-hidden />}
                    className="space-y-0"
                  >
                    <Oculto nome="visitaId" valor={visita.id} />
                    <Oculto nome="diasAntes" valor={String(diasAntes)} />
                  </FormularioAcao>
                ) : null}
              </li>
            ))}
          </ul>
          {lembretes.length > 8 ? (
            <p className="border-t border-graf-200 bg-graf-50 px-5 py-2.5 text-[0.8125rem] text-graf-500">
              e mais {lembretes.length - 8} aviso(s) na fila.
            </p>
          ) : null}
        </Cartao>
      ) : null}

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Equipamento, série, cliente ou contrato",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Status",
            todos: "Em aberto",
            opcoes: [
              { valor: "todos", rotulo: "Todas as visitas" },
              { valor: "atrasadas", rotulo: "Vencidas" },
              ...(Object.keys(ROTULO_VISITA) as VisitStatus[]).map((status) => ({
                valor: status,
                rotulo: ROTULO_VISITA[status],
              })),
            ],
          },
          {
            tipo: "selecao",
            nome: "tecnico",
            rotulo: "Técnico",
            opcoes: tecnicos.map((tecnico) => ({ valor: tecnico.id, rotulo: tecnico.user.name })),
          },
          { tipo: "periodo", nome: "periodo", rotulo: "Prevista entre" },
        ]}
      />

      <Tabela<LinhaVisita>
        colunas={colunas}
        linhas={visitas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/manutencao/${linha.id}`}
        legenda="Visitas de manutenção preventiva"
        vazio={{
          icone: CalendarClock,
          titulo: "Nenhuma visita com esses filtros",
          descricao:
            "As visitas nascem quando um contrato de manutenção é criado. Comece pelo contrato para o ano inteiro entrar na agenda de uma vez.",
          acao: (
            <LinkBotao href="/admin/manutencao/contratos" variante="secundario">
              Ver contratos
            </LinkBotao>
          ),
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="visita"
          rotuloPlural="visitas"
        />
      </Suspense>
    </div>
  );
}
