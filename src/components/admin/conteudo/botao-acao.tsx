"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Botao, type Tamanho, type Variante } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { cn } from "@/lib/utils";

/* ============================================================================
   Botão que dispara uma server action

   As telas do painel têm muitos comandos de uma linha só: publicar, esconder,
   subir, descer, fechar, ativar. Todos seguem a mesma forma — um formulário de
   verdade, com os parâmetros em campos escondidos, uma server action e a
   resposta anunciada.

   Sem JavaScript o formulário ainda envia e a ação roda; o que se perde é só o
   aviso flutuante. Por isso o resultado também vai para uma região viva, que
   leitor de tela anuncia mesmo quando o toast não aparece.
   ============================================================================ */

export type EstadoAcao = {
  erro?: string;
  campo?: string;
  ok?: string;
  senha?: string;
  id?: string;
};

export type AcaoDeFormulario = (estado: EstadoAcao, form: FormData) => Promise<EstadoAcao>;

const VAZIO: EstadoAcao = {};

/** Avisa por toast e por região viva, uma vez por resposta. */
function useAvisoDeResultado(estado: EstadoAcao) {
  const visto = useRef<EstadoAcao | null>(null);

  useEffect(() => {
    if (visto.current === estado) return;
    visto.current = estado;
    if (estado.ok) toast.success(estado.ok);
    else if (estado.erro) toast.error(estado.erro);
  }, [estado]);
}

function CamposEscondidos({ valores }: { valores?: Record<string, string> }) {
  if (!valores) return null;
  return (
    <>
      {Object.entries(valores).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
    </>
  );
}

function Anuncio({ estado }: { estado: EstadoAcao }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {estado.ok ?? estado.erro ?? ""}
    </span>
  );
}

export function BotaoAcao({
  acao,
  valores,
  rotulo,
  rotuloAcessivel,
  icone,
  variante = "secundario",
  tamanho = "sm",
  somenteIcone,
  desabilitado,
  larguraTotal,
  className,
}: {
  acao: AcaoDeFormulario;
  valores?: Record<string, string>;
  rotulo: string;
  /** Quando o botão é só ícone, este é o texto lido em voz alta. */
  rotuloAcessivel?: string;
  icone?: React.ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  somenteIcone?: boolean;
  desabilitado?: boolean;
  larguraTotal?: boolean;
  className?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  useAvisoDeResultado(estado);

  return (
    <form action={executar} className={cn(larguraTotal && "w-full", className)}>
      <CamposEscondidos valores={valores} />
      <Botao
        type="submit"
        variante={variante}
        tamanho={tamanho}
        carregando={pendente}
        disabled={desabilitado}
        larguraTotal={larguraTotal}
        aria-label={somenteIcone ? (rotuloAcessivel ?? rotulo) : undefined}
        title={somenteIcone ? (rotuloAcessivel ?? rotulo) : undefined}
        className={cn(somenteIcone && "aspect-square px-0")}
      >
        {pendente ? null : icone}
        {somenteIcone ? <span className="sr-only">{rotuloAcessivel ?? rotulo}</span> : rotulo}
      </Botao>
      <Anuncio estado={estado} />
    </form>
  );
}

export function BotaoAcaoConfirmar({
  acao,
  valores,
  rotulo,
  pergunta,
  detalhe,
  rotuloConfirmar = "Confirmar",
  icone,
  variante = "perigo",
  tamanho = "sm",
  desabilitado,
  className,
}: {
  acao: AcaoDeFormulario;
  valores?: Record<string, string>;
  rotulo: string;
  pergunta: string;
  detalhe?: string;
  rotuloConfirmar?: string;
  icone?: React.ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  desabilitado?: boolean;
  className?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  useAvisoDeResultado(estado);

  return (
    <form action={executar} className={className}>
      <CamposEscondidos valores={valores} />
      <BotaoConfirmar
        rotulo={rotulo}
        pergunta={pergunta}
        detalhe={detalhe}
        rotuloConfirmar={rotuloConfirmar}
        variante={variante}
        tamanho={tamanho}
        carregando={pendente}
        disabled={desabilitado}
        icone={icone}
      />
      <Anuncio estado={estado} />
    </form>
  );
}

/**
 * Par de botões subir/descer de uma lista ordenada. A ação recebe `id` e
 * `direcao`; quem manda na renumeração é o servidor.
 */
export function BotoesDeOrdem({
  acao,
  id,
  primeiro,
  ultimo,
  rotuloDoItem,
}: {
  acao: AcaoDeFormulario;
  id: string;
  primeiro: boolean;
  ultimo: boolean;
  /** Ex.: "o slide Campanha de junho" — entra no rótulo lido em voz alta. */
  rotuloDoItem: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <BotaoAcao
        acao={acao}
        valores={{ id, direcao: "cima" }}
        rotulo="Subir"
        rotuloAcessivel={`Subir ${rotuloDoItem}`}
        somenteIcone
        desabilitado={primeiro}
        variante="sutil"
        icone={<SetaCima />}
      />
      <BotaoAcao
        acao={acao}
        valores={{ id, direcao: "baixo" }}
        rotulo="Descer"
        rotuloAcessivel={`Descer ${rotuloDoItem}`}
        somenteIcone
        desabilitado={ultimo}
        variante="sutil"
        icone={<SetaBaixo />}
      />
    </div>
  );
}

function SetaCima() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
      <path
        d="M10 15.5V4.5M10 4.5 5 9.5M10 4.5l5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SetaBaixo() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
      <path
        d="M10 4.5v11M10 15.5l5-5M10 15.5l-5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
