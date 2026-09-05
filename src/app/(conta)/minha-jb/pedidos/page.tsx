import { Suspense } from "react";
import type { Metadata } from "next";
import type { OrderStatus, Prisma } from "@prisma/client";
import { Package } from "lucide-react";

import {
  Filtros,
  paginaDaUrl,
  primeiroValor,
  type GrupoFiltro,
} from "@/components/conta/mj-filtros";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { exigirCliente } from "@/lib/auth-cliente";
import { formatarData, formatarPreco, plural } from "@/lib/format";
import { ROTULO_STATUS } from "@/lib/pedido";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Meus pedidos",
  description: "Histórico de pedidos, com status e valores.",
  robots: { index: false, follow: false },
};

const POR_PAGINA = 10;

/**
 * Recortes da listagem.
 *
 * São grupos, não status soltos: os treze status de pedido viram três
 * perguntas que o cliente realmente faz — "o que ainda está andando?", "o que
 * já terminou?", "o que foi cancelado?".
 */
const SITUACOES = {
  aberto: {
    rotulo: "Em aberto",
    status: [
      "aguardando_pagamento",
      "pagamento_em_analise",
      "pago",
      "separacao",
      "revisao_tecnica",
      "aguardando_frete",
      "pronto_retirada",
      "enviado",
      "instalacao_agendada",
      "entregue",
    ],
  },
  concluido: { rotulo: "Concluídos", status: ["concluido"] },
  cancelado: { rotulo: "Cancelados", status: ["cancelado", "reembolsado"] },
} satisfies Record<string, { rotulo: string; status: OrderStatus[] }>;

type ChaveSituacao = keyof typeof SITUACOES;

function ehSituacao(valor: string): valor is ChaveSituacao {
  return valor in SITUACOES;
}

function tomDoPedido(status: OrderStatus) {
  if (status === "concluido" || status === "entregue") return "ok" as const;
  if (status === "cancelado" || status === "reembolsado") return "neutro" as const;
  if (status === "aguardando_pagamento" || status === "pagamento_em_analise") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

type LinhaPedido = {
  id: string;
  number: string;
  status: OrderStatus;
  placedAt: Date;
  totalCents: number;
  itens: number;
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function PedidosPage({ searchParams }: { searchParams: Busca }) {
  const [cliente, params] = await Promise.all([
    exigirCliente("/minha-jb/pedidos"),
    searchParams,
  ]);

  const situacao = primeiroValor(params.situacao);
  const numero = primeiroValor(params.numero).slice(0, 40);
  const pagina = paginaDaUrl(params.pagina);

  const filtro: Prisma.OrderWhereInput = {
    customerId: cliente.id,
    ...(ehSituacao(situacao) ? { status: { in: SITUACOES[situacao].status } } : {}),
    ...(numero ? { number: { contains: numero, mode: "insensitive" } } : {}),
  };

  const [total, pedidos, contagens] = await Promise.all([
    prisma.order.count({ where: filtro }),
    prisma.order.findMany({
      where: filtro,
      orderBy: { placedAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        status: true,
        placedAt: true,
        totalCents: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { customerId: cliente.id },
      _count: { _all: true },
    }),
  ]);

  const porStatus = new Map(contagens.map((linha) => [linha.status, linha._count._all]));
  const totalGeral = contagens.reduce((soma, linha) => soma + linha._count._all, 0);
  const quantidadeDe = (chave: ChaveSituacao) =>
    SITUACOES[chave].status.reduce((soma, status) => soma + (porStatus.get(status) ?? 0), 0);

  const grupos: GrupoFiltro[] = [
    {
      nome: "situacao",
      rotulo: "Situação do pedido",
      opcoes: [
        { valor: "", rotulo: "Todos", quantidade: totalGeral },
        ...(Object.keys(SITUACOES) as ChaveSituacao[]).map((chave) => ({
          valor: chave,
          rotulo: SITUACOES[chave].rotulo,
          quantidade: quantidadeDe(chave),
        })),
      ],
    },
  ];

  const linhas: LinhaPedido[] = pedidos.map((pedido) => ({
    id: pedido.id,
    number: pedido.number,
    status: pedido.status,
    placedAt: pedido.placedAt,
    totalCents: pedido.totalCents,
    itens: pedido._count.items,
  }));

  const colunas: Coluna<LinhaPedido>[] = [
    { chave: "number", rotulo: "Pedido", largura: "10rem" },
    {
      chave: "placedAt",
      rotulo: "Feito em",
      largura: "9rem",
      renderizar: (linha) => formatarData(linha.placedAt),
    },
    {
      chave: "itens",
      rotulo: "Itens",
      largura: "7rem",
      renderizar: (linha) => plural(linha.itens, "item", "itens"),
    },
    {
      chave: "totalCents",
      rotulo: "Total",
      alinhamento: "direita",
      largura: "9rem",
      renderizar: (linha) => (
        <span className="tabular font-semibold text-graf-900">
          {formatarPreco(linha.totalCents)}
        </span>
      ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "12rem",
      renderizar: (linha) => (
        <Etiqueta tom={tomDoPedido(linha.status)}>{ROTULO_STATUS[linha.status]}</Etiqueta>
      ),
    },
  ];

  const filtrando = Boolean(situacao || numero);

  return (
    <div>
      <Topo
        titulo="Meus pedidos"
        descricao="Todo pedido feito no site ou registrado pela equipe da JB, com o valor e a etapa em que ele está."
      />

      <Filtros
        base="/minha-jb/pedidos"
        parametros={{ situacao, numero }}
        grupos={grupos}
        busca={{
          nome: "numero",
          rotulo: "Buscar por número",
          placeholder: "Ex.: JB-001054",
        }}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/minha-jb/pedidos/${linha.number}`}
        legenda="Pedidos da sua conta, do mais recente para o mais antigo"
        vazio={{
          icone: Package,
          titulo: filtrando ? "Nenhum pedido neste recorte" : "Você ainda não tem pedidos",
          descricao: filtrando
            ? "Tente outro filtro ou limpe a busca para ver todos os pedidos da conta."
            : "Pedidos feitos no site e os registrados pela equipe da JB aparecem aqui, com nota fiscal e prazo.",
          acao: filtrando ? (
            <LinkBotao href="/minha-jb/pedidos" variante="secundario">
              Ver todos os pedidos
            </LinkBotao>
          ) : (
            <LinkBotao href="/loja">Ver equipamentos</LinkBotao>
          ),
        }}
      />

      {total > POR_PAGINA ? (
        <Suspense fallback={<Esqueleto className="mt-6 h-11 w-full" />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="pedido"
            rotuloPlural="pedidos"
            className="mt-6"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
