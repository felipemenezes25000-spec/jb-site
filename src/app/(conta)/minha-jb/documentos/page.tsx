import { Suspense } from "react";
import type { Metadata } from "next";
import type { DocumentKind, Prisma } from "@prisma/client";
import { Download, FileText } from "lucide-react";

import {
  Filtros,
  paginaDaUrl,
  primeiroValor,
  type GrupoFiltro,
} from "@/components/conta/mj-filtros";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { exigirCliente } from "@/lib/auth-cliente";
import { ROTULO_DOCUMENTO } from "@/lib/equipamento";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Documentos",
  description: "Notas fiscais, laudos, certificados e contratos da sua conta.",
  robots: { index: false, follow: false },
};

const POR_PAGINA = 20;

const TIPOS: DocumentKind[] = [
  "nota_fiscal",
  "pedido",
  "orcamento",
  "ordem_servico",
  "laudo",
  "certificado",
  "manual",
  "garantia",
  "contrato",
  "outro",
];

function ehTipo(valor: string): valor is DocumentKind {
  return (TIPOS as string[]).includes(valor);
}

function formatarTamanho(bytes: number) {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

type LinhaDocumento = {
  id: string;
  title: string;
  kind: DocumentKind;
  size: number;
  createdAt: Date;
  origem: string;
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function DocumentosPage({ searchParams }: { searchParams: Busca }) {
  const [cliente, params] = await Promise.all([
    exigirCliente("/minha-jb/documentos"),
    searchParams,
  ]);

  const tipo = primeiroValor(params.tipo);
  const pagina = paginaDaUrl(params.pagina);

  const filtro: Prisma.DocumentWhereInput = {
    customerId: cliente.id,
    ...(ehTipo(tipo) ? { kind: tipo } : {}),
  };

  const [total, documentos, contagens] = await Promise.all([
    prisma.document.count({ where: filtro }),
    prisma.document.findMany({
      where: filtro,
      orderBy: { createdAt: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        title: true,
        kind: true,
        size: true,
        createdAt: true,
        order: { select: { number: true } },
        equipment: { select: { name: true } },
        workOrder: { select: { number: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["kind"],
      where: { customerId: cliente.id },
      _count: { _all: true },
    }),
  ]);

  const porTipo = new Map(contagens.map((linha) => [linha.kind, linha._count._all]));
  const totalGeral = contagens.reduce((soma, linha) => soma + linha._count._all, 0);

  const grupos: GrupoFiltro[] = [
    {
      nome: "tipo",
      rotulo: "Tipo de documento",
      opcoes: [
        { valor: "", rotulo: "Todos", quantidade: totalGeral },
        ...TIPOS.filter((chave) => (porTipo.get(chave) ?? 0) > 0).map((chave) => ({
          valor: chave,
          rotulo: ROTULO_DOCUMENTO[chave],
          quantidade: porTipo.get(chave) ?? 0,
        })),
      ],
    },
  ];

  const linhas: LinhaDocumento[] = documentos.map((documento) => ({
    id: documento.id,
    title: documento.title,
    kind: documento.kind,
    size: documento.size,
    createdAt: documento.createdAt,
    origem: documento.order
      ? `Pedido ${documento.order.number}`
      : documento.workOrder
        ? `OS ${documento.workOrder.number}`
        : (documento.equipment?.name ?? "Conta"),
  }));

  const colunas: Coluna<LinhaDocumento>[] = [
    { chave: "title", rotulo: "Documento" },
    {
      chave: "kind",
      rotulo: "Tipo",
      largura: "11rem",
      renderizar: (linha) => ROTULO_DOCUMENTO[linha.kind],
    },
    { chave: "origem", rotulo: "Vinculado a", largura: "12rem", esconderNoMobile: true },
    {
      chave: "createdAt",
      rotulo: "Emitido em",
      largura: "9rem",
      renderizar: (linha) => formatarData(linha.createdAt),
    },
    {
      chave: "size",
      rotulo: "Tamanho",
      largura: "7rem",
      esconderNoMobile: true,
      renderizar: (linha) => formatarTamanho(linha.size),
    },
    {
      chave: "baixar",
      rotulo: "Arquivo",
      alinhamento: "direita",
      largura: "8rem",
      renderizar: (linha) => (
        <a
          href={`/minha-jb/documentos/${linha.id}/baixar`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <Download className="size-4" aria-hidden />
          Baixar
          <span className="sr-only"> {linha.title}</span>
        </a>
      ),
    },
  ];

  const filtrando = Boolean(tipo);

  return (
    <div>
      <Topo
        titulo="Documentos"
        descricao="Notas fiscais, laudos técnicos, certificados e contratos. Tudo guardado na sua conta e disponível para download quando você precisar."
      />

      {totalGeral > 0 ? (
        <Filtros base="/minha-jb/documentos" parametros={{ tipo }} grupos={grupos} />
      ) : null}

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        legenda="Documentos da sua conta, do mais recente para o mais antigo"
        vazio={{
          icone: FileText,
          titulo: filtrando ? "Nenhum documento deste tipo" : "Nenhum documento por aqui",
          descricao: filtrando
            ? "Escolha outro tipo para ver o restante dos seus documentos."
            : "Nota fiscal de pedido, laudo de ordem de serviço e certificado de manutenção aparecem aqui automaticamente quando a equipe da JB os emite.",
          acao: filtrando ? (
            <LinkBotao href="/minha-jb/documentos" variante="secundario">
              Ver todos os documentos
            </LinkBotao>
          ) : (
            <LinkBotao href="/minha-jb/pedidos" variante="secundario">
              Ver meus pedidos
            </LinkBotao>
          ),
        }}
      />

      {total > POR_PAGINA ? (
        <Suspense fallback={<Esqueleto className="mt-6 h-11 w-full" />}>
          <Paginacao
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={total}
            rotuloSingular="documento"
            rotuloPlural="documentos"
            className="mt-6"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
