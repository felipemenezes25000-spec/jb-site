import { Suspense } from "react";
import type { Metadata } from "next";
import type { TicketStatus } from "@prisma/client";
import { Inbox, LifeBuoy } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import {
  ROTULO_TICKET,
  TICKETS_NA_FILA,
  TOM_TICKET,
} from "@/components/admin/conteudo/rotulos";
import { dataDoParametro } from "@/components/admin/conteudo/consultas";
import { FiltrosLista } from "@/components/admin/filtros-lista";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { distanciaEmDias, formatarDataHora, plural } from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Suporte",
};

const POR_PAGINA = 25;

const STATUS_VALIDOS: TicketStatus[] = ["aberto", "respondido", "aguardando_cliente", "fechado"];

type LinhaDoTicket = {
  id: string;
  numero: string;
  assunto: string;
  cliente: string;
  status: TicketStatus;
  mensagens: number;
  atualizado: string;
  espera: string;
};

export default async function PaginaSuporte({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    data_de?: string;
    data_ate?: string;
    pagina?: string;
  }>;
}) {
  await exigirArea("suporte");
  const parametros = await searchParams;
  const numeroDaPagina = Math.max(1, Number(parametros.pagina) || 1);

  const busca = parametros.q?.trim();
  const status = STATUS_VALIDOS.includes(parametros.status as TicketStatus)
    ? (parametros.status as TicketStatus)
    : undefined;
  const de = dataDoParametro(parametros.data_de);
  const ate = dataDoParametro(parametros.data_ate, true);

  const where = {
    ...(status ? { status } : {}),
    ...(de || ate
      ? { createdAt: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } }
      : {}),
    ...(busca
      ? {
          OR: [
            { number: { contains: busca, mode: "insensitive" as const } },
            { subject: { contains: busca, mode: "insensitive" as const } },
            { contactName: { contains: busca, mode: "insensitive" as const } },
            { contactEmail: { contains: busca, mode: "insensitive" as const } },
            { customer: { is: { name: { contains: busca, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [tickets, total, naFila] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (numeroDaPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        number: true,
        subject: true,
        status: true,
        contactName: true,
        contactEmail: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { status: { in: TICKETS_NA_FILA } } }),
  ]);

  const linhas: LinhaDoTicket[] = tickets.map((ticket) => ({
    id: ticket.id,
    numero: ticket.number,
    assunto: ticket.subject,
    cliente: ticket.customer?.name || ticket.contactName || ticket.contactEmail || "Sem contato",
    status: ticket.status,
    mensagens: ticket._count.messages,
    atualizado: formatarDataHora(ticket.updatedAt),
    espera: distanciaEmDias(ticket.createdAt),
  }));

  const colunas: Coluna<LinhaDoTicket>[] = [
    {
      chave: "assunto",
      rotulo: "Ticket",
      renderizar: (linha) => (
        <span className="block">
          <span className="label-mono block text-xs text-graf-500">{linha.numero}</span>
          <span className="block font-semibold text-graf-900">{linha.assunto}</span>
        </span>
      ),
    },
    { chave: "cliente", rotulo: "Cliente", largura: "14rem" },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "12rem",
      renderizar: (linha) => (
        <Etiqueta tom={TOM_TICKET[linha.status]} ponto>
          {ROTULO_TICKET[linha.status]}
        </Etiqueta>
      ),
    },
    {
      chave: "mensagens",
      rotulo: "Mensagens",
      largura: "8rem",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="tabular text-graf-700">{linha.mensagens}</span>,
    },
    {
      chave: "atualizado",
      rotulo: "Última movimentação",
      largura: "14rem",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="block text-graf-600">
          {linha.atualizado}
          <span className="block text-xs text-graf-500">aberto {linha.espera}</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        titulo="Suporte ao cliente"
        descricao="Tickets abertos pelo site e pela área do cliente. Responder aqui manda um aviso para a conta de quem perguntou."
        etiqueta={
          naFila > 0 ? (
            <Etiqueta tom="alerta" ponto>
              {plural(naFila, "ticket na fila", "tickets na fila")}
            </Etiqueta>
          ) : (
            <Etiqueta tom="ok">Fila vazia</Etiqueta>
          )
        }
        acoes={
          <LinkBotao href="/admin/leads" variante="texto" tamanho="sm">
            <Inbox className="size-4" aria-hidden />
            Leads do site
          </LinkBotao>
        }
      />

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Número, assunto, cliente ou e-mail",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: STATUS_VALIDOS.map((chave) => ({
              valor: chave,
              rotulo: ROTULO_TICKET[chave],
            })),
          },
          { tipo: "periodo", nome: "data", rotulo: "Aberto entre" },
        ]}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/suporte/${linha.id}`}
        legenda="Tickets de suporte, do mais movimentado ao mais antigo"
        vazio={{
          icone: LifeBuoy,
          titulo: "Nenhum ticket com esses filtros",
          descricao:
            "Tickets aparecem aqui quando alguém pede ajuda pelo site ou pela área do cliente.",
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={numeroDaPagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="ticket"
          rotuloPlural="tickets"
        />
      </Suspense>
    </div>
  );
}
