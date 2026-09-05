"use client";

import { useRef, useState } from "react";

import { Botao, type Tamanho, type Variante } from "@/components/ui/button";
import { Painel } from "@/components/ui/painel";

/* ============================================================================
   Botão com confirmação
   Para o que não tem volta: cancelar pedido, apagar registro, encerrar
   contrato. O botão continua sendo um submit de verdade dentro do form — o
   clique só é adiado. Confirmado, o form é enviado com este mesmo botão como
   submitter, então `name`, `value` e `formAction` continuam valendo.

   Sem form por perto, use `aoConfirmar` e chame a ação você mesmo.
   ============================================================================ */

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type"> & {
  /** Texto do botão que dispara a confirmação. */
  rotulo: React.ReactNode;
  /** A pergunta em si — vira o título do diálogo. */
  pergunta: string;
  /** O que a pessoa precisa saber antes de decidir. */
  detalhe?: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  variante?: Variante;
  varianteConfirmar?: Variante;
  tamanho?: Tamanho;
  larguraTotal?: boolean;
  carregando?: boolean;
  icone?: React.ReactNode;
  /** Quando informado, roda no lugar de enviar o formulário. */
  aoConfirmar?: () => void;
};

export function BotaoConfirmar({
  rotulo,
  pergunta,
  detalhe,
  rotuloConfirmar = "Confirmar",
  rotuloCancelar = "Cancelar",
  variante = "perigo",
  varianteConfirmar = "primario",
  tamanho = "md",
  larguraTotal,
  carregando,
  icone,
  aoConfirmar,
  disabled,
  className,
  ...props
}: Props) {
  const [aberto, setAberto] = useState(false);
  // Guardado no clique em vez de por `ref`: assim o Botao do kit é usado como
  // ele é, sem precisar encaminhar referência.
  const refBotao = useRef<HTMLButtonElement | null>(null);

  function confirmar() {
    setAberto(false);
    if (aoConfirmar) {
      aoConfirmar();
      return;
    }
    const botao = refBotao.current;
    const formulario = botao?.form;
    if (botao && formulario) formulario.requestSubmit(botao);
  }

  return (
    <>
      <Botao
        {...props}
        type="submit"
        variante={variante}
        tamanho={tamanho}
        larguraTotal={larguraTotal}
        carregando={carregando}
        disabled={disabled}
        className={className}
        onClick={(evento) => {
          evento.preventDefault();
          refBotao.current = evento.currentTarget;
          setAberto(true);
        }}
      >
        {icone}
        {rotulo}
      </Botao>

      <Painel
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={pergunta}
        tamanho="sm"
        rodape={
          <>
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
              {rotuloCancelar}
            </Botao>
            <Botao type="button" variante={varianteConfirmar} onClick={confirmar}>
              {rotuloConfirmar}
            </Botao>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-graf-600">
          {detalhe ?? "Esta ação não pode ser desfeita."}
        </p>
      </Painel>
    </>
  );
}

/** Mesmo componente, nome curto. */
export const Confirmar = BotaoConfirmar;
