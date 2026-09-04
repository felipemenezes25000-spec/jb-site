"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { trocarPropriaSenha, type FormState } from "@/app/admin/actions";
import { Aviso, Campo, Salvar } from "@/components/admin/ui";

export function SenhaForm() {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await trocarPropriaSenha(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  return (
    <form action={action} className="max-w-md space-y-5">
      <Campo label="Senha atual" name="atual" type="password" autoComplete="current-password" required />
      <Campo
        label="Nova senha"
        name="nova"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 8 caracteres."
      />
      <Aviso erro={state.erro} ok={state.ok} />
      <Salvar>Alterar senha</Salvar>
    </form>
  );
}
