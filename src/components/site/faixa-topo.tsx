import { BadgeCheck, CalendarCheck2, FileCheck2, MapPin, Zap } from "lucide-react";

import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";

/* ============================================================================
   Faixa do topo

   Mantém a assinatura vermelha de confiança, mas fica mais compacta no
   celular para devolver pixels à primeira dobra. O conteúdo continua sendo
   composto só por afirmações já sustentadas pelo site e pela operação.
   ============================================================================ */

type Frase = { icone: React.ComponentType<{ className?: string }>; texto: string };

function Trilho({ frases, oculto }: { frases: Frase[]; oculto?: boolean }) {
  return (
    <span aria-hidden={oculto} className="flex shrink-0 items-center">
      {frases.map((frase) => (
        <span
          key={frase.texto}
          className="flex items-center gap-2 whitespace-nowrap px-5 text-[0.75rem] font-bold tracking-tight sm:px-6 sm:text-[0.8125rem]"
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
      <span className="jb-ticker-trilho flex h-8 items-center sm:h-9">
        <Trilho frases={frases} />
        <Trilho frases={frases} oculto />
      </span>
    </div>
  );
}
