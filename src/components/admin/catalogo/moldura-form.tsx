import { CircleCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Peças comuns dos formulários do catálogo

   Sem hooks e sem evento: são só marcação. Por isso servem tanto dentro de um
   formulário cliente quanto direto numa página de servidor.

   `RegiaoEstado` é o único lugar onde a resposta do servidor aparece — uma
   região viva que anuncia erro e sucesso para quem usa leitor de tela, com
   ícone e texto (nunca só a cor).
   ============================================================================ */

export type RespostaForm = { erro?: string; ok?: boolean; mensagem?: string };

export function RegiaoEstado({ estado, className }: { estado: RespostaForm; className?: string }) {
  return (
    <div aria-live="polite" className={cn("empty:hidden", className)}>
      {estado.erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-jb-200 bg-jb-50 px-3.5 py-3 text-sm font-medium text-jb-800"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{estado.erro}</span>
        </p>
      ) : estado.ok && estado.mensagem ? (
        <p className="flex items-start gap-2 rounded-lg border border-ok-500/30 bg-ok-50 px-3.5 py-3 text-sm font-medium text-ok-700">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{estado.mensagem}</span>
        </p>
      ) : null}
    </div>
  );
}

/** Bloco de campos com título — divide o formulário longo sem virar acordeão. */
export function Secao({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-graf-500">{titulo}</h3>
        {descricao ? <p className="mt-1 text-sm text-graf-500">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Grade de campos: uma coluna no celular, duas a partir de sm. */
export function Grade({
  colunas = 2,
  children,
  className,
}: {
  colunas?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        colunas === 1 ? "grid-cols-1" : colunas === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Barra de ação do formulário. Fica grudada no fim do painel para que o botão
 * de salvar não fuja da tela num formulário comprido.
 */
export function BarraSalvar({
  children,
  ajuda,
  className,
}: {
  children: React.ReactNode;
  ajuda?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-graf-200 bg-white/95 px-5 py-3 backdrop-blur",
        className,
      )}
    >
      {ajuda ? <p className="mr-auto text-xs leading-relaxed text-graf-500">{ajuda}</p> : null}
      {children}
    </div>
  );
}

/** Moldura branca padrão de todo formulário longo do catálogo. */
export function Bloco({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo?: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-graf-200 bg-white p-5 shadow-card", className)}>
      {titulo ? (
        <div className="mb-5">
          <h2 className="text-base font-bold text-graf-950">{titulo}</h2>
          {descricao ? <p className="mt-1 text-sm text-graf-500">{descricao}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
