import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="JB Soluções Odontológicas" className="h-14 w-auto" />
          <p className="text-sm text-slate-500">Painel de administração</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Acesso restrito. Todas as ações ficam registradas.
        </p>
      </div>
    </div>
  );
}
