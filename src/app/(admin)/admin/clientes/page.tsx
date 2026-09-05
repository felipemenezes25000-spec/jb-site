import { Suspense } from "react";
import type { Metadata } from "next";
import type { PersonType, Prisma } from "@prisma/client";
import { Building2, UserPlus, Users } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Indicador, Indicadores } from "@/components/admin/indicador";
import { CabecalhoPagina } from "@/components/admin/vendas/comuns";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna, type Direcao } from "@/components/ui/tabela";
import {
  formatarData,
  formatarDocumento,
  formatarPreco,
  formatarTelefone,
  somenteDigitos,
} from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Clientes",
};

/**
 * Lista de clientes.
 *
 * O "total comprado" não sai de um campo guardado no cadastro — ele é somado na
 * hora, só dos pedidos efetivamente pagos e não cancelados, e apenas para os
 * clientes desta página. Guardar o total no cadastro criaria um número que
 * envelhece sozinho toda vez que um pedido é estornado.
 */

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

const POR_PAGINA = 30;

function texto(valor: string | string[] | undefined) {
  return typeof valor === "string" ? valor.trim() : "";
}

export default async function ClientesPage({ searchParams }: { searchParams: Busca }) {
  await exigirArea("clientes");
  const params = await searchParams;

  const busca = texto(params.q);
  const tipo = texto(params.tipo);
  const situacao = texto(params.situacao);
  const ordem = texto(params.ordem) || "cadastro";
  const direcao: Direcao = texto(params.dir) === "asc" ? "asc" : "desc";
  const pagina = Math.max(1, Number(texto(params.pagina)) || 1);

  const where: Prisma.CustomerWhereInput = {};

  if (tipo === "fisica" || tipo === "juridica") where.personType = tipo as PersonType;
  if (situacao === "ativos") where.active = true;
  if (situacao === "inativos") where.active = false;

  if (busca) {
    const digitos = somenteDigitos(busca);
    where.OR = [
      { name: { contains: busca, mode: "insensitive" } },
      { email: { contains: busca, mode: "insensitive" } },
      { companyName: { contains: busca, mode: "insensitive" } },
      { tradeName: { contains: busca, mode: "insensitive" } },
      ...(digitos.length >= 3 ? [{ document: { contains: digitos } }] : []),
      ...(digitos.length >= 3 ? [{ phone: { contains: digitos } }] : []),
    ];
  }

  const ordenacao: Prisma.CustomerOrderByWithRelationInput =
    ordem === "nome" ? { name: direcao } : { createdAt: direcao };

  const inicioDoMes = new Date();
  inicioDoMes.setUTCDate(1);
  inicioDoMes.setUTCHours(3, 0, 0, 0);

  const [clientes, total, ativos, juridicas, novos] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: ordenacao,
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        personType: true,
        companyName: true,
        active: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.customer.count({ where }),
    prisma.customer.count({ where: { ...where, active: true } }),
    prisma.customer.count({ where: { ...where, personType: "juridica" } }),
    prisma.customer.count({ where: { ...where, createdAt: { gte: inicioDoMes } } }),
  ]);

  // total comprado só dos clientes desta página, direto dos pedidos pagos
  const compras = clientes.length
    ? await prisma.order.groupBy({
        by: ["customerId"],
        where: {
          customerId: { in: clientes.map((cliente) => cliente.id) },
          paidAt: { not: null },
          status: { notIn: ["cancelado", "reembolsado"] },
        },
        _sum: { totalCents: true },
      })
    : [];

  const compradoPor = new Map(
    compras.map((linha) => [linha.customerId, linha._sum.totalCents ?? 0]),
  );

  const consultaAtual = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (typeof valor === "string" && valor) consultaAtual.set(chave, valor);
  }

  function hrefOrdenar(chave: string, proxima: Direcao) {
    const novos = new URLSearchParams(consultaAtual.toString());
    novos.set("ordem", chave);
    novos.set("dir", proxima);
    novos.delete("pagina");
    return `/admin/clientes?${novos.toString()}`;
  }

  type Linha = (typeof clientes)[number];

  const colunas: Coluna<Linha>[] = [
    {
      chave: "nome",
      rotulo: "Cliente",
      ordenavel: true,
      renderizar: (linha) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-graf-900">
            {linha.companyName || linha.name}
          </span>
          <span className="block truncate text-xs text-graf-500">{linha.email}</span>
        </span>
      ),
    },
    {
      chave: "telefone",
      rotulo: "Telefone",
      largura: "10rem",
      renderizar: (linha) => (linha.phone ? formatarTelefone(linha.phone) : "—"),
    },
    {
      chave: "documento",
      rotulo: "Documento",
      largura: "11rem",
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha.document ? (
          <span className="tabular">{formatarDocumento(linha.document)}</span>
        ) : (
          "—"
        ),
    },
    {
      chave: "pedidos",
      rotulo: "Pedidos",
      largura: "5.5rem",
      alinhamento: "centro",
      renderizar: (linha) => <span className="tabular">{linha._count.orders}</span>,
    },
    {
      chave: "comprado",
      rotulo: "Comprado",
      largura: "9rem",
      alinhamento: "direita",
      renderizar: (linha) => (
        <span className="tabular font-semibold text-graf-900">
          {formatarPreco(compradoPor.get(linha.id) ?? 0)}
        </span>
      ),
    },
    {
      chave: "cadastro",
      rotulo: "Cadastro",
      largura: "8rem",
      ordenavel: true,
      esconderNoMobile: true,
      renderizar: (linha) => formatarData(linha.createdAt),
    },
    {
      chave: "situacao",
      rotulo: "Situação",
      largura: "7rem",
      renderizar: (linha) =>
        linha.active ? (
          <Etiqueta tom="ok">Ativo</Etiqueta>
        ) : (
          <Etiqueta tom="neutro">Inativo</Etiqueta>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Clientes"
        apoio="Cadastro, histórico de compras, equipamentos e chamados."
        acoes={
          <LinkBotao href="/admin/orcamentos/novo" variante="secundario" tamanho="sm">
            <UserPlus className="size-4" aria-hidden />
            Novo orçamento
          </LinkBotao>
        }
      />

      <Indicadores>
        <Indicador rotulo="Clientes no filtro" valor={total} icone={Users} />
        <Indicador rotulo="Contas ativas" valor={ativos} tom="ok" />
        <Indicador rotulo="Pessoa jurídica" valor={juridicas} icone={Building2} />
        <Indicador
          rotulo="Cadastrados neste mês"
          valor={novos}
          tom={novos > 0 ? "marca" : "neutro"}
        />
      </Indicadores>

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Nome, e-mail, CPF/CNPJ ou telefone",
          },
          {
            tipo: "selecao",
            nome: "tipo",
            rotulo: "Tipo",
            todos: "Todos",
            opcoes: [
              { valor: "fisica", rotulo: "Pessoa física" },
              { valor: "juridica", rotulo: "Pessoa jurídica" },
            ],
          },
          {
            tipo: "selecao",
            nome: "situacao",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: [
              { valor: "ativos", rotulo: "Somente ativos" },
              { valor: "inativos", rotulo: "Somente inativos" },
            ],
          },
        ]}
      />

      <Tabela
        colunas={colunas}
        linhas={clientes}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/clientes/${linha.id}`}
        ordenacao={{ chave: ordem, direcao }}
        hrefOrdenar={hrefOrdenar}
        legenda="Clientes com contato, documento e total comprado"
        vazio={{
          icone: Users,
          titulo: "Nenhum cliente com estes filtros",
          descricao: "Clientes entram no cadastro ao criar conta ou ao fechar o primeiro pedido.",
          acao: (
            <LinkBotao href="/admin/clientes" variante="secundario">
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
            rotuloSingular="cliente"
            rotuloPlural="clientes"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
