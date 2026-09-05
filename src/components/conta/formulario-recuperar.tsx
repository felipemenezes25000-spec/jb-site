"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";

import { pedirRecuperacao, type EstadoConta } from "@/app/acoes/conta";
import { Botao, LinkBotao, classesBotao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";

/**
 * Pedido de redefinição de senha.
 *
 * A resposta é sempre a mesma, exista ou não a conta — por isso a tela de
 * sucesso não afirma que o e-mail foi enviado para aquela pessoa, e sim que
 * ele chega *se* o endereço estiver cadastrado. A mensagem vem inteira do
 * servidor, para as duas telas nunca contarem histórias diferentes.
 */
export function FormularioRecuperar({ emailInicial = "" }: { emailInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoConta, FormData>(pedirRecuperacao, {});
  const formulario = useRef<HTMLFormElement>(null);
  const confirmacao = useRef<HTMLDivElement>(null);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  /* O formulário some e o aviso entra no lugar dele: sem levar o foco junto,
     quem usa leitor de tela continuaria ouvindo um campo que não existe mais. */
  useEffect(() => {
    if (estado.ok) {
      confirmacao.current?.focus();
      return;
    }
    if (!estado.campo) return;
    const alvo = formulario.current?.elements.namedItem(estado.campo);
    if (alvo instanceof HTMLElement) alvo.focus();
  }, [estado]);

  if (estado.ok) {
    return (
      <div className="space-y-6">
        <div
          ref={confirmacao}
          tabIndex={-1}
          className="flex gap-3.5 rounded-xl border border-ok-500/25 bg-ok-50 p-5 outline-none"
        >
          <MailCheck className="mt-0.5 size-5 shrink-0 text-ok-700" aria-hidden />
          <div>
            <p className="font-semibold text-graf-900">Pedido registrado</p>
            <p className="mt-1.5 text-sm leading-relaxed text-graf-700">{estado.ok}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <LinkBotao href="/entrar" variante="secundario">
            Voltar para entrar
          </LinkBotao>
          {/* âncora comum de propósito: recarregar a página é o que devolve o
              formulário em branco, já que a ação não tem como ser rebobinada */}
          <a href="/recuperar-senha" className={classesBotao("texto", "md")}>
            Usar outro e-mail
          </a>
        </div>
      </div>
    );
  }

  return (
    <form ref={formulario} action={acao} noValidate className="space-y-5">
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
        rotulo="E-mail da conta"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={emailInicial}
        required
        autoFocus
        placeholder="voce@clinica.com.br"
        ajuda="O link de redefinição vale por 1 hora."
        erro={erroDe("email")}
      />

      <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
        {enviando ? "Enviando…" : "Enviar link de redefinição"}
      </Botao>

      <p className="text-sm text-graf-600">
        Lembrou a senha?{" "}
        <Link
          href="/entrar"
          className="font-semibold text-jb-700 underline-offset-4 hover:underline"
        >
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}
