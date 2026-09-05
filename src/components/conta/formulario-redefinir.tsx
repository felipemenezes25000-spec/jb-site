"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { redefinirSenha, type EstadoConta } from "@/app/acoes/conta";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";

/**
 * Troca da senha a partir do link recebido por e-mail.
 *
 * O token só é conferido no servidor, e é consumido de uma vez: link usado ou
 * vencido devolve a mesma mensagem e a oferta de pedir outro.
 */
export function FormularioRedefinir({ token }: { token: string }) {
  const [estado, acao, enviando] = useActionState<EstadoConta, FormData>(redefinirSenha, {});
  const [verSenha, setVerSenha] = useState(false);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroDoToken = erroDe("token");
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  return (
    <form action={acao} noValidate className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <p aria-live="polite" className="sr-only">
        {estado.campo && estado.campo !== "token" ? estado.erro : ""}
      </p>

      {erroDoToken ? (
        <div
          role="alert"
          className="rounded-xl border border-jb-200 bg-jb-50 p-5 text-sm leading-relaxed text-jb-800"
        >
          <p className="flex items-start gap-2.5 font-semibold">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{erroDoToken}</span>
          </p>
          <LinkBotao href="/recuperar-senha" variante="secundario" tamanho="sm" className="mt-4">
            Pedir um novo link
          </LinkBotao>
        </div>
      ) : null}

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      <Campo
        rotulo="Nova senha"
        name="senha"
        type={verSenha ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        autoFocus
        ajuda="Mínimo de 8 caracteres."
        erro={erroDe("senha")}
      />

      <Campo
        rotulo="Repita a nova senha"
        name="confirmacao"
        type={verSenha ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        erro={erroDe("confirmacao")}
      />

      <button
        type="button"
        onClick={() => setVerSenha((v) => !v)}
        aria-pressed={verSenha}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-graf-600 transition-colors hover:text-jb-700"
      >
        {verSenha ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        {verSenha ? "Ocultar senhas" : "Mostrar senhas"}
      </button>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
        {enviando ? "Salvando…" : "Salvar nova senha e entrar"}
      </Botao>
    </form>
  );
}
