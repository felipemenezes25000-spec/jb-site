import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, CircleCheck, FileText, MapPin, Wrench } from "lucide-react";

import { podeVerChamado } from "@/components/assistencia/acesso";
import { AcompanharChamado } from "@/components/assistencia/acompanhar-chamado";
import { CanaisDiretos, CartaoApoio } from "@/components/assistencia/apoio";
import { LimparRascunho } from "@/components/assistencia/limpar-rascunho";
import { ResponderChamado } from "@/components/assistencia/responder-chamado";
import { SITUACAO_CHAMADO } from "@/components/assistencia/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { BotaoCopiar } from "@/components/ui/copiar";
import {
  Cartao,
  CabecalhoCartao,
  Etiqueta,
  LinhaDoTempo,
  Trilha,
} from "@/components/ui/data";
import { ROTULO_CHAMADO, ROTULO_URGENCIA, passosDoChamado } from "@/lib/assistencia";
import { sessaoCliente } from "@/lib/auth-cliente";
import { formatarDataHora } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { metadataDePagina } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

/**
 * Acompanhamento público do chamado.
 *
 * A página existe para qualquer número digitado — inclusive um que não existe.
 * É de propósito: se número inválido devolvesse 404 e número válido pedisse o
 * contato, bastaria olhar a resposta para descobrir quais chamados existem.
 * Sem prova de contato, todo mundo vê exatamente a mesma tela.
 *
 * O protocolo abre a página em faixa grafite e em tipografia de código,
 * grande o bastante para ser lido de longe e ditado por telefone — é o que a
 * pessoa acabou de receber e é por ele que tudo é acompanhado. Chamado que
 * ainda está no primeiro evento ganha, além disso, a confirmação de abertura.
 *
 * Nota interna nunca aparece aqui: o histórico é filtrado por
 * `visibleToCustomer`, e a observação da visita (que não tem marca de
 * visibilidade) fica de fora por inteiro.
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
      <div className="container-estreito flex min-h-[60vh] items-center justify-center py-16">
        <AcompanharChamado numero={codigo} />
      </div>
    );
  }

  /* ---------------------------------------------------------- liberado */

  const situacao = SITUACAO_CHAMADO[chamado.status];
  const encerrado = chamado.status === "concluido" || chamado.status === "cancelado";
  const visita = chamado.appointments[0] ?? null;

  /* Chegou agora do envio: ainda no primeiro status e sem nenhum evento além
     do de abertura. É o único momento em que a tela precisa dizer "deu certo". */
  const recemAberto =
    chamado.status === "solicitacao_recebida" && chamado.events.length <= 1;

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

  /* Vazio quando nem o cadastro nem o relato trouxeram identificação — e aí
     a linha some da ficha, em vez de estampar "não identificado". */
  const equipamento =
    chamado.equipment?.name ||
    [chamado.brandName, chamado.modelName].filter(Boolean).join(" ") ||
    chamado.category?.name ||
    "";

  const mensagemWhatsapp = `Olá! Estou falando sobre o chamado ${chamado.number}.`;

  return (
    <>
      {/* Envio concluído: o rascunho do assistente não precisa mais existir. */}
      <LimparRascunho />

      <div className="container-jb pt-6">
        <Trilha
          itens={[
            { rotulo: "Início", href: "/" },
            { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
            { rotulo: `Chamado ${chamado.number}` },
          ]}
        />
      </div>

      {/* ============================================================ PROTOCOLO */}
      <header className="relative isolate mt-6 overflow-hidden border-y border-graf-200 bg-surface-muted">
        <span
          aria-hidden
          className="field-orbit pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_90%_at_75%_0%,#000,transparent)]"
        />

        <div className="container-jb py-9 lg:py-11">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div className="min-w-0">
              <p className="label-mono texto-suave uppercase">Protocolo do chamado</p>
              <h1 className="tabular text-display mt-2 font-mono text-graf-950">
                {chamado.number}
              </h1>
              {equipamento ? (
                <p className="mt-4 text-[0.9375rem] font-semibold text-graf-800">
                  {equipamento}
                </p>
              ) : null}
              <p
                className={
                  equipamento ? "texto-suave mt-1.5 text-sm" : "texto-suave mt-4 text-sm"
                }
              >
                Aberto em {formatarDataHora(chamado.createdAt)}
                {chamado.closedAt
                  ? ` · Encerrado em ${formatarDataHora(chamado.closedAt)}`
                  : ""}
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <Etiqueta tom={situacao.tom} ponto>
                  {ROTULO_CHAMADO[chamado.status]}
                </Etiqueta>
                <Etiqueta tom={chamado.urgency === "parado" ? "alerta" : "neutro"}>
                  Urgência: {ROTULO_URGENCIA[chamado.urgency]}
                </Etiqueta>
              </div>

              <BotaoCopiar
                texto={chamado.number}
                variante="contorno-claro"
                tamanho="sm"
                rotulo="Copiar o número"
                rotuloCopiado="Número copiado"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container-jb py-10 lg:py-12">
        {recemAberto ? (
          <Aviso
            tom="sucesso"
            titulo="Chamado registrado. Guarde este número."
            className="mb-8"
          >
            <p>
              Enviamos a confirmação para{" "}
              <strong className="font-semibold text-graf-900">{chamado.contactEmail}</strong>.
              É por <strong className="font-semibold text-graf-900">{chamado.number}</strong>{" "}
              que a equipe encontra o seu atendimento — anote ou tire um print desta tela.
            </p>
          </Aviso>
        ) : null}

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
              <Cartao className="border-jb-200 ring-1 ring-jb-500/10">
                <CabecalhoCartao
                  titulo="Visita agendada"
                  descricao="Deixe o equipamento acessível no horário combinado."
                />
                <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
                  <div className="flex gap-3">
                    <CalendarClock className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                    <div>
                      <p className="text-[0.9375rem] font-semibold text-graf-900">
                        {formatarDataHora(visita.startsAt)}
                      </p>
                      {visita.endsAt ? (
                        <p className="mt-1 text-[0.8125rem] text-graf-500">
                          Previsão de término: {formatarDataHora(visita.endsAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {visita.technician?.user.name ? (
                    <div className="flex gap-3">
                      <Wrench className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                      <div>
                        <p className="text-[0.9375rem] font-semibold text-graf-900">
                          {visita.technician.user.name}
                        </p>
                        <p className="mt-1 text-[0.8125rem] text-graf-500">Técnico responsável</p>
                      </div>
                    </div>
                  ) : null}

                  {visita.addressSummary ? (
                    <div className="flex gap-3 sm:col-span-2">
                      <MapPin className="mt-0.5 size-4.5 shrink-0 text-jb-600" aria-hidden />
                      <p className="text-[0.9375rem] leading-relaxed text-graf-700">
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
                        <p className="text-[0.9375rem] font-semibold text-graf-900">
                          {evento.title}
                        </p>
                        <p className="text-[0.8125rem] text-graf-500">
                          {formatarDataHora(evento.createdAt)}
                        </p>
                      </div>
                      {evento.message ? (
                        <p className="mt-1.5 whitespace-pre-line text-[0.9375rem] leading-relaxed text-graf-600">
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
                    : "Sua mensagem entra no mesmo histórico que a equipe acompanha."
                }
              />
              <div className="px-5 py-5">
                {encerrado ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="flex-1 text-[0.9375rem] leading-relaxed text-graf-600">
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
              <dl className="space-y-4 px-5 py-5 text-[0.9375rem]">
                {equipamento || chamado.serialNumber ? (
                  <div>
                    <dt className="label-mono uppercase text-graf-500">Equipamento</dt>
                    {equipamento ? (
                      <dd className="mt-1 font-semibold text-graf-900">{equipamento}</dd>
                    ) : null}
                    {chamado.serialNumber ? (
                      <dd className="label-mono mt-1 text-graf-500">
                        Série {chamado.serialNumber}
                      </dd>
                    ) : null}
                  </div>
                ) : null}

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

            {/* Mesma pilha de contato das outras telas da assistência: o
                telefone e o WhatsApp saem das configurações, com alvo de
                toque de 44px em cada linha. */}
            <CartaoApoio titulo="Falar por outro canal" descricao={s.horario}>
              <CanaisDiretos
                telefone={s.telefone}
                whatsapp={s.whatsapp}
                mensagem={mensagemWhatsapp}
              />
              <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-graf-500">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
                Cite o número {chamado.number} para a equipe achar seu atendimento na hora.
              </p>
            </CartaoApoio>

            {cliente ? (
              <Link
                href="/minha-jb/assistencia"
                className="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Ver todos os chamados na Área da Clínica
              </Link>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
