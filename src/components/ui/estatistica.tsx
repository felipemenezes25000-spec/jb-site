import { cn } from "@/lib/utils";

/* ============================================================================
   Estatística — prova objetiva na página pública

   Número grande, rótulo curto embaixo. Serve para o que é verificável e vem
   do banco ou das configurações: ano de início, quantidade de equipamentos
   no catálogo, cidades atendidas.

   Nunca invente o número. Sem dado real, não existe faixa de estatística —
   é melhor não ter do que ter inventado.

   Funciona em fundo claro e dentro de `.on-dark` sem trocar de componente.
   ============================================================================ */

export function Estatistica({
  valor,
  rotulo,
  detalhe,
  prefixo,
  sufixo,
  destaque,
  alinhamento = "esquerda",
  className,
}: {
  /** O número em si, já formatado — "2011", "12", "R$ 5.000". */
  valor: React.ReactNode;
  rotulo: string;
  /** Uma linha de contexto, quando o rótulo sozinho deixa dúvida. */
  detalhe?: string;
  /** Símbolo menor antes do número — "+", "R$". */
  prefixo?: string;
  /** Símbolo menor depois do número — "anos", "%". */
  sufixo?: string;
  /** Põe o número em vermelho. Um por faixa, no máximo. */
  destaque?: boolean;
  alinhamento?: "esquerda" | "centro";
  className?: string;
}) {
  return (
    <div className={cn(alinhamento === "centro" && "text-center", className)}>
      <p
        className={cn(
          "tabular flex items-baseline gap-1 text-display font-extrabold",
          alinhamento === "centro" && "justify-center",
          destaque ? "text-jb-500" : "texto-forte",
        )}
      >
        {prefixo ? (
          <span className="text-[0.5em] font-bold leading-none opacity-80">{prefixo}</span>
        ) : null}
        {valor}
        {sufixo ? (
          <span className="text-[0.42em] font-bold leading-none opacity-80">{sufixo}</span>
        ) : null}
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wider texto-forte">{rotulo}</p>
      {detalhe ? (
        <p className="texto-suave mt-1.5 text-sm leading-relaxed">{detalhe}</p>
      ) : null}
    </div>
  );
}

/**
 * Faixa de estatísticas.
 *
 * Divisórias entre as colunas no desktop, empilhamento simples no celular.
 * Use com duas a quatro estatísticas — cinco viram números pequenos demais
 * para valerem como prova.
 */
export function Estatisticas({
  children,
  colunas = 3,
  divisorias = true,
  className,
}: {
  children: React.ReactNode;
  colunas?: 2 | 3 | 4;
  divisorias?: boolean;
  className?: string;
}) {
  const grade =
    colunas === 2
      ? "sm:grid-cols-2"
      : colunas === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className={cn(
        "grid gap-8 sm:gap-10",
        grade,
        divisorias &&
          "sm:divide-x sm:divide-graf-200 sm:[&>*]:px-8 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0",
        divisorias && "[.on-dark_&]:sm:divide-white/15",
        className,
      )}
    >
      {children}
    </div>
  );
}
