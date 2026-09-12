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
 * de salvar não fuja da tela em formulário longo.
 *
 * O recuo negativo sangra a barra até a borda da página, e por isso precisa
 * espelhar o respiro dela — `px-4 sm:px-5 lg:px-6 xl:px-7 2xl:px-8`, em
 * `casca.tsx`. Estava `-mx-4 sm:-mx-6`: os dois casavam quando a página tinha
 * dois degraus e deixaram de casar quando ela ganhou cinco. A partir de 640px a
 * barra passava a ser mais larga que a própria página e vazava 4px para fora da
 * tela — era o último problema de responsividade do painel, em `/admin` e
 * `/admin/configuracoes`.
 *
 * Espelhar degrau a degrau elimina a classe de erro, não só a ocorrência: se o
 * respiro da página mudar de novo, a divergência aparece lado a lado aqui.
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
    <BarraForm ajuda={aviso} className={cn(
        "-mx-4 px-4 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 xl:-mx-7 xl:px-7 2xl:-mx-8 2xl:px-8",
        className,
      )}>
      {children}
    </BarraForm>
  );
}
