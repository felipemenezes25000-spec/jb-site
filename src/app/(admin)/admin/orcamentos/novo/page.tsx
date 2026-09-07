import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/admin/vendas/comuns";
import { EditorOrcamento } from "@/components/admin/vendas/editor-orcamento";
import { Trilha } from "@/components/ui/data";
import { paraInputDate } from "@/lib/format";
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
  title: "Novo orçamento",
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

/**
 * Montagem de uma proposta nova.
 *
 * Nasce em rascunho: quem monta revisa antes de o cliente ver, e só depois
 * envia pela tela do orçamento. A validade já vem sugerida em sete dias, que é
 * o padrão que `enviarOrcamento` aplicaria de qualquer jeito — melhor a data
 * aparecer na tela do que surgir por baixo dos panos.
 */
export default async function NovoOrcamentoPage({ searchParams }: { searchParams: Busca }) {
  await exigirEdicao("orcamentos");
  const params = await searchParams;
  const clienteInicial = typeof params.cliente === "string" ? params.cliente : "";

  const [clientes, produtos, cliente] = await Promise.all([
    prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, companyName: true, email: true },
    }),
    prisma.product.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, sku: true, priceCents: true },
    }),
    clienteInicial
      ? prisma.customer.findUnique({
          where: { id: clienteInicial },
          select: { id: true, name: true, email: true, phone: true },
        })
      : null,
  ]);

  const emSeteDias = new Date(Date.now() + 7 * 86_400_000);

  return (
    <div className="space-y-6">
      <Trilha
        itens={[{ rotulo: "Orçamentos", href: "/admin/orcamentos" }, { rotulo: "Novo" }]}
      />

      <CabecalhoPagina
        titulo="Novo orçamento"
        apoio="A proposta nasce como rascunho. O envio ao cliente é o passo seguinte."
      />

      <EditorOrcamento
        modo="novo"
        clientes={clientes.map((item) => ({
          id: item.id,
          rotulo: `${item.companyName || item.name} — ${item.email}`,
        }))}
        produtos={produtos.map((produto) => ({
          id: produto.id,
          rotulo: produto.sku ? `${produto.name} (${produto.sku})` : produto.name,
          precoCents: produto.priceCents,
        }))}
        inicial={{
          kind: "comercial",
          customerId: cliente?.id ?? "",
          contatoNome: cliente?.name ?? "",
          contatoEmail: cliente?.email ?? "",
          contatoTelefone: cliente?.phone ?? "",
          mensagem: "",
          condicoes: "",
          notaInterna: "",
          validoAte: paraInputDate(emSeteDias),
          desconto: "",
          frete: "",
          /* Lista vazia, e não `[linhaVazia()]`.
           *
           * `linhaVazia` é exportada de um módulo `"use client"`. Passar uma
           * função dessas como prop funciona; CHAMÁ-LA aqui, no servidor, não
           * — o React recusa com "Attempted to call linhaVazia() from the
           * server", a tela inteira cai no error boundary e a pessoa vê
           * "Esta tela não carregou". Era o único caminho para criar um
           * orçamento pelo painel, e ele nunca chegou a abrir.
           *
           * Não precisa de nada além disto: o `EditorOrcamento` já começa com
           * uma linha em branco quando recebe a lista vazia — a chamada aqui
           * era redundante além de proibida. */
          itens: [],
        }}
      />
    </div>
  );
}
