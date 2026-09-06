"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import { MensagemDoFormulario, erroDoCampo } from "@/components/admin/conteudo/formulario-base";
import { Botao } from "@/components/ui/button";
import { Area } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/**
 * Registro da autorização do cliente.
 *
 * Formulário próprio, com um campo obrigatório: como a autorização foi
 * obtida. Uma caixinha "o cliente autorizou" no formulário de edição faria
 * disso um campo como outro qualquer — e seis meses depois ninguém saberia
 * dizer quem autorizou, quando, nem por qual canal.
 */
const VAZIO: EstadoAcao = {};

export function FormularioAutorizacao({
  acao,
  caseId,
  className,
}: {
  acao: AcaoDeFormulario;
  caseId: string;
  className?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  return (
    <form action={executar} className={cn("space-y-3", className)}>
      <MensagemDoFormulario estado={estado} tituloDoErro="Não foi possível registrar" />
      <input type="hidden" name="id" value={caseId} />

      <Area
        rotulo="Como a autorização foi obtida"
        name="consentNote"
        rows={3}
        maxLength={400}
        required
        erro={erroDoCampo(estado, "consentNote")}
        ajuda="Canal, data e quem autorizou. Ex.: por e-mail de 12/08, respondido pela Dra. responsável técnica da clínica."
      />

      <Botao type="submit" variante="secundario" tamanho="sm" carregando={pendente}>
        <ShieldCheck className="size-4" aria-hidden />
        Registrar autorização
      </Botao>
    </form>
  );
}
