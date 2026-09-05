import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ServiceRequestStatus } from "@prisma/client";
import {
  CalendarClock,
  FileText,
  MessageCircle,
  Paperclip,
  Stethoscope,
  UserRound,
  Wrench,
} from "lucide-react";

import { ResponderChamado } from "@/components/conta/mj-responder-chamado";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import {
  Cartao,
  CabecalhoCartao,
  Etiqueta,
  LinhaDoTempo,
} from "@/components/ui/data";
import {
  ROTULO_AGENDAMENTO,
  ROTULO_CHAMADO,
  ROTULO_URGENCIA,
  passosDoChamado,
  type StatusAgendamento,
} from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import { formatarCep, formatarDataHora, formatarPreco } from "@/lib/format";
import { ROTULO_ORCAMENTO } from "@/lib/orcamento";
import { ROTULO_OS } from "@/lib/os";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Detalhe do chamado",
  robots: { index: false, follow: false },
};

const ENCERRADOS: ServiceRequestStatus[] = ["concluido", "cancelado"];

function tomDoChamado(status: ServiceRequestStatus) {
  if (status === "concluido") return "ok" as const;
  if (status === "cancelado") return "neutro" as const;
  if (status === "aguardando_cliente" || status === "aguardando_aprovacao") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

function ehStatusAgendamento(valor: string): valor is StatusAgendamento {
  return ["agendado", "em_andamento", "concluido", "cancelado"].includes(valor);
}

type Params = Promise<{ numero: string }>;

export default async function ChamadoPage({ params }: { params: Params }) {
  const [cliente, { numero }] = await Promise.all([
    exigirCliente("/minha-jb/assistencia"),
    params,
  ]);

  const chave = decodeURIComponent(numero);

  // aceita o número legível (AT-001205) e o id — os avisos e o histórico do
  // equipamento apontam para o id
  const chamado = await prisma.serviceRequest.findFirst({
    where: { customerId: cliente.id, OR: [{ number: chave }, { id: chave }] },
    include: {
      equipment: {
        select: { id: true, name: true, brandName: true, modelName: true, serialNumber: true },
      },
      category: { select: { name: true } },
      events: {
        where: { visibleToCustomer: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, message: true, status: true, createdAt: true },
      },
      media: {
        orderBy: { order: "asc" },
        select: { id: true, media: { select: { url: true, alt: true, mime: true } } },
      },
      appointments: {
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          addressSummary: true,
          technician: { select: { user: { select: { name: true } } } },
        },
      },
      workOrders: {
        orderBy: { openedAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          diagnosis: true,
          workDone: true,
          totalCents: true,
          closedAt: true,
          serviceWarrantyDays: true,
        },
      },
      quotes: {
        // rascunho é proposta em construção: número e valor ainda mudam, e o
        // comercial não terminou. As telas de /minha-jb/orcamentos já filtram
        // assim — esta tinha ficado de fora.
        where: { status: { not: "rascunho" } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          totalCents: true,
          validUntil: true,
        },
      },
    },
  });

  if (!chamado) notFound();

  const encerrado = ENCERRADOS.includes(chamado.status);
  const aguardandoCliente = chamado.status === "aguardando_cliente";

  const propostaAberta = chamado.quotes.find(
    (orcamento) => orcamento.status === "enviado" || orcamento.status === "em_duvida",
  );

  const enderecoDoAtendimento = [
    [chamado.addressStreet, chamado.addressNumber].filter(Boolean).join(", "),
    chamado.addressComplement,
    chamado.addressDistrict,
    [chamado.addressCity, chamado.addressState].filter(Boolean).join("/"),
    chamado.addressZip ? `CEP ${formatarCep(chamado.addressZip)}` : "",
  ]
    .filter(Boolean)
    .join(" — ");

  const fotos = chamado.media.filter((anexo) => anexo.media.mime.startsWith("image/"));
  const arquivos = chamado.media.filter((anexo) => !anexo.media.mime.startsWith("image/"));

  return (
    <div>
      <Topo
        voltar={{ href: "/minha-jb/assistencia", rotulo: "Assistência" }}
        titulo={`Chamado ${chamado.number}`}
        etiqueta={
          <Etiqueta tom={tomDoChamado(chamado.status)}>
            {ROTULO_CHAMADO[chamado.status]}
          </Etiqueta>
        }
        descricao={`Aberto em ${formatarDataHora(chamado.createdAt)} · urgência ${ROTULO_URGENCIA[
          chamado.urgency
        ].toLowerCase()}`}
        acoes={
          chamado.equipment ? (
            <LinkBotao
              href={`/minha-jb/equipamentos/${chamado.equipment.id}`}
              variante="secundario"
              tamanho="sm"
            >
              <Stethoscope className="size-4" aria-hidden />
              Ver equipamento
            </LinkBotao>
          ) : null
        }
      />

      {propostaAberta ? (
        <Aviso
          tom="atencao"
          titulo="Há um orçamento esperando sua resposta"
          className="mb-6"
          acao={
            <LinkBotao href={`/minha-jb/orcamentos/${propostaAberta.number}`} tamanho="sm">
              Ver e responder
            </LinkBotao>
          }
        >
          Proposta {propostaAberta.number}, no valor de{" "}
          {formatarPreco(propostaAberta.totalCents)}. O reparo começa assim que você
          aprovar.
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Andamento" />
            <div className="p-5">
              <LinhaDoTempo passos={passosDoChamado(chamado)} />
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Conversa"
              descricao="Tudo que a equipe registrou e tudo que você respondeu."
            />
            <div className="p-5">
              <div className="rounded-lg bg-graf-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-graf-500">
                  O que você relatou
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-graf-800">
                  {chamado.description}
                </p>
                {chamado.problemKind ? (
                  <p className="mt-2 text-xs text-graf-500">
                    Resumo: {chamado.problemKind}
                  </p>
                ) : null}
              </div>

              {chamado.events.length > 0 ? (
                <ul className="mt-5 space-y-4">
                  {chamado.events.map((evento) => (
                    <li
                      key={evento.id}
                      className="rounded-lg border border-graf-200 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-bold text-graf-950">{evento.title}</p>
                        {evento.status ? (
                          <Etiqueta tom="neutro">{ROTULO_CHAMADO[evento.status]}</Etiqueta>
                        ) : null}
                      </div>
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
              ) : null}
            </div>
          </Cartao>

          {fotos.length > 0 || arquivos.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Anexos" />
              <div className="space-y-4 p-5">
                {fotos.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {fotos.map((anexo) => (
                      <li
                        key={anexo.id}
                        className="relative aspect-4/3 overflow-hidden rounded-lg bg-graf-100"
                      >
                        <Image
                          src={anexo.media.url}
                          alt={anexo.media.alt || `Anexo do chamado ${chamado.number}`}
                          fill
                          sizes="(max-width: 640px) 45vw, 20vw"
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {arquivos.length > 0 ? (
                  <ul className="space-y-2">
                    {arquivos.map((anexo) => (
                      <li key={anexo.id}>
                        <a
                          href={anexo.media.url}
                          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 underline-offset-4 hover:underline"
                        >
                          <Paperclip className="size-4" aria-hidden />
                          {anexo.media.alt || "Arquivo anexado"}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo="Responder" />
            <div className="p-5">
              {encerrado ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-graf-600">
                    Este chamado está encerrado. Se o problema voltou, abra um novo chamado
                    — o histórico deste continua guardado no equipamento.
                  </p>
                  <LinkBotao href="/minha-jb/assistencia/novo" variante="secundario">
                    Abrir novo chamado
                  </LinkBotao>
                </div>
              ) : (
                <ResponderChamado
                  chamadoId={chamado.id}
                  aguardandoCliente={aguardandoCliente}
                />
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Equipamento" />
            <div className="space-y-1.5 p-5 text-sm">
              {chamado.equipment ? (
                <>
                  <p className="font-bold text-graf-950">
                    <Link
                      href={`/minha-jb/equipamentos/${chamado.equipment.id}`}
                      className="underline-offset-4 hover:text-jb-700 hover:underline"
                    >
                      {chamado.equipment.name}
                    </Link>
                  </p>
                  <p className="text-graf-600">
                    {[chamado.equipment.brandName, chamado.equipment.modelName]
                      .filter(Boolean)
                      .join(" ") || "Marca e modelo não informados"}
                  </p>
                  {chamado.equipment.serialNumber ? (
                    <p className="text-graf-500">
                      Série <span className="tabular">{chamado.equipment.serialNumber}</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-bold text-graf-950">
                    {[chamado.brandName, chamado.modelName].filter(Boolean).join(" ") ||
                      chamado.category?.name ||
                      "Equipamento não cadastrado"}
                  </p>
                  <p className="leading-relaxed text-graf-600">
                    Este chamado não está ligado a um equipamento do seu prontuário.
                  </p>
                </>
              )}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Visitas" />
            <div className="p-5 text-sm">
              {chamado.appointments.length > 0 ? (
                <ul className="space-y-4">
                  {chamado.appointments.map((visita) => (
                    <li key={visita.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <CalendarClock className="size-4 shrink-0 text-graf-500" aria-hidden />
                        <span className="font-semibold text-graf-900">
                          {formatarDataHora(visita.startsAt)}
                        </span>
                        <Etiqueta
                          tom={
                            visita.status === "concluido"
                              ? "ok"
                              : visita.status === "cancelado"
                                ? "neutro"
                                : "andamento"
                          }
                        >
                          {ehStatusAgendamento(visita.status)
                            ? ROTULO_AGENDAMENTO[visita.status]
                            : visita.status}
                        </Etiqueta>
                      </div>
                      {visita.technician?.user.name ? (
                        <p className="mt-1 flex items-center gap-1.5 text-graf-600">
                          <UserRound className="size-3.5 text-graf-500" aria-hidden />
                          Técnico: {visita.technician.user.name}
                        </p>
                      ) : null}
                      {visita.addressSummary ? (
                        <p className="mt-1 text-graf-600">{visita.addressSummary}</p>
                      ) : null}
                      {/* A observação da visita não entra aqui: o campo
                          ServiceAppointment.notes não tem marca de visibilidade
                          no schema e é onde a equipe anota o que é dela. O que
                          se diz ao cliente vai pela linha do tempo, que tem
                          visibleToCustomer de verdade. */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Nenhuma visita marcada ainda. Quando a equipe agendar, a data aparece aqui
                  e você recebe um aviso.
                </p>
              )}
            </div>
          </Cartao>

          {chamado.workOrders.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Ordens de serviço" />
              <ul className="divide-y divide-graf-100 p-5 text-sm">
                {chamado.workOrders.map((ordem) => (
                  <li key={ordem.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 font-bold text-graf-950">
                        <Wrench className="size-4 text-graf-500" aria-hidden />
                        {ordem.number}
                      </span>
                      <Etiqueta
                        tom={
                          ordem.status === "concluida"
                            ? "ok"
                            : ordem.status === "cancelada"
                              ? "neutro"
                              : "andamento"
                        }
                      >
                        {ROTULO_OS[ordem.status]}
                      </Etiqueta>
                    </div>
                    {ordem.workDone || ordem.diagnosis ? (
                      <p className="mt-1.5 line-3 leading-relaxed text-graf-600">
                        {ordem.workDone || ordem.diagnosis}
                      </p>
                    ) : null}
                    {ordem.status === "concluida" ? (
                      <p className="mt-1.5 text-graf-500">
                        {formatarPreco(ordem.totalCents)}
                        {ordem.serviceWarrantyDays
                          ? ` · garantia do serviço: ${ordem.serviceWarrantyDays} dias`
                          : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          {chamado.quotes.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Orçamentos" />
              <ul className="divide-y divide-graf-100 p-5 text-sm">
                {chamado.quotes.map((orcamento) => (
                  <li key={orcamento.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <Link
                        href={`/minha-jb/orcamentos/${orcamento.number}`}
                        className="inline-flex items-center gap-1.5 font-bold text-graf-950 underline-offset-4 hover:text-jb-700 hover:underline"
                      >
                        <FileText className="size-4 text-graf-500" aria-hidden />
                        {orcamento.number}
                      </Link>
                      <span className="tabular font-semibold text-graf-900">
                        {formatarPreco(orcamento.totalCents)}
                      </span>
                    </div>
                    <p className="mt-1.5">
                      <Etiqueta
                        tom={
                          orcamento.status === "aprovado" || orcamento.status === "convertido"
                            ? "ok"
                            : orcamento.status === "recusado" ||
                                orcamento.status === "expirado"
                              ? "neutro"
                              : "aguardando"
                        }
                      >
                        {ROTULO_ORCAMENTO[orcamento.status]}
                      </Etiqueta>
                    </p>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo="Atendimento" />
            <dl className="space-y-2.5 p-5 text-sm">
              <div>
                <dt className="text-graf-500">Urgência declarada</dt>
                <dd className="mt-0.5">
                  <Etiqueta
                    tom={
                      chamado.urgency === "parado" || chamado.urgency === "alta"
                        ? "alerta"
                        : "neutro"
                    }
                  >
                    {ROTULO_URGENCIA[chamado.urgency]}
                  </Etiqueta>
                </dd>
              </div>

              <div>
                <dt className="text-graf-500">Endereço</dt>
                <dd className="mt-0.5 leading-relaxed text-graf-800">
                  {enderecoDoAtendimento || "A confirmar com a equipe."}
                </dd>
              </div>

              {chamado.availability ? (
                <div>
                  <dt className="text-graf-500">Disponibilidade informada</dt>
                  <dd className="mt-0.5 leading-relaxed text-graf-800">
                    {chamado.availability}
                  </dd>
                </div>
              ) : null}

              {chamado.closedAt ? (
                <div>
                  <dt className="text-graf-500">Encerrado em</dt>
                  <dd className="mt-0.5 text-graf-800">
                    {formatarDataHora(chamado.closedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Precisa falar agora?" />
            <div className="p-5 text-sm">
              <p className="leading-relaxed text-graf-600">
                Para urgências, ligue citando o número {chamado.number} — o histórico deste
                chamado já está com a equipe.
              </p>
              <LinkBotao
                href="/contato"
                variante="secundario"
                tamanho="sm"
                className="mt-3"
              >
                <MessageCircle className="size-4" aria-hidden />
                Canais de contato
              </LinkBotao>
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
