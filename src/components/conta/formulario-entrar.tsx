"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const formulario = useRef<HTMLFormElement>(null);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  /* Erro de campo leva o cursor até ele: quem usa teclado ou leitor de tela
     ouve o rótulo, o estado inválido e a mensagem de uma vez só. */
  useEffect(() => {
    if (!estado.campo) return;
    const alvo = formulario.current?.elements.namedItem(estado.campo);
    if (alvo instanceof HTMLElement) alvo.focus();
  }, [estado]);

  return (
    <form ref={formulario} action={acao} noValidate className="space-y-5">
      <input type="hidden" name="destino" value={destino} />

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
        ajuda="Use o e-mail informado no cadastro."
        erro={erroDe("email")}
      />

      <div>
        {/* O botão de ver a senha fica dentro da caixa. 26px é a altura exata
            do rótulo de `Campo` (linha de 20px + 6px de margem), então os 44px
            do botão cobrem exatamente os 44px do campo. */}
        <div className="relative [&_input]:pr-12">
          <Campo
            rotulo="Senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            erro={erroDe("senha")}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-pressed={verSenha}
            aria-label="Mostrar senha"
            title={verSenha ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-1 top-[26px] flex size-11 items-center justify-center rounded-lg text-graf-500 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            {verSenha ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>

        <div className="mt-2 flex justify-end">
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
