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

   Três colunas separadas por fio, sem caixa de vidro em volta: em fundo
   escuro, cartão translúcido é o efeito que mais entrega template. O bloco
   inteiro é clicável pelo link do título.

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
    <Secao fundo="afundada" espaco="lg" padraoDeFundo>
      <TituloSecao
        sobretitulo="Depois da entrega"
        titulo="Quem vende é quem conserta"
        descricao={`A JB é assistência técnica de equipamento odontológico${desdeQuando}, com equipe própria${praca}. O equipamento que sai daqui continua com a mesma equipe do outro lado.`}
        acao={
          <LinkBotao href="/assistencia-tecnica/solicitar" variante="primario" tamanho="lg">
            Abrir um chamado
          </LinkBotao>
        }
      />

      {/* O respiro entre as colunas vem do `px` dos itens, não do `gap`: o fio
          do `divide-x` mora na borda, e somar os dois espremeria o texto. */}
      <ul className="mt-12 grid gap-y-10 md:grid-cols-3 md:gap-x-0 md:divide-x md:divide-white/12 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0 md:[&>*]:px-8 lg:mt-14">
        {CAMINHOS.map((caminho) => {
          const Icone = caminho.icone;
          return (
            <li key={caminho.href} className="group relative">
              <Icone className="size-5 text-jb-300" aria-hidden />
              <h3 className="mt-3.5 text-base font-bold text-graf-950">
                <Link
                  href={caminho.href}
                  /* Link esticado: o item inteiro fica clicável sem virar
                     cartão e sem duplicar o mesmo destino em dois links. */
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {caminho.titulo}
                </Link>
              </h3>
              <p className="texto-suave mt-2 text-base leading-relaxed">
                {caminho.texto}
              </p>
              <span className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700">
                Ver como funciona
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
