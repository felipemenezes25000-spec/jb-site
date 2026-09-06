import { ArrowRight, CalendarClock, FileText, Headset, Package, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { PainelDemonstracaoProntuario } from "@/components/loja/home/demonstracao-prontuario";

/* ============================================================================
   Área da Clínica

   A explicação e a demonstração ficam na mesma faixa. Antes a home tinha uma
   seção dizendo o que era a Área da Clínica e outra logo em seguida mostrando
   o prontuário; agora a prova visual está ao lado da promessa.
   ============================================================================ */

const ITENS = [
  { icone: Package, titulo: "Pedidos", detalhe: "Itens, valores e etapa da compra." },
  { icone: Wrench, titulo: "Equipamentos", detalhe: "Ficha, número de série e histórico." },
  { icone: Headset, titulo: "Assistência", detalhe: "Chamados e andamento do atendimento." },
  { icone: CalendarClock, titulo: "Manutenções", detalhe: "Visitas previstas e realizadas." },
  { icone: FileText, titulo: "Documentos", detalhe: "Notas, manuais, laudos e OS." },
];

export function SecaoAreaClinica() {
  return (
    <Secao fundo="branco" espaco="xl" rotuladoPor="area-da-clinica">
      <div className="grid gap-12 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] xl:items-center xl:gap-16">
        <div>
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Área da Clínica
          </p>
          <h2 id="area-da-clinica" className="mt-4 max-w-[12ch] text-display text-graf-950">
            O equipamento continua tendo história depois da compra.
          </h2>
          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            Compra, assistência, documentos e manutenção ficam ligados à mesma máquina. O cliente acompanha sem depender de conversa perdida em WhatsApp ou e-mail.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {ITENS.map((item) => {
              const Icone = item.icone;
              return (
                <li key={item.titulo} className="flex min-w-0 gap-3 rounded-xl border border-graf-200 bg-surface-muted p-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-jb-600 shadow-xs" aria-hidden>
                    <Icone className="size-4.5" />
                  </span>
                  <div className="min-w-0">
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
            <LinkBotao href="/entrar" variante="secundario" tamanho="lg">
              Já tenho conta
            </LinkBotao>
          </div>
        </div>

        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_50%,rgba(224,20,27,0.09),transparent_64%)]"
          />
          <PainelDemonstracaoProntuario />
        </div>
      </div>
    </Secao>
  );
}
