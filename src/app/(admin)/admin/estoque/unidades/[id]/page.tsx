import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { UnitStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";

import { excluirUnidade, mudarStatusUnidade } from "@/app/acoes/admin-catalogo";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { FormularioUnidade } from "@/components/admin/catalogo/formulario-unidade";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, type Tom } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Unidade de estoque",
};

const ROTULO_STATUS: Record<UnitStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  indisponivel: "Indisponível",
};

const TOM_STATUS: Record<UnitStatus, Tom> = {
  disponivel: "ok",
  reservado: "aguardando",
  vendido: "neutro",
  indisponivel: "alerta",
};

const ORDEM_STATUS: UnitStatus[] = ["disponivel", "reservado", "vendido", "indisponivel"];

const ROTULO_CONDICAO: Record<string, string> = {
  novo: "novo",
  seminovo: "seminovo",
  usado: "usado",
  recondicionado: "recondicionado",
};

export default async function PaginaUnidade({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirArea("estoque");
  const { id } = await params;
  const podeMexer = podeEditar(usuario, "estoque");

  const [unidade, produtos] = await Promise.all([
    prisma.inventoryUnit.findUnique({
      where: { id },
      include: {
        checklist: { orderBy: { order: "asc" } },
        media: { orderBy: { order: "asc" }, include: { media: { select: { id: true, url: true } } } },
        product: { select: { id: true, name: true, sku: true, condition: true } },
        orderItem: {
          select: {
            id: true,
            order: { select: { id: true, number: true, buyerName: true, placedAt: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { status: { not: "archived" } },
      orderBy: [{ condition: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sku: true, condition: true },
    }),
  ]);

  if (!unidade) notFound();

  const pedido = unidade.orderItem?.order ?? null;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Estoque", href: "/admin/estoque" },
          { rotulo: "Unidades", href: "/admin/estoque/unidades" },
          { rotulo: unidade.serialNumber || "Unidade" },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-graf-950">
              {unidade.serialNumber || "Unidade sem número de série"}
            </h1>
            <Etiqueta tom={TOM_STATUS[unidade.status]}>{ROTULO_STATUS[unidade.status]}</Etiqueta>
          </div>
          <p className="mt-1 text-sm text-graf-500">
            <Link
              href={`/admin/produtos/${unidade.product.id}`}
              className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
            >
              {unidade.product.name}
            </Link>{" "}
            · {unidade.product.sku} · cadastrada em {formatarDataHora(unidade.createdAt)}
          </p>
        </div>

        {podeMexer ? (
          <BotaoAcao
            acao={excluirUnidade}
            campos={{ id: unidade.id }}
            rotulo="Excluir unidade"
            icone={<Trash2 className="size-4" aria-hidden />}
            variante="perigo"
            tamanho="md"
            desabilitado={Boolean(unidade.orderItemId)}
            confirmar={{
              pergunta: "Excluir esta unidade?",
              detalhe:
                "Checklist e fotos vão junto. Unidade já vendida não pode ser apagada — marque como indisponível.",
              rotuloConfirmar: "Excluir unidade",
            }}
          />
        ) : null}
      </header>

      {pedido ? (
        <Aviso tom="info" titulo={`Vendida no pedido ${pedido.number}`}>
          Comprada por {pedido.buyerName} em {formatarDataHora(pedido.placedAt)}.{" "}
          <Link
            href={`/admin/pedidos/${pedido.id}`}
            className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
          >
            Abrir o pedido
          </Link>
          .
        </Aviso>
      ) : null}

      {podeMexer && !unidade.orderItemId ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Situação da unidade"
            descricao="Muda só a disponibilidade desta peça — não mexe no saldo do produto."
          />
          <div className="flex flex-wrap gap-2 p-5">
            {ORDEM_STATUS.map((status) => (
              <BotaoAcao
                key={status}
                acao={mudarStatusUnidade}
                campos={{ id: unidade.id, status }}
                rotulo={ROTULO_STATUS[status]}
                variante={status === unidade.status ? "primario" : "secundario"}
                tamanho="md"
                desabilitado={status === unidade.status}
              />
            ))}
          </div>
        </Cartao>
      ) : null}

      <FormularioUnidade
        somenteLeitura={!podeMexer}
        produtos={produtos.map((item) => ({
          id: item.id,
          nome: item.name,
          sku: item.sku,
          condicao: ROTULO_CONDICAO[item.condition] ?? item.condition,
        }))}
        unidade={{
          id: unidade.id,
          productId: unidade.productId,
          serialNumber: unidade.serialNumber ?? "",
          status: unidade.status,
          manufactureYear: unidade.manufactureYear,
          usageHours: unidade.usageHours,
          usageCycles: unidade.usageCycles,
          warrantyMonths: unidade.warrantyMonths,
          acquiredFrom: unidade.acquiredFrom,
          conditionNotes: unidade.conditionNotes,
          inspectionNotes: unidade.inspectionNotes,
          checklist: unidade.checklist.map((item) => ({
            label: item.label,
            result: item.result,
            note: item.note,
          })),
          fotos: unidade.media.map((item) => ({ mediaId: item.mediaId, url: item.media.url })),
          pedido: pedido ? { numero: pedido.number, id: pedido.id } : null,
        }}
      />
    </div>
  );
}
