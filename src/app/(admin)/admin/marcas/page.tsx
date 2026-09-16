import type { Metadata } from "next";
import Link from "next/link";
import { ImageOff, Tags, Trash2 } from "lucide-react";

import { excluirMarca } from "@/app/acoes/admin-catalogo";
import { AtalhosCatalogo } from "@/components/admin/catalogo/atalhos-catalogo";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { exigirArea, podeEditar, podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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
  title: "Marcas",
};

/**
 * Marcas do catálogo.
 *
 * Grade em vez de tabela porque a informação que importa aqui é visual: o
 * logo. Marca com produto não pode ser apagada — o botão fica desabilitado e o
 * texto explica o porquê antes de a pessoa tentar.
 */
export default async function PaginaMarcas() {
  const usuario = await exigirArea("produtos");
  const podeMexer = podeEditar(usuario, "produtos");
  const verEstoque = podeVer(usuario, "estoque");

  const marcas = await prisma.brand.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      published: true,
      order: true,
      logo: { select: { url: true } },
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <Trilha itens={[{ rotulo: "Painel", href: "/admin" }, { rotulo: "Marcas" }]} />

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-graf-950">Marcas</h1>
          <p className="mt-1 text-sm text-graf-500">
            {marcas.length === 0
              ? "Fabricantes representados pela JB."
              : `${plural(marcas.length, "marca cadastrada", "marcas cadastradas")}.`}
          </p>
        </div>
        {podeMexer ? (
          <LinkBotao href="/admin/marcas/nova">Nova marca</LinkBotao>
        ) : (
          <p className="rounded-lg bg-graf-100 px-3 py-2 text-apoio font-semibold text-graf-600">
            Somente consulta
          </p>
        )}
      </header>

      <AtalhosCatalogo atual="marcas" mostrarEstoque={verEstoque} />

      {marcas.length === 0 ? (
        <Vazio
          icone={Tags}
          titulo="Nenhuma marca cadastrada"
          descricao="A marca aparece no filtro do catálogo e ajuda o cliente a encontrar o que já conhece."
          acao={podeMexer ? <LinkBotao href="/admin/marcas/nova">Criar a primeira marca</LinkBotao> : undefined}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {marcas.map((marca) => (
            <li
              key={marca.id}
              className={cn(
                "flex flex-col rounded-xl border border-graf-200 bg-white p-4 shadow-card",
                !marca.published && "bg-graf-50",
              )}
            >
              <div className="flex items-start gap-4">
                {marca.logo?.url ? (
                  <img
                    src={marca.logo.url}
                    alt={`Logo da ${marca.name}`}
                    className="h-14 w-24 shrink-0 rounded border border-graf-200 bg-white object-contain"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-14 w-24 shrink-0 items-center justify-center rounded border border-dashed border-graf-300 bg-graf-50 text-graf-500"
                  >
                    <ImageOff className="size-5" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/marcas/${marca.id}`}
                    className="block truncate text-base font-bold text-graf-950 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {marca.name}
                  </Link>
                  <p className="mt-0.5 truncate text-apoio text-graf-500">/marcas/{marca.slug}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <Etiqueta tom={marca.published ? "ok" : "neutro"}>
                      {marca.published ? "Publicada" : "Oculta"}
                    </Etiqueta>
                    <span className="text-apoio text-graf-500">
                      {plural(marca._count.products, "produto", "produtos")}
                    </span>
                  </p>
                </div>
              </div>

              {marca.description ? (
                <p className="line-2 mt-3 text-sm leading-relaxed text-graf-600">
                  {marca.description}
                </p>
              ) : null}

              {podeMexer ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-graf-200 pt-3">
                  <LinkBotao
                    href={`/admin/marcas/${marca.id}`}
                    variante="secundario"
                    tamanho="sm"
                    className="min-h-11"
                  >
                    Editar
                  </LinkBotao>
                  <LinkBotao
                    href={`/admin/produtos?marca=${marca.id}`}
                    variante="texto"
                    tamanho="sm"
                    className="min-h-11"
                  >
                    Ver produtos
                  </LinkBotao>
                  <span className="ml-auto">
                    <BotaoAcao
                      acao={excluirMarca}
                      campos={{ id: marca.id }}
                      rotulo={<Trash2 className="size-4" aria-hidden />}
                      rotuloAcessivel={`Excluir ${marca.name}`}
                      variante="perigo"
                      tamanho="md"
                      className="h-11 w-11 px-0"
                      desabilitado={marca._count.products > 0}
                      confirmar={{
                        pergunta: `Excluir a marca "${marca.name}"?`,
                        detalhe:
                          "A marca some do filtro e da página de marcas. Esta ação não pode ser desfeita.",
                        rotuloConfirmar: "Excluir marca",
                      }}
                    />
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
