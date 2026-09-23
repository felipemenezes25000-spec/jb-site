import { Phone } from "lucide-react";

import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { NumerosWhatsapp } from "@/components/site/numeros-whatsapp";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import { classesBotao } from "@/components/ui/button";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { telHref } from "@/lib/format";

/* ============================================================================
   Chamada final

   O último empurrão antes do rodapé: fundo vermelho clarinho da marca (nunca
   vermelho cheio em área grande), duas manchas de luz que flutuam devagar e o
   botão maior da página com um anel que pulsa. O selo de horário se repete
   aqui porque é a pergunta que a pessoa faz antes de mandar a mensagem.
   Embaixo, os dois WhatsApps por escrito, para quem prefere escolher o número.
   ============================================================================ */

export function ChamadaFinal({
  whatsapp,
  whatsappAlternativo = "",
  telefone,
  horario,
  cidade,
  mensagem = MENSAGEM_PADRAO,
  equipamento,
  titulo = "Não deixe a agenda parar por causa de um equipamento.",
}: {
  whatsapp: string;
  /** O segundo WhatsApp das configurações; vazio, só o principal aparece. */
  whatsappAlternativo?: string;
  telefone: string;
  horario: string;
  cidade: string;
  /** Nas páginas de equipamento, a mensagem e o título já dizem qual é. */
  mensagem?: string;
  equipamento?: string;
  titulo?: string;
}) {
  const ligar = telHref(telefone);

  return (
    <section aria-labelledby="chamada-final-titulo" className="relative overflow-clip bg-jb-50 py-20 md:py-28">
      <span
        aria-hidden
        className="jb-flutua pointer-events-none absolute -left-24 -top-24 size-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.16),transparent)]"
      />
      <span
        aria-hidden
        className="jb-flutua-lento pointer-events-none absolute -bottom-32 -right-20 size-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.12),transparent)]"
      />

      <div className="container-estreito relative text-center">
        <StatusAtendimento
          horario={horario}
          neutro={`Assistência técnica em ${cidade} e região`}
          className="jb-revela"
        />
        <h2
          id="chamada-final-titulo"
          className="text-display texto-forte jb-revela mx-auto mt-6 max-w-2xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {titulo}
        </h2>
        <p
          className="texto-guia jb-revela mx-auto mt-5 max-w-xl text-graf-700"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          Mande a mensagem agora. Quanto antes a equipe entende o defeito, antes ele volta a
          funcionar.
        </p>

        <div
          className="jb-revela mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <span className="relative inline-flex w-full sm:w-auto">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg bg-jb-500/35 motion-safe:animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
            <BotaoWhatsapp
              numero={whatsapp}
              mensagem={mensagem}
              equipamento={equipamento}
              posicao="fechamento"
              tamanho="lg"
              larguraTotal
              className="relative px-9 text-lg shadow-raised sm:w-auto"
            />
          </span>
          {ligar ? (
            <a
              href={ligar}
              className={classesBotao("secundario", "lg", "w-full whitespace-nowrap sm:w-auto")}
            >
              <Phone className="size-4" aria-hidden />
              Ligar agora
            </a>
          ) : null}
        </div>

        <NumerosWhatsapp
          numeros={[whatsapp, whatsappAlternativo]}
          mensagem={mensagem}
          equipamento={equipamento}
          posicao="fechamento-numero"
          centralizado
          className="jb-revela mt-5"
          style={{ "--i": 4 } as React.CSSProperties}
        />
      </div>
    </section>
  );
}
