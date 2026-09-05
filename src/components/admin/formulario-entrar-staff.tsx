"use client";

import { useActionState, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { entrarStaff, type EstadoEntrar } from "@/app/acoes/staff";
import { Botao } from "@/components/ui/button";
import { Campo, Marcador } from "@/components/ui/form";

/**
 * Entrada da equipe.
 *
 * A mensagem que volta do servidor é sempre genérica — este formulário não
 * tenta adivinhar se o problema foi o e-mail ou a senha, porque o servidor
 * também não conta.
 */
export function FormularioEntrarStaff({ destino = "/admin" }: { destino?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoEntrar, FormData>(entrarStaff, {});
  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="destino" value={destino} />

      <div aria-live="assertive" className="empty:hidden">
        {estado.erro ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-jb-200 bg-jb-50 px-3.5 py-3 text-sm font-medium text-jb-800"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{estado.erro}</span>
          </p>
        ) : null}
      </div>

      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoFocus
        required
        placeholder="voce@jbsolucoes.com.br"
        erro={estado.campo === "email" ? estado.erro : undefined}
      />

      <Campo
        rotulo="Senha"
        name="senha"
        type={mostrarSenha ? "text" : "password"}
        autoComplete="current-password"
        required
        erro={estado.campo === "senha" ? estado.erro : undefined}
      />

      <Marcador
        rotulo="Mostrar senha"
        checked={mostrarSenha}
        onChange={(evento) => setMostrarSenha(evento.target.checked)}
      />

      <Botao type="submit" larguraTotal tamanho="lg" carregando={enviando}>
        {enviando ? "Entrando…" : "Entrar no painel"}
      </Botao>

      <p className="text-center text-xs leading-relaxed text-graf-500">
        Acesso restrito à equipe da JB. Perdeu a senha? Peça a um administrador para gerar
        uma nova em Usuários.
      </p>
    </form>
  );
}
