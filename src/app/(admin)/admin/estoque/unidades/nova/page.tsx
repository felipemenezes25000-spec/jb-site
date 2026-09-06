import type { Metadata } from "next";

import { FormularioUnidade } from "@/components/admin/catalogo/formulario-unidade";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Trilha, Vazio } from "@/components/ui/data";
import { exigirEdicao } from "@/lib/permissoes";
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

export const metadata: Metadata = {
  title: "Nova unidade",
};

const ROTULO_CONDICAO: Record<string, string> = {
  novo: "novo",
  seminovo: "seminovo",
  usado: "usado",
  recondicionado: "recondicionado",
};

export default async function PaginaNovaUnidade({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  await exigirEdicao("estoque");
  const { produto } = await searchParams;

  const produtos = await prisma.product.findMany({
    where: { status: { not: "archived" } },
    orderBy: [{ condition: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sku: true, condition: true },
  });

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Estoque", href: "/admin/estoque" },
          { rotulo: "Unidades", href: "/admin/estoque/unidades" },
          { rotulo: "Nova unidade" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-bold leading-tight text-graf-950">Nova unidade</h1>
        <p className="mt-1 text-sm text-graf-500">
          Uma peça física, com número de série e a revisão que foi feita nela.
        </p>
      </header>

      {produtos.length === 0 ? (
        <Vazio
          titulo="Nenhum produto ativo para vincular"
          descricao="A unidade precisa apontar para um produto do catálogo. Cadastre o produto primeiro."
          acao={<LinkBotao href="/admin/produtos/novo">Novo produto</LinkBotao>}
        />
      ) : (
        <>
          <Aviso tom="info">
            A unidade não altera o saldo do produto por conta própria. Se ela também precisa contar
            no número da vitrine, registre uma entrada na tela de estoque do produto — assim o
            movimento fica no histórico, com motivo e autor.
          </Aviso>

          <FormularioUnidade
            produtoPreSelecionado={produto}
            produtos={produtos.map((item) => ({
              id: item.id,
              nome: item.name,
              sku: item.sku,
              condicao: ROTULO_CONDICAO[item.condition] ?? item.condition,
            }))}
          />
        </>
      )}
    </div>
  );
}
