import Link from "next/link";
import { BadgeCheck, ArrowUpRight } from "lucide-react";

import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Selo do Seminovo JB Certificado

   A certificação já existia inteira: inspeção com técnico, checklist versionado,
   contagem carimbada no fechamento, revogação com motivo e uma página pública
   de conferência em /verificar/CÓDIGO. O que faltava era ela APARECER onde a
   decisão acontece — a ficha do equipamento não mencionava o selo em lugar
   nenhum, e o certificado só era encontrável por quem já tinha o código
   impresso na etiqueta.

   Duas formas, um dado:

   `resumo`  entra na coluna de compra, ao lado do preço: o selo, a frase da
             verificação e o caminho para conferir.
   `laudo`   abre a faixa da unidade física, com data, técnico e código.

   O QUE O TEXTO NÃO PODE DIZER

   Não é certificação independente nem regulatória: é o programa de inspeção da
   própria JB, e o selo diz de quem é. A frase da contagem vem pronta de
   `frasedaVerificacao` — ela carrega os itens não aplicáveis à parte de
   propósito, porque somá-los aos aprovados transforma uma inspeção parcial em
   completa sem mentir em nenhuma linha isolada.
   ============================================================================ */

export type CertificadoDaUnidade = {
  codigoPublico: string;
  /** Já formatada por `frasedaVerificacao` — nunca remontar aqui. */
  frase: string;
  itensAprovados: number;
  itensTotal: number;
  resumo: string;
  inspecionadoEm: Date | string | null;
  tecnico: string | null;
};

export function SeloCertificado({
  certificado,
  forma = "resumo",
  className,
}: {
  certificado: CertificadoDaUnidade;
  forma?: "resumo" | "laudo";
  className?: string;
}) {
  const href = `/verificar/${certificado.codigoPublico}`;

  if (forma === "resumo") {
    return (
      <div
        className={cn(
          "rounded-xl border border-ok-500/25 bg-ok-50/60 p-4 sm:p-5",
          className,
        )}
      >
        <p className="flex items-center gap-2 text-base font-bold text-ok-700">
          <BadgeCheck className="size-[18px] shrink-0" aria-hidden />
          Seminovo JB Certificado
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-graf-700">
          {certificado.frase}
          {certificado.tecnico ? ` · inspeção de ${certificado.tecnico}` : ""}
        </p>
        <Link
          href={href}
          className="foco-jb mt-2.5 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-bold text-jb-700 underline underline-offset-4 transition-colors hover:text-jb-500"
        >
          Conferir o certificado
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-ok-500/25 bg-ok-50/60 p-5 sm:p-6", className)}>
      <p className="flex items-center gap-2 text-base font-bold text-ok-700">
        <BadgeCheck className="size-[18px] shrink-0" aria-hidden />
        Seminovo JB Certificado
      </p>

      <p className="mt-2 text-base leading-relaxed text-graf-700">
        {certificado.frase}
      </p>

      {certificado.resumo ? (
        <p className="mt-3 text-base leading-relaxed text-graf-700">
          {certificado.resumo}
        </p>
      ) : null}

      <dl className="mt-4 divide-y divide-ok-500/20 border-t border-ok-500/20">
        {certificado.inspecionadoEm ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5">
            <dt className="text-sm text-graf-600">Inspecionado em</dt>
            <dd className="text-sm font-semibold tabular text-graf-900">
              {formatarData(certificado.inspecionadoEm)}
            </dd>
          </div>
        ) : null}
        {certificado.tecnico ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5">
            <dt className="text-sm text-graf-600">Técnico responsável</dt>
            <dd className="text-sm font-semibold text-graf-900">
              {certificado.tecnico}
            </dd>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 py-2.5">
          <dt className="text-sm text-graf-600">Código de verificação</dt>
          <dd className="label-mono text-graf-900">{certificado.codigoPublico}</dd>
        </div>
      </dl>

      <Link
        href={href}
        className="foco-jb mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-md text-corpo font-bold text-jb-700 underline underline-offset-4 transition-colors hover:text-jb-500"
      >
        Conferir o certificado desta unidade
        <ArrowUpRight className="size-4 shrink-0" aria-hidden />
      </Link>

      <p className="mt-3 texto-apoio text-graf-600">
        Programa de inspeção da própria JB. A página de conferência é pública e
        mostra o mesmo laudo, item por item — sem exigir conta.
      </p>
    </div>
  );
}
