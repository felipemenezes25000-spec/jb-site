import { History, Layers3, ShieldCheck } from "lucide-react";

import { Contador } from "@/components/site/contador";

/* ============================================================================
   Por que chamar a JB

   Quatro motivos, todos verificáveis ou já praticados no atendimento: anos de
   bancada (das configurações), orçamento antes da troca, histórico por
   equipamento (o painel da equipe registra cada OS) e atendimento a outras
   marcas com confirmação na triagem. Nenhuma nota, contagem de clientes ou
   prazo inventado.

   Grade de 3 colunas e 2 linhas, 6 espaços ocupados: o contador largo em
   cima, o bloco das marcas largo embaixo.
   ============================================================================ */

export function PorQueJb({ anos, desde, cidade }: { anos: number | null; desde: string; cidade: string }) {
  return (
    <section aria-labelledby="por-que-titulo" className="bg-white py-16 md:py-24">
      <div className="container-jb">
        <h2 id="por-que-titulo" className="text-section texto-forte jb-revela max-w-2xl">
          Por que clínicas chamam a JB
        </h2>

        <ul className="mt-10 grid gap-3 sm:gap-4 lg:grid-cols-3">
          {anos ? (
            <li className="jb-revela relative overflow-hidden rounded-2xl border border-jb-200 bg-jb-50 p-6 sm:p-8 lg:col-span-2">
              <span
                aria-hidden
                className="jb-flutua-lento pointer-events-none absolute -bottom-24 -right-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.16),transparent)]"
              />
              <p className="relative flex items-end gap-3">
                <Contador
                  valor={anos}
                  className="tabular font-display text-[5rem] font-extrabold leading-[0.85] tracking-tight text-jb-600 sm:text-[7rem]"
                />
                <span className="pb-2 text-2xl font-extrabold text-graf-950 sm:text-3xl">anos</span>
              </p>
              <p className="relative mt-4 max-w-md text-corpo leading-relaxed text-graf-700 sm:text-lg">
                Consertando equipamento odontológico em {cidade} desde {desde}. Muito defeito a
                gente reconhece já na descrição.
              </p>
            </li>
          ) : null}

          <li className="jb-revela rounded-2xl border border-graf-200 bg-white p-6 sm:p-7" style={{ "--i": 1 } as React.CSSProperties}>
            <ShieldCheck className="size-7 text-jb-600" aria-hidden />
            <h3 className="mt-5 text-bloco texto-forte">Orçamento antes da troca</h3>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              Nenhuma peça é substituída sem a sua aprovação. Você sabe o valor antes.
            </p>
          </li>

          <li className="jb-revela rounded-2xl border border-graf-200 bg-white p-6 sm:p-7" style={{ "--i": 2 } as React.CSSProperties}>
            <History className="size-7 text-jb-600" aria-hidden />
            <h3 className="mt-5 text-bloco texto-forte">Histórico de cada aparelho</h3>
            <p className="mt-2 text-corpo leading-relaxed text-graf-600">
              O que foi feito fica registrado. O próximo atendimento já começa sabendo.
            </p>
          </li>

          <li
            className="jb-revela flex flex-col justify-between gap-6 rounded-2xl border border-graf-200 bg-white p-6 sm:flex-row sm:items-center sm:p-7 lg:col-span-2"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            <div>
              <Layers3 className="size-7 text-jb-600" aria-hidden />
              <h3 className="mt-5 text-bloco texto-forte">Todas as marcas</h3>
              <p className="mt-2 max-w-lg text-corpo leading-relaxed text-graf-600">
                Consertamos equipamento de qualquer marca, e somos assistência técnica autorizada
                EVOXX. A triagem confirma o seu modelo antes de qualquer deslocamento.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
