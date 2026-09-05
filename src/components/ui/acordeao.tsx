import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Acordeão — perguntas frequentes, detalhes técnicos, política de uma seção

   Construído sobre <details>/<summary>: o navegador já dá o estado aberto e
   fechado, o anúncio para o leitor de tela, o teclado (Tab, Enter e Espaço) e
   a busca com Ctrl+F dentro do conteúdo fechado. Nenhuma linha de JavaScript
   vai para o cliente — isto é Server Component.

   Com `exclusivo`, o atributo `name` faz um item fechar o outro. Onde o
   navegador ainda não conhece esse atributo, todos podem ficar abertos ao
   mesmo tempo: degrada sem quebrar.
   ============================================================================ */

export type ItemAcordeao = {
  /** A pergunta. É o que o leitor de tela lê no botão. */
  titulo: string;
  resposta: React.ReactNode;
  /** Começa aberto — use no primeiro item quando a resposta orienta o resto. */
  aberto?: boolean;
};

export function LinhaAcordeao({
  titulo,
  resposta,
  aberto,
  nome,
  className,
}: ItemAcordeao & { nome?: string; className?: string }) {
  return (
    <details
      name={nome}
      open={aberto}
      className={cn(
        "group border-b border-graf-200 last:border-b-0",
        "[.on-dark_&]:border-white/10",
        className,
      )}
    >
      <summary
        className={cn(
          "flex w-full cursor-pointer items-start justify-between gap-4 py-5 pr-1 text-left",
          "text-base font-semibold texto-forte sm:text-lg",
          "transition-colors hover:text-jb-700 [.on-dark_&]:hover:text-jb-300",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        )}
      >
        <span className="min-w-0">{titulo}</span>
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
            "bg-graf-100 text-graf-700 transition-transform duration-200 group-open:rotate-45",
            "[.on-dark_&]:bg-white/10 [.on-dark_&]:text-white",
          )}
        >
          <Plus className="size-4" />
        </span>
      </summary>
      <div className="texto-suave pb-6 pr-10 text-[0.9375rem] leading-relaxed sm:text-base">
        {resposta}
      </div>
    </details>
  );
}

export function Acordeao({
  itens,
  exclusivo = true,
  nome,
  className,
}: {
  itens: ItemAcordeao[];
  /** Abrir um fecha o anterior. Ligado por padrão. */
  exclusivo?: boolean;
  /** Nome do grupo. Só informe quando houver dois acordeões na mesma página. */
  nome?: string;
  className?: string;
}) {
  if (itens.length === 0) return null;

  const grupo = exclusivo ? (nome ?? "acordeao-jb") : undefined;

  return (
    <div className={cn("border-y border-graf-200 [.on-dark_&]:border-white/10", className)}>
      {itens.map((item, i) => (
        <LinhaAcordeao
          key={`${item.titulo}-${i}`}
          titulo={item.titulo}
          resposta={item.resposta}
          aberto={item.aberto}
          nome={grupo}
        />
      ))}
    </div>
  );
}
