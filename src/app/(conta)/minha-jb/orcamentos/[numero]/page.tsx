import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { QuoteStatus } from "@prisma/client";
import { CalendarClock, LifeBuoy, Package } from "lucide-react";

import { DecisaoDoOrcamento } from "@/components/conta/mj-decisao-orcamento";
import { Topo } from "@/components/conta/mj-topo";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, LinhaDoTempo } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import { distanciaEmDias, formatarData, formatarDataHora, formatarPreco } from "@/lib/format";
import { ROTULO_ORCAMENTO, passosDoOrcamento } from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Detalhe do orçamento",
  robots: { index: false, follow: false },
};

function tomDoOrcamento(status: QuoteStatus) {
  if (status === "aprovado" || status === "convertido") return "ok" as const;
  if (status === "recusado" || status === "expirado") return "neutro" as const;
  return "aguardando" as const;
}

type Params = Promise<{ numero: string }>;

export default async function OrcamentoPage({ params }: { params: Params }) {
  const [cliente, { numero }] = await Promise.all([
    exigirCliente("/minha-jb/orcamentos"),
    params,
  ]);

  const chave = decodeURIComponent(numero);

  const orcamento = await prisma.quote.findFirst({
    where: {
      customerId: cliente.id,
      status: { not: "rascunho" },
      OR: [{ number: chave }, { id: chave }],
    },
    include: {
      items: { orderBy: { order: "asc" } },
      events: {
        where: { visibleToCustomer: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, message: true, createdAt: true },
      },
      request: { select: { number: true } },
      order: { select: { number: true } },
    },
  });

  if (!orcamento) notFound();

  const agora = new Date();
  const venceu = Boolean(orcamento.validUntil && orcamento.validUntil < agora);
  const emAberto = orcamento.status === "enviado" || orcamento.status === "em_duvida";
  const podeDecidir = emAberto && !venceu;

  return (
    <div>
      <Topo
        voltar={{ href: "/minha-jb/orcamentos", rotulo: "Meus orçamentos" }}
        titulo={`Orçamento ${orcamento.number}`}
        etiqueta={
          <Etiqueta tom={tomDoOrcamento(orcamento.status)}>
            {ROTULO_ORCAMENTO[orcamento.status]}
          </Etiqueta>
        }
        descricao={
          orcamento.kind === "assistencia"
            ? "Proposta de reparo da assistência técnica."
            : "Proposta comercial de equipamentos e serviços."
        }
      />

      {podeDecidir ? (
        <Aviso tom="atencao" titulo="Esta proposta espera sua resposta" className="mb-6">
          {orcamento.validUntil
            ? `Válida até ${formatarData(orcamento.validUntil)} (${distanciaEmDias(
                orcamento.validUntil,
              )}).`
            : "Sem prazo de validade definido."}{" "}
          {orcamento.kind === "assistencia"
            ? "Com a aprovação, o técnico executa o reparo orçado."
            : "Com a aprovação, o pedido é gerado com os valores desta proposta."}
        </Aviso>
      ) : null}

      {emAberto && venceu ? (
        <Aviso tom="atencao" titulo="O prazo desta proposta venceu" className="mb-6">
          A validade era {formatarData(orcamento.validUntil)}. Fale com a equipe para
          revisarmos os valores — preço de peça e de equipamento muda.
        </Aviso>
      ) : null}

      {orcamento.order ? (
        <Aviso
          tom="sucesso"
          titulo="Proposta aprovada e convertida em pedido"
          className="mb-6"
          acao={
            <LinkBotao href={`/minha-jb/pedidos/${orcamento.order.number}`} tamanho="sm">
              Abrir pedido
            </LinkBotao>
          }
        >
          O pedido {orcamento.order.number} foi criado com os valores desta proposta.
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Itens da proposta" />
            <ul className="divide-y divide-graf-100 p-5">
              {orcamento.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-graf-950">{item.description}</p>
                    <p className="mt-0.5 text-xs text-graf-500">
                      {item.quantity} × {formatarPreco(item.unitPriceCents)}
                    </p>
                  </div>
                  <p className="tabular text-sm font-bold text-graf-900">
                    {formatarPreco(item.totalCents)}
                  </p>
                </li>
              ))}
              {orcamento.items.length === 0 ? (
                <li className="py-3 text-sm text-graf-500">
                  Esta proposta ainda não tem itens detalhados. Fale com a equipe antes de
                  decidir.
                </li>
              ) : null}
            </ul>

            <dl className="space-y-2.5 border-t border-graf-200 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-graf-600">Subtotal</dt>
                <dd className="tabular text-graf-900">
                  {formatarPreco(orcamento.subtotalCents)}
                </dd>
              </div>
              {orcamento.discountCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">Desconto</dt>
                  <dd className="tabular text-ok-700">
                    − {formatarPreco(orcamento.discountCents)}
                  </dd>
                </div>
              ) : null}
              {orcamento.shippingCents > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-graf-600">Frete</dt>
                  <dd className="tabular text-graf-900">
                    {formatarPreco(orcamento.shippingCents)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-graf-200 pt-2.5">
                <dt className="font-bold text-graf-900">Total</dt>
                <dd className="tabular text-base font-bold text-graf-950">
                  {formatarPreco(orcamento.totalCents)}
                </dd>
              </div>
            </dl>
          </Cartao>

          {orcamento.message || orcamento.conditions ? (
            <Cartao>
              <CabecalhoCartao titulo="Condições e observações" />
              <div className="space-y-4 p-5 text-sm">
                {orcamento.message ? (
                  <p className="whitespace-pre-line leading-relaxed text-graf-700">
                    {orcamento.message}
                  </p>
                ) : null}
                {orcamento.conditions ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-graf-500">
                      Condições
                    </p>
                    <p className="mt-1.5 whitespace-pre-line leading-relaxed text-graf-700">
                      {orcamento.conditions}
                    </p>
                  </div>
                ) : null}
              </div>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo={podeDecidir ? "Sua decisão" : "Histórico da proposta"} />
            <div className="p-5">
              {podeDecidir ? (
                <DecisaoDoOrcamento
                  orcamentoId={orcamento.id}
                  numero={orcamento.number}
                  totalCents={orcamento.totalCents}
                  nomeSugerido={cliente.name}
                />
              ) : orcamento.events.length > 0 ? (
                <ul className="space-y-4">
                  {orcamento.events.map((evento) => (
                    <li key={evento.id} className="rounded-lg border border-graf-200 p-4">
                      <p className="text-sm font-bold text-graf-950">{evento.title}</p>
                      {evento.message ? (
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-graf-700">
                          {evento.message}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-xs text-graf-500">
                        {formatarDataHora(evento.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-graf-600">
                  Nenhum registro adicional nesta proposta.
                </p>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Andamento" />
            <div className="p-5">
              <LinhaDoTempo passos={passosDoOrcamento(orcamento)} />
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Dados da proposta" />
            <dl className="space-y-2.5 p-5 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-graf-500">Emitida em</dt>
                <dd className="text-graf-900">{formatarData(orcamento.createdAt)}</dd>
              </div>
              {orcamento.sentAt ? (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="text-graf-500">Enviada em</dt>
                  <dd className="text-graf-900">{formatarData(orcamento.sentAt)}</dd>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-graf-500">Validade</dt>
                <dd className="text-graf-900">
                  {orcamento.validUntil ? formatarData(orcamento.validUntil) : "Sem prazo"}
                </dd>
              </div>
              {orcamento.version > 1 ? (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="text-graf-500">Versão</dt>
                  <dd className="text-graf-900">{orcamento.version}ª</dd>
                </div>
              ) : null}
              {orcamento.decidedAt ? (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="text-graf-500">Decidida em</dt>
                  <dd className="text-graf-900">{formatarDataHora(orcamento.decidedAt)}</dd>
                </div>
              ) : null}
              {orcamento.decidedByName ? (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="text-graf-500">Registrada por</dt>
                  <dd className="text-graf-900">{orcamento.decidedByName}</dd>
                </div>
              ) : null}
            </dl>
          </Cartao>

          {orcamento.request ? (
            <Cartao>
              <CabecalhoCartao titulo="Chamado de origem" />
              <div className="p-5 text-sm">
                <p className="leading-relaxed text-graf-600">
                  Esta proposta nasceu do diagnóstico do chamado{" "}
                  <Link
                    href={`/minha-jb/assistencia/${orcamento.request.number}`}
                    className="font-semibold text-jb-700 underline-offset-4 hover:underline"
                  >
                    {orcamento.request.number}
                  </Link>
                  .
                </p>
                <LinkBotao
                  href={`/minha-jb/assistencia/${orcamento.request.number}`}
                  variante="secundario"
                  tamanho="sm"
                  className="mt-3"
                >
                  <LifeBuoy className="size-4" aria-hidden />
                  Abrir chamado
                </LinkBotao>
              </div>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo="Como funciona" />
            <ul className="space-y-3 p-5 text-sm text-graf-600">
              <li className="flex items-start gap-2.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span>
                  Aprovada dentro do prazo, a proposta vale exatamente pelos valores
                  listados aqui.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Package className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span>
                  {orcamento.kind === "assistencia"
                    ? "O serviço é liberado para execução assim que você aprova."
                    : "O pedido é gerado com os valores negociados, sem passar pelo preço de vitrine."}
                </span>
              </li>
            </ul>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
