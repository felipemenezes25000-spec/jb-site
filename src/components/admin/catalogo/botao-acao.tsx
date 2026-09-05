"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import type { EstadoAcao } from "@/app/acoes/admin-catalogo";
import { Botao, type Tamanho, type Variante } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";

/* ============================================================================
   Botão de ação de linha

   Publicar, mover, arquivar, excluir: ações de um clique só que vivem dentro
   de uma lista. Cada uma é um `<form>` de verdade com a server action, então
   funciona sem JavaScript; com JavaScript, a resposta vira aviso do sonner em
   vez de empurrar a lista para baixo com uma faixa de mensagem.

   O que não tem volta passa por `BotaoConfirmar`, que reenvia este mesmo botão
   como submitter — `name` e `value` continuam valendo.
   ============================================================================ */

export type AcaoDeFormulario = (
  estado: EstadoAcao,
  formData: FormData,
) => Promise<EstadoAcao>;

export function BotaoAcao({
  acao,
  campos,
  rotulo,
  rotuloAcessivel,
  icone,
  variante = "secundario",
  tamanho = "sm",
  confirmar,
  desabilitado,
  larguraTotal,
  className,
}: {
  acao: AcaoDeFormulario;
  /** Campos escondidos enviados junto — id, direção, novo status… */
  campos: Record<string, string>;
  rotulo: React.ReactNode;
  /** Use quando o rótulo visível for só um ícone. */
  rotuloAcessivel?: string;
  icone?: React.ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  confirmar?: { pergunta: string; detalhe?: string; rotuloConfirmar?: string };
  desabilitado?: boolean;
  larguraTotal?: boolean;
  className?: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(acao, {});

  useEffect(() => {
    if (estado.erro) toast.error(estado.erro);
    else if (estado.ok && estado.mensagem) toast.success(estado.mensagem);
  }, [estado]);

  return (
    <form action={enviar} className={larguraTotal ? "w-full" : "inline-block"}>
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}

      {confirmar ? (
        <BotaoConfirmar
          rotulo={rotulo}
          aria-label={rotuloAcessivel}
          pergunta={confirmar.pergunta}
          detalhe={confirmar.detalhe}
          rotuloConfirmar={confirmar.rotuloConfirmar}
          variante={variante}
          tamanho={tamanho}
          icone={icone}
          carregando={enviando}
          disabled={desabilitado}
          larguraTotal={larguraTotal}
          className={className}
        />
      ) : (
        <Botao
          type="submit"
          aria-label={rotuloAcessivel}
          title={rotuloAcessivel}
          variante={variante}
          tamanho={tamanho}
          carregando={enviando}
          disabled={desabilitado}
          larguraTotal={larguraTotal}
          className={className}
        >
          {icone}
          {rotulo}
        </Botao>
      )}
    </form>
  );
}
