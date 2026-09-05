import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { StockMovementKind, UnitStatus } from "@prisma/client";
import { History, ScanBarcode } from "lucide-react";

import { FormularioMovimento } from "@/components/admin/catalogo/formulario-movimento";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, Vazio, type Tom } from "@/components/ui/data";
import { Tabela, type Coluna } from "@/components/ui/tabela";
import { formatarDataHora, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Estoque do produto",
};

/**
 * Estoque de um produto: saldo, entrada/saída e o histórico que explica cada
 * número. `InventoryMovement.userId` é só um id solto no schema (sem relação),
 * então os nomes de quem mexeu vêm numa segunda consulta e são casados aqui —
 * assim a coluna "quem" mostra gente, não identificador.
 */

const ROTULO_MOVIMENTO: Record<StockMovementKind, string> = {
  entrada: "Entrada",
  saida: "Saída",
  reserva: "Reserva",
  liberacao_reserva: "Reserva liberada",
  ajuste: "Ajuste",
  devolucao: "Devolução",
};

const TOM_MOVIMENTO: Record<StockMovementKind, Tom> = {
  entrada: "ok",
  saida: "alerta",
  reserva: "aguardando",
  liberacao_reserva: "andamento",
  ajuste: "neutro",
  devolucao: "ok",
};

const ROTULO_UNIDADE: Record<UnitStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  indisponivel: "Indisponível",
};

const TOM_UNIDADE: Record<UnitStatus, Tom> = {
  disponivel: "ok",
  reservado: "aguardando",
  vendido: "neutro",
  indisponivel: "alerta",
};

type LinhaMovimento = {
  id: string;
  kind: StockMovementKind;
  quantity: number;
  reason: string;
  createdAt: Date;
  autor: string;
  pedido: string | null;
};

export default async function PaginaEstoqueProduto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("estoque");
  const { id } = await params;
  const podeMexer = podeEditar(usuario, "estoque");

  const produto = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sku: true,
      slug: true,
      stock: true,
      lowStockAlert: true,
      trackInventory: true,
      unique: true,
      condition: true,
      status: true,
      units: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          serialNumber: true,
          status: true,
          createdAt: true,
          orderItem: { select: { order: { select: { id: true, number: true } } } },
        },
      },
      movements: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          kind: true,
          quantity: true,
          reason: true,
          createdAt: true,
          userId: true,
          order: { select: { number: true } },
        },
      },
      _count: { select: { units: true, movements: true } },
    },
  });

  if (!produto) notFound();

  const idsDeUsuario = [
    ...new Set(produto.movements.map((movimento) => movimento.userId).filter((valor): valor is string => Boolean(valor))),
  ];
  const equipe = idsDeUsuario.length
    ? await prisma.user.findMany({
        where: { id: { in: idsDeUsuario } },
        select: { id: true, name: true },
      })
    : [];
  const nomePorId = new Map(equipe.map((pessoa) => [pessoa.id, pessoa.name]));

  const movimentos: LinhaMovimento[] = produto.movements.map((movimento) => ({
    id: movimento.id,
    kind: movimento.kind,
    quantity: movimento.quantity,
    reason: movimento.reason,
    createdAt: movimento.createdAt,
    autor: movimento.userId ? (nomePorId.get(movimento.userId) ?? "Usuário removido") : "Sistema",
    pedido: movimento.order?.number ?? null,
  }));

  const colunas: Coluna<LinhaMovimento>[] = [
    {
      chave: "createdAt",
      rotulo: "Quando",
      renderizar: (linha) => formatarDataHora(linha.createdAt),
    },
    {
      chave: "kind",
      rotulo: "Tipo",
      renderizar: (linha) => (
        <Etiqueta tom={TOM_MOVIMENTO[linha.kind]}>{ROTULO_MOVIMENTO[linha.kind]}</Etiqueta>
      ),
    },
    {
      chave: "quantity",
      rotulo: "Quantidade",
      alinhamento: "direita",
      renderizar: (linha) => (
        <span className="tabular font-semibold">
          {linha.quantity > 0 ? `+${linha.quantity}` : linha.quantity}
        </span>
      ),
    },
    {
      chave: "reason",
      rotulo: "Motivo",
      renderizar: (linha) => (
        <span className="block">
          <span className="block">{linha.reason || "—"}</span>
          {linha.pedido ? (
            <span className="block text-xs text-graf-500">Pedido {linha.pedido}</span>
          ) : null}
        </span>
      ),
    },
    {
      chave: "autor",
      rotulo: "Quem",
      esconderNoMobile: true,
    },
  ];

  const baixo = produto.trackInventory && produto.stock <= produto.lowStockAlert;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Estoque", href: "/admin/estoque" },
          { rotulo: produto.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-graf-950">{produto.name}</h1>
          <p className="mt-1 text-sm text-graf-500">
            {produto.sku} ·{" "}
            <Link
              href={`/admin/produtos/${produto.id}`}
              className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
            >
              Abrir ficha do produto
            </Link>
          </p>
        </div>
        <div className="rounded-xl border border-graf-200 bg-white px-5 py-3 text-right shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">Saldo atual</p>
          <p className="tabular mt-1 text-3xl font-bold leading-none text-graf-950">
            {produto.trackInventory ? produto.stock : "—"}
          </p>
          <p className="mt-1 text-xs text-graf-500">
            {produto.trackInventory ? `alerta em ${produto.lowStockAlert}` : "sem controle de estoque"}
          </p>
        </div>
      </header>

      {baixo ? (
        <Aviso tom="atencao" titulo="Estoque no ponto de reposição">
          O saldo ({produto.stock}) chegou ao alerta configurado ({produto.lowStockAlert}). Registre
          uma entrada assim que a mercadoria chegar.
        </Aviso>
      ) : null}

      {produto.unique ? (
        <Aviso tom="info" titulo="Produto de peça única">
          Este produto é marcado como peça única. O que vale para o cliente são as unidades
          identificadas abaixo — cada uma com número de série e revisão própria.
        </Aviso>
      ) : null}

      {podeMexer ? (
        <Cartao>
          <CabecalhoCartao
            titulo="Registrar movimento"
            descricao="Cada movimento entra no histórico com motivo, data e autor."
          />
          <div className="p-5">
            <FormularioMovimento produtoId={produto.id} saldoAtual={produto.stock} />
          </div>
        </Cartao>
      ) : (
        <Aviso tom="info">Seu perfil abre o estoque apenas para consulta.</Aviso>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-graf-950">Histórico de movimentações</h2>
            <p className="text-sm text-graf-500">
              {produto._count.movements === 0
                ? "Nada registrado ainda."
                : `${produto._count.movements} ${plural(produto._count.movements, "movimento", "movimentos")} no total${produto._count.movements > movimentos.length ? ` · mostrando os ${movimentos.length} mais recentes` : ""}.`}
            </p>
          </div>
        </div>

        <Tabela<LinhaMovimento>
          colunas={colunas}
          linhas={movimentos}
          chaveDaLinha={(linha) => linha.id}
          densa
          legenda="Movimentações de estoque deste produto"
          vazio={{
            icone: History,
            titulo: "Sem movimentações",
            descricao:
              "Toda entrada, saída, reserva e ajuste aparece aqui — inclusive as geradas pelos pedidos.",
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-graf-950">Unidades deste produto</h2>
            <p className="text-sm text-graf-500">
              {produto._count.units === 0
                ? "Nenhuma peça identificada."
                : `${produto._count.units} ${plural(produto._count.units, "unidade", "unidades")}${produto._count.units > produto.units.length ? ` · mostrando as ${produto.units.length} mais recentes` : ""}.`}
            </p>
          </div>
          {podeMexer ? (
            <LinkBotao
              href={`/admin/estoque/unidades/nova?produto=${produto.id}`}
              variante="secundario"
              tamanho="sm"
              className="min-h-11"
            >
              Cadastrar unidade
            </LinkBotao>
          ) : null}
        </div>

        {produto.units.length === 0 ? (
          <Vazio
            icone={ScanBarcode}
            titulo="Nenhuma unidade cadastrada"
            descricao="Seminovo, usado e recondicionado precisam de unidade com número de série e checklist de revisão."
            acao={
              podeMexer ? (
                <LinkBotao href={`/admin/estoque/unidades/nova?produto=${produto.id}`}>
                  Cadastrar a primeira unidade
                </LinkBotao>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {produto.units.map((unidade) => (
              <li key={unidade.id}>
                <Link
                  href={`/admin/estoque/unidades/${unidade.id}`}
                  className="flex h-full flex-col rounded-xl border border-graf-200 bg-white p-4 shadow-card transition-[box-shadow,border-color] hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-graf-900">
                        {unidade.serialNumber || "Sem número de série"}
                      </span>
                      <span className="block text-xs text-graf-500">
                        cadastrada em {formatarDataHora(unidade.createdAt)}
                      </span>
                    </span>
                    <Etiqueta tom={TOM_UNIDADE[unidade.status]}>
                      {ROTULO_UNIDADE[unidade.status]}
                    </Etiqueta>
                  </span>
                  {unidade.orderItem?.order ? (
                    <span className="mt-3 text-xs text-graf-500">
                      Vendida no pedido {unidade.orderItem.order.number}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
