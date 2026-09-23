import { BadgeCheck, MessageCircleMore, UsersRound } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";

/* ============================================================================
   Chamada final

   O fechamento antes do rodapé repete apenas o que é verificável: horário
   real, cobertura de marcas, mensagem preparada e escolha entre os dois
   atendentes. O destaque do botão principal pulsa só duas vezes — chama a
   atenção sem virar animação permanente.

   O título convida a contar o problema; não promete que a agenda não vai
   parar nem apressa a decisão. Quem decide o próximo passo é a avaliação.
   ============================================================================ */

export function ChamadaFinal({
  contatos,
  horario,
  cidade,
  mensagem = MENSAGEM_PADRAO,
  equipamento,
  titulo = "Conte o que aconteceu com o equipamento.",
}: {
  contatos: ContatoWhatsapp[];
  horario: string;
  cidade: string;
  mensagem?: string;
  equipamento?: string;
  titulo?: string;
}) {
  const provas = [
    { icone: BadgeCheck, texto: "Todas as marcas" },
    { icone: MessageCircleMore, texto: "Mensagem já preparada" },
    { icone: UsersRound, texto: "Jeferson ou Jackson" },
  ];

  return (
    <section aria-labelledby="chamada-final-titulo" className="relative overflow-clip bg-jb-50 py-16 md:py-24">
      <div className="container-jb relative">
        {/* `overflow-clip`, e não `overflow-hidden`: o cartão tem blocos
            `.jb-revela`, e `hidden` viraria contêiner de rolagem, congelando a
            revelação na opacidade inicial. */}
        <div className="relative mx-auto max-w-5xl overflow-clip rounded-[2rem] border border-graf-200/80 bg-white px-5 py-10 text-center shadow-[0_38px_100px_-58px_rgb(17_19_21/0.55)] sm:px-8 sm:py-12 md:px-12 md:py-14">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-jb-400/60 to-transparent"
          />

          <div className="relative">
            <StatusAtendimento
              horario={horario}
              neutro={`Assistência técnica em ${cidade} e região`}
              className="jb-revela"
            />

            <h2
              id="chamada-final-titulo"
              className="text-display texto-forte jb-revela mx-auto mt-6 max-w-3xl"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              {titulo}
            </h2>
            <p
              className="texto-guia jb-revela mx-auto mt-5 max-w-2xl text-graf-700"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              A mensagem já sai com o equipamento e o sintoma escritos. A equipe técnica organiza a
              triagem e combina com a clínica o próximo passo.
            </p>

            <ul
              className="jb-revela mx-auto mt-7 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3"
              style={{ "--i": 3 } as React.CSSProperties}
              aria-label="O que você encontra ao chamar a JB"
            >
              {provas.map((prova) => (
                <li
                  key={prova.texto}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-graf-200/90 bg-white/85 px-3 text-xs font-extrabold text-graf-800 shadow-xs"
                >
                  <prova.icone className="size-4 shrink-0 text-jb-600" aria-hidden />
                  <span>{prova.texto}</span>
                </li>
              ))}
            </ul>

            <OpcoesWhatsapp
              contatos={contatos}
              mensagem={mensagem}
              equipamento={equipamento}
              posicao="fechamento"
              pulso={2}
              className="jb-revela mt-9 sm:justify-center"
              style={{ "--i": 4 } as React.CSSProperties}
            />

            <p className="jb-revela mt-4 text-xs font-semibold text-graf-500" style={{ "--i": 5 } as React.CSSProperties}>
              Você escolhe com quem falar e revisa a mensagem no WhatsApp antes de enviar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
