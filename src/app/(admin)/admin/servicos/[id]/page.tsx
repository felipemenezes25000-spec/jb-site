import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import { excluirServico } from "@/app/acoes/admin-catalogo";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { FormularioServico } from "@/components/admin/catalogo/formulario-servico";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { formatarPreco, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Serviço",
};

export default async function PaginaServico({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirArea("produtos");
  const { id } = await params;
  const somenteLeitura = !podeEditar(usuario, "produtos");

  const servico = await prisma.service.findUnique({
    where: { id },
    include: {
      addons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          priceCents: true,
          required: true,
          product: { select: { id: true, name: true, sku: true } },
        },
      },
      _count: { select: { orderItems: true, quoteItems: true } },
    },
  });

  if (!servico) notFound();

  const jaVendido = servico._count.orderItems > 0 || servico._count.quoteItems > 0;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Serviços", href: "/admin/servicos" },
          { rotulo: servico.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-graf-950">{servico.name}</h1>
            <Etiqueta tom={servico.published ? "ok" : "neutro"}>
              {servico.published ? "Publicado" : "Oculto"}
            </Etiqueta>
          </div>
          <p className="mt-1 text-sm text-graf-500">
            {servico.priceCents === null
              ? "Sob orçamento"
              : `Preço base ${formatarPreco(servico.priceCents)}`}{" "}
            · em {servico.addons.length}{" "}
            {plural(servico.addons.length, "produto", "produtos")}
          </p>
        </div>

        {!somenteLeitura ? (
          <BotaoAcao
            acao={excluirServico}
            campos={{ id: servico.id }}
            rotulo="Excluir serviço"
            icone={<Trash2 className="size-4" aria-hidden />}
            variante="perigo"
            tamanho="md"
            desabilitado={jaVendido}
            confirmar={{
              pergunta: `Excluir o serviço "${servico.name}"?`,
              detalhe:
                "Ele sai dos produtos que o oferecem. Serviço já vendido ou orçado não pode ser apagado.",
              rotuloConfirmar: "Excluir serviço",
            }}
          />
        ) : null}
      </header>

      {jaVendido && !somenteLeitura ? (
        <Aviso tom="info" titulo="Serviço com histórico">
          Este serviço já foi vendido ou orçado, então não pode ser apagado. Para deixar de
          oferecê-lo, desmarque &quot;Publicado&quot;.
        </Aviso>
      ) : null}

      <FormularioServico
        somenteLeitura={somenteLeitura}
        servico={{
          id: servico.id,
          name: servico.name,
          slug: servico.slug,
          kind: servico.kind,
          description: servico.description,
          priceCents: servico.priceCents,
          published: servico.published,
          order: servico.order,
        }}
      />

      <Cartao>
        <CabecalhoCartao
          titulo="Oferecido nestes produtos"
          descricao="O vínculo é criado na aba Adicionais de cada produto."
        />
        {servico.addons.length === 0 ? (
          <Vazio
            titulo="Nenhum produto oferece este serviço"
            descricao="Abra um produto, vá até a aba Adicionais e escolha este serviço."
            className="m-4 border-graf-200 bg-transparent py-10"
          />
        ) : (
          <ul className="divide-y divide-graf-200">
            {servico.addons.map((addon) => (
              <li key={addon.id}>
                <Link
                  href={`/admin/produtos/${addon.product.id}?aba=adicionais`}
                  className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-graf-900">
                      {addon.product.name}
                    </span>
                    <span className="block truncate text-xs text-graf-500">
                      {addon.product.sku}
                    </span>
                  </span>
                  {addon.required ? <Etiqueta tom="alerta">Obrigatório</Etiqueta> : null}
                  <span className="tabular shrink-0 text-sm font-semibold text-graf-800">
                    {addon.priceCents === null
                      ? "Preço do serviço"
                      : formatarPreco(addon.priceCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
