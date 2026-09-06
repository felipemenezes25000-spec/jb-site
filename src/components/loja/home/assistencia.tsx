import { ArrowRight, ClipboardCheck, Headphones, MessageCircle, PackageCheck, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

const DIFERENCIAIS = [
  {
    icone: PackageCheck,
    titulo: "A compra não termina na entrega",
    descricao: "Instalação, orientação e próximos passos ficam conectados ao equipamento adquirido.",
  },
  {
    icone: Wrench,
    titulo: "Assistência da própria JB",
    descricao: "Quando algo para, você abre o chamado sem começar a relação com um fornecedor do zero.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Histórico que acompanha a máquina",
    descricao: "Ordens de serviço, documentos e manutenções ficam organizados na Área da Clínica.",
  },
] as const;

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <section id="como-funciona" className="bg-white py-16 md:py-20 lg:py-24">
      <div className="container-jb max-w-[112rem]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#111214] px-6 py-9 text-white sm:px-8 sm:py-10 lg:px-12 lg:py-12 xl:px-14">
          <div className="absolute right-0 top-0 h-full w-[28%] bg-jb-600" aria-hidden />
          <div
            className="absolute inset-y-0 right-[16%] w-[25%] bg-jb-500/35"
            style={{ clipPath: "polygon(55% 0,100% 0,45% 100%,0 100%)" }}
            aria-hidden
          />
          <div className="absolute -right-16 -top-24 size-72 rounded-full border-[3rem] border-white/5" aria-hidden />

          <div className="relative z-10 grid gap-10 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] xl:items-center xl:gap-14">
            <div className="max-w-xl">
              <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-300">
                <span className="h-px w-8 bg-jb-400" aria-hidden />
                O diferencial JB
              </p>
              <h2 className="mt-4 text-[clamp(2.4rem,4vw,4.4rem)] font-black leading-[0.98] tracking-[-0.05em] text-white">
                Você compra o equipamento. A JB continua junto.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65">
                Venda e pós-venda no mesmo relacionamento para reduzir improviso quando a clínica precisa de suporte.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg" className="rounded-xl">
                  <Wrench className="size-4" aria-hidden />
                  Solicitar assistência
                </LinkBotao>
                {whatsapp ? (
                  <LinkBotao
                    href={whatsappHref(whatsapp, "Olá! Preciso de ajuda com um equipamento odontológico.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    variante="claro"
                    tamanho="lg"
                    className="rounded-xl text-graf-950 hover:text-jb-700"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    Falar no WhatsApp
                  </LinkBotao>
                ) : null}
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {DIFERENCIAIS.map((item, indice) => {
                const Icone = item.icone;
                return (
                  <li key={item.titulo} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-sm sm:block xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center xl:p-5">
                    <div className="flex items-center justify-between gap-3 sm:mb-4 xl:mb-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jb-500 text-white" aria-hidden>
                        <Icone className="size-4.5" />
                      </span>
                      <span className="text-3xl font-black tracking-[-0.08em] text-white/10 xl:hidden" aria-hidden>0{indice + 1}</span>
                    </div>
                    <div className="min-w-0 xl:px-1">
                      <h3 className="text-base font-extrabold text-white">{item.titulo}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/55">{item.descricao}</p>
                    </div>
                    <span className="hidden text-3xl font-black tracking-[-0.08em] text-white/10 xl:block" aria-hidden>0{indice + 1}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-xs text-white/55">
            <Headphones className="size-4 text-jb-300" aria-hidden />
            <span>Precisa só entender qual equipamento faz sentido?</span>
            <a href="/orcamento" className="inline-flex min-h-9 items-center gap-1 font-extrabold text-white hover:text-jb-200">
              Peça orientação à equipe <ArrowRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
