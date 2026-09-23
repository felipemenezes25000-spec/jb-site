import { BadgeCheck, History, Layers3, ShieldCheck } from "lucide-react";

import { Contador } from "@/components/site/contador";

/* ============================================================================
   Por que chamar a JB

   Esta é a seção de autoridade: sem nota inventada, sem número de clientes e
   sem promessa de prazo. Só fatos do atendimento e da operação, apresentados
   com mais peso visual para sustentar confiança depois do primeiro scroll.
   ============================================================================ */

export function PorQueJb({ anos, desde, cidade }: { anos: number | null; desde: string; cidade: string }) {
  return (
    <section
      aria-labelledby="por-que-titulo"
      className="jb-autoridade-premium py-16 md:py-24 lg:py-28"
    >
      <div className="container-jb">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-end">
          <div>
            <p className="sobretitulo jb-revela">Por que a JB</p>
            <h2 id="por-que-titulo" className="text-section texto-forte jb-revela mt-3 max-w-2xl">
              Confiança não vem de slogan. <span className="text-jb-600">Vem do processo.</span>
            </h2>
          </div>
          <p
            className="texto-guia jb-revela max-w-xl text-graf-600 lg:justify-self-end"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Tempo de bancada, orçamento antes de troca, histórico do aparelho e atendimento a
            todas as marcas: quatro pontos objetivos para decidir com mais segurança.
          </p>
        </div>

        <ul className="jb-autoridade-grid mt-10 grid gap-3 sm:gap-4 lg:grid-cols-3">
          {anos ? (
            <li className="jb-autoridade-destaque jb-revela relative overflow-hidden rounded-[1.6rem] border border-jb-200 p-6 sm:p-8 lg:col-span-2">
              <span
                aria-hidden
                className="jb-flutua-lento pointer-events-none absolute -bottom-24 -right-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.16),transparent)]"
              />
              <div className="relative flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.16em] text-jb-700">
                    Experiência de bancada
                  </p>
                  <p className="mt-5 flex items-end gap-3">
                    <Contador
                      valor={anos}
                      className="tabular font-display text-[5rem] font-extrabold leading-[0.82] tracking-tight text-jb-600 sm:text-[7rem]"
                    />
                    <span className="pb-2 text-2xl font-extrabold text-graf-950 sm:text-3xl">anos</span>
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-jb-200 bg-white/85 px-3 py-2 text-xs font-extrabold text-jb-800 shadow-xs backdrop-blur">
                  <BadgeCheck className="size-4" aria-hidden />
                  Desde {desde}
                </span>
              </div>
              <p className="relative mt-5 max-w-xl text-corpo leading-relaxed text-graf-700 sm:text-lg">
                Consertando equipamento odontológico em {cidade}. Muito defeito já começa a ser
                reconhecido pela descrição que chega na triagem.
              </p>
            </li>
          ) : null}

          <li
            className="jb-autoridade-card jb-revela rounded-[1.45rem] border p-6 sm:p-7"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-jb-100">
              <ShieldCheck className="size-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-bloco texto-forte">Orçamento antes da troca</h3>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              Nenhuma peça é substituída sem a sua aprovação. Você sabe o valor antes.
            </p>
          </li>

          <li
            className="jb-autoridade-card jb-revela rounded-[1.45rem] border p-6 sm:p-7"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-jb-100">
              <History className="size-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-bloco texto-forte">Histórico de cada aparelho</h3>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              O que foi feito fica registrado. O próximo atendimento já começa sabendo.
            </p>
          </li>

          <li
            className="jb-autoridade-card jb-revela flex flex-col justify-between gap-6 rounded-[1.45rem] border p-6 sm:flex-row sm:items-center sm:p-7 lg:col-span-2"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <div>
              <span className="flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-jb-100">
                <Layers3 className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-bloco texto-forte">Todas as marcas</h3>
              <p className="mt-2 max-w-2xl text-corpo leading-relaxed text-graf-600">
                Consertamos equipamento de qualquer marca, e somos assistência técnica autorizada
                EVOXX. A triagem confirma o seu modelo antes de qualquer deslocamento.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-graf-200 bg-graf-50 px-3 py-2 text-xs font-extrabold text-graf-700">
              Modelo confirmado na triagem
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
