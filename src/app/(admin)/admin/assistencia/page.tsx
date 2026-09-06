import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, ServiceRequestStatus, Urgency } from "@prisma/client";
import { CalendarDays, Plus, Stethoscope } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { CabecalhoPagina, Contador } from "@/components/admin/servico/cabecalho";
import {
  EtiquetaChamado,
  EtiquetaUrgencia,
} from "@/components/admin/servico/etiquetas";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { ROTULO_CHAMADO, STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { distanciaEmDias, formatarData } from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
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

export const metadata: Metadata = {
  title: "Chamados",
};

/**
 * Fila de chamados de assistência técnica.
 *
 * A ordenação padrão é a que a operação precisa e não a que o banco entrega de
 * graça: urgência primeiro (o enum do Postgres já vai de `baixa` a `parado`,
 * então `desc` coloca equipamento parado no topo) e, dentro da mesma urgência,
 * o mais antigo antes — quem espera há mais tempo não pode ser ultrapassado.
 *
 * O padrão da tela mostra só o que está em aberto. Ver chamado concluído é
 * consulta; ver chamado em aberto é trabalho.
 */

const POR_PAGINA = 25;

type Busca = {
  q?: string;
  status?: string;
  urgencia?: string;
  tecnico?: string;
  cliente?: string;
  periodo_de?: string;
  periodo_ate?: string;
  pagina?: string;
  ordem?: string;
  dir?: string;
};

/**
 * As duas direções são escritas por extenso em vez de invertidas em tempo de
 * execução: virar `asc` em `desc` dentro de um objeto do Prisma exige um
 * `as`, e o ganho de três linhas não paga a perda de checagem de tipo.
 */
type OrdemChamado = Prisma.ServiceRequestOrderByWithRelationInput[];

const ORDENS: Record<string, { asc: OrdemChamado; desc: OrdemChamado }> = {
  urgencia: {
    asc: [{ urgency: "desc" }, { createdAt: "asc" }],
    desc: [{ urgency: "asc" }, { createdAt: "desc" }],
  },
  numero: { asc: [{ number: "asc" }], desc: [{ number: "desc" }] },
  criado: { asc: [{ createdAt: "asc" }], desc: [{ createdAt: "desc" }] },
  status: {
    asc: [{ status: "asc" }, { createdAt: "asc" }],
    desc: [{ status: "desc" }, { createdAt: "desc" }],
  },
};

function montarHref(atual: Busca, mudancas: Record<string, string | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atual, ...mudancas })) {
    if (valor) busca.set(chave, valor);
  }
  // trocar filtro ou ordenação sempre volta para a primeira página
  busca.delete("pagina");
  const texto = busca.toString();
  return texto ? `/admin/assistencia?${texto}` : "/admin/assistencia";
}

type LinhaChamado = {
  id: string;
  number: string;
  status: ServiceRequestStatus;
  urgency: Urgency;
  createdAt: Date;
  contactName: string;
  customer: { id: string; name: string } | null;
  equipment: { id: string; name: string; serialNumber: string } | null;
  brandName: string;
  modelName: string;
  serialNumber: string;
  appointments: {
    startsAt: Date;
    technician: { user: { name: string } } | null;
  }[];
  workOrders: { technician: { user: { name: string } } | null }[];
};

export default async function PaginaChamados({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  await exigirArea("assistencia");
  const busca = await searchParams;

  const pagina = Math.max(1, Number(busca.pagina) || 1);
  const chaveOrdem = busca.ordem && busca.ordem in ORDENS ? busca.ordem : "urgencia";
  const descendente = busca.dir === "desc";
  const orderBy = descendente ? ORDENS[chaveOrdem].desc : ORDENS[chaveOrdem].asc;

  /* ------------------------------------------------------------- filtros */

  const condicoes: Prisma.ServiceRequestWhereInput[] = [];

  const texto = busca.q?.trim();
  if (texto) {
    condicoes.push({
      OR: [
        { number: { contains: texto, mode: "insensitive" } },
        { contactName: { contains: texto, mode: "insensitive" } },
        { contactEmail: { contains: texto, mode: "insensitive" } },
        { serialNumber: { contains: texto, mode: "insensitive" } },
        { modelName: { contains: texto, mode: "insensitive" } },
        { customer: { name: { contains: texto, mode: "insensitive" } } },
        { equipment: { name: { contains: texto, mode: "insensitive" } } },
      ],
    });
  }

  if (busca.urgencia) condicoes.push({ urgency: busca.urgencia as Urgency });
  if (busca.cliente) condicoes.push({ customerId: busca.cliente });

  if (busca.tecnico) {
    // o chamado não guarda técnico: quem guarda é a visita e a OS
    condicoes.push({
      OR: [
        { appointments: { some: { technicianId: busca.tecnico } } },
        { workOrders: { some: { technicianId: busca.tecnico } } },
      ],
    });
  }

  if (busca.periodo_de || busca.periodo_ate) {
    condicoes.push({
      createdAt: {
        ...(busca.periodo_de ? { gte: new Date(`${busca.periodo_de}T00:00:00-03:00`) } : {}),
        ...(busca.periodo_ate ? { lte: new Date(`${busca.periodo_ate}T23:59:59-03:00`) } : {}),
      },
    });
  }

  const semStatus: Prisma.ServiceRequestWhereInput =
    condicoes.length > 0 ? { AND: condicoes } : {};

  const filtroDeStatus: Prisma.ServiceRequestWhereInput =
    !busca.status
      ? { status: { in: STATUS_CHAMADO_ABERTOS } }
      : busca.status === "todos"
        ? {}
        : { status: busca.status as ServiceRequestStatus };

  const where: Prisma.ServiceRequestWhereInput = {
    AND: [semStatus, filtroDeStatus],
  };

  /* ------------------------------------------------------------ consultas */

  const [total, chamados, porStatus, tecnicos, clientes, totalGeral] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      orderBy,
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        status: true,
        urgency: true,
        createdAt: true,
        contactName: true,
        brandName: true,
        modelName: true,
        serialNumber: true,
        customer: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true, serialNumber: true } },
        appointments: {
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true, technician: { select: { user: { select: { name: true } } } } },
        },
        workOrders: {
          orderBy: { openedAt: "desc" },
          take: 1,
          select: { technician: { select: { user: { select: { name: true } } } } },
        },
      },
    }),
    // contagem por status respeitando os demais filtros — o número da barra
    // precisa bater com o que a lista mostra depois do clique
    prisma.serviceRequest.groupBy({
      by: ["status"],
      where: semStatus,
      _count: { _all: true },
    }),
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.customer.findMany({
      where: { serviceRequests: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.serviceRequest.count({ where: semStatus }),
  ]);

  const contagem = new Map(porStatus.map((linha) => [linha.status, linha._count._all]));
  const abertos = STATUS_CHAMADO_ABERTOS.reduce(
    (soma, status) => soma + (contagem.get(status) ?? 0),
    0,
  );

  const destaques: { chave: string; rotulo: string; valor: number }[] = [
    { chave: "", rotulo: "Em aberto", valor: abertos },
    {
      chave: "solicitacao_recebida",
      rotulo: ROTULO_CHAMADO.solicitacao_recebida,
      valor: contagem.get("solicitacao_recebida") ?? 0,
    },
    { chave: "triagem", rotulo: ROTULO_CHAMADO.triagem, valor: contagem.get("triagem") ?? 0 },
    {
      chave: "visita_agendada",
      rotulo: ROTULO_CHAMADO.visita_agendada,
      valor: contagem.get("visita_agendada") ?? 0,
    },
    {
      chave: "aguardando_peca",
      rotulo: ROTULO_CHAMADO.aguardando_peca,
      valor: contagem.get("aguardando_peca") ?? 0,
    },
    {
      chave: "aguardando_cliente",
      rotulo: ROTULO_CHAMADO.aguardando_cliente,
      valor: contagem.get("aguardando_cliente") ?? 0,
    },
    { chave: "todos", rotulo: "Todos", valor: totalGeral },
  ];

  const colunas: Coluna<LinhaChamado>[] = [
    {
      chave: "number",
      rotulo: "Chamado",
      largura: "13rem",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="block">
          <span className="label-mono block text-graf-500">{linha.number}</span>
          <span className="block truncate font-semibold text-graf-900">
            {linha.customer?.name ?? linha.contactName}
          </span>
        </span>
      ),
    },
    {
      chave: "equipamento",
      rotulo: "Equipamento",
      renderizar: (linha) => {
        const nome =
          linha.equipment?.name ||
          [linha.brandName, linha.modelName].filter(Boolean).join(" ") ||
          "Não identificado";
        const serie = linha.equipment?.serialNumber || linha.serialNumber;
        return (
          <span className="block min-w-0">
            <span className="block truncate">{nome}</span>
            {serie ? (
              <span className="label-mono block text-graf-500">série {serie}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      chave: "urgency",
      rotulo: "Urgência",
      largura: "11rem",
      ordenavel: true,
      renderizar: (linha) => <EtiquetaUrgencia urgencia={linha.urgency} />,
    },
    {
      chave: "status",
      rotulo: "Status",
      largura: "13rem",
      ordenavel: true,
      renderizar: (linha) => <EtiquetaChamado status={linha.status} />,
    },
    {
      chave: "tecnico",
      rotulo: "Técnico",
      largura: "11rem",
      esconderNoMobile: true,
      renderizar: (linha) => {
        const nome =
          linha.appointments[0]?.technician?.user.name ??
          linha.workOrders[0]?.technician?.user.name;
        return nome ? (
          <span className="truncate">{nome}</span>
        ) : (
          <span className="text-graf-500">Sem técnico</span>
        );
      },
    },
    {
      chave: "createdAt",
      rotulo: "Aberto",
      largura: "9rem",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="block">
          <span className="block text-graf-800">{distanciaEmDias(linha.createdAt)}</span>
          <span className="block text-[0.8125rem] text-graf-500">{formatarData(linha.createdAt)}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Chamados de assistência"
        descricao="Equipamento parado primeiro, e dentro de cada urgência o que espera há mais tempo."
        acoes={
          <>
            <LinkBotao href="/admin/agenda" variante="secundario" tamanho="sm">
              <CalendarDays className="size-4" aria-hidden />
              Ver agenda
            </LinkBotao>
            {/* A abertura de chamado pelo painel existe desde sempre, mas só era
                alcançável pela ficha de unidades do cliente. Quem atende o telefone
                começa por esta lista. */}
            <LinkBotao href="/admin/assistencia/novo" tamanho="md">
              <Plus className="size-4" aria-hidden />
              Abrir chamado
            </LinkBotao>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {destaques.map((item) => (
          <Contador
            key={item.chave || "abertos"}
            rotulo={item.rotulo}
            valor={item.valor}
            href={montarHref(busca, { status: item.chave || undefined })}
            ativo={(busca.status ?? "") === item.chave}
          />
        ))}
      </div>

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número, cliente, e-mail, modelo ou série",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Status",
            todos: "Em aberto",
            opcoes: [
              { valor: "todos", rotulo: "Todos os status" },
              ...(Object.keys(ROTULO_CHAMADO) as ServiceRequestStatus[]).map((status) => ({
                valor: status,
                rotulo: ROTULO_CHAMADO[status],
              })),
            ],
          },
          {
            tipo: "selecao",
            nome: "urgencia",
            rotulo: "Urgência",
            opcoes: [
              { valor: "parado", rotulo: "Equipamento parado" },
              { valor: "alta", rotulo: "Alta" },
              { valor: "normal", rotulo: "Normal" },
              { valor: "baixa", rotulo: "Baixa" },
            ],
          },
          {
            tipo: "selecao",
            nome: "tecnico",
            rotulo: "Técnico",
            opcoes: tecnicos.map((tecnico) => ({
              valor: tecnico.id,
              rotulo: tecnico.user.name,
            })),
          },
          {
            tipo: "selecao",
            nome: "cliente",
            rotulo: "Cliente",
            opcoes: clientes.map((cliente) => ({ valor: cliente.id, rotulo: cliente.name })),
          },
          { tipo: "periodo", nome: "periodo", rotulo: "Aberto entre" },
        ]}
      />

      <Tabela<LinhaChamado>
        colunas={colunas}
        linhas={chamados}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/assistencia/${linha.id}`}
        legenda="Chamados de assistência técnica"
        ordenacao={{ chave: mapaDeOrdenacao(chaveOrdem), direcao: descendente ? "desc" : "asc" }}
        hrefOrdenar={(chave, direcao) =>
          montarHref(busca, { ordem: chaveDeColuna(chave), dir: direcao })
        }
        vazio={{
          icone: Stethoscope,
          titulo: "Nenhum chamado com esses filtros",
          descricao:
            "Ajuste a busca ou volte para a fila em aberto. Chamados novos chegam pelo formulário do site e pela Área da Clínica.",
          acao: (
            <LinkBotao href="/admin/assistencia" variante="secundario">
              Ver a fila em aberto
            </LinkBotao>
          ),
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="chamado"
          rotuloPlural="chamados"
        />
      </Suspense>
    </div>
  );
}

/** A tabela ordena por `chave` de coluna; o banco, por chave de ordenação. */
function mapaDeOrdenacao(chave: string) {
  if (chave === "urgencia") return "urgency";
  if (chave === "numero") return "number";
  if (chave === "criado") return "createdAt";
  return chave;
}

function chaveDeColuna(chave: string) {
  if (chave === "urgency") return "urgencia";
  if (chave === "number") return "numero";
  if (chave === "createdAt") return "criado";
  return chave;
}
