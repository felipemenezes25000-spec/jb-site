import { BadgeCheck, CalendarCheck2, FileCheck2, MapPin, Zap } from "lucide-react";

import { LinkWhatsapp } from "@/components/site/botao-whatsapp";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { formatarTelefone } from "@/lib/format";

/* ============================================================================
   Faixa do topo

   Uma tira vermelha fina, acima do cabeçalho, com as frases que vendem a JB
   correndo sem parar. A tira inteira é um link para o WhatsApp: em qualquer
   ponto que a pessoa toque, a conversa abre.

   Vermelho em faixa estreita é "sinal", não fundo de área grande: é o mesmo
   uso do botão, esticado. As frases são as mesmas afirmações que a página já
   sustenta (EVOXX conferível, desde o ano configurado, orçamento antes da
   troca), nenhuma inventada para a faixa.

   Com movimento reduzido a tira para e mostra a primeira frase.
   ============================================================================ */

type Frase = { icone: React.ComponentType<{ className?: string }>; texto: string };

function Trilho({ frases, oculto }: { frases: Frase[]; oculto?: boolean }) {
  return (
    <span aria-hidden={oculto} className="flex shrink-0 items-center">
      {frases.map((frase) => (
        <span
          key={frase.texto}
          className="flex items-center gap-2 whitespace-nowrap px-6 text-[0.8125rem] font-bold tracking-tight"
        >
          <frase.icone className="size-3.5 shrink-0 text-white/85" />
          {frase.texto}
        </span>
      ))}
    </span>
  );
}

export function FaixaTopo({
  whatsapp,
  desde,
  cidade,
}: {
  whatsapp: string;
  desde: string;
  cidade: string;
}) {
  const frases: Frase[] = [
    { icone: BadgeCheck, texto: "Atendemos todas as marcas" },
    { icone: Zap, texto: "Equipamento parou? Chame agora no WhatsApp" },
    { icone: MapPin, texto: `Atendimento em ${cidade} e região, na clínica ou na bancada` },
    { icone: FileCheck2, texto: "Orçamento antes de qualquer troca de peça" },
    { icone: CalendarCheck2, texto: `Na bancada desde ${desde}` },
    { icone: BadgeCheck, texto: "Assistência técnica autorizada EVOXX" },
    ...(whatsapp.trim()
      ? [{ icone: MarcaWhatsapp, texto: `WhatsApp ${formatarTelefone(whatsapp)}` }]
      : []),
  ];

  return (
    <LinkWhatsapp
      numero={whatsapp}
      mensagem={MENSAGEM_PADRAO}
      posicao="faixa-topo"
      rotulo="Chamar a assistência técnica da JB no WhatsApp"
      className="jb-ticker foco-jb relative z-50 block overflow-hidden bg-jb-600 text-white"
    >
      <span className="jb-ticker-trilho flex h-9 items-center">
        <Trilho frases={frases} />
        <Trilho frases={frases} oculto />
      </span>
    </LinkWhatsapp>
  );
}
