import type { Metadata } from "next";
import type { ServiceKind } from "@prisma/client";
import { Wrench } from "lucide-react";

import { AtalhosCatalogo } from "@/components/admin/catalogo/atalhos-catalogo";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Trilha } from "@/components/ui/data";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { formatarPreco, plural } from "@/lib/format";
import { exigirArea, podeEditar, podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Serviços",
};

const ROTULO_TIPO_SERVICO: Record<ServiceKind, string> = {
  instalacao: "Instalação",
  visita_tecnica: "Visita técnica",
  manutencao_preventiva: "Manutenção preventiva",
  manutencao_corretiva: "Manutenção corretiva",
  treinamento: "Treinamento",
  retirada_equipamento: "Retirada de equipamento",
  outro: "Outro",
};

type LinhaServico = {
  id: string;
  name: string;
  slug: string;
  kind: ServiceKind;
  priceCents: number | null;
  published: boolean;
  order: number;
  _count: { addons: number; orderItems: number };
};

/**
 * Serviços vendáveis.
 *
 * Preço nulo é "sob orçamento", e a coluna diz isso por escrito — R$ 0,00
 * significaria grátis, que é outra coisa.
 */
export default async function PaginaServicos() {
  const usuario = await exigirArea("produtos");
  const podeMexer = podeEditar(usuario, "produtos");
  const verEstoque = podeVer(usuario, "estoque");

  const servicos = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      priceCents: true,
      published: true,
      order: true,
      _count: { select: { addons: true, orderItems: true } },
    },
  });

  const colunas: Coluna<LinhaServico>[] = [
    {
      chave: "name",
      rotulo: "Serviço",
      renderizar: (linha) => (
        <span className="block">
          <span className="block truncate font-semibold">{linha.name}</span>
          <span className="block truncate text-xs font-normal text-graf-500">/{linha.slug}</span>
        </span>
      ),
    },
    {
      chave: "kind",
      rotulo: "Tipo",
      renderizar: (linha) => ROTULO_TIPO_SERVICO[linha.kind],
    },
    {
      chave: "priceCents",
      rotulo: "Preço base",
      alinhamento: "direita",
      renderizar: (linha) =>
        linha.priceCents === null ? (
          <span className="text-graf-500">Sob orçamento</span>
        ) : (
          <span className="tabular">{formatarPreco(linha.priceCents)}</span>
        ),
    },
    {
      chave: "addons",
      rotulo: "Em produtos",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="tabular">
          {linha._count.addons === 0 ? "—" : linha._count.addons}
        </span>
      ),
    },
    {
      chave: "orderItems",
      rotulo: "Vendas",
      alinhamento: "direita",
      esconderNoMobile: true,
      renderizar: (linha) => (
        <span className="tabular">
          {linha._count.orderItems === 0 ? "—" : linha._count.orderItems}
        </span>
      ),
    },
    {
      chave: "published",
      rotulo: "Situação",
      renderizar: (linha) => (
        <Etiqueta tom={linha.published ? "ok" : "neutro"}>
          {linha.published ? "Publicado" : "Oculto"}
        </Etiqueta>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Trilha itens={[{ rotulo: "Painel", href: "/admin" }, { rotulo: "Serviços" }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graf-950">Serviços</h1>
          <p className="mt-1 text-sm text-graf-500">
            {servicos.length === 0
              ? "O que a JB vende além do equipamento."
              : `${servicos.length} ${plural(servicos.length, "serviço cadastrado", "serviços cadastrados")}.`}
          </p>
        </div>
        {podeMexer ? (
          <LinkBotao href="/admin/servicos/novo">Novo serviço</LinkBotao>
        ) : (
          <p className="rounded-lg bg-graf-100 px-3 py-2 text-xs font-semibold text-graf-600">
            Somente consulta
          </p>
        )}
      </header>

      <AtalhosCatalogo atual="servicos" mostrarEstoque={verEstoque} />

      <Tabela<LinhaServico>
        colunas={colunas}
        linhas={servicos}
        chaveDaLinha={(linha) => linha.id}
        hrefDaLinha={(linha) => `/admin/servicos/${linha.id}`}
        legenda="Serviços vendáveis, com tipo, preço base e uso"
        vazio={{
          icone: Wrench,
          titulo: "Nenhum serviço cadastrado",
          descricao:
            "Instalação e treinamento cadastrados aqui podem ser oferecidos junto de qualquer produto.",
          acao: podeMexer ? <LinkBotao href="/admin/servicos/novo">Criar o primeiro serviço</LinkBotao> : undefined,
        }}
      />
    </div>
  );
}
