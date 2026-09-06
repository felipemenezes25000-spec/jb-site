import { CircleAlert, CircleCheck } from "lucide-react";

import { BarraForm, BlocoForm, GrupoCampos } from "@/components/admin/pagina";
import { cn } from "@/lib/utils";

/* ============================================================================
   Peças comuns dos formulários do catálogo

   Sem hooks e sem evento: são só marcação. Por isso servem tanto dentro de um
   formulário cliente quanto direto numa página de servidor.

   A moldura, o grupo de campos e a barra de salvar vêm de `admin/pagina.tsx`,
   que é a mesma fonte das telas comerciais e de conteúdo — o que muda aqui é
   só o recuo negativo da barra, que precisa casar com o respiro do bloco.

   `RegiaoEstado` é o único lugar onde a resposta do servidor aparece — uma
   região viva que anuncia erro e sucesso para quem usa leitor de tela, com
   ícone e texto (nunca apenas a cor). O desenho é o mesmo do `Aviso` do kit,
   para que a resposta de salvar não pareça outra coisa em cada tela.
   ============================================================================ */

export type RespostaForm = { erro?: string; ok?: boolean; mensagem?: string };

export function RegiaoEstado({ estado, className }: { estado: RespostaForm; className?: string }) {
  return (
    <div aria-live="polite" className={cn("empty:hidden", className)}>
      {estado.erro ? (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-xl bg-jb-50 px-4 py-3.5 text-sm font-medium text-jb-800 ring-1 ring-inset ring-jb-500/20"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-jb-700" aria-hidden />
          <span className="leading-relaxed">{estado.erro}</span>
        </p>
      ) : estado.ok && estado.mensagem ? (
        <p className="flex items-start gap-3 rounded-xl bg-ok-50 px-4 py-3.5 text-sm font-medium text-ok-700 ring-1 ring-inset ring-ok-500/20">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span className="leading-relaxed">{estado.mensagem}</span>
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
    <GrupoCampos titulo={titulo} descricao={descricao} className={className}>
      {children}
    </GrupoCampos>
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
        "grid gap-x-5 gap-y-4",
        colunas === 1
          ? "grid-cols-1"
          : colunas === 2
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Barra de ação do formulário. Fica grudada no fim do bloco para que o botão
 * de salvar não fuja da tela num formulário comprido. Os recuos negativos
 * acompanham o respiro do `Bloco` — mudou um, muda o outro.
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
    <BarraForm
      ajuda={ajuda}
      className={cn("-mx-5 mt-2 px-5 sm:-mx-6 sm:px-6", className)}
    >
      {children}
    </BarraForm>
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
    <BlocoForm titulo={titulo} descricao={descricao} espacado={false} className={className}>
      {children}
    </BlocoForm>
  );
}
