"use client";

import { useState } from "react";

import type { EstadoAcao } from "@/app/acoes/admin-servico";
import {
  FormularioAcao,
  type AcaoDeFormulario,
} from "@/components/admin/servico/formulario";
import { Botao, type Tamanho, type Variante } from "@/components/ui/button";
import { Painel, type LadoPainel, type TamanhoPainel } from "@/components/ui/painel";

/* ============================================================================
   Botão que abre um painel com um formulário de ação

   É o gesto padrão do backoffice técnico: "Agendar visita", "Registrar
   evento", "Transferir equipamento". O painel só é montado quando abre, então
   os campos nascem limpos a cada uso e nada fica pendurado na árvore.

   Concluída a ação com sucesso, o painel fecha sozinho — a página já foi
   revalidada pela server action e o resultado aparece atrás.
   ============================================================================ */

export function PainelAcao({
  rotulo,
  icone,
  variante = "secundario",
  tamanho = "sm",
  larguraTotal,
  titulo,
  descricao,
  acao,
  children,
  rotuloConfirmar = "Salvar",
  varianteConfirmar = "primario",
  tamanhoPainel = "md",
  lado,
  desabilitado,
  motivoDesabilitado,
}: {
  rotulo: React.ReactNode;
  icone?: React.ReactNode;
  variante?: Variante;
  tamanho?: Tamanho;
  larguraTotal?: boolean;
  /** Título do painel — é também o nome acessível do diálogo. */
  titulo: string;
  descricao?: string;
  acao: AcaoDeFormulario;
  children: React.ReactNode | ((contexto: { estado: EstadoAcao; pendente: boolean }) => React.ReactNode);
  rotuloConfirmar?: string;
  varianteConfirmar?: Variante;
  tamanhoPainel?: TamanhoPainel;
  lado?: LadoPainel;
  desabilitado?: boolean;
  motivoDesabilitado?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Botao
        type="button"
        variante={variante}
        tamanho={tamanho}
        larguraTotal={larguraTotal}
        onClick={() => setAberto(true)}
        disabled={desabilitado}
        title={desabilitado ? motivoDesabilitado : undefined}
      >
        {icone}
        {rotulo}
      </Botao>

      <Painel
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={titulo}
        descricao={descricao}
        tamanho={tamanhoPainel}
        lado={lado}
      >
        <FormularioAcao
          acao={acao}
          rotulo={rotuloConfirmar}
          variante={varianteConfirmar}
          aoConcluir={() => setAberto(false)}
          classeAcoes="justify-end border-t border-graf-200 pt-4"
          acoesExtras={
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
          }
        >
          {children}
        </FormularioAcao>
      </Painel>
    </>
  );
}
