"use client";

import { useEstadoDaAcao } from "@/components/admin/servico/formulario";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Area, Campo, Selecao } from "@/components/ui/form";

/* ============================================================================
   Campos que conhecem o erro da ação

   São os campos do kit com uma diferença: eles perguntam ao contexto do
   `FormularioAcao` se o erro que voltou do servidor é deles, comparando com o
   próprio `name`. Assim a mensagem aparece embaixo do campo certo, e a página
   — que é Server Component e não pode passar função nenhuma para o cliente —
   continua escrevendo formulário do jeito mais simples possível.

   Um erro sem campo (regra que envolve mais de um dado, falha do banco) fica
   só na região viva do formulário, que é onde ele pertence.
   ============================================================================ */

function useErroDoCampo(nome: string | undefined, erroManual?: string) {
  const { estado } = useEstadoDaAcao();
  if (erroManual) return erroManual;
  if (!nome || !estado.campo) return undefined;
  return estado.campo === nome ? estado.erro : undefined;
}

export function CampoAcao(props: React.ComponentProps<typeof Campo>) {
  const erro = useErroDoCampo(props.name, props.erro);
  return <Campo {...props} erro={erro} />;
}

export function AreaAcao(props: React.ComponentProps<typeof Area>) {
  const erro = useErroDoCampo(props.name, props.erro);
  return <Area {...props} erro={erro} />;
}

export function SelecaoAcao(props: React.ComponentProps<typeof Selecao>) {
  const erro = useErroDoCampo(props.name, props.erro);
  return <Selecao {...props} erro={erro} />;
}

/** Moeda em centavos. O `name` do erro é o do campo escondido (`nome`). */
export function MoedaAcao(props: React.ComponentProps<typeof CampoMoeda>) {
  const erro = useErroDoCampo(props.nome, props.erro);
  return <CampoMoeda {...props} erro={erro} />;
}
