import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, ServiceRequestStatus, Urgency } from "@prisma/client";
import { AlertTriangle, Clock3, LifeBuoy, Plus, Wrench } from "lucide-react";

import {
  Filtros,
  paginaDaUrl,
  primeiroValor,
  type GrupoFiltro,
} from "@/components/conta/mj-filtros";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Esqueleto, Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import {
  ROTULO_CHAMADO,
  ROTULO_URGENCIA,
  STATUS_CHAMADO_ABERTOS,
} from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Assistência técnica",
  description: "Chamados de assistência da sua clínica.",
  robots: { index: false, follow: false },
};

const POR_PAGINA = 10;

const SITUACOES = {
  aberto: { rotulo: "Em aberto", status: STATUS_CHAMADO_ABERTOS },
  concluido: { rotulo: "Concluídos", status: ["concluido"] as ServiceRequestStatus[] },
  cancelado: { rotulo: "Cancelados", status: ["cancelado"] as ServiceRequestStatus[] },
} satisfies Record<string, { rotulo: string; status: ServiceRequestStatus[] }>;

type ChaveSituacao = keyof typeof SITUACOES;

function ehSituacao(valor: string): valor is ChaveSituacao {
  return valor in SITUACOES;
}

const URGENCIAS: Urgency[] = ["parado", "alta", "normal", "baixa"];

function ehUrgencia(valor: string): valor is Urgency {
  return (URGENCIAS as string[]).includes(valor);
}

function tomDoChamado(status: ServiceRequestStatus) {
  if (status === "concluido") return "ok" as const;
  if (status === "cancelado") return "neutro" as const;
  if (status === "aguardando_cliente" || status === "aguardando_aprovacao") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

type LinhaChamado = {
  id: string;
  number: string;
  equipamento: string;
  status: ServiceRequestStatus;
  urgency: Urgency;
  createdAt: Date;
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function AssistenciaPage({ searchParams }: { searchParams: Busca }) {
  const [cliente, params] = await Promise.all([
    exigirCliente("/minha-jb/assistencia"),
    searchParams,
  ]);

  const situacao = primeiroValor(params.situacao);
  const urgencia = primeiroValor(params.urgencia);
  const numero = primeiroValor(params.numero).slice(0, 40);
  const pagina = paginaDaUrl(params.pagina);

  const filtro: Prisma.ServiceRequestWhereInput = {
    customerId: cliente.id,
    ...(ehSituacao(situacao) ? { status: { in: SITUACOES[situacao].status } } : {}),
    ...(ehUrgencia(urgencia) ? { urgency: urgencia } : {}),
    ...(numero ? { number: { contains: numero, mode: "insensitive" } } : {}),
  };

  const [total, chamados, porStatus, porUrgencia, paradosAbertos] = await Promise.all([
    prisma.serviceRequest.count({ where: filtro }),
    prisma.serviceRequest.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        status: true,
        urgency: true,
        createdAt: true,
        brandName: true,
        modelName: true,
        equipment: { select: { name: true } },
      },
    }),
    prisma.serviceRequest.groupBy({
      by: ["status"],
      where: { customerId: cliente.id },
      _count: { _all: true },
    }),
    prisma.serviceRequest.groupBy({
      by: ["urgency"],
      where: { customerId: cliente.id },
      _count: { _all: true },
    }),
    prisma.serviceRequest.count({
      where: {
        customerId: cliente.id,
        status: { in: STATUS_CHAMADO_ABERTOS },
        urgency: "parado",
      },
    }),
  ]);

  const contagemStatus = new Map(porStatus.map((linha) => [linha.status, linha._count._all]));
  const contagemUrgencia = new Map(
    porUrgencia.map((linha) => [linha.urgency, linha._count._all]),
  );
  const totalGeral = porStatus.reduce((soma, linha) => soma + linha._count._all, 0);
  const emAndamento = STATUS_CHAMADO_ABERTOS.reduce(
    (soma, status) => soma + (contagemStatus.get(status) ?? 0),
    0,
  );
  const aguardandoVoce =
    (contagemStatus.get("aguardando_cliente") ?? 0) +
    (contagemStatus.get("aguardando_aprovacao") ?? 0);

  const grupos: GrupoFiltro[] = [
    {
      nome: "situacao",
      rotulo: "Situação do chamado",
      opcoes: [
        { valor: "", rotulo: "Todos", quantidade: totalGeral },
        ...(Object.keys(SITUACOES) as ChaveSituacao[]).map((chave) => ({
          valor: chave,
          rotulo: SITUACOES[chave].rotulo,
          quantidade: SITUACOES[chave].status.reduce(
            (soma, status) => soma + (contagemStatus.get(status) ?? 0),
            0,
          ),
        })),
      ],
    },
    {
      nome: "urgencia",
      rotulo: "Urgência",
      opcoes: [
        { valor: "", rotulo: "Qualquer urgência" },
        ...URGENCIAS.filter((chave) => (contagemUrgencia.get(chave) ?? 0) > 0).map(
          (chave) => ({
            valor: chave,
            rotulo: ROTULO_URGENCIA[chave],
            quantidade: contagemUrgencia.get(chave) ?? 0,
          }),
        ),
      ],
    },
  ];

  const linhas: LinhaChamado[] = chamados.map((chamado) => ({
    id: chamado.id,
    number: chamado.number,
    equipamento:
      chamado.equipment?.name ||
      [chamado.brandName, chamado.modelName].filter(Boolean).join(" ") ||
      "Não identificado",
    status: chamado.status,
    urgency: chamado.urgency,
    createdAt: chamado.createdAt,
  }));

  const colunas: Coluna<LinhaChamado>[] = [
    { chave: "number", rotulo: "Chamado", largura: "10rem" },
    { chave: "equipamento", rotulo: "Equipamento" },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "13rem",
      renderizar: (linha) => (
        <Etiqueta tom={tomDoChamado(linha.status)}>{ROTULO_CHAMADO[linha.status]}</Etiqueta>
      ),
    },
    {
      chave: "urgency",
      rotulo: "Urgência",
      largura: "10rem",
      renderizar: (linha) => (
        <Etiqueta
          tom={linha.urgency === "parado" || linha.urgency === "alta" ? "alerta" : "neutro"}
        >
          {ROTULO_URGENCIA[linha.urgency]}
        </Etiqueta>
      ),
    },
    {
      chave: "createdAt",
      rotulo: "Aberto em",
      largura: "9rem",
      esconderNoMobile: true,
      renderizar: (linha) => formatarData(linha.createdAt),
    },
  ];

  const filtrando = Boolean(situacao || urgencia || numero);

  return (
    <div>
      <Topo
        titulo="Assistência técnica"
        descricao="A central dos equipamentos que precisam da JB: veja o que está andando, o que espera sua resposta e o histórico de cada chamado."
        acoes={
          <LinkBotao href="/minha-jb/assistencia/novo" tamanho="sm">
            <Plus className="size-4" aria-hidden />
            Abrir chamado
          </LinkBotao>
        }
      />

      <section aria-label="Resumo da assistência" className="mb-6 grid gap-3 sm:grid-cols-3">
        <Cartao data-motion-clinic-kpi className="relative overflow-hidden p-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-info-500" aria-hidden />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-mono uppercase text-graf-500">Em andamento</p>
              <p className="tabular mt-2 text-3xl font-extrabold tracking-tight text-graf-950">
                {emAndamento}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-graf-500">
                {emAndamento === 1 ? "chamado ainda aberto" : "chamados ainda abertos"}
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-50 text-info-700">
              <Clock3 className="size-4.5" aria-hidden />
            </span>
          </div>
        </Cartao>

        <Cartao data-motion-clinic-kpi className="relative overflow-hidden p-5">
          <div
            className={aguardandoVoce > 0 ? "absolute inset-y-0 left-0 w-1 bg-warn-500" : "absolute inset-y-0 left-0 w-1 bg-graf-200"}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-mono uppercase text-graf-500">Aguardando você</p>
              <p className="tabular mt-2 text-3xl font-extrabold tracking-tight text-graf-950">
                {aguardandoVoce}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-graf-500">
                {aguardandoVoce > 0 ? "resposta ou aprovação pendente" : "nenhuma ação pendente"}
              </p>
            </div>
            <span
              className={
                aguardandoVoce > 0
                  ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-warn-50 text-warn-700"
                  : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-100 text-graf-500"
              }
            >
              <AlertTriangle className="size-4.5" aria-hidden />
            </span>
          </div>
        </Cartao>

        <Cartao data-motion-clinic-kpi className="relative overflow-hidden p-5">
          <div
            className={paradosAbertos > 0 ? "absolute inset-y-0 left-0 w-1 bg-jb-600" : "absolute inset-y-0 left-0 w-1 bg-graf-200"}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-mono uppercase text-graf-500">Equipamento parado</p>
              <p className="tabular mt-2 text-3xl font-extrabold tracking-tight text-graf-950">
                {paradosAbertos}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-graf-500">
                {paradosAbertos === 1 ? "chamado crítico em aberto" : "chamados críticos em aberto"}
              </p>
            </div>
            <span
              className={
                paradosAbertos > 0
                  ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700"
                  : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-100 text-graf-500"
              }
            >
              <Wrench className="size-4.5" aria-hidden />
            </span>
          </div>
        </Cartao>
      </section>

      <Filtros
        base="/minha-jb/assistencia"
        parametros={{ situacao, urgencia, numero }}
        grupos={grupos}
        busca={{
          nome: "numero",
          rotulo: "Buscar por número",
          placeholder: "Ex.: AT-001205",
        }}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/minha-jb/assistencia/${linha.number}`}
        legenda="Chamados de assistência da sua conta, do mais recente para o mais antigo"
        vazio={{
          icone: LifeBuoy,
          titulo: filtrando ? "Nenhum chamado neste recorte" : "Nenhum chamado por aqui",
          descricao: filtrando
            ? "Tente outro filtro ou limpe a busca para ver todos os chamados."
            : "Equipamento parado, com ruído estranho ou fora do padrão? Abra um chamado e acompanhe cada etapa por aqui.",
          acao: filtrando ? (
            <LinkBotao href="/minha-jb/assistencia" variante="secundario">
              Ver todos os chamados
            </LinkBotao>
          ) : (
            <LinkBotao href="/minha-jb/assistencia/novo">Abrir chamado</LinkBotao>
          ),
        }}
      />

      {total > POR_PAGINA ? (
        <Suspense fallback={<Esqueleto className="mt-6 h-11 w-full" />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="chamado"
            rotuloPlural="chamados"
            className="mt-6"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
