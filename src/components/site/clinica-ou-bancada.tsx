import Image from "next/image";
import { ClipboardCheck, Stethoscope, Wrench } from "lucide-react";

import { ChamarWhatsapp } from "@/components/site/chamar-whatsapp";

/* ============================================================================
   Na sua clínica ou na nossa bancada

   Duas fotos: o consultório (onde a visita acontece) e a bancada (para onde
   vai o que precisa de oficina), a segunda sobreposta à primeira. As duas são
   ilustrativas, do protótipo aprovado; o texto não diz que são da JB.

   O corte do consultório (`public/site/consultorio.webp`) é só a sala com a
   cadeira: as frases em inglês na parede da foto original ficaram de fora.
   ============================================================================ */

const PONTOS = [
  {
    icone: Stethoscope,
    titulo: "Visita técnica na clínica",
    texto: "Diagnóstico e reparo no próprio consultório, quando o equipamento permite.",
  },
  {
    icone: Wrench,
    titulo: "Bancada da JB",
    texto: "O que precisa de oficina vai para a bancada e volta testado.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Tudo registrado",
    texto: "Cada atendimento entra no histórico do equipamento.",
  },
] as const;

export function ClinicaOuBancada({ cidade, mensagem }: { cidade: string; mensagem?: string }) {
  return (
    <section aria-labelledby="clinica-bancada-titulo" className="overflow-hidden bg-surface-muted py-16 md:py-24">
      <div className="container-jb grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="jb-revela relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-graf-100 shadow-pop lg:aspect-[5/6]">
            <Image
              src="/site/consultorio.webp"
              alt="Consultório odontológico com a cadeira pronta para atendimento"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="jb-foto-viva object-cover"
            />
          </div>
          <div className="jb-boia-2 absolute -bottom-6 -right-3 w-[46%] overflow-hidden rounded-2xl border-4 border-white shadow-pop sm:-right-6">
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
          <p className="jb-boia absolute -left-3 top-6 rounded-xl bg-white px-3.5 py-2 text-sm font-extrabold text-graf-900 shadow-pop sm:-left-6">
            {cidade} e região
          </p>
        </div>

        <div>
          <h2 id="clinica-bancada-titulo" className="text-section texto-forte jb-revela">
            Na sua clínica <span className="text-jb-600">ou na nossa bancada.</span>
          </h2>
          <p
            className="texto-guia jb-revela mt-5 max-w-xl text-graf-600"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            A triagem pelo WhatsApp define o melhor caminho para o seu equipamento voltar a
            funcionar sem parar a sua agenda mais do que o necessário.
          </p>

          <ul className="mt-8 grid gap-4">
            {PONTOS.map((ponto, indice) => (
              <li
                key={ponto.titulo}
                className="jb-revela flex gap-4 rounded-2xl border border-graf-200 bg-white p-4 shadow-xs"
                style={{ "--i": indice + 1 } as React.CSSProperties}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                  <ponto.icone className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-corpo font-extrabold text-graf-950">{ponto.titulo}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-graf-600">{ponto.texto}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="jb-revela mt-8" style={{ "--i": 3 } as React.CSSProperties}>
            <ChamarWhatsapp tamanho="lg" mensagem={mensagem} />
          </div>
        </div>
      </div>
    </section>
  );
}
