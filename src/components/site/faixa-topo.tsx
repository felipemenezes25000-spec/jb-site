import { BadgeCheck, CalendarCheck2, FileCheck2, MapPin, Zap } from "lucide-react";

import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";

/* ============================================================================
   Faixa do topo

   Uma tira vermelha fina, acima do cabeçalho, com as frases que vendem a JB
   correndo sem parar. Não é link: um toque nela abriria o WhatsApp de uma
   pessoa só, e o site sempre oferece os dois, Jeferson e Jackson, que estão
   logo abaixo, no cabeçalho.

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
  contatos,
  desde,
  cidade,
}: {
  contatos: ContatoWhatsapp[];
  desde: string;
  cidade: string;
}) {
  const nomes = contatos.map((contato) => contato.nome).filter(Boolean);

  const frases: Frase[] = [
    { icone: BadgeCheck, texto: "Atendemos todas as marcas" },
    { icone: Zap, texto: "Equipamento parou? Chame agora no WhatsApp" },
    { icone: MapPin, texto: `Atendimento em ${cidade} e região, na clínica ou na bancada` },
    { icone: FileCheck2, texto: "Orçamento antes de qualquer troca de peça" },
    { icone: CalendarCheck2, texto: `Na bancada desde ${desde}` },
    { icone: BadgeCheck, texto: "Assistência técnica autorizada EVOXX" },
    ...(nomes.length > 0
      ? [{ icone: MarcaWhatsapp, texto: `No WhatsApp: ${nomes.join(" e ")}` }]
      : []),
  ];

  return (
    <div className="jb-ticker relative z-50 block overflow-hidden bg-jb-600 text-white">
      <span className="jb-ticker-trilho flex h-9 items-center">
        <Trilho frases={frases} />
        <Trilho frases={frases} oculto />
      </span>
    </div>
  );
}
