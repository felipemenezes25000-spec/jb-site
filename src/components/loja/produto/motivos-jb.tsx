import { CalendarClock, MapPin, ShieldCheck, Wrench } from "lucide-react";

import { Secao } from "@/components/ui/secao";
import { cn } from "@/lib/utils";

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
  temServicos: boolean;
}) {
  const praca = [cidade, uf].filter(Boolean).join(" — ");
  const motivos: Motivo[] = [];

  if (desde) {
    motivos.push({
      icone: CalendarClock,
      titulo: `Desde ${desde}`,
      texto: "Venda e assistência focadas em equipamento odontológico.",
    });
  }

  motivos.push({
    icone: Wrench,
    titulo: praca ? `Equipe própria em ${praca}` : "Equipe técnica própria",
    texto: "Quem vende também acompanha instalação, manutenção e suporte.",
  });

  if (garantiaMeses && garantiaMeses > 0) {
    motivos.push({
      icone: ShieldCheck,
      titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia`,
      texto: "Prazo registrado especificamente para este equipamento.",
    });
  } else if (temServicos) {
    motivos.push({
      icone: MapPin,
      titulo: "Serviço no consultório",
      texto: "Os serviços da equipe podem entrar no mesmo pedido do equipamento.",
    });
  }

  if (motivos.length < 2) return null;

  return (
    <Secao fundo="clara" espaco="md" separador>
      <div className="overflow-hidden rounded-[1.75rem] bg-graf-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <div className="border-b border-white/10 px-6 py-5 sm:px-8">
          <p className="micro text-jb-300">
            Confiança depois da compra
          </p>
          <h2 className="mt-1.5 text-xl font-bold tracking-[-0.02em] text-white sm:text-2xl">
            Por que comprar este equipamento na JB
          </h2>
        </div>

        <ul
          className={cn(
            "grid",
            motivos.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3",
          )}
        >
          {motivos.map((motivo, indice) => {
            const Icone = motivo.icone;
            return (
              <li
                key={motivo.titulo}
                className={`min-w-0 border-white/10 px-6 py-6 sm:px-8 ${
                  indice > 0 ? "border-t md:border-l md:border-t-0" : ""
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-jb-300">
                  <Icone className="size-[18px]" aria-hidden />
                </span>
                <p className="mt-4 text-base font-bold text-white">{motivo.titulo}</p>
                <p className="mt-2 text-sm leading-6 text-white/60">{motivo.texto}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </Secao>
  );
}
