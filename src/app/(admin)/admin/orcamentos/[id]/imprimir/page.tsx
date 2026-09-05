import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DadoImpresso,
  FolhaImpressao,
  SecaoImpressa,
} from "@/components/admin/vendas/folha-impressao";
import {
  formatarData,
  formatarDocumento,
  formatarPreco,
  formatarTelefone,
} from "@/lib/format";
import { ROTULO_ORCAMENTO, ROTULO_TIPO_ORCAMENTO } from "@/lib/orcamento";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

type Props = { params: Promise<{ id: string }> };

/**
 * Proposta em papel timbrado.
 *
 * É o documento que vai por e-mail ou impresso para a mesa do cliente. Só
 * aparece o que é dele: mensagem, itens, valores, prazo e condições. A nota
 * interna fica de fora — ela existe justamente para não sair daqui.
 */

export const metadata: Metadata = {
  title: "Impressão do orçamento",
  robots: { index: false, follow: false },
};

export default async function ImprimirOrcamentoPage({ params }: Props) {
  await exigirArea("orcamentos");
  const { id } = await params;

  const [orcamento, ajustes] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            name: true,
            companyName: true,
            document: true,
            personType: true,
            email: true,
            phone: true,
          },
        },
        items: { orderBy: { order: "asc" } },
      },
    }),
    getSettings(),
  ]);

  if (!orcamento) notFound();

  const nome = orcamento.customer?.companyName || orcamento.customer?.name || orcamento.contactName;
  const email = orcamento.customer?.email || orcamento.contactEmail;
  const telefone = orcamento.customer?.phone || orcamento.contactPhone;

  return (
    <FolhaImpressao
      voltarHref={`/admin/orcamentos/${orcamento.id}`}
      voltarRotulo="Voltar ao orçamento"
      documento="Orçamento"
      numero={orcamento.number}
      empresa={{
        nome: ajustes.empresa_nome,
        resumo: ajustes.empresa_resumo,
        endereco: enderecoCompleto(ajustes),
        telefone: ajustes.telefone,
        email: ajustes.email,
        site: SITE_URL.replace(/^https?:\/\//, ""),
      }}
    >
      <SecaoImpressa titulo="Proposta">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <DadoImpresso rotulo="Emitida em">{formatarData(orcamento.createdAt)}</DadoImpresso>
          <DadoImpresso rotulo="Válida até">
            {orcamento.validUntil ? formatarData(orcamento.validUntil) : "A combinar"}
          </DadoImpresso>
          <DadoImpresso rotulo="Tipo">{ROTULO_TIPO_ORCAMENTO[orcamento.kind]}</DadoImpresso>
          <DadoImpresso rotulo="Situação">{ROTULO_ORCAMENTO[orcamento.status]}</DadoImpresso>
        </dl>
      </SecaoImpressa>

      <SecaoImpressa titulo="Cliente">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <DadoImpresso rotulo="Nome">{nome}</DadoImpresso>
          <DadoImpresso rotulo="E-mail">{email}</DadoImpresso>
          <DadoImpresso rotulo="Telefone">
            {telefone ? formatarTelefone(telefone) : ""}
          </DadoImpresso>
          {orcamento.customer?.document ? (
            <DadoImpresso
              rotulo={orcamento.customer.personType === "juridica" ? "CNPJ" : "CPF"}
            >
              {formatarDocumento(orcamento.customer.document)}
            </DadoImpresso>
          ) : null}
        </dl>
      </SecaoImpressa>

      {orcamento.message ? (
        <SecaoImpressa titulo="Mensagem">
          <p className="whitespace-pre-line text-sm leading-relaxed text-graf-800">
            {orcamento.message}
          </p>
        </SecaoImpressa>
      ) : null}

      <SecaoImpressa titulo="Itens">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Itens do orçamento {orcamento.number}</caption>
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
            {orcamento.items.map((item) => (
              <tr key={item.id} className="border-b border-graf-200 align-top">
                <td className="py-2.5 pr-3 text-graf-950">{item.description}</td>
                <td className="tabular py-2.5 pr-3 text-center">{item.quantity}</td>
                <td className="tabular py-2.5 pr-3 text-right">
                  {formatarPreco(item.unitPriceCents)}
                </td>
                <td className="tabular py-2.5 text-right font-semibold">
                  {formatarPreco(item.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="quebra ml-auto mt-4 max-w-xs text-sm">
          <div className="flex justify-between py-1">
            <span className="text-graf-600">Subtotal</span>
            <span className="tabular">{formatarPreco(orcamento.subtotalCents)}</span>
          </div>
          {orcamento.discountCents > 0 ? (
            <div className="flex justify-between py-1">
              <span className="text-graf-600">Desconto</span>
              <span className="tabular">− {formatarPreco(orcamento.discountCents)}</span>
            </div>
          ) : null}
          {orcamento.shippingCents > 0 ? (
            <div className="flex justify-between py-1">
              <span className="text-graf-600">Frete</span>
              <span className="tabular">{formatarPreco(orcamento.shippingCents)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-graf-300 pt-2">
            <span className="font-bold">Total</span>
            <span className="tabular text-base font-bold">
              {formatarPreco(orcamento.totalCents)}
            </span>
          </div>
        </div>
      </SecaoImpressa>

      {orcamento.conditions ? (
        <SecaoImpressa titulo="Condições">
          <p className="whitespace-pre-line text-sm leading-relaxed text-graf-800">
            {orcamento.conditions}
          </p>
        </SecaoImpressa>
      ) : null}

      <SecaoImpressa titulo="Aceite">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <div className="mt-10 border-t border-graf-400 pt-1 text-xs text-graf-600">
              Assinatura do cliente
            </div>
          </div>
          <div>
            <div className="mt-10 border-t border-graf-400 pt-1 text-xs text-graf-600">
              Data
            </div>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-graf-500">
          {orcamento.validUntil
            ? `Proposta válida até ${formatarData(orcamento.validUntil)}. Após essa data, os valores podem mudar.`
            : "Os valores desta proposta podem mudar sem prazo de validade definido — confirme antes de fechar."}
        </p>
      </SecaoImpressa>
    </FolhaImpressao>
  );
}
