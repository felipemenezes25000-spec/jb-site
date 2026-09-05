import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ContractStatus, Prisma } from "@prisma/client";
import { FileSignature, Plus } from "lucide-react";

import { FiltrosLista } from "@/components/admin/filtros-lista";
import {
  CabecalhoPagina,
  subnavServico,
  SubNavegacao,
} from "@/components/admin/servico/cabecalho";
import { EtiquetaContrato } from "@/components/admin/servico/etiquetas";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { formatarData, formatarPreco, plural } from "@/lib/format";
import { ROTULO_CONTRATO, STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Contratos de manutenção",
};

/**
 * Contratos de manutenção preventiva.
 *
 * A coluna "visitas" mostra o que ainda vai acontecer sobre o total gerado:
 * é a leitura que responde "esse contrato está sendo cumprido?" sem precisar
 * abrir a ficha.
 */

const POR_PAGINA = 25;

type Busca = { q?: string; status?: string; pagina?: string };

type LinhaContrato = {
  id: string;
  number: string;
  status: ContractStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  priceCents: number;
  customer: { id: string; name: string };
  plan: { name: string } | null;
  _count: { items: number; visits: number };
  visitasAbertas: number;
};

export default async function PaginaContratos({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const usuario = await exigirArea("manutencao");
  const busca = await searchParams;
  const editar = podeEditar(usuario, "manutencao");

  const pagina = Math.max(1, Number(busca.pagina) || 1);

  const condicoes: Prisma.MaintenanceContractWhereInput[] = [];

  const texto = busca.q?.trim();
  if (texto) {
    condicoes.push({
      OR: [
        { number: { contains: texto, mode: "insensitive" } },
        { customer: { name: { contains: texto, mode: "insensitive" } } },
        { plan: { name: { contains: texto, mode: "insensitive" } } },
      ],
    });
  }

  if (busca.status) condicoes.push({ status: busca.status as ContractStatus });

  const where: Prisma.MaintenanceContractWhereInput =
    condicoes.length > 0 ? { AND: condicoes } : {};

  const [total, contratos] = await Promise.all([
    prisma.maintenanceContract.count({ where }),
    prisma.maintenanceContract.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        status: true,
        startsAt: true,
        endsAt: true,
        priceCents: true,
        customer: { select: { id: true, name: true } },
        plan: { select: { name: true } },
        _count: { select: { items: true, visits: true } },
      },
    }),
  ]);

  // uma consulta agrupada em vez de um count por linha
  const abertasPorContrato =
    contratos.length === 0
      ? []
      : await prisma.maintenanceVisit.groupBy({
          by: ["contractId"],
          where: {
            contractId: { in: contratos.map((contrato) => contrato.id) },
            status: { in: STATUS_VISITA_ABERTOS },
          },
          _count: { _all: true },
        });

  const abertas = new Map(
    abertasPorContrato.map((linha) => [linha.contractId ?? "", linha._count._all]),
  );

  const linhas: LinhaContrato[] = contratos.map((contrato) => ({
    ...contrato,
    visitasAbertas: abertas.get(contrato.id) ?? 0,
  }));

  const colunas: Coluna<LinhaContrato>[] = [
    {
      chave: "number",
      rotulo: "Contrato",
      largura: "14rem",
      renderizar: (linha) => (
        <span className="block">
          <span className="label-mono block text-graf-500">{linha.number}</span>
          <span className="block truncate font-semibold text-graf-900">
            {linha.customer.name}
          </span>
        </span>
      ),
    },
    {
      chave: "plano",
      rotulo: "Plano",
      renderizar: (linha) =>
        linha.plan?.name ?? <span className="text-graf-500">Sem plano vinculado</span>,
    },
    {
      chave: "vigencia",
      rotulo: "Vigência",
      largura: "13rem",
      renderizar: (linha) =>
        linha.startsAt || linha.endsAt ? (
          <span className="block text-sm">
            {formatarData(linha.startsAt)} — {formatarData(linha.endsAt)}
          </span>
        ) : (
          <span className="text-graf-500">Sem datas definidas</span>
        ),
    },
    {
      chave: "equipamentos",
      rotulo: "Cobertura",
      largura: "12rem",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="block text-sm">
          <span className="block">
            {plural(linha._count.items, "equipamento", "equipamentos")}
          </span>
          <span className="block text-xs text-graf-500">
            {linha._count.visits === 0
              ? "sem visitas geradas"
              : `${linha.visitasAbertas} de ${linha._count.visits} visitas em aberto`}
          </span>
        </span>
      ),
    },
    {
      chave: "priceCents",
      rotulo: "Valor",
      largura: "8rem",
      alinhamento: "direita",
      renderizar: (linha) => (
        <span className="tabular font-semibold">{formatarPreco(linha.priceCents)}</span>
      ),
    },
    {
      chave: "status",
      rotulo: "Status",
      largura: "9rem",
      renderizar: (linha) => <EtiquetaContrato status={linha.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Contratos de manutenção"
        descricao="Cobertura preventiva por cliente, com a agenda de visitas do período."
        acoes={
          editar ? (
            <LinkBotao href="/admin/manutencao/contratos/novo" variante="primario" tamanho="md">
              <Plus className="size-4" aria-hidden />
              Novo contrato
            </LinkBotao>
          ) : null
        }
      />

      <SubNavegacao itens={subnavServico(usuario)} atual="/admin/manutencao/contratos" />

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número do contrato, cliente ou plano",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Status",
            opcoes: (Object.keys(ROTULO_CONTRATO) as ContractStatus[]).map((status) => ({
              valor: status,
              rotulo: ROTULO_CONTRATO[status],
            })),
          },
        ]}
      />

      <Tabela<LinhaContrato>
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/manutencao/contratos/${linha.id}`}
        legenda="Contratos de manutenção preventiva"
        vazio={{
          icone: FileSignature,
          titulo: "Nenhum contrato com esses filtros",
          descricao:
            "Um contrato cobre os equipamentos escolhidos e já nasce com a agenda de visitas do período inteiro.",
          acao: editar ? (
            <LinkBotao href="/admin/manutencao/contratos/novo" variante="primario" tamanho="sm">
              Criar o primeiro contrato
            </LinkBotao>
          ) : (
            <Link
              href="/admin/manutencao/contratos"
              className="text-sm font-semibold text-jb-700 hover:text-jb-500"
            >
              Limpar filtros
            </Link>
          ),
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="contrato"
          rotuloPlural="contratos"
        />
      </Suspense>
    </div>
  );
}
