import { ArrowRight, CalendarClock, FileText, Headset, Package, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { PainelDemonstracaoProntuario } from "@/components/loja/home/demonstracao-prontuario";

const ITENS = [
  { icone: Package, titulo: "Pedidos", detalhe: "Itens, valores e etapa da compra." },
  { icone: Wrench, titulo: "Equipamentos", detalhe: "Ficha, número de série e histórico." },
  { icone: Headset, titulo: "Assistência", detalhe: "Chamados e andamento do atendimento." },
  { icone: CalendarClock, titulo: "Manutenções", detalhe: "Visitas previstas e realizadas." },
  { icone: FileText, titulo: "Documentos", detalhe: "Notas, manuais, laudos e OS." },
];

export function SecaoAreaClinica() {
  return (
    <section aria-labelledby="area-da-clinica" className="border-b border-jb-100 bg-white py-16 md:py-24 lg:py-28">
      <div className="container-jb max-w-[112rem] grid gap-12 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] xl:items-center xl:gap-16">
        <div>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Área da Clínica
          </p>
          <h2 id="area-da-clinica" className="mt-4 max-w-[12ch] text-display text-graf-950">
            O equipamento continua tendo história depois da compra.
          </h2>
          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            Compra, assistência, documentos e manutenção ficam ligados à mesma máquina. O cliente acompanha tudo em um único lugar.
          </p>

          <ul className="mt-8 divide-y divide-jb-100 border-y border-jb-100">
            {ITENS.map((item) => {
              const Icone = item.icone;
              return (
                <li key={item.titulo} className="flex min-w-0 gap-3 py-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-jb-500 text-white" aria-hidden>
                    <Icone className="size-4.5" />
                  </span>
                  <div className="min-w-0 self-center">
                    <p className="text-sm font-extrabold text-graf-950">{item.titulo}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-graf-500">{item.detalhe}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/cadastro" tamanho="lg">
              Criar conta da clínica
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/entrar" variante="perigo" tamanho="lg">Já tenho conta</LinkBotao>
          </div>
        </div>

        <PainelDemonstracaoProntuario />
      </div>
    </section>
  );
}
