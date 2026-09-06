import { Suspense } from "react";
import type { Metadata } from "next";
import { Download, Inbox, LifeBuoy } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { montarFiltroDeLeads } from "@/components/admin/conteudo/consultas";
import { ROTULO_LEAD, STATUS_LEAD, rotuloLead, tomLead } from "@/components/admin/conteudo/rotulos";
import { FiltrosLista } from "@/components/admin/filtros-lista";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { formatarDataHora, formatarTelefone, plural } from "@/lib/format";
import { exigirArea, podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Leads",
};

const POR_PAGINA = 30;

type LinhaDoLead = {
  id: string;
  nome: string;
  contato: string;
  local: string;
  status: string;
  recebido: string;
  resumo: string;
};

export default async function PaginaLeads({
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
  const usuario = await exigirArea("leads");
  // O atalho é conferido contra a área que ele abre — "suporte" —, não contra
  // uma área vizinha. Papel que não abre a fila de tickets não vê o botão.
  const verSuporte = podeVer(usuario, "suporte");
  const parametros = await searchParams;
  const numeroDaPagina = Math.max(1, Number(parametros.pagina) || 1);

  const where = montarFiltroDeLeads(parametros);

  const [leads, total, novos] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (numeroDaPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cidade: true,
        estado: true,
        obs: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { status: "novo" } }),
  ]);

  const linhas: LinhaDoLead[] = leads.map((lead) => ({
    id: lead.id,
    nome: lead.nome || "Sem nome informado",
    contato: [lead.email, lead.telefone ? formatarTelefone(lead.telefone) : ""]
      .filter(Boolean)
      .join(" · "),
    local: [lead.cidade, lead.estado].filter(Boolean).join("/"),
    status: lead.status,
    recebido: formatarDataHora(lead.createdAt),
    resumo: lead.obs.replace(/\s+/g, " ").trim(),
  }));

  const consulta = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (chave !== "pagina" && typeof valor === "string" && valor) consulta.set(chave, valor);
  }
  const enderecoDoCsv = `/admin/leads/exportar${consulta.toString() ? `?${consulta}` : ""}`;

  const colunas: Coluna<LinhaDoLead>[] = [
    {
      chave: "nome",
      rotulo: "Contato",
      renderizar: (linha) => (
        <span className="block">
          <span className="block font-semibold text-graf-900">{linha.nome}</span>
          <span className="mt-0.5 block text-[0.8125rem] text-graf-500">{linha.contato}</span>
        </span>
      ),
    },
    {
      chave: "resumo",
      rotulo: "Mensagem",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="line-2 block max-w-md text-[0.8125rem] leading-relaxed text-graf-600">
          {linha.resumo || <span className="text-graf-500">Enviou o formulário sem mensagem</span>}
        </span>
      ),
    },
    {
      chave: "local",
      rotulo: "Cidade",
      largura: "9rem",
      renderizar: (linha) =>
        linha.local ? linha.local : <span className="text-graf-500">Não informada</span>,
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "10rem",
      renderizar: (linha) => (
        <Etiqueta tom={tomLead(linha.status)} ponto>
          {rotuloLead(linha.status)}
        </Etiqueta>
      ),
    },
    {
      chave: "recebido",
      rotulo: "Recebido em",
      largura: "12rem",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="text-graf-600">{linha.recebido}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        titulo="Leads do site"
        descricao="Contatos vindos dos formulários. Marque o atendimento para a equipe saber o que já foi respondido."
        etiqueta={
          novos > 0 ? (
            <Etiqueta tom="alerta" ponto>
              {plural(novos, "novo sem resposta", "novos sem resposta")}
            </Etiqueta>
          ) : (
            <Etiqueta tom="ok">Nenhum contato sem resposta</Etiqueta>
          )
        }
        acoes={
          <>
            {/* Suporte já tem entrada no menu lateral; o atalho segue aqui
                porque lead e ticket são a mesma conversa em dois momentos, e
                quem tria uma fila costuma tomar a outra na sequência. */}
            {verSuporte ? (
              <LinkBotao href="/admin/suporte" variante="texto" tamanho="sm">
                <LifeBuoy className="size-4" aria-hidden />
                Tickets de suporte
              </LinkBotao>
            ) : null}
            <LinkBotao href={enderecoDoCsv} variante="secundario" tamanho="sm" prefetch={false}>
              <Download className="size-4" aria-hidden />
              Exportar CSV
            </LinkBotao>
          </>
        }
      />

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Nome, e-mail, telefone, cidade ou mensagem",
          },
          {
            tipo: "selecao",
            nome: "status",
            rotulo: "Situação",
            todos: "Todas",
            opcoes: STATUS_LEAD.map((chave) => ({ valor: chave, rotulo: ROTULO_LEAD[chave] })),
          },
          { tipo: "periodo", nome: "data", rotulo: "Recebido entre" },
        ]}
      />

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/leads/${linha.id}`}
        legenda="Contatos recebidos pelos formulários do site"
        vazio={{
          icone: Inbox,
          titulo: "Nenhum lead com esses filtros",
          descricao:
            "Ajuste a busca ou o período. Contatos novos aparecem aqui assim que alguém envia o formulário do site.",
        }}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={numeroDaPagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="lead"
          rotuloPlural="leads"
        />
      </Suspense>
    </div>
  );
}
