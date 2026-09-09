import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { FormularioCrossSellTipado } from "@/components/admin/catalogo/formulario-cross-sell-tipado";
import { Trilha } from "@/components/ui/data";
import { decodificarOrdemRelacao } from "@/lib/marketplace/relacionamentos-produto";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function PaginaRelacionamentosProduto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("produtos");
  const { id } = await params;
  const somenteLeitura = !podeEditar(usuario, "produtos");

  const [produto, catalogo] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        status: true,
        relatedFrom: {
          orderBy: { order: "asc" },
          select: { targetId: true, order: true },
        },
      },
    }),
    prisma.product.findMany({
      where: { status: { not: "archived" } },
      orderBy: [{ name: "asc" }, { sku: "asc" }],
      take: 500,
      select: { id: true, name: true, sku: true, condition: true },
    }),
  ]);

  if (!produto) notFound();

  const iniciais = produto.relatedFrom
    .map((relacao) => {
      const decodificada = decodificarOrdemRelacao(relacao.order);
      return {
        targetId: relacao.targetId,
        tipo: decodificada.tipo,
        ordem: decodificada.ordem,
      };
    })
    .sort((a, b) => {
      const peso = { alternativa: 0, acessorio: 1, complemento: 2 } as const;
      return peso[a.tipo] - peso[b.tipo] || a.ordem - b.ordem;
    })
    .map(({ targetId, tipo }) => ({ targetId, tipo }));

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Produtos", href: "/admin/produtos" },
          { rotulo: produto.name, href: `/admin/produtos/${produto.id}` },
          { rotulo: "Cross-sell" },
        ]}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-jb-700">Arquitetura da compra</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-graf-950">
            Cross-sell de {produto.name}
          </h1>
          <p className="mt-1 text-sm text-graf-500">
            {produto.sku} · classifique cada relação pela função que ela cumpre na decisão do cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/produtos/${produto.id}?aba=relacionados`}
            className="foco-jb inline-flex min-h-11 items-center gap-2 rounded-xl border border-graf-300 bg-white px-4 text-sm font-bold text-graf-800 hover:bg-graf-50"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar ao produto
          </Link>
          {produto.status === "active" ? (
            <Link
              href={`/loja/${produto.slug}`}
              className="foco-jb inline-flex min-h-11 items-center gap-2 rounded-xl bg-graf-950 px-4 text-sm font-bold text-white hover:bg-graf-800"
            >
              Ver PDP
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </header>

      <FormularioCrossSellTipado
        produtoId={produto.id}
        somenteLeitura={somenteLeitura}
        iniciais={iniciais}
        catalogo={catalogo.map((item) => ({
          id: item.id,
          nome: item.name,
          sku: item.sku,
          condicao: item.condition,
        }))}
      />
    </div>
  );
}
