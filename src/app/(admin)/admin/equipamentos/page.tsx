import { Suspense } from "react";
import type { Metadata } from "next";
import type { EquipmentStatus, Prisma } from "@prisma/client";
import { MonitorCog, Plus } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { CabecalhoPagina, Contador } from "@/components/admin/servico/cabecalho";
import { EtiquetaEquipamento } from "@/components/admin/servico/etiquetas";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { ROTULO_EQUIPAMENTO } from "@/lib/equipamento";
import { distanciaEmDias, formatarData } from "@/lib/format";
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
  title: "Equipamentos",
};

/**
 * Parque instalado de todos os clientes.
 *
 * É a base que sustenta a assistência: quem liga dizendo "a autoclave parou"
 * precisa ser encontrado pelo número de série em dois segundos. Por isso a
 * busca cobre série, nome, marca, modelo e cliente ao mesmo tempo.
 */

const POR_PAGINA = 25;

type Busca = {
  q?: string;
  status?: string;
  cliente?: string;
  categoria?: string;
  pagina?: string;
  ordem?: string;
  dir?: string;
};

type OrdemEquipamento = Prisma.EquipmentOrderByWithRelationInput[];

const ORDENS: Record<string, { asc: OrdemEquipamento; desc: OrdemEquipamento }> = {
  nome: { asc: [{ name: "asc" }], desc: [{ name: "desc" }] },
  cadastro: { asc: [{ createdAt: "asc" }], desc: [{ createdAt: "desc" }] },
  preventiva: {
    asc: [{ nextMaintenanceAt: { sort: "asc", nulls: "last" } }],
    desc: [{ nextMaintenanceAt: { sort: "desc", nulls: "last" } }],
  },
  status: { asc: [{ status: "asc" }], desc: [{ status: "desc" }] },
};

const COLUNA_PARA_ORDEM: Record<string, string> = {
  name: "nome",
  status: "status",
  nextMaintenanceAt: "preventiva",
  createdAt: "cadastro",
};

const ORDEM_PARA_COLUNA: Record<string, string> = {
  nome: "name",
  status: "status",
  preventiva: "nextMaintenanceAt",
  cadastro: "createdAt",
};

function montarHref(atual: Busca, mudancas: Record<string, string | undefined>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atual, ...mudancas })) {
    if (valor) busca.set(chave, valor);
  }
  busca.delete("pagina");
  const texto = busca.toString();
  return texto ? `/admin/equipamentos?${texto}` : "/admin/equipamentos";
}

type LinhaEquipamento = {
  id: string;
  name: string;
  brandName: string;
  modelName: string;
  serialNumber: string;
  status: EquipmentStatus;
  nextMaintenanceAt: Date | null;
  warrantyUntil: Date | null;
  room: string;
  customer: { id: string; name: string };
  location: { name: string } | null;
  category: { name: string } | null;
};

export default async function PaginaEquipamentos({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("equipamentos");
  const busca = await searchParams;
  const editar = podeEditar(usuario, "equipamentos");

  const pagina = Math.max(1, Number(busca.pagina) || 1);
  const chaveOrdem = busca.ordem && busca.ordem in ORDENS ? busca.ordem : "nome";
  const descendente = busca.dir === "desc";
  const orderBy = descendente ? ORDENS[chaveOrdem].desc : ORDENS[chaveOrdem].asc;

  const condicoes: Prisma.EquipmentWhereInput[] = [];

  const texto = busca.q?.trim();
  if (texto) {
    condicoes.push({
      OR: [
        { name: { contains: texto, mode: "insensitive" } },
        { serialNumber: { contains: texto, mode: "insensitive" } },
        { brandName: { contains: texto, mode: "insensitive" } },
        { modelName: { contains: texto, mode: "insensitive" } },
        { customer: { name: { contains: texto, mode: "insensitive" } } },
      ],
    });
  }

  if (busca.cliente) condicoes.push({ customerId: busca.cliente });
  if (busca.categoria) condicoes.push({ categoryId: busca.categoria });

  const semStatus: Prisma.EquipmentWhereInput = condicoes.length > 0 ? { AND: condicoes } : {};

  const filtroDeStatus: Prisma.EquipmentWhereInput = !busca.status
    ? {}
    : { status: busca.status as EquipmentStatus };

  const where: Prisma.EquipmentWhereInput = { AND: [semStatus, filtroDeStatus] };

  const [total, equipamentos, porStatus, clientes, categorias, totalGeral] = await Promise.all([
    prisma.equipment.count({ where }),
    prisma.equipment.findMany({
      where,
      orderBy,
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        name: true,
        brandName: true,
        modelName: true,
        serialNumber: true,
        status: true,
        nextMaintenanceAt: true,
        warrantyUntil: true,
        room: true,
        customer: { select: { id: true, name: true } },
        location: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.equipment.groupBy({ by: ["status"], where: semStatus, _count: { _all: true } }),
    prisma.customer.findMany({
      where: { equipments: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: 500,
    }),
    prisma.category.findMany({
      where: { equipments: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.equipment.count({ where: semStatus }),
  ]);

  const contagem = new Map(porStatus.map((linha) => [linha.status, linha._count._all]));

  const destaques = [
    { chave: "", rotulo: "Todos", valor: totalGeral },
    ...(Object.keys(ROTULO_EQUIPAMENTO) as EquipmentStatus[]).map((status) => ({
      chave: status,
      rotulo: ROTULO_EQUIPAMENTO[status],
      valor: contagem.get(status) ?? 0,
    })),
  ];

  const colunas: Coluna<LinhaEquipamento>[] = [
    {
      chave: "name",
      rotulo: "Equipamento",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-graf-900">{linha.name}</span>
          <span className="block truncate text-[0.8125rem] text-graf-500">
            {linha.customer.name}
          </span>
        </span>
      ),
    },
    {
      chave: "marca",
      rotulo: "Marca / modelo",
      largura: "13rem",
      renderizar: (linha) =>
        [linha.brandName, linha.modelName].filter(Boolean).join(" ") || (
          <span className="text-graf-500">Não informado</span>
        ),
    },
    {
      chave: "serialNumber",
      rotulo: "Série",
      largura: "11rem",
      renderizar: (linha) =>
        linha.serialNumber ? (
          <span className="label-mono">{linha.serialNumber}</span>
        ) : (
          <span className="text-graf-500">Sem série</span>
        ),
    },
    {
      chave: "local",
      rotulo: "Local",
      largura: "12rem",
      esconderNoMobile: true,
      renderizar: (linha) =>
        [linha.location?.name, linha.room].filter(Boolean).join(" · ") || (
          <span className="text-graf-500">Não informado</span>
        ),
    },
    {
      chave: "nextMaintenanceAt",
      rotulo: "Próxima preventiva",
      largura: "11rem",
      ordenavel: true,
      renderizar: (linha) =>
        linha.nextMaintenanceAt ? (
          <span className="block">
            <span className="block">{formatarData(linha.nextMaintenanceAt)}</span>
            <span className="block text-[0.8125rem] text-graf-500">
              {distanciaEmDias(linha.nextMaintenanceAt)}
            </span>
          </span>
        ) : (
          <span className="text-graf-500">Sem intervalo definido</span>
        ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "11rem",
      ordenavel: true,
      renderizar: (linha) => <EtiquetaEquipamento status={linha.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Equipamentos"
        descricao="Parque instalado de todos os clientes, com garantia, histórico e próxima preventiva."
        acoes={
          editar ? (
            <LinkBotao href="/admin/equipamentos/novo">
              <Plus className="size-4" aria-hidden />
              Novo equipamento
            </LinkBotao>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        {destaques.map((item) => (
          <Contador
            key={item.chave || "todos"}
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
            placeholder: "Número de série, equipamento, marca, modelo ou cliente",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            opcoes: (Object.keys(ROTULO_EQUIPAMENTO) as EquipmentStatus[]).map((status) => ({
              valor: status,
              rotulo: ROTULO_EQUIPAMENTO[status],
            })),
          },
          {
            tipo: "selecao",
            nome: "cliente",
            rotulo: "Cliente",
            opcoes: clientes.map((cliente) => ({ valor: cliente.id, rotulo: cliente.name })),
          },
          {
            tipo: "selecao",
            nome: "categoria",
            rotulo: "Categoria",
            opcoes: categorias.map((categoria) => ({
              valor: categoria.id,
              rotulo: categoria.name,
            })),
          },
        ]}
      />

      <Tabela<LinhaEquipamento>
        colunas={colunas}
        linhas={equipamentos}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/equipamentos/${linha.id}`}
        legenda="Equipamentos dos clientes"
        ordenacao={{
          chave: ORDEM_PARA_COLUNA[chaveOrdem] ?? "name",
          direcao: descendente ? "desc" : "asc",
        }}
        hrefOrdenar={(chave, direcao) =>
          montarHref(busca, { ordem: COLUNA_PARA_ORDEM[chave] ?? "nome", dir: direcao })
        }
        vazio={{
          icone: MonitorCog,
          titulo: "Nenhum equipamento com esses filtros",
          descricao:
            "Equipamentos entram aqui por três caminhos: compra na loja, cadastro do cliente na Área da Clínica e cadastro da equipe técnica.",
          acao: editar ? (
            <LinkBotao href="/admin/equipamentos/novo">Cadastrar equipamento</LinkBotao>
          ) : (
            <LinkBotao href="/admin/equipamentos" variante="secundario">
              Limpar filtros
            </LinkBotao>
          ),
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="equipamento"
          rotuloPlural="equipamentos"
        />
      </Suspense>
    </div>
  );
}
