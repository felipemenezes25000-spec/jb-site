import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
  Package,
  Search,
  ShoppingCart,
  Stethoscope,
  Users,
} from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Etiqueta, Vazio, type Tom } from "@/components/ui/data";
import type { StaffUser } from "@/lib/auth";
import { ROTULO_CHAMADO } from "@/lib/assistencia";
import { formatarData, formatarDocumento, formatarPreco, plural, somenteDigitos } from "@/lib/format";
import { ROTULO_ORCAMENTO } from "@/lib/orcamento";
import { ROTULO_OS } from "@/lib/os";
import { ROTULO_STATUS } from "@/lib/pedido";
import { exigirStaffAdmin, podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Busca",
};

const LIMITE_POR_TIPO = 6;

type Resultado = {
  id: string;
  titulo: string;
  detalhe: string;
  href: string;
  etiqueta?: { texto: string; tom: Tom };
  valor?: string;
};

type Grupo = {
  chave: string;
  rotulo: string;
  icone: React.ComponentType<{ className?: string }>;
  itens: Resultado[];
  hrefTodos?: string;
};

/**
 * Busca global do painel.
 *
 * Uma consulta por domínio, todas em paralelo, e só nas áreas que o papel de
 * quem buscou consegue abrir — resultado que a pessoa não poderia abrir não
 * aparece nem como título. O termo é usado em `contains` sem distinguir
 * maiúsculas; quando tem só dígitos, também vale como documento ou telefone.
 */
async function buscar(termo: string, usuario: StaffUser): Promise<Grupo[]> {
  const busca = termo.trim();
  const digitos = somenteDigitos(busca);
  const texto = { contains: busca, mode: "insensitive" as const };

  const [pedidos, clientes, produtos, chamados, ordens, orcamentos] = await Promise.all([
    podeVer(usuario, "pedidos")
      ? prisma.order.findMany({
          where: {
            OR: [
              { number: texto },
              { buyerName: texto },
              { buyerEmail: texto },
              ...(digitos.length >= 3 ? [{ buyerDocument: { contains: digitos } }] : []),
            ],
          },
          orderBy: { placedAt: "desc" },
          take: LIMITE_POR_TIPO,
          select: {
            id: true,
            number: true,
            buyerName: true,
            status: true,
            totalCents: true,
            placedAt: true,
          },
        })
      : Promise.resolve([]),

    podeVer(usuario, "clientes")
      ? prisma.customer.findMany({
          where: {
            OR: [
              { name: texto },
              { email: texto },
              { companyName: texto },
              ...(digitos.length >= 3
                ? [{ document: { contains: digitos } }, { phone: { contains: digitos } }]
                : []),
            ],
          },
          orderBy: { name: "asc" },
          take: LIMITE_POR_TIPO,
          select: {
            id: true,
            name: true,
            email: true,
            document: true,
            personType: true,
            active: true,
            _count: { select: { orders: true } },
          },
        })
      : Promise.resolve([]),

    podeVer(usuario, "produtos")
      ? prisma.product.findMany({
          where: {
            OR: [{ name: texto }, { sku: texto }, { model: texto }, { slug: texto }],
          },
          orderBy: { name: "asc" },
          take: LIMITE_POR_TIPO,
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            stock: true,
            priceCents: true,
          },
        })
      : Promise.resolve([]),

    podeVer(usuario, "assistencia")
      ? prisma.serviceRequest.findMany({
          where: {
            OR: [
              { number: texto },
              { contactName: texto },
              { contactEmail: texto },
              { serialNumber: texto },
              { modelName: texto },
              { brandName: texto },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: LIMITE_POR_TIPO,
          select: {
            id: true,
            number: true,
            status: true,
            contactName: true,
            createdAt: true,
            customer: { select: { name: true } },
          },
        })
      : Promise.resolve([]),

    podeVer(usuario, "os")
      ? prisma.workOrder.findMany({
          where: {
            OR: [{ number: texto }, { customerName: texto }, { reportedIssue: texto }],
          },
          orderBy: { openedAt: "desc" },
          take: LIMITE_POR_TIPO,
          select: {
            id: true,
            number: true,
            status: true,
            customerName: true,
            totalCents: true,
            openedAt: true,
          },
        })
      : Promise.resolve([]),

    podeVer(usuario, "orcamentos")
      ? prisma.quote.findMany({
          where: {
            OR: [{ number: texto }, { contactName: texto }, { contactEmail: texto }],
          },
          orderBy: { createdAt: "desc" },
          take: LIMITE_POR_TIPO,
          select: {
            id: true,
            number: true,
            status: true,
            contactName: true,
            totalCents: true,
            createdAt: true,
            customer: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const consulta = encodeURIComponent(busca);

  return [
    {
      chave: "pedidos",
      rotulo: "Pedidos",
      icone: ShoppingCart,
      hrefTodos: `/admin/pedidos?q=${consulta}`,
      itens: pedidos.map((pedido) => ({
        id: pedido.id,
        titulo: `${pedido.number} · ${pedido.buyerName}`,
        detalhe: `Feito em ${formatarData(pedido.placedAt)}`,
        href: `/admin/pedidos/${pedido.id}`,
        valor: formatarPreco(pedido.totalCents),
        etiqueta: { texto: ROTULO_STATUS[pedido.status], tom: "andamento" as Tom },
      })),
    },
    {
      chave: "clientes",
      rotulo: "Clientes",
      icone: Users,
      hrefTodos: `/admin/clientes?q=${consulta}`,
      itens: clientes.map((cliente) => ({
        id: cliente.id,
        titulo: cliente.name,
        detalhe: [
          cliente.email,
          cliente.document ? formatarDocumento(cliente.document) : "",
          plural(cliente._count.orders, "pedido", "pedidos"),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/admin/clientes/${cliente.id}`,
        etiqueta: cliente.active
          ? undefined
          : { texto: "Inativo", tom: "neutro" as Tom },
      })),
    },
    {
      chave: "produtos",
      rotulo: "Produtos",
      icone: Package,
      hrefTodos: `/admin/produtos?q=${consulta}`,
      itens: produtos.map((produto) => ({
        id: produto.id,
        titulo: produto.name,
        detalhe: `SKU ${produto.sku} · ${plural(produto.stock, "unidade", "unidades")} em estoque`,
        href: `/admin/produtos/${produto.id}`,
        valor: formatarPreco(produto.priceCents),
        etiqueta:
          produto.status === "active"
            ? { texto: "Publicado", tom: "ok" as Tom }
            : produto.status === "draft"
              ? { texto: "Rascunho", tom: "aguardando" as Tom }
              : { texto: "Arquivado", tom: "neutro" as Tom },
      })),
    },
    {
      chave: "chamados",
      rotulo: "Chamados",
      icone: Stethoscope,
      hrefTodos: `/admin/assistencia?q=${consulta}`,
      itens: chamados.map((chamado) => ({
        id: chamado.id,
        titulo: `${chamado.number} · ${chamado.customer?.name ?? chamado.contactName}`,
        detalhe: `Aberto em ${formatarData(chamado.createdAt)}`,
        href: `/admin/assistencia/${chamado.id}`,
        etiqueta: { texto: ROTULO_CHAMADO[chamado.status], tom: "andamento" as Tom },
      })),
    },
    {
      chave: "os",
      rotulo: "Ordens de serviço",
      icone: ClipboardList,
      hrefTodos: `/admin/os?q=${consulta}`,
      itens: ordens.map((ordem) => ({
        id: ordem.id,
        titulo: `${ordem.number} · ${ordem.customerName || "Sem cliente informado"}`,
        detalhe: `Aberta em ${formatarData(ordem.openedAt)}`,
        href: `/admin/os/${ordem.id}`,
        valor: ordem.totalCents > 0 ? formatarPreco(ordem.totalCents) : undefined,
        etiqueta: { texto: ROTULO_OS[ordem.status], tom: "andamento" as Tom },
      })),
    },
    {
      chave: "orcamentos",
      rotulo: "Orçamentos",
      icone: FileText,
      hrefTodos: `/admin/orcamentos?q=${consulta}`,
      itens: orcamentos.map((orcamento) => ({
        id: orcamento.id,
        titulo: `${orcamento.number} · ${orcamento.customer?.name ?? orcamento.contactName ?? "Sem contato"}`,
        detalhe: `Criado em ${formatarData(orcamento.createdAt)}`,
        href: `/admin/orcamentos/${orcamento.id}`,
        valor: formatarPreco(orcamento.totalCents),
        etiqueta: { texto: ROTULO_ORCAMENTO[orcamento.status], tom: "aguardando" as Tom },
      })),
    },
  ].filter((grupo) => grupo.itens.length > 0);
}

export default async function PaginaBuscaGlobal({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const usuario = await exigirStaffAdmin();
  const { q } = await searchParams;
  const termo = (q ?? "").trim();

  const grupos = termo.length >= 2 ? await buscar(termo, usuario) : [];
  const encontrados = grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0);

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        titulo={termo ? `Resultados para "${termo}"` : "Busca"}
        descricao="Procura em pedidos, clientes, produtos, chamados, ordens de serviço e orçamentos — somente nas áreas que o seu perfil abre."
        etiqueta={
          termo.length >= 2 ? (
            <Etiqueta tom={encontrados > 0 ? "ok" : "neutro"}>
              {plural(encontrados, "resultado", "resultados")}
            </Etiqueta>
          ) : undefined
        }
      />

      <form
        action="/admin/busca"
        method="get"
        role="search"
        className="rounded-xl border border-graf-200 bg-white p-3 shadow-card"
      >
        <label htmlFor="termo-da-busca" className="mb-1 block text-xs font-semibold text-graf-600">
          O que você procura
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graf-500"
              aria-hidden
            />
            <input
              id="termo-da-busca"
              name="q"
              type="search"
              defaultValue={termo}
              autoComplete="off"
              placeholder="Número do pedido, nome do cliente, SKU, número da OS…"
              className={cn(
                "h-11 w-full rounded-lg border border-graf-450 bg-white pl-9 pr-3 text-sm text-graf-900",
                "placeholder:text-graf-500 hover:border-graf-500",
                "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
              )}
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-jb-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            Buscar
          </button>
        </div>
      </form>

      {termo.length === 0 ? (
        <Vazio
          icone={Search}
          titulo="Digite o que você procura"
          descricao="Vale número de pedido, de chamado, de OS ou de orçamento, nome ou e-mail de cliente, SKU e nome de produto, número de série de equipamento."
        />
      ) : termo.length < 2 ? (
        <Vazio
          icone={Search}
          titulo="Termo curto demais"
          descricao="Use pelo menos dois caracteres — com um só, a busca devolveria quase tudo."
        />
      ) : grupos.length === 0 ? (
        <Vazio
          icone={Search}
          titulo={`Nada encontrado para "${termo}"`}
          descricao="Confira a grafia ou tente por outro dado: número do documento, e-mail ou parte do nome. Lembre que a busca só olha as áreas que o seu perfil abre."
        />
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => {
            const Icone = grupo.icone;
            return (
              <section key={grupo.chave} aria-labelledby={`grupo-${grupo.chave}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id={`grupo-${grupo.chave}`}
                    className="flex items-center gap-2 text-lg font-bold text-graf-950"
                  >
                    <Icone className="size-5 text-graf-500" aria-hidden />
                    {grupo.rotulo}
                    <span className="tabular text-sm font-semibold text-graf-500">
                      ({grupo.itens.length}
                      {grupo.itens.length === LIMITE_POR_TIPO ? "+" : ""})
                    </span>
                  </h2>
                  {grupo.hrefTodos && grupo.itens.length === LIMITE_POR_TIPO ? (
                    <Link
                      href={grupo.hrefTodos}
                      className="text-sm font-semibold text-jb-700 underline underline-offset-2"
                    >
                      Ver todos em {grupo.rotulo.toLowerCase()}
                    </Link>
                  ) : null}
                </div>

                <ul className="divide-y divide-graf-100 overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card">
                  {grupo.itens.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition-colors",
                          "hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-graf-900">
                            {item.titulo}
                          </span>
                          <span className="block truncate text-xs text-graf-500">
                            {item.detalhe}
                          </span>
                        </span>
                        {item.valor ? (
                          <span className="tabular shrink-0 text-sm font-semibold text-graf-800">
                            {item.valor}
                          </span>
                        ) : null}
                        {item.etiqueta ? (
                          <Etiqueta tom={item.etiqueta.tom}>{item.etiqueta.texto}</Etiqueta>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
