import { ArrowRight, FileText, Headset, Package, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { PainelDemonstracaoProntuario } from "@/components/loja/home/demonstracao-prontuario";

const ITENS = [
  {
    icone: Package,
    titulo: "Equipamentos e pedidos",
    detalhe: "O que a clínica comprou e a ficha de cada máquina.",
  },
  {
    icone: Wrench,
    titulo: "Chamados e manutenções",
    detalhe: "Acompanhe atendimento, visitas e histórico técnico.",
  },
  {
    icone: FileText,
    titulo: "Documentos no mesmo lugar",
    detalhe: "OS, manuais, laudos e arquivos ligados ao equipamento.",
  },
] as const;

export function SecaoAreaClinica() {
  return (
    <section aria-labelledby="area-da-clinica" className="overflow-hidden border-y border-jb-700 bg-jb-600 text-white">
      <div className="container-jb max-w-[112rem] grid gap-10 py-16 md:py-20 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-14 lg:py-24">
        <div className="max-w-xl">
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white/75">
            <span className="h-px w-8 bg-white" aria-hidden />
            Área da Clínica
          </p>
          <h2 id="area-da-clinica" className="mt-4 text-[clamp(2.5rem,4.2vw,4.8rem)] font-black leading-[0.96] tracking-[-0.055em] text-white">
            Seu equipamento não vira uma compra esquecida.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75">
            A JB mantém compra e pós-venda conectados à mesma ficha. Sua equipe sabe o que tem, o que aconteceu e o que precisa acontecer depois.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {ITENS.map((item) => {
              const Icone = item.icone;
              return (
                <li key={item.titulo} className="flex gap-3 rounded-xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-jb-700" aria-hidden>
                    <Icone className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-white">{item.titulo}</p>
                    <p className="mt-0.5 text-[0.72rem] leading-relaxed text-white/65">{item.detalhe}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/cadastro" variante="claro" tamanho="lg" className="text-jb-700 hover:text-jb-900">
              Criar conta da clínica
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/entrar" variante="contorno-claro" tamanho="lg">
              Já tenho conta
            </LinkBotao>
          </div>

          <p className="mt-5 flex items-center gap-2 text-xs text-white/55">
            <Headset className="size-4" aria-hidden />
            Compra, suporte e histórico no mesmo relacionamento com a JB.
          </p>
        </div>

        <div className="rounded-[1.8rem] bg-white p-2 shadow-[0_30px_90px_-38px_rgba(80,0,0,0.48)] sm:p-3">
          <PainelDemonstracaoProntuario />
        </div>
      </div>
    </section>
  );
}
