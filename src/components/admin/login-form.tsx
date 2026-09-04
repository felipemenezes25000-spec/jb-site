"use client";

import { useActionState } from "react";

import { entrar, type FormState } from "@/app/admin/actions";
import { Aviso, Campo, Salvar } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(entrar, {});

  return (
    <form action={action} className="space-y-5">
      <Campo
        label="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
      />
      <Campo
        label="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
      />
      <Aviso erro={state.erro} />
      <Salvar>Entrar</Salvar>
    </form>
  );
}
