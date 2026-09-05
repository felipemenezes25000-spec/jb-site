import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, ShoppingCart } from "lucide-react";

import { AcoesDoPagamento } from "@/components/admin/vendas/acoes-pagamento";
import {
  CabecalhoPagina,
  Dado,
  EtiquetaPedido,
  ListaDeDados,
  ROTULO_METODO,
  ROTULO_PAGAMENTO,
  TOM_PAGAMENTO,
  rotuloProvedor,
} from "@/components/admin/vendas/comuns";
import { LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { PODE } from "@/lib/auth";
import { formatarDataHora, formatarPreco } from "@/lib/format";
import { pagamentoEhSimulado } from "@/lib/pagamento";
import { ROTULO_STATUS } from "@/lib/pedido";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

/**
 * Ficha da cobrança.
 *
 * O bloco de eventos mostra o payload cru que o provedor mandou, sem
 * interpretação. Quando uma cobrança dá errado, é esse texto que responde por
 * quê — resumir aqui só atrasaria quem está investigando.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pagamento = await prisma.payment.findUnique({
    where: { id },
    select: { order: { select: { number: true } } },
  });
  if (!pagamento) return { title: "Pagamento não encontrado" };
  return { title: `Pagamento do pedido ${pagamento.order.number}` };
}

export default async function PagamentoPage({ params }: Props) {
  const usuario = await exigirArea("pagamentos");
  const { id } = await params;

  const pagamento = await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          number: true,
          status: true,
          buyerName: true,
          buyerEmail: true,
          totalCents: true,
        },
      },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!pagamento) notFound();

  const manual = pagamento.provider === "manual";
  const podeConsultar = !manual && Boolean(pagamento.externalId);
  const motivoSemConsulta = manual
    ? "Pagamento registrado à mão pela equipe: não existe cobrança no provedor para consultar."
    : "Esta cobrança não guardou o identificador do provedor, então não há o que consultar.";

  const diferencaDoPedido = pagamento.amountCents - pagamento.order.totalCents;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Pagamentos", href: "/admin/pagamentos" },
          { rotulo: pagamento.order.number },
        ]}
      />

      <CabecalhoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">{formatarPreco(pagamento.amountCents)}</span>
            <Etiqueta tom={TOM_PAGAMENTO[pagamento.status]} ponto>
              {ROTULO_PAGAMENTO[pagamento.status]}
            </Etiqueta>
          </span>
        }
        apoio={
          <>
            {ROTULO_METODO[pagamento.method]} via {rotuloProvedor(pagamento.provider)} · criada em{" "}
            {formatarDataHora(pagamento.createdAt)}
          </>
        }
        acoes={
          <LinkBotao
            href={`/admin/pedidos/${pagamento.order.id}`}
            variante="secundario"
            tamanho="sm"
          >
            <ShoppingCart className="size-4" aria-hidden />
            Abrir pedido {pagamento.order.number}
          </LinkBotao>
        }
      />

      {pagamento.provider === "mock" ? (
        <Aviso tom="atencao" titulo="Cobrança simulada">
          Esta cobrança foi criada pelo provedor de teste. Nenhum dinheiro mudou de mãos, e o
          estorno aqui é apenas um registro.
        </Aviso>
      ) : null}

      {manual ? (
        <Aviso tom="info" titulo="Recebimento registrado pela equipe">
          O valor entrou fora do site — transferência, dinheiro ou maquininha. O comprovante fica
          com a JB; aqui está só o registro contábil.
        </Aviso>
      ) : null}

      {diferencaDoPedido !== 0 ? (
        <Aviso tom="atencao" titulo="Valor diferente do total do pedido">
          A cobrança é de {formatarPreco(pagamento.amountCents)} e o pedido soma{" "}
          {formatarPreco(pagamento.order.totalCents)}. Isso acontece quando o pedido mudou depois
          da cobrança — confira antes de dar baixa.
        </Aviso>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Dados da cobrança" />
            <div className="p-5">
              <ListaDeDados colunas={3}>
                <Dado rotulo="Pedido">
                  <Link
                    href={`/admin/pedidos/${pagamento.order.id}`}
                    className="tabular text-jb-700 underline-offset-2 hover:underline"
                  >
                    {pagamento.order.number}
                  </Link>
                </Dado>
                <Dado rotulo="Situação do pedido">
                  <EtiquetaPedido
                    status={pagamento.order.status}
                    rotulo={ROTULO_STATUS[pagamento.order.status]}
                  />
                </Dado>
                <Dado rotulo="Comprador">{pagamento.order.buyerName}</Dado>

                <Dado rotulo="Forma">{ROTULO_METODO[pagamento.method]}</Dado>
                <Dado rotulo="Parcelas">
                  {pagamento.installments > 1 ? `${pagamento.installments}x` : "À vista"}
                </Dado>
                <Dado rotulo="Provedor">{rotuloProvedor(pagamento.provider)}</Dado>

                <Dado rotulo="Identificador no provedor">
                  {pagamento.externalId ? (
                    <span className="break-all font-mono text-xs">{pagamento.externalId}</span>
                  ) : null}
                </Dado>
                <Dado rotulo="Aprovada em">
                  {pagamento.approvedAt ? formatarDataHora(pagamento.approvedAt) : null}
                </Dado>
                <Dado rotulo="Expira em">
                  {pagamento.expiresAt ? formatarDataHora(pagamento.expiresAt) : null}
                </Dado>

                {pagamento.cardLast4 ? (
                  <Dado rotulo="Cartão">
                    {[pagamento.cardBrand, `final ${pagamento.cardLast4}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Dado>
                ) : null}
                <Dado rotulo="Última atualização">
                  {formatarDataHora(pagamento.updatedAt)}
                </Dado>
              </ListaDeDados>

              {pagamento.failReason ? (
                <div className="mt-5 rounded-lg border border-jb-200 bg-jb-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-jb-700">
                    Motivo informado
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-graf-800">
                    {pagamento.failReason}
                  </p>
                </div>
              ) : null}

              {pagamento.pixCopyPaste ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                    Pix copia e cola
                  </p>
                  <p className="mt-1 break-all rounded-lg bg-graf-50 p-3 font-mono text-xs text-graf-700">
                    {pagamento.pixCopyPaste}
                  </p>
                </div>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Eventos do provedor"
              descricao="Conteúdo bruto de cada notificação e consulta, na ordem inversa."
            />
            <div className="p-5">
              {pagamento.events.length === 0 ? (
                <Vazio
                  icone={History}
                  titulo="Nenhum evento registrado"
                  descricao="Webhooks e consultas manuais aparecem aqui assim que chegarem."
                />
              ) : (
                <ul className="space-y-4">
                  {pagamento.events.map((evento) => (
                    <li key={evento.id} className="rounded-lg border border-graf-200">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-graf-200 bg-graf-50 px-4 py-2.5">
                        <span className="text-sm font-semibold text-graf-900">{evento.kind}</span>
                        <span className="text-xs text-graf-500">
                          {formatarDataHora(evento.createdAt)}
                        </span>
                      </div>
                      <p className="border-b border-graf-100 px-4 py-2 font-mono text-[11px] break-all text-graf-500">
                        {evento.eventKey}
                      </p>
                      <div className="overflow-x-auto">
                        <pre className="px-4 py-3 font-mono text-xs leading-relaxed text-graf-700">
                          {JSON.stringify(evento.payload, null, 2)}
                        </pre>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>

        <aside>
          <AcoesDoPagamento
            pagamentoId={pagamento.id}
            provedor={rotuloProvedor(pagamento.provider)}
            podeConsultar={podeConsultar && !pagamentoEhSimulado()}
            motivoSemConsulta={
              pagamentoEhSimulado() && !manual
                ? "O provedor simulado não guarda estado próprio: não há a quem perguntar. Configure um provedor real para usar a reconsulta."
                : motivoSemConsulta
            }
            podeEstornar={PODE.confirmarPagamentoManual(usuario)}
            jaEstornado={pagamento.status === "estornado"}
            valorFormatado={formatarPreco(pagamento.amountCents)}
          />
        </aside>
      </div>
    </div>
  );
}
