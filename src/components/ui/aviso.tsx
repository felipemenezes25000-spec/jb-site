import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Aviso
   Caixa de mensagem no meio do conteúdo — resultado de ação, alerta de prazo,
   explicação de regra. Sempre com ícone e texto: quem não distingue matiz
   continua entendendo o que está acontecendo.

   O papel muda com o tom: erro interrompe a leitura do leitor de tela
   (role="alert"), o resto só é anunciado na vez (role="status").
   ============================================================================ */

export type TomAviso = "info" | "sucesso" | "atencao" | "erro";

const ESTILOS: Record<TomAviso, { caixa: string; icone: string; titulo: string }> = {
  info: {
    caixa: "bg-info-50 ring-info-500/20",
    icone: "text-info-700",
    titulo: "text-info-700",
  },
  sucesso: {
    caixa: "bg-ok-50 ring-ok-500/20",
    icone: "text-ok-700",
    titulo: "text-ok-700",
  },
  atencao: {
    caixa: "bg-warn-50 ring-warn-500/25",
    icone: "text-warn-700",
    titulo: "text-warn-700",
  },
  erro: {
    caixa: "bg-jb-50 ring-jb-500/20",
    icone: "text-jb-700",
    titulo: "text-jb-800",
  },
};

const ICONES: Record<TomAviso, React.ComponentType<{ className?: string }>> = {
  info: Info,
  sucesso: CircleCheck,
  atencao: TriangleAlert,
  erro: CircleAlert,
};

const PREFIXO: Record<TomAviso, string> = {
  info: "Informação:",
  sucesso: "Sucesso:",
  atencao: "Atenção:",
  erro: "Erro:",
};

export function Aviso({
  tom = "info",
  titulo,
  children,
  acao,
  className,
}: {
  tom?: TomAviso;
  titulo?: React.ReactNode;
  children?: React.ReactNode;
  /** Botão ou link à direita — "Tentar de novo", "Ver pedido". */
  acao?: React.ReactNode;
  className?: string;
}) {
  const estilo = ESTILOS[tom];
  const Icone = ICONES[tom];

  return (
    <div
      role={tom === "erro" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-3 rounded-xl px-4 py-3.5 ring-1 ring-inset",
        estilo.caixa,
        className,
      )}
    >
      <Icone className={cn("mt-0.5 size-5 shrink-0", estilo.icone)} aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="sr-only">{PREFIXO[tom]} </span>
        {titulo ? (
          <p className={cn("text-sm font-bold leading-snug", estilo.titulo)}>{titulo}</p>
        ) : null}
        {children ? (
          <div
            className={cn(
              "text-sm leading-relaxed text-graf-700",
              titulo ? "mt-1" : undefined,
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
