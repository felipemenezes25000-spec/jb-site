import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, Printer, ShoppingCart, Stethoscope, User } from "lucide-react";

import { AcoesOrcamento } from "@/components/admin/vendas/acoes-orcamento";
import {
  CabecalhoPagina,
  Dado,
  ListaDeDados,
  TOM_ORCAMENTO,
} from "@/components/admin/vendas/comuns";
import { EditorOrcamento } from "@/components/admin/vendas/editor-orcamento";
import { LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import {
  Cartao,
  CabecalhoCartao,
  Etiqueta,
  LinhaDoTempo,
  Trilha,
  Vazio,
} from "@/components/ui/data";
import { PODE } from "@/lib/auth";
import {
  distanciaEmDias,
  formatarData,
  formatarDataHora,
  formatarPreco,
  formatarTelefone,
  paraInputDate,
} from "@/lib/format";
import {
  ROTULO_ORCAMENTO,
  ROTULO_TIPO_ORCAMENTO,
  passosDoOrcamento,
} from "@/lib/orcamento";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

/**
 * Tela da proposta.
 *
 * Um orçamento é um documento vivo até ser decidido: enquanto está em rascunho
 * ou negociação, o editor fica aberto na coluna principal. Depois de aprovado ou
 * convertido, ele passa a ser leitura — mexer nos valores mudaria uma venda já
 * registrada.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const orcamento = await prisma.quote.findUnique({
    where: { id },
    select: { number: true, contactName: true },
  });
  if (!orcamento) return { title: "Orçamento não encontrado" };
  return { title: `Orçamento ${orcamento.number}` };
}

/** Centavos no formato que o editor espera de volta no campo de texto. */
function paraCampo(centavos: number) {
  return centavos > 0 ? (centavos / 100).toFixed(2).replace(".", ",") : "";
}

export default async function OrcamentoPage({ params }: Props) {
  const usuario = await exigirArea("orcamentos");
  const { id } = await params;

  const orcamento = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, companyName: true, email: true, phone: true } },
      request: { select: { id: true, number: true } },
      order: { select: { id: true, number: true, status: true } },
      items: { orderBy: { order: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!orcamento) notFound();

  const podeMexer = podeEditar(usuario, "orcamentos");
  const travado =
    orcamento.status === "convertido" ||
    orcamento.status === "aprovado" ||
    orcamento.status === "recusado";

  const [clientes, produtos, autores] = await Promise.all([
    podeMexer && !travado
      ? prisma.customer.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          take: 500,
          select: { id: true, name: true, companyName: true, email: true },
        })
      : Promise.resolve([]),
    podeMexer && !travado
      ? prisma.product.findMany({
          where: { status: "active" },
          orderBy: { name: "asc" },
          take: 500,
          select: { id: true, name: true, sku: true, priceCents: true },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        id: {
          in: [
            ...new Set(orcamento.events.map((e) => e.userId).filter((v): v is string => !!v)),
          ],
        },
      },
      select: { id: true, name: true },
    }),
  ]);

  const nomePorUsuario = new Map(autores.map((autor) => [autor.id, autor.name]));

  const vencido =
    Boolean(orcamento.validUntil) &&
    orcamento.validUntil! < new Date() &&
    (orcamento.status === "enviado" || orcamento.status === "em_duvida");

  const passos = passosDoOrcamento(orcamento);

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Orçamentos", href: "/admin/orcamentos" },
          { rotulo: orcamento.number },
        ]}
      />

      <CabecalhoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">Orçamento {orcamento.number}</span>
            <Etiqueta tom={TOM_ORCAMENTO[orcamento.status]} ponto>
              {ROTULO_ORCAMENTO[orcamento.status]}
            </Etiqueta>
          </span>
        }
        apoio={
          <>
            {ROTULO_TIPO_ORCAMENTO[orcamento.kind]} · versão {orcamento.version} · criada em{" "}
            {formatarData(orcamento.createdAt)} ·{" "}
            <span className="tabular font-semibold text-graf-800">
              {formatarPreco(orcamento.totalCents)}
            </span>
          </>
        }
        acoes={
          <>
            {orcamento.customer ? (
              <LinkBotao
                href={`/admin/clientes/${orcamento.customer.id}`}
                variante="secundario"
                tamanho="sm"
              >
                <User className="size-4" aria-hidden />
                Ficha do cliente
              </LinkBotao>
            ) : null}
            <LinkBotao
              href={`/admin/orcamentos/${orcamento.id}/imprimir`}
              variante="secundario"
              tamanho="sm"
              target="_blank"
            >
              <Printer className="size-4" aria-hidden />
              Imprimir
            </LinkBotao>
          </>
        }
      />

      {vencido ? (
        <Aviso tom="atencao" titulo="Prazo vencido">
          A validade era {formatarData(orcamento.validUntil)} ({distanciaEmDias(orcamento.validUntil)}).
          Aprovar uma proposta vencida é recusado pelo sistema — revise os valores e envie uma
          versão nova.
        </Aviso>
      ) : null}

      {orcamento.order ? (
        <Aviso tom="sucesso" titulo={`Pedido ${orcamento.order.number} gerado`}>
          A aprovação desta proposta virou uma venda com os valores negociados.{" "}
          <Link
            href={`/admin/pedidos/${orcamento.order.id}`}
            className="font-semibold underline underline-offset-2"
          >
            Abrir o pedido
          </Link>
          .
        </Aviso>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          {podeMexer && !travado ? (
            <EditorOrcamento
              modo="editar"
              quoteId={orcamento.id}
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
                kind: orcamento.kind,
                customerId: orcamento.customerId ?? "",
                contatoNome: orcamento.contactName,
                contatoEmail: orcamento.contactEmail,
                contatoTelefone: orcamento.contactPhone,
                mensagem: orcamento.message,
                condicoes: orcamento.conditions,
                notaInterna: orcamento.internalNote,
                validoAte: paraInputDate(orcamento.validUntil),
                desconto: paraCampo(orcamento.discountCents),
                frete: paraCampo(orcamento.shippingCents),
                itens: orcamento.items.map((item) => ({
                  chave: item.id,
                  descricao: item.description,
                  quantidade: String(item.quantity),
                  valor: paraCampo(item.unitPriceCents),
                  productId: item.productId ?? "",
                })),
              }}
            />
          ) : (
            <>
              <Cartao>
                <CabecalhoCartao
                  titulo="Dados da proposta"
                  descricao={
                    travado
                      ? "Proposta já decidida: os valores ficam como estão."
                      : "Você tem acesso de leitura a esta área."
                  }
                />
                <div className="p-5">
                  <ListaDeDados colunas={3}>
                    <Dado rotulo="Cliente">
                      {orcamento.customer ? (
                        <Link
                          href={`/admin/clientes/${orcamento.customer.id}`}
                          className="text-jb-700 underline-offset-2 hover:underline"
                        >
                          {orcamento.customer.companyName || orcamento.customer.name}
                        </Link>
                      ) : (
                        orcamento.contactName
                      )}
                    </Dado>
                    <Dado rotulo="E-mail">{orcamento.contactEmail}</Dado>
                    {orcamento.contactPhone ? (
                      <Dado rotulo="Telefone">{formatarTelefone(orcamento.contactPhone)}</Dado>
                    ) : null}
                    <Dado rotulo="Validade">
                      {orcamento.validUntil ? formatarData(orcamento.validUntil) : "Sem prazo"}
                    </Dado>
                    {orcamento.sentAt ? (
                      <Dado rotulo="Enviada em">{formatarDataHora(orcamento.sentAt)}</Dado>
                    ) : null}
                    {orcamento.decidedAt ? (
                      <Dado rotulo="Decidida em">{formatarDataHora(orcamento.decidedAt)}</Dado>
                    ) : null}
                    {orcamento.decidedByName ? (
                      <Dado rotulo="Decidida por">{orcamento.decidedByName}</Dado>
                    ) : null}
                  </ListaDeDados>
                </div>
              </Cartao>

              <EditorOrcamento
                modo="editar"
                quoteId={orcamento.id}
                clientes={[]}
                produtos={[]}
                somenteLeitura
                motivoBloqueio={
                  travado
                    ? "Proposta já decidida: o conteúdo fica travado como registro."
                    : "Seu acesso a orçamentos é apenas de consulta."
                }
                inicial={{
                  kind: orcamento.kind,
                  customerId: orcamento.customerId ?? "",
                  contatoNome: orcamento.contactName,
                  contatoEmail: orcamento.contactEmail,
                  contatoTelefone: orcamento.contactPhone,
                  mensagem: orcamento.message,
                  condicoes: orcamento.conditions,
                  notaInterna: orcamento.internalNote,
                  validoAte: paraInputDate(orcamento.validUntil),
                  desconto: paraCampo(orcamento.discountCents),
                  frete: paraCampo(orcamento.shippingCents),
                  itens: orcamento.items.map((item) => ({
                    chave: item.id,
                    descricao: item.description,
                    quantidade: String(item.quantity),
                    valor: paraCampo(item.unitPriceCents),
                    productId: item.productId ?? "",
                  })),
                }}
              />
            </>
          )}

          {orcamento.request ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Chamado de origem"
                descricao="Esta proposta nasceu de um atendimento técnico."
              />
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="flex items-center gap-2 text-sm text-graf-700">
                  <Stethoscope className="size-4 text-graf-500" aria-hidden />
                  Chamado{" "}
                  <span className="tabular font-semibold">{orcamento.request.number}</span>
                </p>
                <LinkBotao
                  href={`/admin/assistencia/${orcamento.request.id}`}
                  variante="secundario"
                  tamanho="sm"
                >
                  Abrir chamado
                </LinkBotao>
              </div>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao
              titulo="Andamento"
              descricao="Da montagem à decisão do cliente."
            />
            <div className="p-5">
              <LinhaDoTempo passos={passos} />
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Histórico"
              descricao="Eventos registrados nesta proposta."
            />
            <div className="p-5">
              {orcamento.events.length === 0 ? (
                <Vazio
                  icone={History}
                  titulo="Sem eventos"
                  descricao="Envio, anotações e decisões aparecem aqui."
                />
              ) : (
                <ul className="space-y-4">
                  {[...orcamento.events].reverse().map((evento) => (
                    <li key={evento.id} className="border-l-2 border-graf-200 pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-graf-900">{evento.title}</p>
                        {evento.visibleToCustomer ? null : (
                          <Etiqueta tom="neutro">Só para a equipe</Etiqueta>
                        )}
                      </div>
                      {evento.message ? (
                        <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-graf-700">
                          {evento.message}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[0.8125rem] text-graf-500">
                        {formatarDataHora(evento.createdAt)}
                        {evento.userId && nomePorUsuario.get(evento.userId)
                          ? ` · ${nomePorUsuario.get(evento.userId)}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>

        <aside className="space-y-6">
          {podeMexer ? (
            <AcoesOrcamento
              situacao={{
                quoteId: orcamento.id,
                numero: orcamento.number,
                status: orcamento.status,
                jaEnviada: orcamento.sentAt !== null,
                comercial: orcamento.kind === "comercial",
                totalFormatado: formatarPreco(orcamento.totalCents),
                temItens: orcamento.items.length > 0,
                emailDoContato: orcamento.contactEmail,
                podeExcluir: PODE.excluirRegistros(usuario),
              }}
            />
          ) : (
            <Cartao>
              <CabecalhoCartao titulo="Somente consulta" />
              <div className="p-5">
                <p className="text-sm leading-relaxed text-graf-600">
                  Seu acesso aos orçamentos é apenas de consulta: dá para acompanhar a proposta,
                  mas não para enviá-la nem registrar a decisão do cliente.
                </p>
              </div>
            </Cartao>
          )}

          {orcamento.order ? (
            <Cartao>
              <CabecalhoCartao titulo="Pedido gerado" />
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="flex items-center gap-2 text-sm text-graf-700">
                  <ShoppingCart className="size-4 text-graf-500" aria-hidden />
                  <span className="tabular font-semibold">{orcamento.order.number}</span>
                </p>
                <LinkBotao
                  href={`/admin/pedidos/${orcamento.order.id}`}
                  variante="secundario"
                  tamanho="sm"
                >
                  Abrir pedido
                </LinkBotao>
              </div>
            </Cartao>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
