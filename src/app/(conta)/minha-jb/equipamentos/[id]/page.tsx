import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, History, LifeBuoy, Pencil, ShieldCheck } from "lucide-react";

import { Historico } from "@/components/conta/mj-historico";
import { ListaDeDocumentos } from "@/components/conta/mj-lista-documentos";
import { Topo } from "@/components/conta/mj-topo";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, type Tom } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import {
  ROTULO_EQUIPAMENTO,
  ROTULO_ORIGEM,
  historicoDoEquipamento,
} from "@/lib/equipamento";
import { distanciaEmDias, formatarData } from "@/lib/format";
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

type Params = Promise<{ id: string }>;

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1 py-2">
      <dt className="text-sm text-graf-500">{rotulo}</dt>
      <dd className="min-w-0 text-sm text-graf-900">{valor}</dd>
    </div>
  );
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
    },
  });

  if (!equipamento) notFound();

  const historico = await historicoDoEquipamento(equipamento.id);

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Ficha do equipamento" />
            <dl className="divide-y divide-graf-100 p-5">
              <Linha rotulo="Tipo" valor={equipamento.category?.name ?? "Não informado"} />
              <Linha rotulo="Marca e modelo" valor={identificacao} />
              <Linha
                rotulo="Número de série"
                valor={
                  equipamento.serialNumber ? (
                    <span className="tabular">{equipamento.serialNumber}</span>
                  ) : (
                    "Não informado"
                  )
                }
              />
              <Linha rotulo="Voltagem" valor={equipamento.voltage ?? "Não informada"} />
              <Linha
                rotulo="Onde fica"
                valor={
                  [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · ") ||
                  "Não informado"
                }
              />
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
              <Linha
                rotulo="Comprado em"
                valor={
                  equipamento.purchasedAt ? formatarData(equipamento.purchasedAt) : "Não informado"
                }
              />
              <Linha
                rotulo="Instalado em"
                valor={
                  equipamento.installedAt ? formatarData(equipamento.installedAt) : "Não informado"
                }
              />
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
              descricao="Chamados, ordens de serviço, manutenções e documentos deste equipamento."
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
            <CabecalhoCartao titulo="Garantia" />
            <div className="p-5 text-sm">
              {equipamento.warrantyUntil ? (
                <>
                  <p className="flex items-center gap-2">
                    <ShieldCheck
                      className={`size-5 shrink-0 ${garantiaValida ? "text-ok-700" : "text-graf-500"}`}
                      aria-hidden
                    />
                    <span className="font-bold text-graf-950">
                      {garantiaValida ? "Na garantia" : "Garantia encerrada"}
                    </span>
                  </p>
                  <p className="mt-2 leading-relaxed text-graf-600">
                    {garantiaValida ? "Válida até " : "Venceu em "}
                    <span className="font-semibold text-graf-900">
                      {formatarData(equipamento.warrantyUntil)}
                    </span>{" "}
                    ({distanciaEmDias(equipamento.warrantyUntil)}).
                  </p>
                </>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Não há data de garantia registrada. Se você tem a nota fiscal, informe a
                  data na edição do equipamento — o controle passa a ser automático.
                </p>
              )}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Manutenção preventiva" />
            <div className="space-y-2 p-5 text-sm">
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
                <p className="text-graf-600">Sem data prevista.</p>
              )}

              {equipamento.lastMaintenanceAt ? (
                <p className="text-graf-600">
                  Última manutenção em {formatarData(equipamento.lastMaintenanceAt)}.
                </p>
              ) : null}

              {equipamento.maintenanceIntervalDays ? (
                <p className="text-graf-500">
                  Intervalo definido: {equipamento.maintenanceIntervalDays} dias.
                </p>
              ) : (
                <p className="leading-relaxed text-graf-500">
                  Defina o intervalo na edição para acompanharmos a próxima data.
                </p>
              )}

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
