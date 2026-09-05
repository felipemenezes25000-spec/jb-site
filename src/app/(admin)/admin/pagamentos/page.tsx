import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentMethod, type PaymentStatus, type Prisma } from "@prisma/client";
import { CircleAlert, CreditCard, ShoppingCart, Wallet } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Indicador, Indicadores } from "@/components/admin/indicador";
import {
  CabecalhoPagina,
  ORDEM_STATUS_PAGAMENTO,
  ROTULO_METODO,
  ROTULO_PAGAMENTO,
  TOM_PAGAMENTO,
  rotuloProvedor,
} from "@/components/admin/vendas/comuns";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Aviso } from "@/components/ui/aviso";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna, type Direcao } from "@/components/ui/tabela";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { pagamentoEhSimulado } from "@/lib/pagamento";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pagamentos",
};

/**
 * Lista de cobranças.
 *
 * Uma cobrança não é a mesma coisa que um pedido: o mesmo pedido pode ter um Pix
 * expirado, um cartão recusado e um Pix aprovado. Esta tela mostra as
 * tentativas, e é por ela que se descobre por que um pedido não consta pago.
 */

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

const POR_PAGINA = 30;

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor.trim() : "";
}

const ORDENAVEIS: Record<string, keyof Prisma.PaymentOrderByWithRelationInput> = {
  data: "createdAt",
  valor: "amountCents",
  status: "status",
};

export default async function PagamentosPage({ searchParams }: { searchParams: Busca }) {
  await exigirArea("pedidos");
  const params = await searchParams;

  const busca = texto(params.q);
  const status = texto(params.status);
  const metodo = texto(params.metodo);
  const de = texto(params.data_de);
  const ate = texto(params.data_ate);
  const ordem = texto(params.ordem) || "data";
  const direcao: Direcao = texto(params.dir) === "asc" ? "asc" : "desc";
  const pagina = Math.max(1, Number(texto(params.pagina)) || 1);

  const where: Prisma.PaymentWhereInput = {};

  if (status && ORDEM_STATUS_PAGAMENTO.includes(status as PaymentStatus)) {
    where.status = status as PaymentStatus;
  }
  if (metodo && metodo in ROTULO_METODO) where.method = metodo as PaymentMethod;

  if (de || ate) {
    where.createdAt = {
      ...(de ? { gte: new Date(`${de}T00:00:00-03:00`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59-03:00`) } : {}),
    };
  }

  if (busca) {
    where.OR = [
      { externalId: { contains: busca, mode: "insensitive" } },
      { provider: { contains: busca, mode: "insensitive" } },
      { order: { is: { number: { contains: busca, mode: "insensitive" } } } },
      { order: { is: { buyerName: { contains: busca, mode: "insensitive" } } } },
      { order: { is: { buyerEmail: { contains: busca, mode: "insensitive" } } } },
    ];
  }

  const [linhas, total, aprovado, aguardando, problemas] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { [ORDENAVEIS[ordem] ?? "createdAt"]: direcao },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        status: true,
        method: true,
        provider: true,
        amountCents: true,
        installments: true,
        createdAt: true,
        externalId: true,
        order: { select: { id: true, number: true, buyerName: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { ...where, status: "aprovado" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.count({ where: { ...where, status: { in: ["criado", "pendente", "em_analise"] } } }),
    prisma.payment.count({
      where: { ...where, status: { in: ["recusado", "estornado", "cancelado", "expirado"] } },
    }),
  ]);

  const consultaAtual = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (typeof valor === "string" && valor) consultaAtual.set(chave, valor);
  }

  function hrefOrdenar(chave: string, proxima: Direcao) {
    const novos = new URLSearchParams(consultaAtual.toString());
    novos.set("ordem", chave);
    novos.set("dir", proxima);
    novos.delete("pagina");
    return `/admin/pagamentos?${novos.toString()}`;
  }

  type Linha = (typeof linhas)[number];

  const colunas: Coluna<Linha>[] = [
    {
      chave: "pedido",
      rotulo: "Pedido",
      largura: "10rem",
      renderizar: (linha) => (
        <span className="block min-w-0">
          <span className="tabular block font-semibold">{linha.order.number}</span>
          <span className="block truncate text-xs text-graf-500">{linha.order.buyerName}</span>
        </span>
      ),
    },
    {
      chave: "data",
      rotulo: "Criada em",
      largura: "11rem",
      ordenavel: true,
      renderizar: (linha) => formatarDataHora(linha.createdAt),
    },
    {
      chave: "metodo",
      rotulo: "Forma",
      largura: "10rem",
      renderizar: (linha) => (
        <span className="block">
          {ROTULO_METODO[linha.method]}
          {linha.installments > 1 ? (
            <span className="block text-xs text-graf-500">{linha.installments}x</span>
          ) : null}
        </span>
      ),
    },
    {
      chave: "provedor",
      rotulo: "Provedor",
      largura: "10rem",
      esconderNoMobile: true,
      renderizar: (linha) => rotuloProvedor(linha.provider),
    },
    {
      chave: "valor",
      rotulo: "Valor",
      largura: "9rem",
      alinhamento: "direita",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="tabular font-semibold text-graf-900">
          {formatarPreco(linha.amountCents)}
        </span>
      ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "10rem",
      ordenavel: true,
      renderizar: (linha) => (
        <Etiqueta tom={TOM_PAGAMENTO[linha.status]} ponto>
          {ROTULO_PAGAMENTO[linha.status]}
        </Etiqueta>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Pagamentos"
        apoio="Cada tentativa de cobrança feita pela loja, aprovada ou não."
        acoes={
          <LinkBotao href="/admin/pedidos" variante="secundario" tamanho="sm">
            <ShoppingCart className="size-4" aria-hidden />
            Pedidos
          </LinkBotao>
        }
      />

      {pagamentoEhSimulado() ? (
        <Aviso tom="atencao" titulo="Provedor de teste em uso">
          Este ambiente está com o provedor simulado: nenhuma cobrança aqui é real e nenhum valor
          entrou na conta da JB. Para cobrar de verdade, configure `PAYMENT_PROVIDER` e as
          credenciais do adquirente.
        </Aviso>
      ) : null}

      <Indicadores>
        <Indicador rotulo="Cobranças no filtro" valor={total} icone={CreditCard} />
        <Indicador
          rotulo="Aprovado"
          valor={formatarPreco(aprovado._sum.amountCents ?? 0)}
          icone={Wallet}
          tom="ok"
          detalhe={`${aprovado._count} cobrança(s) confirmada(s)`}
        />
        <Indicador
          rotulo="Aguardando"
          valor={aguardando}
          tom={aguardando > 0 ? "aviso" : "neutro"}
          detalhe="Criadas, pendentes ou em análise"
        />
        <Indicador
          rotulo="Recusadas e estornadas"
          valor={problemas}
          icone={CircleAlert}
          tom={problemas > 0 ? "marca" : "neutro"}
        />
      </Indicadores>

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número do pedido, comprador ou id do provedor",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: ORDEM_STATUS_PAGAMENTO.map((s) => ({
              valor: s,
              rotulo: ROTULO_PAGAMENTO[s],
            })),
          },
          {
            tipo: "selecao",
            nome: "metodo",
            rotulo: "Forma",
            todos: "Todas",
            opcoes: (["pix", "cartao", "boleto", "manual"] as PaymentMethod[]).map((m) => ({
              valor: m,
              rotulo: ROTULO_METODO[m],
            })),
          },
          { tipo: "periodo", nome: "data", rotulo: "Período" },
        ]}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/pagamentos/${linha.id}`}
        ordenacao={{ chave: ordem, direcao }}
        hrefOrdenar={hrefOrdenar}
        legenda="Cobranças com forma de pagamento, provedor e situação"
        vazio={{
          icone: CreditCard,
          titulo: "Nenhuma cobrança com estes filtros",
          descricao:
            "Pedidos pagos por transferência ou dinheiro aparecem aqui como registro manual.",
          acao: (
            <LinkBotao href="/admin/pagamentos" variante="secundario">
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
            rotuloSingular="cobrança"
            rotuloPlural="cobranças"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
