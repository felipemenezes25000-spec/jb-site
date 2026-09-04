import { TituloPagina } from "@/components/admin/shell";
import { Etiqueta } from "@/components/admin/ui";
import { UsuarioForm } from "@/components/admin/usuario-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const atual = await requireAdmin();
  const usuarios = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <TituloPagina
        titulo="Usuários"
        descricao="Quem pode entrar no painel. As senhas ficam guardadas com hash bcrypt."
      />

      <div className="space-y-4">
        {usuarios.map((usuario) => (
          <details
            key={usuario.id}
            className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-slate-50">
              <span className="font-semibold text-slate-900">{usuario.name}</span>
              <span className="text-sm text-slate-500">{usuario.email}</span>
              {usuario.role === "admin" ? <Etiqueta tom="ambar">administrador</Etiqueta> : null}
              {!usuario.active ? <Etiqueta tom="cinza">bloqueado</Etiqueta> : null}
              <span className="ml-auto text-xs text-slate-400">
                {usuario.lastLoginAt
                  ? `último acesso em ${formatDateTime(usuario.lastLoginAt)}`
                  : "nunca acessou"}
              </span>
            </summary>
            <div className="border-t border-slate-100 p-6">
              <UsuarioForm
                ehVoce={usuario.id === atual.id}
                usuario={{
                  id: usuario.id,
                  name: usuario.name,
                  email: usuario.email,
                  role: usuario.role,
                  active: usuario.active,
                }}
              />
            </div>
          </details>
        ))}

        <details className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
            + novo usuário
          </summary>
          <div className="border-t border-slate-100 p-6">
            <UsuarioForm
              ehVoce={false}
              usuario={{ id: "", name: "", email: "", role: "editor", active: true }}
            />
          </div>
        </details>
      </div>
    </>
  );
}
