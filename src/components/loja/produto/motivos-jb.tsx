import { CalendarClock, MapPin, ShieldCheck, Wrench } from "lucide-react";

import { Secao } from "@/components/ui/secao";
import { cn } from "@/lib/utils";

/* ============================================================================
   Por que comprar este equipamento na JB

   Faixa curta logo abaixo do preço, com o que a empresa é de fato: tempo de
   atividade, equipe própria, cidade de atendimento e a garantia registrada
   NESTE cadastro. Três colunas separadas por fio — não três cartões.

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
      <h2 className="text-title texto-forte">Por que comprar na JB</h2>

      <ul
        className={cn(
          /* O fio vertical vive na borda do item, então o respiro tem de vir do
             `px` e não do `gap` — com os dois, a coluna do meio ficaria com
             menos de 150px de texto em 768px. */
          "mt-8 grid gap-y-10 md:gap-x-0 md:divide-x md:divide-graf-200 lg:mt-10",
          "md:[&>*]:px-8 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0",
          motivos.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3",
        )}
      >
        {motivos.map((motivo) => {
          const Icone = motivo.icone;
          return (
            <li key={motivo.titulo}>
              <Icone className="size-5 text-jb-600" aria-hidden />
              <p className="mt-3.5 text-base font-bold text-graf-950">{motivo.titulo}</p>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
                {motivo.texto}
              </p>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
