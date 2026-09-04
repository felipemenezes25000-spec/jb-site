"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { excluirUsuario, salvarUsuario, type FormState } from "@/app/admin/actions";
import { Alternar, Aviso, Campo, Salvar, Selecao } from "@/components/admin/ui";

export type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export function UsuarioForm({ usuario, ehVoce }: { usuario: Usuario; ehVoce: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await salvarUsuario(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        <input type="hidden" name="id" value={usuario.id} />

        <div className="grid gap-5 md:grid-cols-2">
          <Campo label="Nome" name="name" defaultValue={usuario.name} required />
          <Campo label="E-mail" name="email" type="email" defaultValue={usuario.email} required />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Selecao label="Permissão" name="role" defaultValue={usuario.role}>
            <option value="editor">Editor — edita conteúdo</option>
            <option value="admin">Administrador — também exclui e gerencia usuários</option>
          </Selecao>
          <Campo
            label={usuario.id ? "Nova senha" : "Senha"}
            name="senha"
            type="password"
            autoComplete="new-password"
            hint={usuario.id ? "Deixe vazio para manter a atual." : "Mínimo de 8 caracteres."}
          />
        </div>

        <Alternar
          label="Ativo"
          name="active"
          defaultChecked={usuario.active}
          hint="Desmarque para bloquear o acesso sem excluir o usuário."
        />

        <Aviso erro={state.erro} ok={state.ok} />
        <Salvar>{usuario.id ? "Salvar usuário" : "Criar usuário"}</Salvar>
      </form>

      {usuario.id && !ehVoce ? (
        <form
          action={async () => {
            await excluirUsuario(usuario.id);
            toast.success("Usuário excluído.");
          }}
        >
          <button
            type="submit"
            className="text-sm text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            Excluir este usuário
          </button>
        </form>
      ) : null}
    </div>
  );
}
