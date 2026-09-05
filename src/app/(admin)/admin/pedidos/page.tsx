import { Suspense } from "react";
import type { Metadata } from "next";
import type { OrderStatus, Prisma } from "@prisma/client";
import { CreditCard, Receipt, ShoppingCart, TicketPercent, Truck, Wallet } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Indicador, Indicadores } from "@/components/admin/indicador";
import {
  CabecalhoPagina,
  EtiquetaPedido,
  ORDEM_STATUS_PEDIDO,
  PEDIDOS_EM_ACAO,
} from "@/components/admin/vendas/comuns";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna, type Direcao } from "@/components/ui/tabela";
import { formatarData, formatarPreco, plural, somenteDigitos } from "@/lib/format";
import { ROTULO_STATUS } from "@/lib/pedido";
import { exigirArea, podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pedidos",
};

/**
 * Lista de pedidos do backoffice.
 *
 * Todo o estado de filtro vive na query string: a página continua sendo
 * renderizada no servidor, o botão "voltar" funciona e o gestor consegue mandar
 * o link já filtrado para outra pessoa.
 *
 * Os totalizadores respeitam exatamente o mesmo filtro da tabela. Se somassem o
 * mês inteiro enquanto a lista mostra uma semana, o número no topo viraria uma
 * afirmação falsa sobre o que está logo abaixo.
 */

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

const POR_PAGINA = 25;

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor.trim() : "";
}

/* -------------------------------------------------------------- faixas */

const FAIXAS: { valor: string; rotulo: string; min?: number; max?: number }[] = [
  { valor: "ate-1000", rotulo: "Até R$ 1.000", max: 100_000 },
  { valor: "1000-5000", rotulo: "R$ 1.000 a R$ 5.000", min: 100_000, max: 500_000 },
  { valor: "5000-20000", rotulo: "R$ 5.000 a R$ 20.000", min: 500_000, max: 2_000_000 },
  { valor: "acima-20000", rotulo: "Acima de R$ 20.000", min: 2_000_000 },
];

/* ------------------------------------------------------------- ordenação */

const ORDENAVEIS: Record<string, keyof Prisma.OrderOrderByWithRelationInput> = {
  numero: "number",
  data: "placedAt",
  total: "totalCents",
  status: "status",
};

function montarOrdem(chave: string, direcao: Direcao): Prisma.OrderOrderByWithRelationInput {
  const campo = ORDENAVEIS[chave];
  if (!campo) return { placedAt: "desc" };
  return { [campo]: direcao } as Prisma.OrderOrderByWithRelationInput;
}

/* ------------------------------------------------------------------ tela */

export default async function PedidosPage({ searchParams }: { searchParams: Busca }) {
  const usuario = await exigirArea("pedidos");
  const params = await searchParams;

  const busca = texto(params.q);
  const status = texto(params.status);
  const faixa = texto(params.valor);
  const de = texto(params.data_de);
  const ate = texto(params.data_ate);
  const ordem = texto(params.ordem) || "data";
  const direcao: Direcao = texto(params.dir) === "asc" ? "asc" : "desc";
  const pagina = Math.max(1, Number(texto(params.pagina)) || 1);

  /* ---------------------------------------------------------- filtro */

  const where: Prisma.OrderWhereInput = {};

  if (status && status in ROTULO_STATUS) where.status = status as OrderStatus;

  if (de || ate) {
    // o dia final entra inteiro: quem filtra "até 10/03" espera o dia 10 dentro
    where.placedAt = {
      ...(de ? { gte: new Date(`${de}T00:00:00-03:00`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59-03:00`) } : {}),
    };
  }

  const escolhida = FAIXAS.find((f) => f.valor === faixa);
  if (escolhida) {
    where.totalCents = {
      ...(escolhida.min === undefined ? {} : { gte: escolhida.min }),
      ...(escolhida.max === undefined ? {} : { lt: escolhida.max }),
    };
  }

  if (busca) {
    const digitos = somenteDigitos(busca);
    where.OR = [
      { number: { contains: busca, mode: "insensitive" } },
      { buyerName: { contains: busca, mode: "insensitive" } },
      { buyerEmail: { contains: busca, mode: "insensitive" } },
      { companyName: { contains: busca, mode: "insensitive" } },
      ...(digitos.length >= 3 ? [{ buyerDocument: { contains: digitos } }] : []),
      ...(digitos.length >= 3 ? [{ buyerPhone: { contains: digitos } }] : []),
    ];
  }

  /* --------------------------------------------------------- consultas */

  const [linhas, total, resumo, emAcao, recebido] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: montarOrdem(ordem, direcao),
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        status: true,
        placedAt: true,
        paidAt: true,
        totalCents: true,
        buyerName: true,
        buyerEmail: true,
        companyName: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _sum: { totalCents: true } }),
    prisma.order.count({ where: { ...where, status: { in: PEDIDOS_EM_ACAO } } }),
    prisma.order.aggregate({
      where: { ...where, paidAt: { not: null }, status: { notIn: ["cancelado", "reembolsado"] } },
      _sum: { totalCents: true },
    }),
  ]);

  const soma = resumo._sum.totalCents ?? 0;
  const ticket = total > 0 ? Math.round(soma / total) : 0;

  /* ------------------------------------------------------------ links */

  const consultaAtual = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (typeof valor === "string" && valor) consultaAtual.set(chave, valor);
  }

  function hrefOrdenar(chave: string, proxima: Direcao) {
    const novos = new URLSearchParams(consultaAtual.toString());
    novos.set("ordem", chave);
    novos.set("dir", proxima);
    novos.delete("pagina");
    return `/admin/pedidos?${novos.toString()}`;
  }

  type Linha = (typeof linhas)[number];

  const colunas: Coluna<Linha>[] = [
    {
      chave: "numero",
      rotulo: "Pedido",
      largura: "9rem",
      ordenavel: true,
      renderizar: (linha) => <span className="tabular font-semibold">{linha.number}</span>,
    },
    {
      chave: "data",
      rotulo: "Data",
      largura: "8rem",
      ordenavel: true,
      renderizar: (linha) => formatarData(linha.placedAt),
    },
    {
      chave: "cliente",
      rotulo: "Cliente",
      renderizar: (linha) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-graf-900">
            {linha.companyName || linha.buyerName}
          </span>
          <span className="block truncate text-xs text-graf-500">{linha.buyerEmail}</span>
        </span>
      ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "12rem",
      ordenavel: true,
      renderizar: (linha) => (
        <EtiquetaPedido status={linha.status} rotulo={ROTULO_STATUS[linha.status]} ponto />
      ),
    },
    {
      chave: "itens",
      rotulo: "Itens",
      largura: "5rem",
      alinhamento: "centro",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="tabular">{linha._count.items}</span>,
    },
    {
      chave: "total",
      rotulo: "Total",
      largura: "9rem",
      alinhamento: "direita",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="tabular font-semibold text-graf-900">
          {formatarPreco(linha.totalCents)}
        </span>
      ),
    },
    {
      chave: "pagamento",
      rotulo: "Pagamento",
      largura: "9rem",
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha.paidAt ? (
          <Etiqueta tom="ok">Pago em {formatarData(linha.paidAt)}</Etiqueta>
        ) : (
          <span className="text-graf-500">Em aberto</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Pedidos"
        apoio="Vendas da loja, do pagamento à entrega."
        acoes={
          <>
            <LinkBotao href="/admin/pagamentos" variante="secundario" tamanho="sm">
              <CreditCard className="size-4" aria-hidden />
              Pagamentos
            </LinkBotao>
            {podeVer(usuario, "produtos") ? (
              <LinkBotao href="/admin/cupons" variante="secundario" tamanho="sm">
                <TicketPercent className="size-4" aria-hidden />
                Cupons
              </LinkBotao>
            ) : null}
            {podeVer(usuario, "configuracoes") ? (
              <LinkBotao href="/admin/frete" variante="secundario" tamanho="sm">
                <Truck className="size-4" aria-hidden />
                Frete
              </LinkBotao>
            ) : null}
          </>
        }
      />

      <Indicadores>
        <Indicador
          rotulo="Pedidos no filtro"
          valor={total}
          icone={ShoppingCart}
          detalhe={total === 0 ? "Nenhum pedido para estes filtros" : undefined}
        />
        <Indicador
          rotulo="Soma dos pedidos"
          valor={formatarPreco(soma)}
          icone={Receipt}
          tom="marca"
          detalhe="Inclui cancelados, se estiverem no filtro"
        />
        <Indicador
          rotulo="Já recebido"
          valor={formatarPreco(recebido._sum.totalCents ?? 0)}
          icone={Wallet}
          tom="ok"
          detalhe="Pedidos com pagamento confirmado"
        />
        <Indicador
          rotulo="Aguardando ação"
          valor={emAcao}
          tom={emAcao > 0 ? "aviso" : "neutro"}
          detalhe="Pago, em separação, revisão, frete ou retirada"
        />
      </Indicadores>

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número, nome, e-mail, CPF/CNPJ ou telefone",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: ORDEM_STATUS_PEDIDO.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] })),
          },
          {
            tipo: "selecao",
            nome: "valor",
            rotulo: "Valor",
            todos: "Qualquer valor",
            opcoes: FAIXAS.map((f) => ({ valor: f.valor, rotulo: f.rotulo })),
          },
          { tipo: "periodo", nome: "data", rotulo: "Período" },
        ]}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/pedidos/${linha.id}`}
        ordenacao={{ chave: ordem, direcao }}
        hrefOrdenar={hrefOrdenar}
        legenda="Pedidos filtrados, com situação e valor"
        rodape={
          total > 0
            ? `Ticket médio de ${formatarPreco(ticket)} em ${plural(total, "pedido", "pedidos")}.`
            : undefined
        }
        vazio={{
          icone: ShoppingCart,
          titulo: "Nenhum pedido com estes filtros",
          descricao:
            "Ajuste o período, a situação ou a faixa de valor para encontrar o que procura.",
          acao: (
            <LinkBotao href="/admin/pedidos" variante="secundario">
              Limpar filtros
            </LinkBotao>
          ),
        }}
      />

      {total > POR_PAGINA ? (
        <Suspense fallback={<div className="h-11" aria-hidden />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="pedido"
            rotuloPlural="pedidos"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
