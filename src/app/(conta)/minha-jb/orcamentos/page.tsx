import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { FileText } from "lucide-react";

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
import { formatarData, formatarPreco } from "@/lib/format";
import { ROTULO_ORCAMENTO, STATUS_ORCAMENTO_ABERTOS } from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Meus orçamentos",
  description: "Propostas comerciais e de assistência técnica.",
  robots: { index: false, follow: false },
};

const POR_PAGINA = 10;

const SITUACOES = {
  aguardando: { rotulo: "Aguardando você", status: STATUS_ORCAMENTO_ABERTOS },
  aprovado: {
    rotulo: "Aprovados",
    status: ["aprovado", "convertido"] as QuoteStatus[],
  },
  encerrado: {
    rotulo: "Recusados e vencidos",
    status: ["recusado", "expirado"] as QuoteStatus[],
  },
} satisfies Record<string, { rotulo: string; status: QuoteStatus[] }>;

type ChaveSituacao = keyof typeof SITUACOES;

function ehSituacao(valor: string): valor is ChaveSituacao {
  return valor in SITUACOES;
}

function tomDoOrcamento(status: QuoteStatus) {
  if (status === "aprovado" || status === "convertido") return "ok" as const;
  if (status === "recusado" || status === "expirado") return "neutro" as const;
  if (status === "rascunho") return "neutro" as const;
  return "aguardando" as const;
}

type LinhaOrcamento = {
  id: string;
  number: string;
  tipo: string;
  status: QuoteStatus;
  totalCents: number;
  validUntil: Date | null;
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function OrcamentosPage({ searchParams }: { searchParams: Busca }) {
  const [cliente, params] = await Promise.all([
    exigirCliente("/minha-jb/orcamentos"),
    searchParams,
  ]);

  const situacao = primeiroValor(params.situacao);
  const numero = primeiroValor(params.numero).slice(0, 40);
  const pagina = paginaDaUrl(params.pagina);

  // rascunho é documento interno: enquanto a equipe monta, nada aparece aqui
  const base: Prisma.QuoteWhereInput = {
    customerId: cliente.id,
    status: { not: "rascunho" },
  };

  const filtro: Prisma.QuoteWhereInput = {
    ...base,
    ...(ehSituacao(situacao) ? { status: { in: SITUACOES[situacao].status } } : {}),
    ...(numero ? { number: { contains: numero, mode: "insensitive" } } : {}),
  };

  const [total, orcamentos, contagens] = await Promise.all([
    prisma.quote.count({ where: filtro }),
    prisma.quote.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        kind: true,
        status: true,
        totalCents: true,
        validUntil: true,
      },
    }),
    prisma.quote.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
    }),
  ]);

  const porStatus = new Map(contagens.map((linha) => [linha.status, linha._count._all]));
  const totalGeral = contagens.reduce((soma, linha) => soma + linha._count._all, 0);

  const grupos: GrupoFiltro[] = [
    {
      nome: "situacao",
      rotulo: "Situação da proposta",
      opcoes: [
        { valor: "", rotulo: "Todas", quantidade: totalGeral },
        ...(Object.keys(SITUACOES) as ChaveSituacao[]).map((chave) => ({
          valor: chave,
          rotulo: SITUACOES[chave].rotulo,
          quantidade: SITUACOES[chave].status.reduce(
            (soma, status) => soma + (porStatus.get(status) ?? 0),
            0,
          ),
        })),
      ],
    },
  ];

  const linhas: LinhaOrcamento[] = orcamentos.map((orcamento) => ({
    id: orcamento.id,
    number: orcamento.number,
    tipo: orcamento.kind === "assistencia" ? "Assistência técnica" : "Comercial",
    status: orcamento.status,
    totalCents: orcamento.totalCents,
    validUntil: orcamento.validUntil,
  }));

  const colunas: Coluna<LinhaOrcamento>[] = [
    { chave: "number", rotulo: "Orçamento", largura: "11rem" },
    { chave: "tipo", rotulo: "Tipo", largura: "12rem" },
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
      chave: "validUntil",
      rotulo: "Válido até",
      largura: "9rem",
      esconderNoMobile: true,
      renderizar: (linha) =>
        linha.validUntil ? formatarData(linha.validUntil) : "Sem prazo definido",
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "12rem",
      renderizar: (linha) => (
        <Etiqueta tom={tomDoOrcamento(linha.status)}>
          {ROTULO_ORCAMENTO[linha.status]}
        </Etiqueta>
      ),
    },
  ];

  const filtrando = Boolean(situacao || numero);

  return (
    <div>
      <Topo
        titulo="Meus orçamentos"
        descricao="Propostas enviadas pela equipe: equipamentos, peças e serviços de assistência. Aprovar ou recusar é feito aqui mesmo, com registro de data e hora."
      />

      <Filtros
        base="/minha-jb/orcamentos"
        parametros={{ situacao, numero }}
        grupos={grupos}
        busca={{
          nome: "numero",
          rotulo: "Buscar por número",
          placeholder: "Ex.: ORC-002841",
        }}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/minha-jb/orcamentos/${linha.number}`}
        legenda="Orçamentos da sua conta, do mais recente para o mais antigo"
        vazio={{
          icone: FileText,
          titulo: filtrando ? "Nenhuma proposta neste recorte" : "Nenhum orçamento por aqui",
          descricao: filtrando
            ? "Tente outro filtro ou limpe a busca para ver todas as propostas."
            : "Quando a equipe montar uma proposta para você — de equipamento ou de reparo —, ela aparece aqui para aprovar ou recusar.",
          acao: filtrando ? (
            <LinkBotao href="/minha-jb/orcamentos" variante="secundario">
              Ver todas as propostas
            </LinkBotao>
          ) : (
            <LinkBotao href="/orcamento">Pedir um orçamento</LinkBotao>
          ),
        }}
      />

      {total > POR_PAGINA ? (
        <Suspense fallback={<Esqueleto className="mt-6 h-11 w-full" />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="orçamento"
            rotuloPlural="orçamentos"
            className="mt-6"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
