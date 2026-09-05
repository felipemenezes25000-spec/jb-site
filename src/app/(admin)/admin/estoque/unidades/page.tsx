import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, UnitStatus } from "@prisma/client";
import { ScanBarcode, ScanSearch } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta, Trilha, type Tom } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { formatarData, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Unidades de estoque",
};

/**
 * Unidades identificadas.
 *
 * Uma linha por peça física. É a tela usada quando alguém liga perguntando
 * "aquela autoclave seminova ainda está disponível?" — daí a busca por número
 * de série ser o primeiro campo.
 */

const POR_PAGINA = 25;

const ROTULO_STATUS: Record<UnitStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  indisponivel: "Indisponível",
};

const TOM_STATUS: Record<UnitStatus, Tom> = {
  disponivel: "ok",
  reservado: "aguardando",
  vendido: "neutro",
  indisponivel: "alerta",
};

type Busca = {
  q?: string;
  status?: string;
  produto?: string;
  pagina?: string;
};

export default async function PaginaUnidades({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("estoque");
  const parametros = await searchParams;
  const podeMexer = podeEditar(usuario, "estoque");

  const produtos = await prisma.product.findMany({
    where: { units: { some: {} } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, sku: true },
  });

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Estoque", href: "/admin/estoque" },
          { rotulo: "Unidades" },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graf-950">Unidades de estoque</h1>
          <p className="mt-1 text-sm text-graf-500">
            Peças identificadas de seminovos, usados e recondicionados.
          </p>
        </div>
        {podeMexer ? (
          <LinkBotao href="/admin/estoque/unidades/nova">Nova unidade</LinkBotao>
        ) : (
          <p className="rounded-lg bg-graf-100 px-3 py-2 text-xs font-semibold text-graf-600">
            Somente consulta
          </p>
        )}
      </header>

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número de série, produto ou origem",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: [
              { valor: "disponivel", rotulo: "Disponível" },
              { valor: "reservado", rotulo: "Reservado" },
              { valor: "vendido", rotulo: "Vendido" },
              { valor: "indisponivel", rotulo: "Indisponível" },
            ],
          },
          {
            tipo: "selecao",
            nome: "produto",
            rotulo: "Produto",
            todos: "Todos",
            opcoes: produtos.map((produto) => ({
              valor: produto.id,
              rotulo: `${produto.name} (${produto.sku})`,
            })),
          },
        ]}
      />

      <Suspense key={JSON.stringify(parametros)} fallback={<EsqueletoLista />}>
        <Lista parametros={parametros} podeMexer={podeMexer} />
      </Suspense>
    </div>
  );
}

function EsqueletoLista() {
  return (
    <div className="space-y-3">
      <Esqueleto className="h-12" />
      {[0, 1, 2, 3, 4].map((indice) => (
        <Esqueleto key={indice} className="h-16" />
      ))}
    </div>
  );
}

type LinhaUnidade = {
  id: string;
  serialNumber: string | null;
  status: UnitStatus;
  manufactureYear: number | null;
  usageHours: number | null;
  createdAt: Date;
  acquiredFrom: string;
  product: { id: string; name: string; sku: string };
  orderItem: { order: { number: string } } | null;
  _count: { checklist: number };
};

async function Lista({ parametros, podeMexer }: { parametros: Busca; podeMexer: boolean }) {
  const pagina = Math.max(1, Number(parametros.pagina) || 1);

  const where: Prisma.InventoryUnitWhereInput = {};
  const termo = parametros.q?.trim();
  if (termo) {
    where.OR = [
      { serialNumber: { contains: termo, mode: "insensitive" } },
      { acquiredFrom: { contains: termo, mode: "insensitive" } },
      { product: { name: { contains: termo, mode: "insensitive" } } },
      { product: { sku: { contains: termo, mode: "insensitive" } } },
    ];
  }
  if (
    parametros.status === "disponivel" ||
    parametros.status === "reservado" ||
    parametros.status === "vendido" ||
    parametros.status === "indisponivel"
  ) {
    where.status = parametros.status;
  }
  if (parametros.produto) where.productId = parametros.produto;

  const [unidades, total] = await Promise.all([
    prisma.inventoryUnit.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        serialNumber: true,
        status: true,
        manufactureYear: true,
        usageHours: true,
        createdAt: true,
        acquiredFrom: true,
        product: { select: { id: true, name: true, sku: true } },
        orderItem: { select: { order: { select: { number: true } } } },
        _count: { select: { checklist: true } },
      },
    }),
    prisma.inventoryUnit.count({ where }),
  ]);

  const colunas: Coluna<LinhaUnidade>[] = [
    {
      chave: "serialNumber",
      rotulo: "Unidade",
      renderizar: (linha) => (
        <span className="block">
          <span className="block truncate font-semibold">
            {linha.serialNumber || "Sem número de série"}
          </span>
          <span className="block truncate text-xs font-normal text-graf-500">
            {linha.product.name} · {linha.product.sku}
          </span>
        </span>
      ),
    },
    {
      chave: "manufactureYear",
      rotulo: "Ano",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="tabular">{linha.manufactureYear ?? "—"}</span>
      ),
    },
    {
      chave: "usageHours",
      rotulo: "Horas",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="tabular">{linha.usageHours ?? "—"}</span>,
    },
    {
      chave: "checklist",
      rotulo: "Revisão",
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha._count.checklist === 0
          ? "Sem checklist"
          : `${linha._count.checklist} ${plural(linha._count.checklist, "item", "itens")}`,
    },
    {
      chave: "pedido",
      rotulo: "Pedido",
      renderizar: (linha) => linha.orderItem?.order.number ?? "—",
    },
    {
      chave: "status",
      rotulo: "Situação",
      renderizar: (linha) => (
        <Etiqueta tom={TOM_STATUS[linha.status]}>{ROTULO_STATUS[linha.status]}</Etiqueta>
      ),
    },
    {
      chave: "createdAt",
      rotulo: "Cadastro",
      esconderNoMobile: true,
      renderizar: (linha) => formatarData(linha.createdAt),
    },
  ];

  const filtrando = Boolean(parametros.q || parametros.status || parametros.produto);

  return (
    <div className="space-y-5">
      <Tabela<LinhaUnidade>
        colunas={colunas}
        linhas={unidades}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/estoque/unidades/${linha.id}`}
        legenda="Unidades físicas em estoque"
        vazio={
          filtrando
            ? {
                icone: ScanSearch,
                titulo: "Nenhuma unidade com esses filtros",
                descricao: "Ajuste a busca ou limpe os filtros na barra acima.",
                acao: (
                  <LinkBotao href="/admin/estoque/unidades" variante="secundario">
                    Limpar filtros
                  </LinkBotao>
                ),
              }
            : {
                icone: ScanBarcode,
                titulo: "Nenhuma unidade cadastrada",
                descricao:
                  "Cada seminovo, usado ou recondicionado é uma peça única, com número de série e revisão própria.",
                acao: podeMexer ? (
                  <LinkBotao href="/admin/estoque/unidades/nova">Cadastrar a primeira</LinkBotao>
                ) : undefined,
              }
        }
      />

      {total > 0 ? (
        <Suspense fallback={<Esqueleto className="h-11" />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="unidade"
            rotuloPlural="unidades"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
