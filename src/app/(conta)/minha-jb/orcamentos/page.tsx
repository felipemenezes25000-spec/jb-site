import { Suspense } from "react";
import type { Metadata } from "next";
import type { Prisma, QuoteStatus } from "@prisma/client";
import { FileText, Inbox, Send } from "lucide-react";

import {
  Filtros,
  paginaDaUrl,
  primeiroValor,
  type GrupoFiltro,
} from "@/components/conta/mj-filtros";
import { Topo } from "@/components/conta/mj-topo";
import { AbasPorUrl, type Aba } from "@/components/ui/abas";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { exigirCliente } from "@/lib/auth-cliente";
import { formatarData, formatarPreco, plural } from "@/lib/format";
import {
  ROTULO_ORCAMENTO,
  STATUS_ORCAMENTO_ABERTOS,
  STATUS_ORCAMENTO_VISIVEIS,
} from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Meus orçamentos",
  description: "Propostas comerciais e de assistência técnica.",
  robots: { index: false, follow: false },
};

/* ============================================================================
   Duas coisas diferentes com o mesmo nome

   Esta tela misturava, na mesma tabela, o que a clínica PEDIU e o que a JB
   RESPONDEU. As duas se chamam "orçamento" em português e são registros
   diferentes em tudo o que importa:

     · Um **pedido** é o formulário que a pessoa enviou pelo /orcamento. Não tem
       preço — ninguém montou proposta ainda —, não tem validade, e a única
       pergunta que ele responde é "chegou?".
     · Uma **proposta** é o que a equipe devolveu. Tem total, tem prazo, e pede
       uma decisão: aprovar ou recusar.

   Juntas numa tabela com as colunas de proposta, o pedido aparecia com "Total:
   R$ 0,00" e "Válido até: Sem prazo definido". A clínica lia que a JB tinha
   orçado o equipamento em zero reais. A coluna estava certa; a tabela é que
   não era dele.

   Separar em duas abas não é organização visual: é parar de responder com
   número o que ainda não tem número.

   Os pedidos vêm primeiro porque são o começo da conversa — e porque foram o
   lado invisível desta tela por mais tempo. O contador ao lado de cada aba faz
   a outra ficar a um clique, e nenhuma das duas some por estar vazia.
   ============================================================================ */

const POR_PAGINA = 10;

/**
 * Quantos pedidos em análise a aba lista sem paginar.
 *
 * Pedido é transitório: ele vira proposta em dias. Uma clínica com mais de
 * vinte esperando ao mesmo tempo tem um problema que paginação não resolve —
 * então o limite existe para a tela não crescer sem fim, e o excedente é
 * anunciado em vez de sumir.
 */
const PEDIDOS_NA_TELA = 20;

/** As situações que uma PROPOSTA pode ter. `solicitado` não é uma delas. */
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

/* `solicitado` sai da lista de propostas e ganha aba própria; o resto do que o
   cliente pode ver continua sendo proposta. Derivado, não redigitado: um
   status novo em `STATUS_ORCAMENTO_VISIVEIS` entra aqui sozinho. */
const STATUS_DE_PROPOSTA = STATUS_ORCAMENTO_VISIVEIS.filter(
  (status) => status !== "solicitado",
);

function tomDoOrcamento(status: QuoteStatus) {
  if (status === "aprovado" || status === "convertido") return "ok" as const;
  if (status === "recusado" || status === "expirado") return "neutro" as const;
  if (status === "rascunho") return "neutro" as const;
  return "aguardando" as const;
}

type LinhaProposta = {
  id: string;
  number: string;
  tipo: string;
  status: QuoteStatus;
  totalCents: number;
  validUntil: Date | null;
};

type LinhaPedido = {
  id: string;
  number: string;
  pedido: string;
  criadoEm: Date;
  status: QuoteStatus;
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

  /* `rascunho` é documento interno — o que a equipe escreve antes de o cliente
     ver. Todo o resto é do cliente, inclusive o `solicitado` que ele mesmo
     criou pelo site. */
  const basePropostas: Prisma.QuoteWhereInput = {
    customerId: cliente.id,
    status: { in: STATUS_DE_PROPOSTA },
  };

  const filtro: Prisma.QuoteWhereInput = {
    ...basePropostas,
    ...(ehSituacao(situacao) ? { status: { in: SITUACOES[situacao].status } } : {}),
    ...(numero ? { number: { contains: numero, mode: "insensitive" } } : {}),
  };

  const [total, propostas, contagens, totalPedidos, pedidos] = await Promise.all([
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
      where: basePropostas,
      _count: { _all: true },
    }),
    prisma.quote.count({
      where: { customerId: cliente.id, status: "solicitado" },
    }),
    prisma.quote.findMany({
      where: { customerId: cliente.id, status: "solicitado" },
      orderBy: { createdAt: "desc" },
      take: PEDIDOS_NA_TELA,
      select: {
        id: true,
        number: true,
        status: true,
        createdAt: true,
        /* O que foi pedido, nas palavras de quem pediu. Um pedido sem preço
           precisa dizer do que ele é — senão a linha é só um código. */
        items: { orderBy: { order: "asc" }, select: { description: true } },
      },
    }),
  ]);

  const porStatus = new Map(contagens.map((linha) => [linha.status, linha._count._all]));
  const totalDePropostas = contagens.reduce((soma, linha) => soma + linha._count._all, 0);

  const grupos: GrupoFiltro[] = [
    {
      nome: "situacao",
      rotulo: "Situação da proposta",
      opcoes: [
        { valor: "", rotulo: "Todas", quantidade: totalDePropostas },
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

  const linhasDePropostas: LinhaProposta[] = propostas.map((orcamento) => ({
    id: orcamento.id,
    number: orcamento.number,
    tipo: orcamento.kind === "assistencia" ? "Assistência técnica" : "Comercial",
    status: orcamento.status,
    totalCents: orcamento.totalCents,
    validUntil: orcamento.validUntil,
  }));

  const linhasDePedidos: LinhaPedido[] = pedidos.map((orcamento) => {
    const itens = orcamento.items.map((item) => item.description.trim()).filter(Boolean);
    return {
      id: orcamento.id,
      number: orcamento.number,
      pedido:
        itens.length === 0
          ? "Pedido sem itens registrados"
          : itens.length === 1
            ? itens[0]
            : `${itens[0]} e mais ${plural(itens.length - 1, "item", "itens")}`,
      criadoEm: orcamento.createdAt,
      status: orcamento.status,
    };
  });

  const colunasDePropostas: Coluna<LinhaProposta>[] = [
    { chave: "number", rotulo: "Proposta", largura: "11rem" },
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

  /* Sem coluna de total e sem coluna de validade: as duas só existem depois que
     alguém monta a proposta, e preenchê-las com zero e "sem prazo" era o que
     fazia o pedido parecer uma proposta de graça. */
  const colunasDePedidos: Coluna<LinhaPedido>[] = [
    { chave: "number", rotulo: "Pedido", largura: "11rem" },
    { chave: "pedido", rotulo: "O que você pediu" },
    {
      chave: "criadoEm",
      rotulo: "Enviado em",
      largura: "10rem",
      esconderNoMobile: true,
      renderizar: (linha) => formatarData(linha.criadoEm),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "13rem",
      renderizar: (linha) => (
        <Etiqueta tom="aguardando">{ROTULO_ORCAMENTO[linha.status]}</Etiqueta>
      ),
    },
  ];

  const filtrando = Boolean(situacao || numero);

  const abas: Aba[] = [
    {
      chave: "pedidos",
      rotulo: "Meus pedidos de orçamento",
      icone: <Send className="size-4 shrink-0" aria-hidden />,
      contador: totalPedidos,
      conteudo: (
        <>
          <Tabela
            colunas={colunasDePedidos}
            linhas={linhasDePedidos}
            chaveDaLinha={(linha) => linha.id}
            hrefDaLinha={(linha) => `/minha-jb/orcamentos/${linha.number}`}
            legenda="Pedidos de orçamento que você enviou e ainda estão em análise"
            vazio={{
              icone: Send,
              titulo: "Nenhum pedido em análise",
              descricao:
                "Quando você pedir um orçamento pelo site, ele aparece aqui com o número enquanto a equipe monta a proposta.",
              /* Quem já tem proposta não veio aqui para pedir outra: veio
                 decidir. O vazio desta aba aponta para onde está o que ele
                 procura, em vez de oferecer mais uma etapa. */
              acao:
                totalDePropostas > 0 ? (
                  <LinkBotao
                    href="/minha-jb/orcamentos?aba=propostas"
                    variante="secundario"
                  >
                    Ver {plural(totalDePropostas, "proposta recebida", "propostas recebidas")}
                  </LinkBotao>
                ) : (
                  <LinkBotao href="/orcamento">Pedir um orçamento</LinkBotao>
                ),
            }}
          />

          {totalPedidos > PEDIDOS_NA_TELA ? (
            <p className="mt-4 text-sm text-graf-600">
              Mostrando os {PEDIDOS_NA_TELA} mais recentes de{" "}
              {plural(totalPedidos, "pedido", "pedidos")} em análise. Busque pelo número
              na aba de propostas quando a sua chegar.
            </p>
          ) : null}
        </>
      ),
    },
    {
      chave: "propostas",
      rotulo: "Propostas recebidas",
      icone: <Inbox className="size-4 shrink-0" aria-hidden />,
      contador: totalDePropostas,
      conteudo: (
        <>
          <Filtros
            base="/minha-jb/orcamentos"
            /* `aba` viaja fixo: estes filtros são os da aba de propostas, então
               qualquer link que eles gerem tem de voltar para ela. Ler o valor
               da URL aqui seria deixar o filtro mandar a pessoa para a outra
               aba quando ela chegasse por um link antigo. */
            parametros={{ situacao, numero, aba: "propostas" }}
            grupos={grupos}
            busca={{
              nome: "numero",
              rotulo: "Buscar por número",
              placeholder: "Ex.: ORC-002841",
            }}
          />

          <Tabela
            colunas={colunasDePropostas}
            linhas={linhasDePropostas}
            chaveDaLinha={(linha) => linha.id}
            hrefDaLinha={(linha) => `/minha-jb/orcamentos/${linha.number}`}
            legenda="Propostas que a JB enviou, da mais recente para a mais antiga"
            vazio={{
              icone: FileText,
              titulo: filtrando
                ? "Nenhuma proposta neste recorte"
                : "Nenhuma proposta recebida",
              descricao: filtrando
                ? "Tente outro filtro ou limpe a busca para ver todas as propostas."
                : "Quando a equipe montar uma proposta para você — de equipamento ou de reparo —, ela aparece aqui para aprovar ou recusar.",
              acao: filtrando ? (
                <LinkBotao href="/minha-jb/orcamentos?aba=propostas" variante="secundario">
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
                rotuloSingular="proposta"
                rotuloPlural="propostas"
                className="mt-6"
              />
            </Suspense>
          ) : null}
        </>
      ),
    },
  ];

  return (
    <div>
      <Topo
        titulo="Meus orçamentos"
        descricao="O que você pediu e o que a JB respondeu. Aprovar ou recusar uma proposta é feito aqui mesmo, com registro de data e hora."
      />

      <AbasPorUrl abas={abas} parametro="aba" rotuloDaLista="Orçamentos" />
    </div>
  );
}
