import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarClock,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  Wrench,
} from "lucide-react";

import { podeVerChamado } from "@/components/assistencia/acesso";
import { AcompanharChamado } from "@/components/assistencia/acompanhar-chamado";
import { LimparRascunho } from "@/components/assistencia/limpar-rascunho";
import { ResponderChamado } from "@/components/assistencia/responder-chamado";
import { SITUACAO_CHAMADO } from "@/components/assistencia/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import {
  Cartao,
  CabecalhoCartao,
  Etiqueta,
  LinhaDoTempo,
  Trilha,
} from "@/components/ui/data";
import { ROTULO_CHAMADO, ROTULO_URGENCIA, passosDoChamado } from "@/lib/assistencia";
import { sessaoCliente } from "@/lib/auth-cliente";
import { formatarDataHora, telHref, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { metadataDePagina } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/**
 * Acompanhamento público do chamado.
 *
 * A página existe para qualquer número digitado — inclusive um que não existe.
 * É de propósito: se número inválido devolvesse 404 e número válido pedisse o
 * contato, bastaria olhar a resposta para descobrir quais chamados existem.
 * Sem prova de contato, todo mundo vê exatamente a mesma tela.
 *
 * Nada aqui é indexado (`noIndex`): é conteúdo de uma pessoa só.
 */

type Parametros = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { numero } = await params;
  const limpo = decodeURIComponent(numero).toUpperCase().slice(0, 24);

  return metadataDePagina({
    titulo: `Chamado ${limpo}`,
    descricao: "Acompanhamento do seu chamado de assistência técnica na JB.",
    caminho: `/chamado/${limpo}`,
    noIndex: true,
  });
}

export default async function ChamadoPage({ params }: Parametros) {
  const { numero } = await params;
  const codigo = decodeURIComponent(numero).toUpperCase().slice(0, 24);

  const [s, cliente, chamado] = await Promise.all([
    getSettings(),
    sessaoCliente(),
    prisma.serviceRequest.findUnique({
      where: { number: codigo },
      include: {
        category: { select: { name: true } },
        equipment: { select: { name: true } },
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            title: true,
            message: true,
            visibleToCustomer: true,
            createdAt: true,
          },
        },
        appointments: {
          where: { status: { in: ["agendado", "em_andamento"] } },
          orderBy: { startsAt: "asc" },
          take: 1,
          select: {
            startsAt: true,
            endsAt: true,
            addressSummary: true,
            notes: true,
            technician: { select: { user: { select: { name: true } } } },
          },
        },
        media: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            media: { select: { url: true, alt: true, mime: true, filename: true } },
          },
        },
      },
    }),
  ]);

  const liberado =
    chamado !== null &&
    (await podeVerChamado({
      id: chamado.id,
      number: chamado.number,
      customerId: chamado.customerId,
    }));

  /* --------------------------------------------------- porta de entrada */

  if (!chamado || !liberado) {
    return (
      <div className="container-jb flex min-h-[60vh] items-center justify-center py-14">
        <AcompanharChamado numero={codigo} />
      </div>
    );
  }

  /* ---------------------------------------------------------- liberado */

  const situacao = SITUACAO_CHAMADO[chamado.status];
  const encerrado = chamado.status === "concluido" || chamado.status === "cancelado";
  const visita = chamado.appointments[0] ?? null;

  const passos = passosDoChamado({
    status: chamado.status,
    createdAt: chamado.createdAt,
    closedAt: chamado.closedAt,
    events: chamado.events.map((evento) => ({
      status: evento.status,
      createdAt: evento.createdAt,
    })),
  });

  const historico = chamado.events
    .filter((evento) => evento.visibleToCustomer)
    .slice()
    .reverse();

  const endereco = [
    [chamado.addressStreet, chamado.addressNumber].filter(Boolean).join(", "),
    chamado.addressComplement,
    chamado.addressDistrict,
    [chamado.addressCity, chamado.addressState].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" — ");

  const equipamento =
    chamado.equipment?.name ||
    [chamado.brandName, chamado.modelName].filter(Boolean).join(" ") ||
    chamado.category?.name ||
    "Equipamento não identificado";

  const whatsapp = whatsappHref(
    s.whatsapp,
    `Olá! Estou falando sobre o chamado ${chamado.number}.`,
  );

  return (
    <div className="container-jb py-8 lg:py-12">
      {/* Envio concluído: o rascunho do assistente não precisa mais existir. */}
      <LimparRascunho />

      <Trilha
        itens={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
          { rotulo: `Chamado ${chamado.number}` },
        ]}
        className="mb-6"
      />

      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className="label-mono uppercase text-graf-500">Chamado</p>
          <h1 className="tabular mt-1 text-display leading-none">{chamado.number}</h1>
          <p className="mt-3 text-sm text-graf-500">
            Aberto em {formatarDataHora(chamado.createdAt)}
            {chamado.closedAt ? ` · Encerrado em ${formatarDataHora(chamado.closedAt)}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={situacao.tom} ponto>
            {ROTULO_CHAMADO[chamado.status]}
          </Etiqueta>
          <Etiqueta tom={chamado.urgency === "parado" ? "alerta" : "neutro"}>
            Urgência: {ROTULO_URGENCIA[chamado.urgency]}
          </Etiqueta>
        </div>
      </header>

      {/* -------------------------------------------------- situação atual */}
      <Aviso
        tom={
          chamado.status === "concluido"
            ? "sucesso"
            : situacao.tom === "aguardando"
              ? "atencao"
              : "info"
        }
        titulo={situacao.texto}
        className="mt-8"
      >
        <p>
          <strong className="font-semibold text-graf-900">O que precisamos de você: </strong>
          {situacao.pedido}
        </p>
      </Aviso>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-8">
          {/* ------------------------------------------------ visita agendada */}
          {visita ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Visita agendada"
                descricao="Deixe o equipamento acessível no horário combinado."
              />
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-graf-900">
                      {formatarDataHora(visita.startsAt)}
                    </p>
                    {visita.endsAt ? (
                      <p className="mt-0.5 text-xs text-graf-500">
                        Previsão de término: {formatarDataHora(visita.endsAt)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {visita.technician?.user.name ? (
                  <div className="flex gap-3">
                    <Wrench className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-graf-900">
                        {visita.technician.user.name}
                      </p>
                      <p className="mt-0.5 text-xs text-graf-500">Técnico responsável</p>
                    </div>
                  </div>
                ) : null}

                {visita.addressSummary ? (
                  <div className="flex gap-3 sm:col-span-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                    <p className="text-sm leading-relaxed text-graf-700">
                      {visita.addressSummary}
                    </p>
                  </div>
                ) : null}

                {/* A observação da visita fica fora desta página, que é
                    pública: ServiceAppointment.notes não tem marca de
                    visibilidade e é onde a equipe anota o que é dela. O que se
                    comunica ao cliente vai pela linha do tempo abaixo, filtrada
                    por visibleToCustomer. */}
              </div>
            </Cartao>
          ) : null}

          {/* -------------------------------------------------- linha do tempo */}
          <Cartao>
            <CabecalhoCartao
              titulo="Andamento"
              descricao="As etapas do atendimento, na ordem em que acontecem."
            />
            <div className="px-5 py-6">
              <LinhaDoTempo passos={passos} />
            </div>
          </Cartao>

          {/* ------------------------------------------------------ histórico */}
          {historico.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Mensagens e registros"
                descricao="Tudo o que foi comunicado neste chamado."
              />
              <ul className="divide-y divide-graf-200">
                {historico.map((evento) => (
                  <li key={evento.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-semibold text-graf-900">{evento.title}</p>
                      <p className="text-xs text-graf-500">
                        {formatarDataHora(evento.createdAt)}
                      </p>
                    </div>
                    {evento.message ? (
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-graf-600">
                        {evento.message}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          {/* --------------------------------------------------------- resposta */}
          <Cartao>
            <CabecalhoCartao
              titulo="Falar com a equipe"
              descricao={
                encerrado
                  ? "Este chamado está encerrado."
                  : "Sua mensagem entra na mesma linha do tempo que a equipe acompanha."
              }
            />
            <div className="px-5 py-5">
              {encerrado ? (
                <div className="flex flex-wrap items-center gap-4">
                  <p className="flex-1 text-sm leading-relaxed text-graf-600">
                    Se o problema voltar, abra um novo chamado citando o número{" "}
                    <strong className="font-semibold text-graf-900">{chamado.number}</strong>{" "}
                    na descrição.
                  </p>
                  <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario">
                    Abrir novo chamado
                  </LinkBotao>
                </div>
              ) : (
                <ResponderChamado numero={chamado.number} />
              )}
            </div>
          </Cartao>
        </div>

        {/* ------------------------------------------------------------- lado */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Cartao>
            <CabecalhoCartao titulo="Equipamento e local" />
            <dl className="space-y-4 px-5 py-5 text-sm">
              <div>
                <dt className="label-mono uppercase text-graf-500">Equipamento</dt>
                <dd className="mt-1 font-semibold text-graf-900">{equipamento}</dd>
                {chamado.serialNumber ? (
                  <dd className="mt-0.5 text-graf-500">Série {chamado.serialNumber}</dd>
                ) : null}
              </div>

              {chamado.problemKind ? (
                <div>
                  <dt className="label-mono uppercase text-graf-500">Sintoma</dt>
                  <dd className="mt-1 text-graf-700">{chamado.problemKind}</dd>
                </div>
              ) : null}

              <div>
                <dt className="label-mono uppercase text-graf-500">Relato</dt>
                <dd className="mt-1 whitespace-pre-line leading-relaxed text-graf-700">
                  {chamado.description}
                </dd>
              </div>

              <div>
                <dt className="label-mono uppercase text-graf-500">Local do atendimento</dt>
                <dd className="mt-1 leading-relaxed text-graf-700">
                  {endereco || "A combinar com a equipe."}
                </dd>
              </div>

              {chamado.availability ? (
                <div>
                  <dt className="label-mono uppercase text-graf-500">Melhor horário</dt>
                  <dd className="mt-1 text-graf-700">{chamado.availability}</dd>
                </div>
              ) : null}
            </dl>
          </Cartao>

          {chamado.media.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Arquivos enviados" />
              <ul className="grid grid-cols-3 gap-2 px-5 py-5">
                {chamado.media.map((anexo) => (
                  <li key={anexo.id}>
                    <a
                      href={anexo.media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-graf-200 bg-graf-50 transition-colors hover:border-graf-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {anexo.media.mime.startsWith("image/") ? (
                        <Image
                          src={anexo.media.url}
                          alt={anexo.media.alt || "Foto enviada no chamado"}
                          width={160}
                          height={160}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1 p-2 text-center text-graf-500">
                          <FileText className="size-5" aria-hidden />
                          <span className="line-2 text-[11px] leading-tight">
                            {anexo.media.filename}
                          </span>
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao className="p-5">
            <h2 className="text-sm font-bold text-graf-950">Falar por outro canal</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">{s.horario}</p>
            <div className="mt-4 space-y-3 text-sm">
              {s.telefone ? (
                <a
                  href={telHref(s.telefone)}
                  className="flex min-h-11 items-center gap-3 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <Phone className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.telefone}
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <MessageCircle className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.whatsapp}
                </a>
              ) : null}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-graf-500">
              Cite o número {chamado.number} para a equipe achar seu atendimento na hora.
            </p>
          </Cartao>

          {cliente ? (
            <Link
              href="/minha-jb/assistencia"
              className="block text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
            >
              Ver todos os meus chamados
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
