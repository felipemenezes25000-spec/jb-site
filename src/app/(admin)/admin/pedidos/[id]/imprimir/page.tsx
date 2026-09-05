import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DadoImpresso,
  FolhaImpressao,
  SecaoImpressa,
} from "@/components/admin/vendas/folha-impressao";
import { ROTULO_FRETE, ROTULO_METODO } from "@/components/admin/vendas/comuns";
import {
  formatarCep,
  formatarData,
  formatarDataHora,
  formatarDocumento,
  formatarPreco,
  formatarTelefone,
} from "@/lib/format";
import { ROTULO_STATUS } from "@/lib/pedido";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

type Props = { params: Promise<{ id: string }> };

/**
 * Pedido em papel timbrado.
 *
 * Serve de espelho da venda para arquivo e para entregar junto do equipamento.
 * Não é documento fiscal — a nota fiscal é anexada ao pedido como documento e
 * a folha diz isso em letra pequena, para ninguém confundir os dois papéis.
 */

export const metadata: Metadata = {
  title: "Impressão do pedido",
  robots: { index: false, follow: false },
};

export default async function ImprimirPedidoPage({ params }: Props) {
  await exigirArea("pedidos");
  const { id } = await params;

  const [pedido, ajustes] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: [{ parentId: "asc" }, { id: "asc" }] },
        payments: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    }),
    getSettings(),
  ]);

  if (!pedido) notFound();

  const principais = pedido.items.filter((item) => !item.parentId);
  const endereco = [
    [pedido.shipStreet, pedido.shipNumber].filter(Boolean).join(", "),
    pedido.shipComplement,
    pedido.shipDistrict,
    [pedido.shipCity, pedido.shipState].filter(Boolean).join("/"),
    pedido.shipZip ? `CEP ${formatarCep(pedido.shipZip)}` : "",
  ].filter(Boolean);

  const aprovado = pedido.payments.find((pagamento) => pagamento.status === "aprovado");

  return (
    <FolhaImpressao
      voltarHref={`/admin/pedidos/${pedido.id}`}
      voltarRotulo="Voltar ao pedido"
      documento="Pedido"
      numero={pedido.number}
      empresa={{
        nome: ajustes.empresa_nome,
        resumo: ajustes.empresa_resumo,
        endereco: enderecoCompleto(ajustes),
        telefone: ajustes.telefone,
        email: ajustes.email,
        site: SITE_URL.replace(/^https?:\/\//, ""),
      }}
    >
      <SecaoImpressa titulo="Dados da venda">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <DadoImpresso rotulo="Emitido em">{formatarDataHora(pedido.placedAt)}</DadoImpresso>
          <DadoImpresso rotulo="Situação">{ROTULO_STATUS[pedido.status]}</DadoImpresso>
          <DadoImpresso rotulo="Pagamento">
            {pedido.paidAt ? `Confirmado em ${formatarData(pedido.paidAt)}` : "Em aberto"}
          </DadoImpresso>
          <DadoImpresso rotulo="Forma">
            {aprovado ? ROTULO_METODO[aprovado.method] : ""}
          </DadoImpresso>
        </dl>
      </SecaoImpressa>

      <SecaoImpressa titulo="Comprador">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <DadoImpresso rotulo="Nome">{pedido.buyerName}</DadoImpresso>
          <DadoImpresso rotulo={pedido.personType === "juridica" ? "CNPJ" : "CPF"}>
            {pedido.buyerDocument ? formatarDocumento(pedido.buyerDocument) : ""}
          </DadoImpresso>
          {pedido.personType === "juridica" ? (
            <DadoImpresso rotulo="Razão social">{pedido.companyName}</DadoImpresso>
          ) : null}
          <DadoImpresso rotulo="E-mail">{pedido.buyerEmail}</DadoImpresso>
          <DadoImpresso rotulo="Telefone">
            {pedido.buyerPhone ? formatarTelefone(pedido.buyerPhone) : ""}
          </DadoImpresso>
        </dl>
      </SecaoImpressa>

      <SecaoImpressa titulo={pedido.shippingLabel || ROTULO_FRETE[pedido.shippingKind]}>
        {endereco.length > 0 ? (
          <address className="text-sm not-italic leading-relaxed text-graf-800">
            {endereco.map((linha) => (
              <span key={linha} className="block">
                {linha}
              </span>
            ))}
            {pedido.shipReference ? (
              <span className="block text-graf-600">Referência: {pedido.shipReference}</span>
            ) : null}
          </address>
        ) : (
          <p className="text-sm text-graf-600">
            {pedido.shippingKind === "retirada"
              ? ajustes.retirada_instrucoes ||
                "Retirada no endereço da JB, em horário comercial."
              : "Sem endereço de entrega registrado."}
          </p>
        )}
      </SecaoImpressa>

      <SecaoImpressa titulo="Itens">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Itens do pedido {pedido.number}</caption>
          <thead>
            <tr className="border-b border-graf-300 text-left text-[10px] uppercase tracking-wider text-graf-500">
              <th scope="col" className="py-2 pr-3 font-bold">
                Descrição
              </th>
              <th scope="col" className="w-16 py-2 pr-3 text-center font-bold">
                Qtd.
              </th>
              <th scope="col" className="w-28 py-2 pr-3 text-right font-bold">
                Unitário
              </th>
              <th scope="col" className="w-28 py-2 text-right font-bold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {principais.map((item) => {
              const adicionais = pedido.items.filter((outro) => outro.parentId === item.id);
              return (
                <tr key={item.id} className="border-b border-graf-200 align-top">
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium text-graf-950">{item.name}</span>
                    <span className="block text-xs text-graf-500">
                      {[item.brandName, item.modelName, item.sku ? `SKU ${item.sku}` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {adicionais.map((adicional) => (
                      <span key={adicional.id} className="block text-xs text-graf-600">
                        + {adicional.name} ({formatarPreco(adicional.totalCents)})
                      </span>
                    ))}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-center">{item.quantity}</td>
                  <td className="tabular py-2.5 pr-3 text-right">
                    {formatarPreco(item.unitPriceCents)}
                  </td>
                  <td className="tabular py-2.5 text-right font-semibold">
                    {formatarPreco(item.totalCents)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="quebra mt-4 ml-auto max-w-xs text-sm">
          <div className="flex justify-between py-1">
            <span className="text-graf-600">Subtotal</span>
            <span className="tabular">{formatarPreco(pedido.subtotalCents)}</span>
          </div>
          {pedido.discountCents > 0 ? (
            <div className="flex justify-between py-1">
              <span className="text-graf-600">
                Desconto{pedido.couponCode ? ` (${pedido.couponCode})` : ""}
              </span>
              <span className="tabular">− {formatarPreco(pedido.discountCents)}</span>
            </div>
          ) : null}
          <div className="flex justify-between py-1">
            <span className="text-graf-600">
              {pedido.shippingLabel || ROTULO_FRETE[pedido.shippingKind]}
            </span>
            <span className="tabular">
              {pedido.shippingCents > 0 ? formatarPreco(pedido.shippingCents) : "Sem custo"}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-graf-300 pt-2">
            <span className="font-bold">Total</span>
            <span className="tabular text-base font-bold">
              {formatarPreco(pedido.totalCents)}
            </span>
          </div>
        </div>
      </SecaoImpressa>

      {pedido.customerNote ? (
        <SecaoImpressa titulo="Observação do cliente">
          <p className="whitespace-pre-line text-sm leading-relaxed text-graf-800">
            {pedido.customerNote}
          </p>
        </SecaoImpressa>
      ) : null}

      <p className="mt-8 text-[11px] leading-relaxed text-graf-500">
        Este documento é o espelho do pedido registrado no sistema da JB e não substitui a nota
        fiscal.
      </p>
    </FolhaImpressao>
  );
}
