import { ClipboardCheck, MapPin, Wrench } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";

const MENSAGEM_VISITA_TECNICA =
  "Olá, JB! Vim pelo site e preciso de uma visita técnica para avaliar a infraestrutura hidráulica e de esgoto do consultório. Entendi que o orçamento é preparado após a avaliação no local.";

export function InfraestruturaClinica({ contatos }: { contatos: ContatoWhatsapp[] }) {
  return (
    <section
      id="infraestrutura"
      aria-labelledby="infraestrutura-titulo"
      className="border-y border-graf-200 bg-surface-muted py-16 md:py-24"
    >
      <div className="container-jb grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-16">
        <div>
          <p className="sobretitulo jb-revela">Serviço técnico complementar</p>
          <h2 id="infraestrutura-titulo" className="text-section texto-forte jb-revela mt-3 max-w-2xl">
            Infraestrutura hidráulica e de esgoto para o consultório.
          </h2>
          <p
            className="texto-guia jb-revela mt-5 max-w-2xl text-graf-600"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            A JB também realiza a preparação e a execução da rede hidráulica e de esgoto necessária
            para a instalação e adequação de equipamentos odontológicos. Esse serviço começa com uma
            visita técnica ao local; o orçamento é preparado depois do levantamento presencial.
          </p>
        </div>

        <div
          className="jb-revela rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:p-6"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <ol className="grid gap-4" aria-label="Etapas para orçamento de infraestrutura">
            <li className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                <MapPin className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-extrabold text-graf-950">1. Visita técnica no local</p>
                <p className="mt-1 text-sm leading-relaxed text-graf-600">
                  A equipe avalia o espaço e os pontos necessários antes de precificar o serviço.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                <Wrench className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-extrabold text-graf-950">2. Levantamento técnico</p>
                <p className="mt-1 text-sm leading-relaxed text-graf-600">
                  São definidos os ajustes de hidráulica e esgoto necessários para o ambiente.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                <ClipboardCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="font-extrabold text-graf-950">3. Orçamento após a vistoria</p>
                <p className="mt-1 text-sm leading-relaxed text-graf-600">
                  Com o levantamento concluído, a JB apresenta o orçamento para a execução.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-6 border-t border-graf-200 pt-5">
            <p className="mb-3 text-sm font-bold text-graf-700">Solicitar visita técnica</p>
            <OpcoesWhatsapp
              contatos={contatos}
              mensagem={MENSAGEM_VISITA_TECNICA}
              posicao="secao"
              lado
            />
          </div>
        </div>
      </div>
    </section>
  );
}
