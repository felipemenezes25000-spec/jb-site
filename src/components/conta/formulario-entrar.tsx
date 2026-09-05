"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { entrarCliente, type EstadoConta } from "@/app/acoes/conta";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";

/**
 * Login do cliente. O servidor devolve sempre a mesma mensagem para e-mail
 * inexistente e senha errada — a tela não pode virar um verificador de contas.
 */
export function FormularioEntrar({
  destino,
  emailInicial = "",
}: {
  destino: string;
  emailInicial?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoConta, FormData>(entrarCliente, {});
  const [verSenha, setVerSenha] = useState(false);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  return (
    <form action={acao} noValidate className="space-y-5">
      <input type="hidden" name="destino" value={destino} />

      {/* erro de campo não fica em região viva; aqui ele é anunciado uma vez */}
      <p aria-live="polite" className="sr-only">
        {estado.campo ? estado.erro : ""}
      </p>

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
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={emailInicial}
        required
        autoFocus
        placeholder="voce@clinica.com.br"
        erro={erroDe("email")}
      />

      <div>
        <Campo
          rotulo="Senha"
          name="senha"
          type={verSenha ? "text" : "password"}
          autoComplete="current-password"
          required
          erro={erroDe("senha")}
        />

        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-pressed={verSenha}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-graf-600 transition-colors hover:text-jb-700"
          >
            {verSenha ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
            {verSenha ? "Ocultar senha" : "Mostrar senha"}
          </button>

          <Link
            href="/recuperar-senha"
            className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-jb-700 underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
