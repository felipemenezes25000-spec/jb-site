import Image from "next/image";
import Link from "next/link";
import type { EquipmentStatus } from "@prisma/client";
import { ArrowRight, CalendarClock, LifeBuoy, MapPin, ShieldCheck } from "lucide-react";

import { Etiqueta, type Tom } from "@/components/ui/data";
import { ROTULO_EQUIPAMENTO } from "@/lib/equipamento";
import { distanciaEmDias, formatarData, plural } from "@/lib/format";

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
    <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-graf-200/90 bg-white shadow-[0_1px_2px_rgba(18,24,35,0.025),0_18px_46px_-36px_rgba(18,24,35,0.34)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-graf-300 hover:shadow-[0_8px_22px_rgba(18,24,35,0.045),0_28px_58px_-34px_rgba(18,24,35,0.3)]">
      {equipamento.imagemUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-graf-50">
          <Image
            src={equipamento.imagemUrl}
            alt={equipamento.imagemAlt}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 30vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
          />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-graf-950/12 to-transparent" aria-hidden />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">{etiquetas}</div>
        </div>
      ) : (
        <div className="flex min-h-14 flex-wrap items-center gap-1.5 border-b border-graf-100 bg-gradient-to-r from-graf-50 via-white to-jb-50/35 px-4 py-3">
          {etiquetas}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[0.96rem] font-extrabold leading-snug tracking-[-0.015em] text-graf-950">
              <Link
                href={`/minha-jb/equipamentos/${equipamento.id}`}
                className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {equipamento.name}
              </Link>
            </h3>
            <p className="mt-0.5 line-2 text-sm leading-relaxed text-graf-600">
              {[equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
                "Marca e modelo não informados"}
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-500/10">
            <LifeBuoy className="size-[17px]" aria-hidden />
          </span>
        </div>

        {equipamento.serialNumber ? (
          <p className="mt-2 text-xs text-graf-500">
            Série <span className="tabular font-medium text-graf-600">{equipamento.serialNumber}</span>
          </p>
        ) : null}

        {/* Dentro de uma `<dl>`, um `<div>` de agrupamento só pode conter
            `<dt>` e `<dd>` — e aqui havia um `<span>` com o ícone entre os
            dois, o que o axe acusa como `definition-list` (grave). O ícone
            passou para dentro do `<dd>`, que virou a linha em si. */}
        <dl className="mt-4 space-y-2 border-t border-graf-100 pt-3.5 text-xs">
          {lugar ? (
            <div>
              <dt className="sr-only">Local</dt>
              <dd className="flex items-start gap-2.5 text-graf-600">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-graf-500">
                  <MapPin className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 pt-1">{lugar}</span>
              </dd>
            </div>
          ) : null}

          {equipamento.warrantyUntil ? (
            <div>
              <dt className="sr-only">Garantia</dt>
              <dd className={`flex items-start gap-2.5 ${garantiaValida ? "text-ok-700" : "text-graf-500"}`}>
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${garantiaValida ? "bg-ok-50 text-ok-700" : "bg-graf-50 text-graf-500"}`}>
                  <ShieldCheck className="size-3.5" aria-hidden />
                </span>
                <span className="pt-1">
                  {garantiaValida ? "Garantia até " : "Garantia venceu em "}
                  {formatarData(equipamento.warrantyUntil)}
                </span>
              </dd>
            </div>
          ) : null}

          {equipamento.nextMaintenanceAt ? (
            <div>
              <dt className="sr-only">Próxima manutenção</dt>
              <dd className={`flex items-start gap-2.5 ${preventivaAtrasada ? "font-semibold text-jb-700" : "text-graf-600"}`}>
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${preventivaAtrasada ? "bg-jb-50 text-jb-600" : "bg-graf-50 text-graf-500"}`}>
                  <CalendarClock className="size-3.5" aria-hidden />
                </span>
                <span className="pt-1">
                  {preventivaAtrasada ? "Preventiva atrasada — " : "Preventiva "}
                  {distanciaEmDias(equipamento.nextMaintenanceAt)} ({formatarData(equipamento.nextMaintenanceAt)})
                </span>
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-bold text-jb-700">
          Ver prontuário
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </p>
      </div>
    </article>
  );
}
