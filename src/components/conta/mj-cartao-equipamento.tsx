import Image from "next/image";
import Link from "next/link";
import type { EquipmentStatus } from "@prisma/client";
import { CalendarClock, LifeBuoy, MapPin, ShieldCheck } from "lucide-react";

import { Etiqueta, type Tom } from "@/components/ui/data";
import { ROTULO_EQUIPAMENTO } from "@/lib/equipamento";
import { distanciaEmDias, formatarData, plural } from "@/lib/format";

/**
 * Cartão de um equipamento do prontuário.
 *
 * Mostra o que decide alguma coisa: em que estado ele está, se a garantia
 * ainda vale, quando é a próxima preventiva e se já existe chamado aberto.
 * Nada é calculado no olho — garantia vencida aparece como vencida, e
 * equipamento sem data de garantia não ganha data nenhuma.
 */

const TOM_STATUS: Record<EquipmentStatus, Tom> = {
  operacional: "ok",
  em_manutencao: "andamento",
  aguardando_peca: "aguardando",
  inoperante: "alerta",
  desativado: "neutro",
};

export type EquipamentoDoCartao = {
  id: string;
  name: string;
  brandName: string;
  modelName: string;
  serialNumber: string;
  status: EquipmentStatus;
  room: string;
  warrantyUntil: Date | null;
  nextMaintenanceAt: Date | null;
  imagemUrl: string | null;
  imagemAlt: string;
  chamadosAbertos: number;
  location: { id: string; name: string } | null;
};

export function CartaoEquipamento({ equipamento }: { equipamento: EquipamentoDoCartao }) {
  const agora = new Date();
  const garantiaValida = equipamento.warrantyUntil
    ? equipamento.warrantyUntil.getTime() > agora.getTime()
    : null;
  const preventivaAtrasada = equipamento.nextMaintenanceAt
    ? equipamento.nextMaintenanceAt.getTime() < agora.getTime()
    : false;

  const lugar = [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · ");

  const etiquetas = (
    <>
      <Etiqueta tom={TOM_STATUS[equipamento.status]}>
        {ROTULO_EQUIPAMENTO[equipamento.status]}
      </Etiqueta>
      {equipamento.chamadosAbertos > 0 ? (
        <Etiqueta tom="alerta" ponto>
          {plural(equipamento.chamadosAbertos, "chamado aberto", "chamados abertos")}
        </Etiqueta>
      ) : null}
    </>
  );

  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card transition-[box-shadow,border-color] duration-200 hover:border-graf-300 hover:shadow-raised">
      {/* A maior parte do prontuário é equipamento que a clínica cadastrou sem
          foto. Reservar a placa de 4:3 para todos deixava um retângulo cinza
          com ícone de imagem quebrada ocupando metade do cartão — o estado
          normal parecia defeito. Sem foto, as etiquetas viram a faixa de topo. */}
      {equipamento.imagemUrl ? (
        <div className="relative aspect-4/3 bg-graf-50">
          <Image
            src={equipamento.imagemUrl}
            alt={equipamento.imagemAlt}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 30vw"
            className="object-cover"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{etiquetas}</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 border-b border-graf-100 bg-graf-50/70 px-4 py-3">
          {etiquetas}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[0.9375rem] font-bold leading-snug text-graf-950">
          <Link
            href={`/minha-jb/equipamentos/${equipamento.id}`}
            className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            {equipamento.name}
          </Link>
        </h3>

        <p className="mt-0.5 line-2 text-sm text-graf-600">
          {[equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
            "Marca e modelo não informados"}
        </p>

        {equipamento.serialNumber ? (
          <p className="mt-1 text-xs text-graf-500">
            Série <span className="tabular">{equipamento.serialNumber}</span>
          </p>
        ) : null}

        <dl className="mt-3 space-y-1.5 border-t border-graf-100 pt-3 text-xs">
          {lugar ? (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Local</dt>
              <MapPin className="mt-px size-3.5 shrink-0 text-graf-500" aria-hidden />
              <dd className="min-w-0 text-graf-600">{lugar}</dd>
            </div>
          ) : null}

          {equipamento.warrantyUntil ? (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Garantia</dt>
              <ShieldCheck
                className={`mt-px size-3.5 shrink-0 ${garantiaValida ? "text-ok-700" : "text-graf-500"}`}
                aria-hidden
              />
              <dd className={garantiaValida ? "text-ok-700" : "text-graf-500"}>
                {garantiaValida ? "Garantia até " : "Garantia venceu em "}
                {formatarData(equipamento.warrantyUntil)}
              </dd>
            </div>
          ) : null}

          {equipamento.nextMaintenanceAt ? (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Próxima manutenção</dt>
              <CalendarClock
                className={`mt-px size-3.5 shrink-0 ${preventivaAtrasada ? "text-jb-600" : "text-graf-500"}`}
                aria-hidden
              />
              <dd className={preventivaAtrasada ? "font-semibold text-jb-700" : "text-graf-600"}>
                {preventivaAtrasada ? "Preventiva atrasada — " : "Preventiva "}
                {distanciaEmDias(equipamento.nextMaintenanceAt)} (
                {formatarData(equipamento.nextMaintenanceAt)})
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-3 flex items-center gap-1.5 pt-1 text-xs font-semibold text-jb-700">
          <LifeBuoy className="size-3.5" aria-hidden />
          Ver prontuário
        </p>
      </div>
    </article>
  );
}
