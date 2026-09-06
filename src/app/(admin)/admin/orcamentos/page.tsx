import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, QuoteKind, QuoteStatus } from "@prisma/client";
import { CircleCheck, FileText, Plus, Send, TrendingUp } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Indicador, Indicadores } from "@/components/admin/indicador";
import {
  CabecalhoPagina,
  ORDEM_STATUS_ORCAMENTO,
  TOM_ORCAMENTO,
} from "@/components/admin/vendas/comuns";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna, type Direcao } from "@/components/ui/tabela";
import { distanciaEmDias, formatarData, formatarPreco, plural } from "@/lib/format";
import { ROTULO_ORCAMENTO, ROTULO_TIPO_ORCAMENTO } from "@/lib/orcamento";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Orçamentos",
};

/**
 * Lista de propostas.
 *
 * O número que importa nesta tela é o de propostas vivas: enviadas ou em
 * negociação, ainda dentro do prazo. É a fila que a equipe comercial precisa
 * cutucar hoje — e por isso ele fica em destaque, junto do valor que está em
 * jogo nessas propostas.
 */

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

const POR_PAGINA = 25;

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor.trim() : "";
}

export default async function OrcamentosPage({ searchParams }: { searchParams: Busca }) {
  await exigirArea("orcamentos");
  const params = await searchParams;

  const busca = texto(params.q);
  const status = texto(params.status);
  const tipo = texto(params.tipo);
  const de = texto(params.data_de);
  const ate = texto(params.data_ate);
  const ordem = texto(params.ordem) || "data";
  const direcao: Direcao = texto(params.dir) === "asc" ? "asc" : "desc";
  const pagina = Math.max(1, Number(texto(params.pagina)) || 1);

  const where: Prisma.QuoteWhereInput = {};

  if (status && ORDEM_STATUS_ORCAMENTO.includes(status as QuoteStatus)) {
    where.status = status as QuoteStatus;
  }
  if (tipo === "comercial" || tipo === "assistencia") where.kind = tipo as QuoteKind;

  if (de || ate) {
    where.createdAt = {
      ...(de ? { gte: new Date(`${de}T00:00:00-03:00`) } : {}),
      ...(ate ? { lte: new Date(`${ate}T23:59:59-03:00`) } : {}),
    };
  }

  if (busca) {
    where.OR = [
      { number: { contains: busca, mode: "insensitive" } },
      { contactName: { contains: busca, mode: "insensitive" } },
      { contactEmail: { contains: busca, mode: "insensitive" } },
      { customer: { is: { name: { contains: busca, mode: "insensitive" } } } },
      { customer: { is: { companyName: { contains: busca, mode: "insensitive" } } } },
    ];
  }

  const ordenacao: Prisma.QuoteOrderByWithRelationInput =
    ordem === "total"
      ? { totalCents: direcao }
      : ordem === "validade"
        ? { validUntil: direcao }
        : { createdAt: direcao };

  const [linhas, total, emAberto, aprovados, convertidos] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: ordenacao,
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        kind: true,
        status: true,
        totalCents: true,
        createdAt: true,
        validUntil: true,
        contactName: true,
        contactEmail: true,
        customer: { select: { id: true, name: true, companyName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.quote.count({ where }),
    prisma.quote.aggregate({
      where: { ...where, status: { in: ["enviado", "em_duvida"] } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.quote.count({ where: { ...where, status: "aprovado" } }),
    prisma.quote.count({ where: { ...where, status: "convertido" } }),
  ]);

  const decididos = aprovados + convertidos;
  const conversao = total > 0 ? Math.round((decididos / total) * 100) : 0;

  const consultaAtual = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (typeof valor === "string" && valor) consultaAtual.set(chave, valor);
  }

  function hrefOrdenar(chave: string, proxima: Direcao) {
    const novos = new URLSearchParams(consultaAtual.toString());
    novos.set("ordem", chave);
    novos.set("dir", proxima);
    novos.delete("pagina");
    return `/admin/orcamentos?${novos.toString()}`;
  }

  type Linha = (typeof linhas)[number];

  const colunas: Coluna<Linha>[] = [
    {
      chave: "numero",
      rotulo: "Proposta",
      largura: "9rem",
      renderizar: (linha) => <span className="tabular font-semibold">{linha.number}</span>,
    },
    {
      chave: "cliente",
      rotulo: "Cliente",
      renderizar: (linha) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-graf-900">
            {linha.customer?.companyName ||
              linha.customer?.name ||
              linha.contactName ||
              "Contato não informado"}
          </span>
          <span className="block truncate text-[0.8125rem] text-graf-500">
            {linha.contactEmail || "E-mail não informado"}
          </span>
        </span>
      ),
    },
    {
      chave: "tipo",
      rotulo: "Tipo",
      largura: "11rem",
      esconderNoMobile: true,
      renderizar: (linha) => ROTULO_TIPO_ORCAMENTO[linha.kind],
    },
    {
      chave: "data",
      rotulo: "Criada em",
      largura: "8rem",
      ordenavel: true,
      renderizar: (linha) => formatarData(linha.createdAt),
    },
    {
      chave: "validade",
      rotulo: "Validade",
      largura: "9rem",
      ordenavel: true,
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha.validUntil ? (
          <span
            className={
              linha.validUntil < new Date() ? "text-jb-700" : undefined
            }
          >
            {formatarData(linha.validUntil)}
            <span className="block text-[0.8125rem] text-graf-500">
              {distanciaEmDias(linha.validUntil)}
            </span>
          </span>
        ) : (
          <span className="text-graf-500">Sem prazo</span>
        ),
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
      chave: "status",
      rotulo: "Situação",
      largura: "11rem",
      renderizar: (linha) => (
        <Etiqueta tom={TOM_ORCAMENTO[linha.status]} ponto>
          {ROTULO_ORCAMENTO[linha.status]}
        </Etiqueta>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Orçamentos"
        apoio="Propostas comerciais e de assistência, da montagem à aprovação."
        acoes={
          <LinkBotao href="/admin/orcamentos/novo">
            <Plus className="size-4" aria-hidden />
            Novo orçamento
          </LinkBotao>
        }
      />

      <Indicadores>
        <Indicador rotulo="Propostas no filtro" valor={total} icone={FileText} />
        <Indicador
          rotulo="Em aberto"
          valor={emAberto._count}
          icone={Send}
          tom={emAberto._count > 0 ? "aviso" : "neutro"}
          detalhe="Enviadas ou em negociação"
        />
        <Indicador
          rotulo="Valor em jogo"
          valor={formatarPreco(emAberto._sum.totalCents ?? 0)}
          tom="marca"
          detalhe="Soma das propostas em aberto"
        />
        <Indicador
          rotulo="Fechamento"
          valor={`${conversao}%`}
          icone={total > 0 ? TrendingUp : CircleCheck}
          tom={conversao >= 50 ? "ok" : "neutro"}
          detalhe={`${plural(decididos, "proposta fechada", "propostas fechadas")} de ${total}`}
        />
      </Indicadores>

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número, cliente ou e-mail do contato",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: ORDEM_STATUS_ORCAMENTO.map((s) => ({
              valor: s,
              rotulo: ROTULO_ORCAMENTO[s],
            })),
          },
          {
            tipo: "selecao",
            nome: "tipo",
            rotulo: "Tipo",
            todos: "Todos",
            opcoes: [
              { valor: "comercial", rotulo: ROTULO_TIPO_ORCAMENTO.comercial },
              { valor: "assistencia", rotulo: ROTULO_TIPO_ORCAMENTO.assistencia },
            ],
          },
          { tipo: "periodo", nome: "data", rotulo: "Período" },
        ]}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/orcamentos/${linha.id}`}
        ordenacao={{ chave: ordem, direcao }}
        hrefOrdenar={hrefOrdenar}
        legenda="Orçamentos com cliente, validade, valor e situação"
        vazio={{
          icone: FileText,
          titulo: "Nenhuma proposta com estes filtros",
          descricao: "Monte um orçamento com preço negociado e envie para aprovação do cliente.",
          acao: <LinkBotao href="/admin/orcamentos/novo">Novo orçamento</LinkBotao>,
        }}
      />

      {total > POR_PAGINA ? (
        <Suspense fallback={<div className="h-11" aria-hidden />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="proposta"
            rotuloPlural="propostas"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
