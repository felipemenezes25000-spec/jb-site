import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Gauge,
  Hash,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { CONDICAO_PDP, type CondicaoProduto } from "@/components/loja/produto/condicao";
import {
  SeloCertificado,
  type CertificadoDaUnidade,
} from "@/components/loja/produto/selo-certificado";
import { Etiqueta, type Tom } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";

export type ItemDeChecklist = {
  id: string;
  rotulo: string;
  resultado: string;
  nota: string;
};

const RESULTADO: Record<string, { rotulo: string; tom: Tom }> = {
  verificado: { rotulo: "Verificado", tom: "ok" },
  substituido: { rotulo: "Peça substituída", tom: "andamento" },
  reparado: { rotulo: "Reparado", tom: "andamento" },
  nao_aplicavel: { rotulo: "Não se aplica", tom: "neutro" },
};

type DadoDaUnidade = {
  rotulo: string;
  valor: string;
  mono: boolean;
  icone: LucideIcon;
};

function Rotulo({ children }: { children: React.ReactNode }) {
  return <h3 className="micro text-graf-500">{children}</h3>;
}

function IconeDoResultado({ resultado }: { resultado: string }) {
  if (resultado === "substituido" || resultado === "reparado") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-700 ring-1 ring-jb-100">
        <Wrench className="size-4" aria-hidden />
      </span>
    );
  }

  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ok-50 text-ok-700 ring-1 ring-ok-100">
      <CheckCircle2 className="size-4" aria-hidden />
    </span>
  );
}

export function UnidadeFisica({
  id,
  condicao,
  numeroDeSerie,
  anoDeFabricacao,
  horasDeUso,
  ciclos,
  garantiaMeses,
  notasDeEstado,
  notasDeInspecao,
  checklist,
  certificado,
  vendida,
}: {
  id?: string;
  condicao: CondicaoProduto;
  numeroDeSerie: string | null;
  anoDeFabricacao: number | null;
  horasDeUso: number | null;
  ciclos: number | null;
  garantiaMeses: number | null;
  notasDeEstado: string;
  notasDeInspecao: string;
  checklist: ItemDeChecklist[];
  certificado?: CertificadoDaUnidade | null;
  vendida?: boolean;
}) {
  const desenho = CONDICAO_PDP[condicao];

  const dados: DadoDaUnidade[] = [
    numeroDeSerie
      ? { rotulo: "Número de série", valor: numeroDeSerie, mono: true, icone: Hash }
      : null,
    anoDeFabricacao
      ? {
          rotulo: "Ano de fabricação",
          valor: String(anoDeFabricacao),
          mono: false,
          icone: CalendarDays,
        }
      : null,
    ciclos
      ? {
          rotulo: "Ciclos registrados",
          valor: ciclos.toLocaleString("pt-BR"),
          mono: false,
          icone: Gauge,
        }
      : null,
    horasDeUso
      ? {
          rotulo: "Horas de uso",
          valor: `${horasDeUso.toLocaleString("pt-BR")} h`,
          mono: false,
          icone: Clock3,
        }
      : null,
    garantiaMeses
      ? {
          rotulo: "Garantia desta unidade",
          valor: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"}`,
          mono: false,
          icone: ShieldCheck,
        }
      : null,
  ].filter((linha): linha is DadoDaUnidade => linha !== null);

  const substituidas = checklist.filter((item) => item.resultado === "substituido").length;
  const reparados = checklist.filter((item) => item.resultado === "reparado").length;
  const verificados = checklist.filter((item) => item.resultado === "verificado").length;

  const contagens = [
    verificados > 0 ? { rotulo: "Itens verificados", valor: verificados, destaque: false } : null,
    substituidas > 0 ? { rotulo: "Peças substituídas", valor: substituidas, destaque: true } : null,
    reparados > 0 ? { rotulo: "Itens reparados", valor: reparados, destaque: true } : null,
  ].filter(
    (linha): linha is { rotulo: string; valor: number; destaque: boolean } => linha !== null,
  );

  const nadaAMostrar =
    dados.length === 0 &&
    checklist.length === 0 &&
    !notasDeEstado &&
    !notasDeInspecao &&
    !certificado;
  if (nadaAMostrar) return null;

  const temComplemento =
    dados.length > 0 || Boolean(notasDeEstado) || Boolean(notasDeInspecao) || Boolean(certificado);

  return (
    <Secao
      id={id}
      espaco="lg"
      fundo="marca"
      separador
      className="scroll-mt-[var(--jb-topo-secoes)]"
      largura="loja"
    >
      <div className="overflow-hidden rounded-[2rem] border border-graf-200/90 bg-white shadow-[0_30px_90px_-58px_rgba(15,23,42,0.45)]">
        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:p-10 xl:gap-16">
          <div className="min-w-0 self-start">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${desenho.selo}`}
            >
              <ClipboardCheck className="size-4" aria-hidden />
              {vendida ? "Unidade vendida" : "Unidade inspecionada"}
            </span>

            <h2 className="fonte-display mt-5 max-w-[15ch] text-[clamp(1.8rem,1.35rem+1.6vw,2.7rem)] leading-[1.05] tracking-[-0.035em] text-graf-950">
              {vendida ? "A unidade que foi vendida" : "O passaporte desta unidade"}
            </h2>

            <p className="mt-3 max-w-[48ch] text-base leading-7 text-graf-600">
              {checklist.length > 0
                ? "Não é ficha genérica de catálogo. Aqui ficam a identidade, os testes e as intervenções da máquina específica que será enviada."
                : "Os dados abaixo pertencem à unidade física anunciada — não ao modelo de forma genérica."}
            </p>

            {numeroDeSerie ? (
              <div className="mt-5 inline-flex max-w-full items-center gap-3 rounded-2xl border border-graf-200 bg-graf-50/80 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-graf-950 text-white">
                  <Hash className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="micro block text-graf-500">Unidade identificada</span>
                  <span className="label-mono mt-0.5 block truncate text-graf-950">{numeroDeSerie}</span>
                </span>
              </div>
            ) : null}

            {contagens.length > 0 ? (
              <dl className="mt-6 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {contagens.map((contagem) => (
                  <div
                    key={contagem.rotulo}
                    className="rounded-2xl border border-graf-200 bg-white px-4 py-4 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.5)]"
                  >
                    <dd
                      className={`fonte-display tabular text-3xl leading-none ${contagem.destaque ? "text-jb-650" : "text-graf-950"}`}
                    >
                      {contagem.valor}
                    </dd>
                    <dt className="micro mt-2 leading-4 text-graf-500">{contagem.rotulo}</dt>
                  </div>
                ))}
              </dl>
            ) : null}

            {!vendida ? (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={`/orcamento?assunto=${encodeURIComponent("Laudo completo desta unidade")}`}
                  className="botao-jb foco-jb inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-extrabold shadow-sm"
                >
                  <ClipboardCheck className="size-4" aria-hidden />
                  Pedir laudo completo
                </Link>
                {certificado ? (
                  <span className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-ok-700">
                    <BadgeCheck className="size-4" aria-hidden />
                    Certificação publicada
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {checklist.length > 0 ? (
            <div className="min-w-0 rounded-3xl border border-graf-200 bg-graf-50/60 p-4 sm:p-5 lg:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-graf-200 pb-4">
                <div>
                  <Rotulo>Checklist da bancada</Rotulo>
                  <p className="mt-1.5 text-sm font-bold text-graf-900">
                    O que foi conferido nesta máquina
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold tabular text-graf-600 ring-1 ring-graf-200">
                  {checklist.length} {checklist.length === 1 ? "item" : "itens"}
                </span>
              </div>

              <ul className="mt-3 grid gap-2.5">
                {checklist.map((item) => {
                  const resultado = RESULTADO[item.resultado] ?? RESULTADO.verificado;
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-2xl border border-graf-200/90 bg-white px-4 py-3.5 shadow-[0_10px_24px_-25px_rgba(15,23,42,0.45)]"
                    >
                      <IconeDoResultado resultado={item.resultado} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                          <span className="text-sm font-extrabold text-graf-900">{item.rotulo}</span>
                          <Etiqueta tom={resultado.tom}>{resultado.rotulo}</Etiqueta>
                        </div>
                        {item.nota ? (
                          <p className="mt-1.5 text-sm leading-5 text-graf-500">{item.nota}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {temComplemento ? (
          <div className="border-t border-graf-200 bg-graf-50/55 px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
            {dados.length > 0 ? (
              <div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <Rotulo>Identidade e uso</Rotulo>
                    <p className="mt-1 text-sm font-bold text-graf-900">Dados da unidade física anunciada</p>
                  </div>
                  <span className="text-xs text-graf-500">Informação por unidade, não por modelo</span>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {dados.map((linha) => {
                    const Icone = linha.icone;
                    return (
                      <div
                        key={linha.rotulo}
                        className="min-w-0 rounded-2xl border border-graf-200 bg-white p-4 shadow-[0_12px_28px_-28px_rgba(15,23,42,0.45)]"
                      >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-graf-50 text-graf-700 ring-1 ring-graf-200">
                          <Icone className="size-4" aria-hidden />
                        </span>
                        <dt className="micro mt-3 text-graf-500">{linha.rotulo}</dt>
                        <dd
                          className={
                            linha.mono
                              ? "label-mono mt-1 break-all text-graf-950"
                              : "mt-1 text-base font-extrabold tabular text-graf-950"
                          }
                        >
                          {linha.valor}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ) : null}

            {certificado || notasDeEstado || notasDeInspecao ? (
              <div className={`grid gap-5 ${dados.length > 0 ? "mt-7 border-t border-graf-200 pt-7" : ""} lg:grid-cols-2`}>
                {certificado ? (
                  <div className="min-w-0">
                    <SeloCertificado certificado={certificado} forma="laudo" />
                  </div>
                ) : null}

                {notasDeEstado || notasDeInspecao ? (
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {notasDeEstado ? (
                      <div className="rounded-2xl border border-graf-200 bg-white p-5">
                        <Rotulo>Estado de conservação</Rotulo>
                        <p className="mt-2.5 text-sm leading-6 text-graf-700">{notasDeEstado}</p>
                      </div>
                    ) : null}

                    {notasDeInspecao ? (
                      <div className="rounded-2xl border border-graf-200 bg-white p-5">
                        <Rotulo>Observações da revisão</Rotulo>
                        <p className="mt-2.5 text-sm leading-6 text-graf-700">{notasDeInspecao}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Secao>
  );
}
