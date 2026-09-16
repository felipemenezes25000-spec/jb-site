import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { TicketStatus } from "@prisma/client";
import { CheckCircle2, EyeOff, RotateCcw } from "lucide-react";

import { mudarStatusTicket, responderTicket } from "@/app/acoes/admin-conteudo";
import { BotaoAcao } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { RespostaDoTicket } from "@/components/admin/conteudo/resposta-ticket";
import { ROTULO_TICKET, TOM_TICKET } from "@/components/admin/conteudo/rotulos";
import { Cartao, CabecalhoCartao, Etiqueta, Vazio } from "@/components/ui/data";
import { formatarDataHora, formatarTelefone } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { number: true, subject: true },
  });
  return { title: ticket ? `${ticket.number} · Suporte` : "Ticket" };
}

export default async function PaginaDetalheDoTicket({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("suporte");
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      subject: true,
      status: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      productId: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, name: true, email: true, phone: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          fromStaff: true,
          userId: true,
          visibleToCustomer: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) notFound();

  const podeEscrever = podeEditar(usuario, "suporte");

  // SupportMessage guarda só o id de quem escreveu; o nome vem daqui
  const idsDaEquipe = [
    ...new Set(ticket.messages.flatMap((mensagem) => (mensagem.userId ? [mensagem.userId] : []))),
  ];
  const equipe = idsDaEquipe.length
    ? await prisma.user.findMany({
        where: { id: { in: idsDaEquipe } },
        select: { id: true, name: true },
      })
    : [];
  const nomeDaEquipe = new Map(equipe.map((pessoa) => [pessoa.id, pessoa.name]));

  const produto = ticket.productId
    ? await prisma.product.findUnique({
        where: { id: ticket.productId },
        select: { id: true, name: true, sku: true },
      })
    : null;

  const proximos: { status: TicketStatus; rotulo: string; icone: React.ReactNode }[] =
    ticket.status === "fechado"
      ? [
          {
            status: "aberto",
            rotulo: "Reabrir ticket",
            icone: <RotateCcw className="size-4" aria-hidden />,
          },
        ]
      : [
          {
            status: "aguardando_cliente",
            rotulo: "Aguardar o cliente",
            icone: <EyeOff className="size-4" aria-hidden />,
          },
          {
            status: "fechado",
            rotulo: "Fechar ticket",
            icone: <CheckCircle2 className="size-4" aria-hidden />,
          },
        ];

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Suporte", href: "/admin/suporte" }, { rotulo: ticket.number }]}
        titulo={ticket.subject}
        descricao={`${ticket.number} · aberto em ${formatarDataHora(ticket.createdAt)} · última movimentação em ${formatarDataHora(ticket.updatedAt)}`}
        etiqueta={
          <Etiqueta tom={TOM_TICKET[ticket.status]} ponto>
            {ROTULO_TICKET[ticket.status]}
          </Etiqueta>
        }
        acoes={
          podeEscrever
            ? proximos.map((proximo) => (
                <BotaoAcao
                  key={proximo.status}
                  acao={mudarStatusTicket}
                  valores={{ id: ticket.id, status: proximo.status }}
                  rotulo={proximo.rotulo}
                  variante={proximo.status === "fechado" ? "primario" : "secundario"}
                  icone={proximo.icone}
                />
              ))
            : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="space-y-5">
          <Cartao>
            <CabecalhoCartao
              titulo="Conversa"
              descricao="Da mais antiga para a mais recente. Notas internas ficam marcadas."
            />
            {ticket.messages.length === 0 ? (
              <Vazio
                titulo="Nenhuma mensagem ainda"
                descricao="Este ticket foi aberto sem texto. Responda abaixo para iniciar a conversa."
                className="m-4 border-graf-200 bg-transparent py-8"
              />
            ) : (
              <ul className="space-y-4 px-5 py-5">
                {ticket.messages.map((mensagem) => {
                  const autor = mensagem.fromStaff
                    ? (mensagem.userId && nomeDaEquipe.get(mensagem.userId)) || "Equipe JB"
                    : ticket.customer?.name || ticket.contactName || "Cliente";

                  return (
                    <li
                      key={mensagem.id}
                      className={cn(
                        "rounded-xl border p-4",
                        !mensagem.visibleToCustomer
                          ? "border-warn-500/30 bg-warn-50"
                          : mensagem.fromStaff
                            ? "border-jb-200 bg-jb-50/50"
                            : "border-graf-200 bg-white",
                      )}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-bold text-graf-900">{autor}</span>
                        <span className="text-apoio text-graf-500">
                          {formatarDataHora(mensagem.createdAt)}
                        </span>
                        {!mensagem.visibleToCustomer ? (
                          <Etiqueta tom="aguardando">Nota interna</Etiqueta>
                        ) : null}
                      </div>
                      <p className="whitespace-pre-line text-corpo leading-relaxed text-graf-700">
                        {mensagem.body}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>

          {podeEscrever ? (
            <RespostaDoTicket
              acao={responderTicket}
              id={ticket.id}
              temCliente={Boolean(ticket.customer)}
            />
          ) : null}
        </div>

        <div className="space-y-5">
          <Cartao>
            <CabecalhoCartao titulo="Quem abriu" />
            <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-5 py-4 text-sm">
              <dt className="text-graf-500">Nome</dt>
              <dd className="text-graf-800">
                {ticket.customer ? (
                  <Link
                    href={`/admin/clientes/${ticket.customer.id}`}
                    className="font-medium text-jb-700 underline underline-offset-2"
                  >
                    {ticket.customer.name}
                  </Link>
                ) : (
                  ticket.contactName || (
                    <span className="text-graf-500">Nome não informado</span>
                  )
                )}
              </dd>

              <dt className="text-graf-500">E-mail</dt>
              <dd className="break-all text-graf-800">
                {ticket.customer?.email || ticket.contactEmail || (
                  <span className="text-graf-500">E-mail não informado</span>
                )}
              </dd>

              <dt className="text-graf-500">Telefone</dt>
              <dd className="text-graf-800">
                {(() => {
                  const telefone = ticket.customer?.phone || ticket.contactPhone;
                  return telefone ? (
                    formatarTelefone(telefone)
                  ) : (
                    <span className="text-graf-500">Telefone não informado</span>
                  );
                })()}
              </dd>

              <dt className="text-graf-500">Cadastro</dt>
              <dd className="text-graf-800">
                {ticket.customer ? "Cliente com conta no site" : "Contato sem conta"}
              </dd>
            </dl>
          </Cartao>

          {produto ? (
            <Cartao>
              <CabecalhoCartao titulo="Produto citado" />
              <div className="px-5 py-4 text-sm">
                <Link
                  href={`/admin/produtos/${produto.id}`}
                  className="font-medium text-jb-700 underline underline-offset-2"
                >
                  {produto.name}
                </Link>
                <p className="mt-1 text-apoio text-graf-500">SKU {produto.sku}</p>
              </div>
            </Cartao>
          ) : null}
        </div>
      </div>
    </div>
  );
}
