import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonitorCog, Trash2 } from "lucide-react";

import { excluirCategoria } from "@/app/acoes/admin-cadastros";
import {
  achatarCategorias,
  idsDaSubarvore,
  montarArvore,
} from "@/components/admin/catalogo/arvore-categorias";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { FormularioCategoria } from "@/components/admin/catalogo/formulario-categoria";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { plural } from "@/lib/format";
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

export const metadata: Metadata = {
  title: "Categoria",
};

/**
 * Ficha da categoria.
 *
 * A lista de categorias mãe possíveis já sai daqui sem a própria categoria e
 * sem as descendentes dela — escolher uma delas criaria um anel na árvore. O
 * servidor confere de novo antes de gravar; este filtro é só para a pessoa não
 * ver uma opção que vai ser recusada.
 */
export default async function PaginaCategoria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("cadastros");
  const { id } = await params;
  const somenteLeitura = !podeEditar(usuario, "cadastros");

  const [categoria, linhas, equipamentos] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { equipments: true, serviceRequests: true, children: true } } },
    }),
    prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        published: true,
        featured: true,
        parentId: true,
      },
    }),
    prisma.equipment.findMany({
      where: { categoryId: id },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        name: true,
        brandName: true,
        modelName: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  if (!categoria) notFound();

  const arvore = montarArvore(linhas);
  const proibidos = new Set(idsDaSubarvore(arvore, id));
  const paisPossiveis = achatarCategorias(arvore).filter((item) => !proibidos.has(item.id));

  /* Equipamento e chamado apontam para a categoria com `SetNull`: apagar só
     tira a classificação deles. O que impede é ter subcategoria embaixo. */
  const bloqueiaExclusao = categoria._count.children > 0;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Categorias", href: "/admin/categorias" },
          { rotulo: categoria.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight text-graf-950">{categoria.name}</h1>
            <Etiqueta tom={categoria.published ? "ok" : "neutro"}>
              {categoria.published ? "Publicada" : "Oculta"}
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-graf-500">
            {plural(categoria._count.equipments, "equipamento de cliente", "equipamentos de clientes")} ·{" "}
            {plural(categoria._count.serviceRequests, "chamado", "chamados")} ·{" "}
            {plural(categoria._count.children, "subcategoria", "subcategorias")}
          </p>
        </div>

        {!somenteLeitura ? (
          <BotaoAcao
            acao={excluirCategoria}
            campos={{ id: categoria.id }}
            rotulo="Excluir categoria"
            icone={<Trash2 className="size-4" aria-hidden />}
            variante="perigo"
            tamanho="md"
            desabilitado={bloqueiaExclusao}
            confirmar={{
              pergunta: `Excluir "${categoria.name}"?`,
              detalhe: "Equipamentos e chamados desta categoria ficam sem classificação. Esta ação não pode ser desfeita.",
              rotuloConfirmar: "Excluir categoria",
            }}
          />
        ) : null}
      </header>

      {bloqueiaExclusao && !somenteLeitura ? (
        <Aviso tom="info" titulo="Não dá para apagar agora">
          Há {plural(categoria._count.children, "subcategoria", "subcategorias")} abaixo dela.
          Mova ou apague as subcategorias primeiro. Se a intenção é só deixar de usá-la,
          desmarque &quot;Publicada&quot;.
        </Aviso>
      ) : null}

      <FormularioCategoria
        somenteLeitura={somenteLeitura}
        paisPossiveis={paisPossiveis}
        categoria={{
          id: categoria.id,
          name: categoria.name,
          slug: categoria.slug,
          description: categoria.description,
          parentId: categoria.parentId,
          icon: categoria.icon,
          order: categoria.order,
          published: categoria.published,
          featured: categoria.featured,
          seoTitle: categoria.seoTitle,
          seoDescription: categoria.seoDescription,
        }}
      />

      <Cartao>
        <CabecalhoCartao
          titulo="Equipamentos de clientes nesta categoria"
          descricao={
            categoria._count.equipments > equipamentos.length
              ? `Mostrando os ${equipamentos.length} mais recentes de ${categoria._count.equipments}.`
              : undefined
          }
        />
        {equipamentos.length === 0 ? (
          <Vazio
            icone={MonitorCog}
            titulo="Nenhum equipamento nesta categoria"
            descricao="Ao cadastrar um equipamento de cliente, escolha esta categoria."
            className="m-4 border-graf-200 bg-transparent py-10"
          />
        ) : (
          <ul className="divide-y divide-graf-200">
            {equipamentos.map((equipamento) => (
              <li key={equipamento.id}>
                <Link
                  href={`/admin/equipamentos/${equipamento.id}`}
                  className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-graf-900">
                      {equipamento.name}
                    </span>
                    <span className="block truncate text-apoio text-graf-500">
                      {[equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") || "Marca e modelo não informados"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-graf-600">{equipamento.customer.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
