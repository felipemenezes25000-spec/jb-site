import Link from "next/link";
import { ArrowRight, CalendarCheck, LifeBuoy, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { TituloSecao } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";

/* ============================================================================
   Depois da entrega

   A JB vende e conserta — e é isso que separa a loja de um revendedor. A faixa
   grafite aparece uma vez por página, no fim, ligando o equipamento que a
   pessoa está vendo aos caminhos reais da assistência.

   Nenhum prazo, nenhuma cobertura e nenhum número: só as portas de entrada que
   existem no site.
   ============================================================================ */

const CAMINHOS = [
  {
    href: "/assistencia-tecnica",
    icone: Wrench,
    titulo: "Assistência técnica",
    texto: "Equipamento parado ou com defeito. A equipe faz a triagem e agenda a visita.",
  },
  {
    href: "/manutencao-preventiva",
    icone: CalendarCheck,
    titulo: "Manutenção preventiva",
    texto: "Revisão programada para o equipamento não parar no meio do atendimento.",
  },
  {
    href: "/planos-de-manutencao",
    icone: LifeBuoy,
    titulo: "Planos de manutenção",
    texto: "Acompanhamento contínuo do parque de equipamentos da clínica.",
  },
];

export function AssistenciaRelacionada({
  desde,
  cidade,
}: {
  /** Ano de início, vindo da configuração da loja. Vazio = a frase não usa. */
  desde: string;
  /** Cidade de atendimento, também da configuração. */
  cidade: string;
}) {
  const desdeQuando = desde ? ` desde ${desde}` : "";
  const praca = cidade ? ` em ${cidade}` : "";

  return (
    <Secao fundo="grafite" espaco="lg" padraoDeFundo>
      <TituloSecao
        sobretitulo="Depois da entrega"
        titulo="Quem vende é quem conserta"
        descricao={`A JB é assistência técnica de equipamento odontológico${desdeQuando}, com equipe própria${praca}. O equipamento que sai daqui continua com a mesma equipe do outro lado.`}
      />

      <ul className="mt-10 grid gap-4 md:grid-cols-3 lg:gap-6">
        {CAMINHOS.map((caminho) => {
          const Icone = caminho.icone;
          return (
            <li key={caminho.href} className="flex">
              <Link
                href={caminho.href}
                className="group flex w-full flex-col rounded-xl border border-white/12 bg-white/5 p-5 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:p-6"
              >
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-lg bg-jb-500 text-white"
                >
                  <Icone className="size-5" />
                </span>
                <span className="mt-4 block text-base font-bold text-white">
                  {caminho.titulo}
                </span>
                <span className="mt-1.5 block text-sm leading-relaxed text-graf-300">
                  {caminho.texto}
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  Ver como funciona
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <LinkBotao href="/assistencia-tecnica/solicitar" variante="claro" tamanho="lg">
          Abrir um chamado
        </LinkBotao>
      </div>
    </Secao>
  );
}
