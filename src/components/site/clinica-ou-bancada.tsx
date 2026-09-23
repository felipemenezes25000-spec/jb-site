import Image from "next/image";
import { ClipboardCheck, Stethoscope, Wrench } from "lucide-react";

import { ChamarWhatsapp } from "@/components/site/chamar-whatsapp";

/* ============================================================================
   Na sua clínica ou na nossa bancada

   A seção explica a decisão técnica sem parecer um bloco institucional:
   fotografia grande, bancada sobreposta e três pontos operacionais numerados.
   As imagens continuam ilustrativas; o texto não atribui a elas uma origem
   que não esteja documentada.
   ============================================================================ */

const PONTOS = [
  {
    numero: "01",
    icone: Stethoscope,
    titulo: "Avaliação na clínica",
    texto: "Quando o equipamento e o tipo de ocorrência permitem, a avaliação e o serviço podem acontecer no próprio consultório.",
  },
  {
    numero: "02",
    icone: Wrench,
    titulo: "Bancada da JB",
    texto: "Quando o serviço pede bancada, a forma de retirada, avaliação e devolução é combinada com a clínica.",
  },
  {
    numero: "03",
    icone: ClipboardCheck,
    titulo: "Serviço registrado",
    texto: "O atendimento e o que foi executado ficam registrados no histórico do equipamento.",
  },
] as const;

export function ClinicaOuBancada({ cidade, mensagem }: { cidade: string; mensagem?: string }) {
  return (
    <section
      aria-labelledby="clinica-bancada-titulo"
      className="jb-clinica-premium py-16 md:py-24 lg:py-28"
    >
      <div className="container-jb grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 xl:gap-20">
        <div className="jb-clinica-visual jb-revela relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-graf-100 lg:aspect-[5/6]">
            <Image
              src="/site/consultorio.webp"
              alt="Consultório odontológico com a cadeira pronta para atendimento"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="jb-foto-viva object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-graf-950/35 to-transparent"
            />
            <p className="absolute bottom-5 left-5 right-5 text-sm font-bold leading-relaxed text-white drop-shadow-sm sm:text-base">
              Atendimento definido conforme o equipamento e o tipo de serviço.
            </p>
          </div>

          <div className="jb-boia-2 absolute -bottom-7 -right-3 w-[47%] overflow-hidden rounded-[1.35rem] border-4 border-white shadow-pop sm:-right-7">
            <div className="relative aspect-square">
              <Image
                src="/site/bancada.webp"
                alt="Técnico trabalhando numa autoclave na bancada"
                fill
                sizes="(min-width: 1024px) 18vw, 42vw"
                className="object-cover object-[62%_40%]"
              />
            </div>
          </div>

          <p className="jb-boia absolute -left-3 top-6 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3.5 py-2 text-sm font-extrabold text-graf-900 shadow-pop backdrop-blur sm:-left-6">
            <span className="size-2 rounded-full bg-ok-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]" aria-hidden />
            {cidade} e região
          </p>
        </div>

        <div>
          <p className="sobretitulo jb-revela">Atendimento técnico</p>
          <h2 id="clinica-bancada-titulo" className="text-section texto-forte jb-revela mt-3">
            Na sua clínica <span className="text-jb-600">ou na nossa bancada.</span>
          </h2>
          <p
            className="texto-guia jb-revela mt-5 max-w-xl text-graf-600"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            A triagem organiza o contexto inicial. A equipe combina com a clínica onde a avaliação
            e o serviço fazem mais sentido para aquele equipamento e ocorrência.
          </p>

          <ul className="mt-8 grid gap-3">
            {PONTOS.map((ponto, indice) => (
              <li
                key={ponto.titulo}
                data-numero={ponto.numero}
                className="jb-clinica-ponto jb-revela flex gap-4 rounded-2xl border p-4 sm:p-5"
                style={{ "--i": indice + 1 } as React.CSSProperties}
              >
                <span className="relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-jb-100">
                  <ponto.icone className="size-5" aria-hidden />
                </span>
                <span className="relative z-[1] pr-10">
                  <span className="block text-corpo font-extrabold text-graf-950">{ponto.titulo}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-graf-600">{ponto.texto}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="jb-revela mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--i": 3 } as React.CSSProperties}>
            <ChamarWhatsapp tamanho="lg" mensagem={mensagem} />
            <p className="max-w-xs text-xs font-semibold leading-relaxed text-graf-500">
              A forma de atendimento é combinada a partir da triagem e da avaliação necessária.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
