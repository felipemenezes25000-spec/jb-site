"use client";

import { Aviso } from "@/components/ui/aviso";
import { cn } from "@/lib/utils";
import type { EstadoAcao } from "@/components/admin/conteudo/botao-acao";

/* ============================================================================
   Peças comuns dos formulários do painel

   Erro do servidor aparece em dois lugares ao mesmo tempo: no topo, num aviso
   com `role="alert"` (o leitor de tela interrompe e lê), e no campo que causou
   o problema, pelo `campo` que a ação devolve. Assim quem enxerga a tela e quem
   não enxerga recebem a mesma informação.
   ============================================================================ */

/** Mensagem só do campo indicado pela ação. */
export function erroDoCampo(estado: EstadoAcao, campo: string) {
  return estado.campo === campo ? estado.erro : undefined;
}

export function MensagemDoFormulario({
  estado,
  tituloDoErro = "Não foi possível salvar",
  className,
}: {
  estado: EstadoAcao;
  tituloDoErro?: string;
  className?: string;
}) {
  if (!estado.erro && !estado.ok) return null;

  return estado.erro ? (
    <Aviso tom="erro" titulo={tituloDoErro} className={className}>
      {estado.erro}
    </Aviso>
  ) : (
    <Aviso tom="sucesso" className={className}>
      {estado.ok}
    </Aviso>
  );
}

/** Cartão de agrupamento dentro de um formulário longo. */
export function Bloco({
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
    <section
      className={cn("rounded-xl border border-graf-200 bg-white p-5 shadow-card", className)}
    >
      <h2 className="text-base font-bold text-graf-950">{titulo}</h2>
      {descricao ? <p className="mt-0.5 text-sm text-graf-500">{descricao}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Barra de ações do formulário. Fica colada no fim da janela para que o botão
 * de salvar não fuja da tela em formulário longo.
 */
export function BarraDeSalvar({
  children,
  aviso,
  className,
}: {
  children: React.ReactNode;
  aviso?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-graf-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6",
        className,
      )}
    >
      {aviso ? <p className="min-w-0 flex-1 text-xs text-graf-500">{aviso}</p> : null}
      <div className={cn("flex flex-wrap gap-3", !aviso && "ml-auto")}>{children}</div>
    </div>
  );
}
