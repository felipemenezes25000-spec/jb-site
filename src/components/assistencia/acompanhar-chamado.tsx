"use client";

import { useActionState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";

import { liberarChamado, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Cartao } from "@/components/ui/data";
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
    <Cartao className="w-full max-w-lg p-7 sm:p-9">
      <form action={acao}>
        <input type="hidden" name="numero" value={numero} />

        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100"
        >
          <KeyRound className="size-5" />
        </span>

        <p aria-hidden className="label-mono mt-7 uppercase text-graf-500">
          Protocolo do chamado
        </p>
        <h1 className="tabular mt-2 font-mono text-3xl font-bold tracking-tight text-graf-950">
          <span className="sr-only">Acompanhar o chamado </span>
          {numero}
        </h1>

        <p className="mt-5 text-[0.9375rem] leading-relaxed text-graf-600">
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
          className="mt-7"
        />

        <div aria-live="polite" className="mt-4 empty:mt-0">
          {estado.erro && estado.campo !== "contato" ? (
            <Aviso tom="erro">{estado.erro}</Aviso>
          ) : null}
        </div>

        <Botao type="submit" tamanho="lg" larguraTotal carregando={pendente} className="mt-6">
          {pendente ? "Conferindo…" : "Ver o chamado"}
        </Botao>

        <p className="mt-4 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-graf-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
          <span>
            Quem tem só o número do chamado não vê os dados do atendimento — nem o
            endereço, nem o contato da clínica.
          </span>
        </p>

        <p className="mt-7 border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-500">
          Tem conta na JB?{" "}
          <Link
            href="/entrar?destino=/minha-jb/assistencia"
            className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
          >
            Entre na Área da Clínica
          </Link>{" "}
          e todos os seus chamados aparecem juntos, sem precisar do número.
        </p>
      </form>
    </Cartao>
  );
}
