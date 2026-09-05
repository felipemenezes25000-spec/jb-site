import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductCondition } from "@prisma/client";
import {
  CalendarClock,
  CalendarCheck,
  FileText,
  History,
  LifeBuoy,
  Pencil,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Destaques, type Destaque } from "@/components/conta/mj-destaques";
import { Historico } from "@/components/conta/mj-historico";
import { ListaDeDocumentos } from "@/components/conta/mj-lista-documentos";
import { Topo } from "@/components/conta/mj-topo";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, type Tom } from "@/components/ui/data";
import { ROTULO_CHAMADO, STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import {
  ROTULO_EQUIPAMENTO,
  ROTULO_ORIGEM,
  historicoDoEquipamento,
} from "@/lib/equipamento";
import { distanciaEmDias, formatarData, plural } from "@/lib/format";
import { ROTULO_CONTRATO, ROTULO_VISITA, STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { ROTULO_OS } from "@/lib/os";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Prontuário do equipamento",
  robots: { index: false, follow: false },
};

const TOM_STATUS: Record<string, Tom> = {
  operacional: "ok",
  em_manutencao: "andamento",
  aguardando_peca: "aguardando",
  inoperante: "alerta",
  desativado: "neutro",
};

const ROTULO_CONDICAO: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
  recondicionado: "Recondicionado",
};

type Params = Promise<{ id: string }>;

/**
 * Uma linha da ficha. Só é chamada quando existe valor — campo sem dado não
 * vira travessão repetido: ele some, e a ficha fica do tamanho do que se sabe.
 */
function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1 py-2.5">
      <dt className="text-sm text-graf-500">{rotulo}</dt>
      <dd className="min-w-0 text-sm text-graf-900">{valor}</dd>
    </div>
  );
}

function tomDoChamado(status: string) {
  if (status === "concluido") return "ok" as const;
  if (status === "cancelado") return "neutro" as const;
  if (status === "aguardando_cliente" || status === "aguardando_aprovacao") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

export default async function EquipamentoPage({ params }: { params: Params }) {
  const [cliente, { id }] = await Promise.all([
    exigirCliente("/minha-jb/equipamentos"),
    params,
  ]);

  const equipamento = await prisma.equipment.findFirst({
    where: { id, customerId: cliente.id },
    include: {
      category: { select: { name: true } },
      location: { select: { name: true } },
      order: { select: { number: true } },
      product: { select: { slug: true, name: true } },
      media: {
        orderBy: { order: "asc" },
        select: { id: true, media: { select: { url: true, alt: true } } },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, title: true, size: true, createdAt: true },
      },
      // o chamado é o que o cliente abre; a OS é o que a equipe executa. As
      // duas listas aparecem separadas porque respondem a perguntas diferentes:
      // "o que eu pedi" e "o que já foi feito no aparelho".
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, status: true, createdAt: true },
      },
      workOrders: {
        orderBy: { openedAt: "desc" },
        take: 5,
        select: {
          id: true,
          number: true,
          status: true,
          openedAt: true,
          closedAt: true,
          workDone: true,
          diagnosis: true,
          requestId: true,
          serviceWarrantyDays: true,
        },
      },
      visits: {
        where: { status: { in: STATUS_VISITA_ABERTOS } },
        orderBy: { dueAt: "asc" },
        take: 3,
        select: { id: true, status: true, dueAt: true, scheduledAt: true },
      },
      contractItems: {
        select: {
          contract: {
            select: {
              id: true,
              number: true,
              status: true,
              startsAt: true,
              endsAt: true,
              plan: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!equipamento) notFound();

  const [historico, chamadosAbertos] = await Promise.all([
    historicoDoEquipamento(equipamento.id),
    prisma.serviceRequest.count({
      where: { equipmentId: equipamento.id, status: { in: STATUS_CHAMADO_ABERTOS } },
    }),
  ]);

  const agora = new Date();
  const garantiaValida = equipamento.warrantyUntil
    ? equipamento.warrantyUntil.getTime() > agora.getTime()
    : null;
  const preventivaAtrasada = equipamento.nextMaintenanceAt
    ? equipamento.nextMaintenanceAt.getTime() < agora.getTime()
    : false;

  const identificacao =
    [equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
    "Marca e modelo não informados";

  const lugar = [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · ");

  // o contrato vigente é o que importa na ficha; encerrado vira histórico
  const contrato =
    equipamento.contractItems
      .map((item) => item.contract)
      .find((item) => item.status === "ativo") ??
    equipamento.contractItems[0]?.contract ??
    null;

  /* ------------------------------------------------------------ destaques */

  const destaques: Destaque[] = [];

  if (equipamento.warrantyUntil) {
    destaques.push({
      rotulo: "Garantia",
      valor: garantiaValida ? "Na garantia" : "Garantia encerrada",
      detalhe: `${garantiaValida ? "Válida até" : "Venceu em"} ${formatarData(
        equipamento.warrantyUntil,
      )}`,
      icone: ShieldCheck,
      tom: garantiaValida ? "ok" : "neutro",
    });
  }

  if (equipamento.nextMaintenanceAt) {
    destaques.push({
      rotulo: "Próxima preventiva",
      valor: formatarData(equipamento.nextMaintenanceAt),
      detalhe: preventivaAtrasada
        ? `Atrasada — prevista ${distanciaEmDias(equipamento.nextMaintenanceAt)}`
        : distanciaEmDias(equipamento.nextMaintenanceAt),
      icone: CalendarClock,
      tom: preventivaAtrasada ? "alerta" : "info",
    });
  }

  if (equipamento.lastMaintenanceAt) {
    destaques.push({
      rotulo: "Última manutenção",
      valor: formatarData(equipamento.lastMaintenanceAt),
      detalhe: distanciaEmDias(equipamento.lastMaintenanceAt),
      icone: CalendarCheck,
      tom: "neutro",
    });
  }

  destaques.push({
    rotulo: "Chamados abertos",
    valor: chamadosAbertos,
    detalhe:
      chamadosAbertos > 0
        ? "Atendimento em andamento neste equipamento."
        : "Nenhum atendimento em andamento.",
    icone: LifeBuoy,
    tom: chamadosAbertos > 0 ? "alerta" : "neutro",
  });

  const fichaIncompleta = !equipamento.warrantyUntil && !equipamento.maintenanceIntervalDays;

  return (
    <div>
      <Topo
        voltar={{ href: "/minha-jb/equipamentos", rotulo: "Meus equipamentos" }}
        titulo={equipamento.name}
        etiqueta={
          <Etiqueta tom={TOM_STATUS[equipamento.status] ?? "neutro"}>
            {ROTULO_EQUIPAMENTO[equipamento.status]}
          </Etiqueta>
        }
        descricao={identificacao}
        acoes={
          <>
            <LinkBotao
              href={`/minha-jb/assistencia/novo?equipamento=${equipamento.id}`}
              tamanho="sm"
            >
              <LifeBuoy className="size-4" aria-hidden />
              Abrir chamado
            </LinkBotao>
            <LinkBotao
              href={`/minha-jb/equipamentos/${equipamento.id}/editar`}
              variante="secundario"
              tamanho="sm"
            >
              <Pencil className="size-4" aria-hidden />
              Editar
            </LinkBotao>
          </>
        }
      />

      {/* uma célula sozinha ocupando a largura toda parece caixa esquecida:
          com menos de dois fatos, a ficha e o aviso abaixo já contam a história */}
      {destaques.length >= 2 ? <Destaques itens={destaques} className="mb-6" /> : null}

      {fichaIncompleta ? (
        <Aviso
          tom="info"
          titulo="Complete a ficha e o acompanhamento passa a ser automático"
          className="mb-6"
          acao={
            <LinkBotao
              href={`/minha-jb/equipamentos/${equipamento.id}/editar`}
              variante="secundario"
              tamanho="sm"
            >
              Completar ficha
            </LinkBotao>
          }
        >
          Com a data da garantia e o intervalo de manutenção informados, a JB avisa você
          antes de a preventiva vencer e você vê a garantia sem procurar a nota fiscal.
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao
              titulo="Ficha do equipamento"
              descricao="O que a JB tem registrado sobre este aparelho."
            />
            <dl className="divide-y divide-graf-100 p-5">
              {equipamento.category?.name ? (
                <Linha rotulo="Tipo" valor={equipamento.category.name} />
              ) : null}
              <Linha rotulo="Marca e modelo" valor={identificacao} />
              {equipamento.serialNumber ? (
                <Linha
                  rotulo="Número de série"
                  valor={<span className="tabular">{equipamento.serialNumber}</span>}
                />
              ) : null}
              {equipamento.voltage ? (
                <Linha rotulo="Voltagem" valor={equipamento.voltage} />
              ) : null}
              {equipamento.condition ? (
                <Linha rotulo="Condição" valor={ROTULO_CONDICAO[equipamento.condition]} />
              ) : null}
              {lugar ? <Linha rotulo="Onde fica" valor={lugar} /> : null}
              <Linha rotulo="Origem" valor={ROTULO_ORIGEM[equipamento.origin]} />
              {equipamento.order ? (
                <Linha
                  rotulo="Pedido de origem"
                  valor={
                    <Link
                      href={`/minha-jb/pedidos/${equipamento.order.number}`}
                      className="font-semibold text-jb-700 underline-offset-4 hover:underline"
                    >
                      {equipamento.order.number}
                    </Link>
                  }
                />
              ) : null}
              {equipamento.product ? (
                <Linha
                  rotulo="Produto no catálogo"
                  valor={
                    <Link
                      href={`/loja/${equipamento.product.slug}`}
                      className="font-semibold text-jb-700 underline-offset-4 hover:underline"
                    >
                      {equipamento.product.name}
                    </Link>
                  }
                />
              ) : null}
              {equipamento.manufacturedAt ? (
                <Linha
                  rotulo="Fabricado em"
                  valor={formatarData(equipamento.manufacturedAt)}
                />
              ) : null}
              {equipamento.purchasedAt ? (
                <Linha rotulo="Comprado em" valor={formatarData(equipamento.purchasedAt)} />
              ) : null}
              {equipamento.installedAt ? (
                <Linha rotulo="Instalado em" valor={formatarData(equipamento.installedAt)} />
              ) : null}
              {equipamento.warrantyUntil ? (
                <Linha
                  rotulo="Garantia"
                  valor={
                    <span className={garantiaValida ? "text-ok-700" : undefined}>
                      {garantiaValida ? "Válida até " : "Venceu em "}
                      {formatarData(equipamento.warrantyUntil)}
                    </span>
                  }
                />
              ) : null}
              {equipamento.notes ? (
                <Linha
                  rotulo="Observações"
                  valor={<span className="whitespace-pre-line">{equipamento.notes}</span>}
                />
              ) : null}
            </dl>
          </Cartao>

          {equipamento.media.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Fotos" />
              <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                {equipamento.media.map((foto) => (
                  <li
                    key={foto.id}
                    className="relative aspect-4/3 overflow-hidden rounded-lg bg-graf-100"
                  >
                    <Image
                      src={foto.media.url}
                      alt={foto.media.alt || `Foto de ${equipamento.name}`}
                      fill
                      sizes="(max-width: 640px) 45vw, 20vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao
              titulo="Histórico"
              descricao="Chamados, ordens de serviço, manutenções e documentos deste equipamento, do mais recente para o mais antigo."
            />
            <div className="p-5">
              {historico.length > 0 ? (
                <Historico itens={historico} />
              ) : (
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-graf-500">
                  <History className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span>
                    O histórico começa agora. Cada chamado, visita e documento deste
                    equipamento passa a aparecer aqui em ordem.
                  </span>
                </p>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Manutenção preventiva" />
            <div className="space-y-3 p-5 text-sm">
              {equipamento.nextMaintenanceAt ? (
                <p
                  className={
                    preventivaAtrasada
                      ? "font-semibold text-jb-700"
                      : "font-semibold text-graf-900"
                  }
                >
                  {preventivaAtrasada ? "Atrasada desde " : "Prevista para "}
                  {formatarData(equipamento.nextMaintenanceAt)}
                </p>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Sem data prevista. Informe o intervalo na edição da ficha para a JB
                  acompanhar a próxima visita.
                </p>
              )}

              {equipamento.maintenanceIntervalDays ? (
                <p className="text-graf-600">
                  A cada {equipamento.maintenanceIntervalDays} dias, conforme a ficha.
                </p>
              ) : null}

              {equipamento.visits.length > 0 ? (
                <ul className="space-y-2 border-t border-graf-100 pt-3">
                  {equipamento.visits.map((visita) => {
                    const quando = visita.scheduledAt ?? visita.dueAt;
                    return (
                      <li key={visita.id} className="flex flex-wrap items-center gap-2">
                        <CalendarClock
                          className="size-4 shrink-0 text-graf-500"
                          aria-hidden
                        />
                        <span className="tabular font-semibold text-graf-900">
                          {formatarData(quando)}
                        </span>
                        <Etiqueta tom={visita.status === "agendada" ? "andamento" : "aguardando"}>
                          {ROTULO_VISITA[visita.status]}
                        </Etiqueta>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {contrato ? (
                <div className="border-t border-graf-100 pt-3">
                  <p className="font-semibold text-graf-900">
                    {contrato.plan?.name ?? "Contrato de manutenção"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-graf-600">
                    <span className="tabular">{contrato.number}</span>
                    <Etiqueta tom={contrato.status === "ativo" ? "ok" : "neutro"}>
                      {ROTULO_CONTRATO[contrato.status]}
                    </Etiqueta>
                  </p>
                  {contrato.endsAt ? (
                    <p className="mt-1 text-graf-500">
                      Cobertura até {formatarData(contrato.endsAt)}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <LinkBotao
                href="/minha-jb/manutencoes"
                variante="secundario"
                tamanho="sm"
                className="mt-1"
              >
                Ver manutenções
              </LinkBotao>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Chamados" />
            <div className="p-5 text-sm">
              {equipamento.serviceRequests.length > 0 ? (
                <ul className="divide-y divide-graf-100">
                  {equipamento.serviceRequests.map((chamado) => (
                    <li key={chamado.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Link
                          href={`/minha-jb/assistencia/${chamado.number}`}
                          className="font-bold text-graf-950 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {chamado.number}
                        </Link>
                        <Etiqueta tom={tomDoChamado(chamado.status)}>
                          {ROTULO_CHAMADO[chamado.status]}
                        </Etiqueta>
                      </div>
                      <p className="mt-1 text-xs text-graf-500">
                        aberto em {formatarData(chamado.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Nenhum chamado registrado para este equipamento. Se ele parar, fizer
                  ruído estranho ou sair do padrão, abra um chamado — a ficha já vai
                  preenchida.
                </p>
              )}
            </div>
          </Cartao>

          {equipamento.workOrders.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Ordens de serviço"
                descricao="O que a equipe técnica executou no aparelho."
              />
              <ul className="divide-y divide-graf-100 p-5 text-sm">
                {equipamento.workOrders.map((ordem) => (
                  <li key={ordem.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 font-bold text-graf-950">
                        <Wrench className="size-4 text-graf-500" aria-hidden />
                        {ordem.requestId ? (
                          <Link
                            href={`/minha-jb/assistencia/${ordem.requestId}`}
                            className="underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                          >
                            {ordem.number}
                          </Link>
                        ) : (
                          ordem.number
                        )}
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
                    <p className="mt-1 text-xs text-graf-500">
                      {ordem.closedAt
                        ? `concluída em ${formatarData(ordem.closedAt)}`
                        : `aberta em ${formatarData(ordem.openedAt)}`}
                      {ordem.status === "concluida" && ordem.serviceWarrantyDays
                        ? ` · garantia do serviço: ${plural(
                            ordem.serviceWarrantyDays,
                            "dia",
                            "dias",
                          )}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo="Documentos" />
            <div className="p-5">
              {equipamento.documents.length > 0 ? (
                <ListaDeDocumentos documentos={equipamento.documents} />
              ) : (
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-graf-500">
                  <FileText className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span>
                    Laudos, certificados e manuais deste equipamento aparecem aqui quando a
                    equipe da JB os emitir.
                  </span>
                </p>
              )}
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
