import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";

import { excluirMarca } from "@/app/acoes/admin-catalogo";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { FormularioMarca } from "@/components/admin/catalogo/formulario-marca";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta, Trilha } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Marca",
};

export default async function PaginaMarca({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirArea("produtos");
  const { id } = await params;
  const somenteLeitura = !podeEditar(usuario, "produtos");

  const marca = await prisma.brand.findUnique({
    where: { id },
    include: {
      logo: { select: { id: true, url: true } },
      _count: { select: { products: true } },
    },
  });

  if (!marca) notFound();

  const temProdutos = marca._count.products > 0;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Marcas", href: "/admin/marcas" },
          { rotulo: marca.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-graf-950">{marca.name}</h1>
            <Etiqueta tom={marca.published ? "ok" : "neutro"}>
              {marca.published ? "Publicada" : "Oculta"}
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-graf-500">
            {marca._count.products} {plural(marca._count.products, "produto", "produtos")}
            {temProdutos ? (
              <>
                {" · "}
                <Link
                  href={`/admin/produtos?marca=${marca.id}`}
                  className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
                >
                  Ver no catálogo
                </Link>
              </>
            ) : null}
            {marca.published ? (
              <>
                {" · "}
                <Link
                  href={`/marcas/${marca.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
                >
                  Ver na loja
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : null}
          </p>
        </div>

        {!somenteLeitura ? (
          <BotaoAcao
            acao={excluirMarca}
            campos={{ id: marca.id }}
            rotulo="Excluir marca"
            icone={<Trash2 className="size-4" aria-hidden />}
            variante="perigo"
            tamanho="md"
            desabilitado={temProdutos}
            confirmar={{
              pergunta: `Excluir a marca "${marca.name}"?`,
              detalhe: "A marca some do filtro e da página de marcas. Esta ação não pode ser desfeita.",
              rotuloConfirmar: "Excluir marca",
            }}
          />
        ) : null}
      </header>

      {temProdutos && !somenteLeitura ? (
        <Aviso tom="info" titulo="Marca em uso">
          {marca._count.products} {plural(marca._count.products, "produto usa", "produtos usam")}{" "}
          esta marca, então ela não pode ser apagada. Para tirá-la do site sem mexer nos produtos,
          desmarque &quot;Publicada&quot;.
        </Aviso>
      ) : null}

      <FormularioMarca
        somenteLeitura={somenteLeitura}
        marca={{
          id: marca.id,
          name: marca.name,
          slug: marca.slug,
          description: marca.description,
          order: marca.order,
          published: marca.published,
          logoId: marca.logo?.id ?? null,
          logoUrl: marca.logo?.url ?? null,
        }}
      />
    </div>
  );
}
