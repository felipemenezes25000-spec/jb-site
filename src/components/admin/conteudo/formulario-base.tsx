"use client";

import { BarraForm, BlocoForm } from "@/components/admin/pagina";
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
    <BlocoForm titulo={titulo} descricao={descricao} className={className}>
      {children}
    </BlocoForm>
  );
}

/**
 * Barra de ações do formulário. Fica colada no fim da janela para que o botão
 * de salvar não fuja da tela em formulário longo. Os recuos negativos casam com
 * o respiro da página do painel, e não com o do bloco.
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
    <BarraForm ajuda={aviso} className={cn("-mx-4 px-4 sm:-mx-6 sm:px-6", className)}>
      {children}
    </BarraForm>
  );
}
