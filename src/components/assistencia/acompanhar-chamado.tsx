"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { liberarChamado, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";

/**
 * Porta de entrada do acompanhamento sem conta.
 *
 * O número do chamado é curto para poder ser ditado por telefone — por isso
 * ele sozinho não abre nada. Quem chega sem sessão repete o e-mail ou o
 * telefone informados na abertura, e só então o servidor grava o comprovante
 * de acesso.
 *
 * A mensagem de erro é sempre a mesma, dê o número existente ou não: quem
 * ficasse testando números descobriria quais existem.
 */
export function AcompanharChamado({ numero }: { numero: string }) {
  const [estado, acao, pendente] = useActionState<EstadoAssistencia, FormData>(
    liberarChamado,
    {},
  );

  return (
    <form action={acao} className="mx-auto w-full max-w-md">
      <input type="hidden" name="numero" value={numero} />

      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
        <KeyRound className="size-5" aria-hidden />
      </div>

      <h1 className="text-title leading-tight">Acompanhar o chamado {numero}</h1>
      <p className="mt-3 text-base leading-relaxed text-graf-600">
        Para proteger os dados do atendimento, confirme o e-mail ou o telefone informado
        quando o chamado foi aberto.
      </p>

      <Campo
        rotulo="E-mail ou telefone do chamado"
        name="contato"
        required
        autoComplete="email"
        placeholder="voce@clinica.com.br ou (11) 98888-7777"
        erro={estado.campo === "contato" ? estado.erro : undefined}
        className="mt-6"
      />

      <div aria-live="polite" className="mt-4 empty:mt-0">
        {estado.erro && estado.campo !== "contato" ? (
          <Aviso tom="erro">{estado.erro}</Aviso>
        ) : null}
      </div>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={pendente} className="mt-6">
        {pendente ? "Conferindo…" : "Ver o chamado"}
      </Botao>

      <p className="mt-5 text-sm leading-relaxed text-graf-500">
        Tem conta na JB? Entre e todos os seus chamados aparecem juntos, sem precisar do
        número.
      </p>
    </form>
  );
}
