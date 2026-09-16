import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, WorkOrderStatus } from "@prisma/client";
import { CalendarDays, ClipboardList, Plus } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { CabecalhoPagina, Contador } from "@/components/admin/servico/cabecalho";
import { EtiquetaOS } from "@/components/admin/servico/etiquetas";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { criarOrdemDeServico } from "@/app/acoes/admin-servico";
import { distanciaEmDias, formatarData, formatarPreco } from "@/lib/format";
import { ROTULO_OS, STATUS_OS_ABERTOS } from "@/lib/os";
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

export const metadata: Metadata = {
  title: "Ordens de serviço",
};

/**
 * Lista de ordens de serviço.
 *
 * O padrão mostra o que ainda está na bancada ou no campo. OS concluída é
 * histórico e continua acessível pelo filtro, pelo chamado e pelo prontuário
 * do equipamento.
 */

const POR_PAGINA = 25;

type Busca = {
  q?: string;
  status?: string;
  tecnico?: string;
  periodo_de?: string;
  periodo_ate?: string;
  pagina?: string;
  ordem?: string;
  dir?: string;
};

type OrdemOS = Prisma.WorkOrderOrderByWithRelationInput[];

const ORDENS: Record<string, { asc: OrdemOS; desc: OrdemOS }> = {
  aberta: { asc: [{ openedAt: "asc" }], desc: [{ openedAt: "desc" }] },
  numero: { asc: [{ number: "asc" }], desc: [{ number: "desc" }] },
  status: {
    asc: [{ status: "asc" }, { openedAt: "asc" }],
    desc: [{ status: "desc" }, { openedAt: "desc" }],
  },
  total: { asc: [{ totalCents: "asc" }], desc: [{ totalCents: "desc" }] },
};

function montarHref(atual: Busca, mudancas: Record<string, string | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atual, ...mudancas })) {
    if (valor) busca.set(chave, valor);
  }
  busca.delete("pagina");
  const texto = busca.toString();
  return texto ? `/admin/os?${texto}` : "/admin/os";
}

const COLUNA_PARA_ORDEM: Record<string, string> = {
  number: "numero",
  status: "status",
  totalCents: "total",
  openedAt: "aberta",
};

const ORDEM_PARA_COLUNA: Record<string, string> = {
  numero: "number",
  status: "status",
  total: "totalCents",
  aberta: "openedAt",
};

type LinhaOS = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  openedAt: Date;
  totalCents: number;
  customerName: string;
  reportedIssue: string;
  technician: { user: { name: string } } | null;
  equipment: { id: string; name: string; serialNumber: string } | null;
  request: { id: string; number: string; customer: { name: string } | null } | null;
};

export default async function PaginaOrdens({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("os");
  const busca = await searchParams;
  const editar = podeEditar(usuario, "os");

  const pagina = Math.max(1, Number(busca.pagina) || 1);
  const chaveOrdem = busca.ordem && busca.ordem in ORDENS ? busca.ordem : "aberta";
  const descendente = busca.dir !== "asc";
  const orderBy = descendente ? ORDENS[chaveOrdem].desc : ORDENS[chaveOrdem].asc;

  const condicoes: Prisma.WorkOrderWhereInput[] = [];

  const texto = busca.q?.trim();
  if (texto) {
    condicoes.push({
      OR: [
        { number: { contains: texto, mode: "insensitive" } },
        { customerName: { contains: texto, mode: "insensitive" } },
        { reportedIssue: { contains: texto, mode: "insensitive" } },
        { equipment: { name: { contains: texto, mode: "insensitive" } } },
        { equipment: { serialNumber: { contains: texto, mode: "insensitive" } } },
        { request: { number: { contains: texto, mode: "insensitive" } } },
      ],
    });
  }

  if (busca.tecnico) condicoes.push({ technicianId: busca.tecnico });

  if (busca.periodo_de || busca.periodo_ate) {
    condicoes.push({
      openedAt: {
        ...(busca.periodo_de ? { gte: new Date(`${busca.periodo_de}T00:00:00-03:00`) } : {}),
        ...(busca.periodo_ate ? { lte: new Date(`${busca.periodo_ate}T23:59:59-03:00`) } : {}),
      },
    });
  }

  const semStatus: Prisma.WorkOrderWhereInput = condicoes.length > 0 ? { AND: condicoes } : {};

  const filtroDeStatus: Prisma.WorkOrderWhereInput = !busca.status
    ? { status: { in: STATUS_OS_ABERTOS } }
    : busca.status === "todos"
      ? {}
      : { status: busca.status as WorkOrderStatus };

  const where: Prisma.WorkOrderWhereInput = { AND: [semStatus, filtroDeStatus] };

  const [total, ordens, porStatus, tecnicos, totalGeral] = await Promise.all([
    prisma.workOrder.count({ where }),
    prisma.workOrder.findMany({
      where,
      orderBy,
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        status: true,
        openedAt: true,
        totalCents: true,
        customerName: true,
        reportedIssue: true,
        technician: { select: { user: { select: { name: true } } } },
        equipment: { select: { id: true, name: true, serialNumber: true } },
        request: {
          select: { id: true, number: true, customer: { select: { name: true } } },
        },
      },
    }),
    prisma.workOrder.groupBy({ by: ["status"], where: semStatus, _count: { _all: true } }),
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.workOrder.count({ where: semStatus }),
  ]);

  const contagem = new Map(porStatus.map((linha) => [linha.status, linha._count._all]));
  const abertas = STATUS_OS_ABERTOS.reduce(
    (soma, status) => soma + (contagem.get(status) ?? 0),
    0,
  );

  const destaques = [
    { chave: "", rotulo: "Em aberto", valor: abertas },
    { chave: "aberta", rotulo: ROTULO_OS.aberta, valor: contagem.get("aberta") ?? 0 },
    { chave: "em_execucao", rotulo: ROTULO_OS.em_execucao, valor: contagem.get("em_execucao") ?? 0 },
    {
      chave: "aguardando_peca",
      rotulo: ROTULO_OS.aguardando_peca,
      valor: contagem.get("aguardando_peca") ?? 0,
    },
    {
      chave: "aguardando_aprovacao",
      rotulo: ROTULO_OS.aguardando_aprovacao,
      valor: contagem.get("aguardando_aprovacao") ?? 0,
    },
    { chave: "concluida", rotulo: ROTULO_OS.concluida, valor: contagem.get("concluida") ?? 0 },
    { chave: "todos", rotulo: "Todas", valor: totalGeral },
  ];

  const colunas: Coluna<LinhaOS>[] = [
    {
      chave: "number",
      rotulo: "OS",
      largura: "13rem",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="block">
          <span className="label-mono block text-graf-500">{linha.number}</span>
          <span className="block truncate font-semibold text-graf-900">
            {linha.request?.customer?.name || linha.customerName || "Sem cliente informado"}
          </span>
        </span>
      ),
    },
    {
      chave: "equipamento",
      rotulo: "Equipamento",
      renderizar: (linha) => {
        // A OS avulsa de balcão pode nascer sem equipamento cadastrado: nesse
        // caso o que identifica a linha é o defeito relatado, e só quando nem
        // isso existe é que aparece o aviso de cadastro incompleto.
        const identificacao = linha.equipment?.name || linha.reportedIssue;
        return (
          <span className="block min-w-0">
            {identificacao ? (
              <span className="block truncate">{identificacao}</span>
            ) : (
              <span className="block text-graf-500">Equipamento não identificado</span>
            )}
            {linha.equipment?.serialNumber ? (
              <span className="label-mono block text-graf-500">
                série {linha.equipment.serialNumber}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      chave: "tecnico",
      rotulo: "Técnico",
      largura: "11rem",
      renderizar: (linha) =>
        linha.technician ? (
          <span className="truncate">{linha.technician.user.name}</span>
        ) : (
          <span className="text-graf-500">Sem técnico</span>
        ),
    },
    {
      chave: "status",
      rotulo: "Status",
      largura: "12rem",
      ordenavel: true,
      renderizar: (linha) => <EtiquetaOS status={linha.status} />,
    },
    {
      chave: "totalCents",
      rotulo: "Total",
      largura: "8rem",
      alinhamento: "direita",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="tabular font-semibold">{formatarPreco(linha.totalCents)}</span>
      ),
    },
    {
      chave: "openedAt",
      rotulo: "Aberta",
      largura: "9rem",
      ordenavel: true,
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="block">
          <span className="block text-graf-800">{distanciaEmDias(linha.openedAt)}</span>
          <span className="block text-[0.8125rem] text-graf-500">{formatarData(linha.openedAt)}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Ordens de serviço"
        descricao="Diagnóstico, peças, mão de obra e laudo de cada reparo."
        acoes={
          <>
            <LinkBotao href="/admin/agenda" variante="secundario" tamanho="sm">
              <CalendarDays className="size-4" aria-hidden />
              Ver agenda
            </LinkBotao>
            {editar ? (
              <PainelAcao
                rotulo="Nova OS"
                icone={<Plus className="size-4" aria-hidden />}
                variante="primario"
                tamanho="md"
                titulo="Abrir ordem de serviço avulsa"
                descricao="Para serviço de balcão ou reparo que não veio de um chamado. Vindo de um chamado, abra pela ficha dele — assim a OS herda equipamento e relato."
                acao={criarOrdemDeServico}
                rotuloConfirmar="Abrir OS"
              >
                <>
                  <CampoAcao
                    rotulo="Cliente"
                    name="nomeCliente"
                    maxLength={180}
                    placeholder="Nome de quem trouxe o equipamento"
                  />
                  <AreaAcao
                    rotulo="Defeito relatado"
                    name="defeitoRelatado"
                    rows={3}
                    placeholder="O que o cliente descreveu"
                  />
                  <SelecaoAcao rotulo="Técnico" name="tecnicoId">
                    <option value="">Definir depois</option>
                    {tecnicos.map((tecnico) => (
                      <option key={tecnico.id} value={tecnico.id}>
                        {tecnico.user.name}
                      </option>
                    ))}
                  </SelecaoAcao>
                  <CampoAcao
                    rotulo="Garantia do serviço (dias)"
                    name="garantiaDias"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                  />
                  <AreaAcao rotulo="Observações internas" name="observacoes" rows={2} />
                </>
              </PainelAcao>
            ) : null}
          </>
        }
      />

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

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número da OS, cliente, equipamento, série ou chamado",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Status",
            todos: "Em aberto",
            opcoes: [
              { valor: "todos", rotulo: "Todos os status" },
              ...(Object.keys(ROTULO_OS) as WorkOrderStatus[]).map((status) => ({
                valor: status,
                rotulo: ROTULO_OS[status],
              })),
            ],
          },
          {
            tipo: "selecao",
            nome: "tecnico",
            rotulo: "Técnico",
            opcoes: tecnicos.map((tecnico) => ({ valor: tecnico.id, rotulo: tecnico.user.name })),
          },
          { tipo: "periodo", nome: "periodo", rotulo: "Aberta entre" },
        ]}
      />

      <Tabela<LinhaOS>
        colunas={colunas}
        linhas={ordens}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/os/${linha.id}`}
        legenda="Ordens de serviço"
        ordenacao={{
          chave: ORDEM_PARA_COLUNA[chaveOrdem] ?? "openedAt",
          direcao: descendente ? "desc" : "asc",
        }}
        hrefOrdenar={(chave, direcao) =>
          montarHref(busca, { ordem: COLUNA_PARA_ORDEM[chave] ?? "aberta", dir: direcao })
        }
        vazio={{
          icone: ClipboardList,
          titulo: "Nenhuma ordem de serviço com esses filtros",
          descricao:
            "As OS nascem a partir de um chamado, de uma visita preventiva com pendência ou avulsas, pelo botão acima.",
          acao: (
            <LinkBotao href="/admin/os" variante="secundario">
              Ver as ordens em aberto
            </LinkBotao>
          ),
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="ordem"
          rotuloPlural="ordens"
        />
      </Suspense>
    </div>
  );
}
