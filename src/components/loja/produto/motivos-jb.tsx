import { CalendarClock, MapPin, ShieldCheck, Wrench } from "lucide-react";

import { Secao } from "@/components/ui/secao";
import { cn } from "@/lib/utils";

/* ============================================================================
   Por que comprar este equipamento na JB

   Faixa curta logo abaixo do preço, com o que a empresa é de fato: tempo de
   atividade, equipe própria, cidade de atendimento e a garantia registrada
   NESTE cadastro.

   Cada item nasce de um campo real — configuração da loja ou cadastro do
   produto. Sem nada para dizer, a faixa não existe: é melhor não ter do que
   encher de frase de efeito.
   ============================================================================ */

type Motivo = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
};

export function MotivosJB({
  desde,
  cidade,
  uf,
  garantiaMeses,
  temServicos,
}: {
  desde: string;
  cidade: string;
  uf: string;
  garantiaMeses: number | null;
  /** O produto tem serviço da JB vinculado no cadastro. */
  temServicos: boolean;
}) {
  const praca = [cidade, uf].filter(Boolean).join(" — ");
  const motivos: Motivo[] = [];

  if (desde) {
    motivos.push({
      icone: CalendarClock,
      titulo: `Em atividade desde ${desde}`,
      texto: "Venda e assistência de equipamento odontológico, sem outra linha de negócio.",
    });
  }

  motivos.push({
    icone: Wrench,
    titulo: praca ? `Equipe técnica própria em ${praca}` : "Equipe técnica própria",
    texto: "A instalação e a manutenção ficam com quem vendeu o equipamento.",
  });

  if (garantiaMeses && garantiaMeses > 0) {
    motivos.push({
      icone: ShieldCheck,
      titulo: `Garantia de ${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"}`,
      texto: "Prazo registrado no cadastro deste equipamento, atendido pela própria JB.",
    });
  } else if (temServicos) {
    motivos.push({
      icone: MapPin,
      titulo: "Instalação no seu consultório",
      texto: "Os serviços da equipe entram no mesmo pedido, sem outro fornecedor.",
    });
  }

  if (motivos.length < 2) return null;

  return (
    <Secao fundo="clara" espaco="md" separador>
      <ul
        className={cn(
          "grid gap-8 sm:gap-10 sm:divide-x sm:divide-graf-200",
          "sm:[&>*]:px-8 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0",
          motivos.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
        )}
      >
        {motivos.map((motivo) => {
          const Icone = motivo.icone;
          return (
            <li key={motivo.titulo}>
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-lg bg-white text-jb-600 shadow-card"
              >
                <Icone className="size-5" />
              </span>
              <p className="mt-4 text-base font-bold text-graf-950">{motivo.titulo}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-graf-600">{motivo.texto}</p>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
