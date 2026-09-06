"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import { MensagemDoFormulario, erroDoCampo } from "@/components/admin/conteudo/formulario-base";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/**
 * Cadastro de uma fonte do artigo.
 *
 * Fica fora do formulário principal de propósito: adicionar uma fonte não pode
 * exigir salvar o texto inteiro, e salvar o texto não pode apagar uma fonte
 * recém-adicionada. São duas escritas independentes porque são duas decisões
 * independentes.
 */
const VAZIO: EstadoAcao = {};

export function FormularioFonte({
  acao,
  articleId,
  className,
}: {
  acao: AcaoDeFormulario;
  articleId: string;
  className?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  return (
    <form action={executar} className={cn("space-y-3", className)}>
      <MensagemDoFormulario estado={estado} tituloDoErro="Não foi possível adicionar" />
      <input type="hidden" name="articleId" value={articleId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          rotulo="Fonte"
          name="title"
          maxLength={200}
          required
          erro={erroDoCampo(estado, "title")}
          placeholder="Manual do usuário Cristófoli Vitale Class, rev. 2023"
        />
        <Campo
          rotulo="Endereço (opcional)"
          name="url"
          type="url"
          maxLength={500}
          erro={erroDoCampo(estado, "url")}
          placeholder="https://…"
        />
        <Campo
          rotulo="Observação (opcional)"
          name="note"
          maxLength={300}
          className="sm:col-span-2"
          ajuda="Em que parte da fonte está o que o artigo afirma."
        />
      </div>

      <Botao type="submit" variante="secundario" tamanho="sm" carregando={pendente}>
        <Plus className="size-4" aria-hidden />
        Adicionar fonte
      </Botao>
    </form>
  );
}
