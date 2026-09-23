"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef } from "react";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";

import type { EstadoAcao } from "@/app/acoes/admin-servico";
import { Botao, type Tamanho, type Variante } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ============================================================================
   Formulário de ação do backoffice técnico

   Toda escrita destas telas passa por aqui: um `useActionState` com a server
   action, uma região viva para o erro e um botão que desabilita sozinho
   enquanto a ação corre. O padrão é sempre o mesmo para que a pessoa aprenda
   uma vez e reconheça em todas as telas.

   O estado da ação viaja por contexto, não por render prop. O motivo é a
   fronteira servidor/cliente: as páginas do painel são Server Components e uma
   função não atravessa essa fronteira como prop. Com contexto, a página monta
   os campos normalmente e os campos de `@/components/admin/servico/campos`
   descobrem sozinhos qual deles voltou com erro — pelo `name`.
   ============================================================================ */

export type AcaoDeFormulario = (
  anterior: EstadoAcao,
  formData: FormData,
) => Promise<EstadoAcao>;

export const ESTADO_VAZIO: EstadoAcao = {};

type Contexto = { estado: EstadoAcao; pendente: boolean };

const EstadoDaAcao = createContext<Contexto>({ estado: ESTADO_VAZIO, pendente: false });

/** Estado da ação em volta. Usado pelos campos para achar o próprio erro. */
export function useEstadoDaAcao() {
  return useContext(EstadoDaAcao);
}

export function FormularioAcao({
  acao,
  children,
  rotulo = "Salvar",
  variante = "primario",
  tamanho = "md",
  larguraTotal,
  icone,
  acoesExtras,
  aoConcluir,
  reiniciarAoConcluir,
  esconderBotao,
  className,
  classeAcoes,
  desabilitado,
  motivoDesabilitado,
}: {
  acao: AcaoDeFormulario;
  children?: React.ReactNode | ((contexto: Contexto) => React.ReactNode);
  rotulo?: React.ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  larguraTotal?: boolean;
  icone?: React.ReactNode;
  /** Botões adicionais ao lado do principal — "Cancelar", por exemplo. */
  acoesExtras?: React.ReactNode;
  /** Chamado depois de uma ação bem-sucedida. Use para fechar o painel. */
  aoConcluir?: () => void;
  reiniciarAoConcluir?: boolean;
  /** Para formulários cujo envio é disparado por outro controle. */
  esconderBotao?: boolean;
  className?: string;
  classeAcoes?: string;
  desabilitado?: boolean;
  /** Explica por que o botão está desligado. Sem cor como único indicador. */
  motivoDesabilitado?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, ESTADO_VAZIO);
  const idErro = useId();
  const refFormulario = useRef<HTMLFormElement>(null);
  const refConcluir = useRef(aoConcluir);
  const refUltimo = useRef<EstadoAcao>(ESTADO_VAZIO);

  useEffect(() => {
    refConcluir.current = aoConcluir;
  });

  useEffect(() => {
    // o mesmo objeto de estado não deve disparar o aviso duas vezes
    if (estado === refUltimo.current) return;
    refUltimo.current = estado;
    if (!estado.ok) return;

    if (estado.mensagem) toast.success(estado.mensagem);
    if (reiniciarAoConcluir) refFormulario.current?.reset();
    refConcluir.current?.();
  }, [estado, reiniciarAoConcluir]);

  return (
    <form
      ref={refFormulario}
      action={enviar}
      className={cn("space-y-4", className)}
      aria-busy={pendente || undefined}
      aria-describedby={estado.erro ? idErro : undefined}
    >
      <EstadoDaAcao.Provider value={{ estado, pendente }}>
        {typeof children === "function" ? children({ estado, pendente }) : children}
      </EstadoDaAcao.Provider>

      {/* A região existe sempre montada: um alerta que só nasce depois do erro
          costuma não ser anunciado pelo leitor de tela. Aparecendo, usa a mesma
          caixa de erro do resto do painel — texto vermelho solto no meio do
          formulário se confundia com o rótulo de um campo. */}
      <p
        id={idErro}
        role="alert"
        aria-live="assertive"
        className={cn(
          "text-sm font-medium",
          estado.erro
            ? "flex items-start gap-3 rounded-xl bg-jb-50 px-4 py-3.5 leading-relaxed text-jb-800 ring-1 ring-inset ring-jb-500/20"
            : "sr-only",
        )}
      >
        {estado.erro ? (
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-jb-700" aria-hidden />
        ) : null}
        <span>{estado.erro ?? ""}</span>
      </p>

      {esconderBotao ? null : (
        <div className={cn("flex flex-wrap items-center gap-3", classeAcoes)}>
          <Botao
            type="submit"
            variante={variante}
            tamanho={tamanho}
            larguraTotal={larguraTotal}
            carregando={pendente}
            disabled={desabilitado}
            title={desabilitado ? motivoDesabilitado : undefined}
          >
            {pendente ? null : icone}
            {rotulo}
          </Botao>
          {acoesExtras}
          {desabilitado && motivoDesabilitado ? (
            <span className="text-apoio text-graf-500">{motivoDesabilitado}</span>
          ) : null}
        </div>
      )}
    </form>
  );
}

/**
 * Campo escondido. Existe para que os formulários não precisem repetir
 * `<input type="hidden">` com aspas soltas em toda tela.
 */
export function Oculto({ nome, valor }: { nome: string; valor: string | null | undefined }) {
  return <input type="hidden" name={nome} value={valor ?? ""} />;
}
