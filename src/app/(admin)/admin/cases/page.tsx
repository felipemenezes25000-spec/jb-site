import type { Metadata } from "next";
import { ClipboardCheck, Plus } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { ROTULO_ESTADO_CASE, type EstadoDoCase } from "@/lib/cases";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export const metadata: Metadata = { title: "Cases técnicos" };

const TOM: Record<EstadoDoCase, "ok" | "andamento" | "aguardando" | "neutro"> = {
  publicado: "ok",
  em_revisao: "aguardando",
  rascunho: "andamento",
  arquivado: "neutro",
};

type Linha = {
  id: string;
  title: string;
  equipamento: string;
  status: EstadoDoCase;
  autorizado: boolean;
  tecnico: string | null;
  revisor: string | null;
  atualizado: string;
};

export default async function PaginaCases() {
  const usuario = await exigirArea("cases");
  const podeEscrever = podeEditar(usuario, "cases");

  const cases = await prisma.techCase.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      equipmentLabel: true,
      status: true,
      customerConsent: true,
      updatedAt: true,
      technician: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  const linhas: Linha[] = cases.map((caso) => ({
    id: caso.id,
    title: caso.title,
    equipamento: caso.equipmentLabel,
    status: caso.status as EstadoDoCase,
    autorizado: caso.customerConsent,
    tecnico: caso.technician?.name ?? null,
    revisor: caso.reviewer?.name ?? null,
    atualizado: formatarDataHora(caso.updatedAt),
  }));

  const semAutorizacao = linhas.filter(
    (linha) => linha.status !== "publicado" && !linha.autorizado,
  ).length;

  const colunas: Coluna<Linha>[] = [
    {
      chave: "title",
      rotulo: "Case",
      renderizar: (linha) => (
        <span className="block">
          <span className="block font-semibold text-graf-900">{linha.title}</span>
          <span className="mt-0.5 block text-[0.8125rem] text-graf-500">
            {linha.equipamento || "Equipamento não informado"}
          </span>
        </span>
      ),
    },
    {
      chave: "assinatura",
      rotulo: "Quem responde",
      largura: "15rem",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="block text-[0.8125rem] leading-relaxed">
          <span className="block text-graf-700">
            {linha.tecnico ? `Executou: ${linha.tecnico}` : "Executou: a definir"}
          </span>
          <span className="block text-graf-500">
            {linha.revisor ? `Revisão: ${linha.revisor}` : "Revisão: a definir"}
          </span>
        </span>
      ),
    },
    {
      chave: "autorizado",
      rotulo: "Autorização",
      largura: "10rem",
      renderizar: (linha) =>
        linha.autorizado ? (
          <Etiqueta tom="ok">Autorizado</Etiqueta>
        ) : (
          <Etiqueta tom="aguardando">Sem autorização</Etiqueta>
        ),
    },
    {
      chave: "status",
      rotulo: "Situação",
      largura: "9rem",
      renderizar: (linha) => (
        <Etiqueta tom={TOM[linha.status]}>{ROTULO_ESTADO_CASE[linha.status]}</Etiqueta>
      ),
    },
    {
      chave: "atualizado",
      rotulo: "Alterado",
      largura: "12rem",
      esconderNoMobile: true,
      renderizar: (linha) => <span className="text-graf-600">{linha.atualizado}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Cases técnicos" }]}
        titulo="Cases técnicos"
        descricao="Atendimentos que viram exemplo público. Nenhum vai ao ar sem autorização da clínica atendida."
        acoes={
          podeEscrever ? (
            <LinkBotao href="/admin/cases/novo" tamanho="sm">
              <Plus className="size-4" aria-hidden />
              Novo case
            </LinkBotao>
          ) : undefined
        }
      />

      {semAutorizacao > 0 ? (
        <Aviso tom="info" titulo="Cases esperando autorização">
          {semAutorizacao === 1
            ? "1 case está escrito e não tem autorização do cliente"
            : `${semAutorizacao} cases estão escritos e não têm autorização do cliente`}
          . Escrever é trabalho da JB; publicar depende de quem foi atendido.
        </Aviso>
      ) : null}

      <Tabela
        colunas={colunas}
        linhas={linhas}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/cases/${linha.id}`}
        legenda="Cases técnicos, com autorização e situação editorial"
        vazio={{
          icone: ClipboardCheck,
          titulo: "Nenhum case ainda",
          descricao:
            "Enquanto não houver case publicado, a página pública mostra o processo de atendimento — que é prova que não depende de autorização de ninguém.",
          acao: podeEscrever ? (
            <LinkBotao href="/admin/cases/novo">
              <Plus className="size-4" aria-hidden />
              Novo case
            </LinkBotao>
          ) : undefined,
        }}
      />
    </div>
  );
}
