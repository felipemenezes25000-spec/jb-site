import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { FormularioEntrarStaff } from "@/components/admin/formulario-entrar-staff";
import { Logo } from "@/components/ui/logo";
import { sessaoStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesso da equipe ao painel interno da JB Soluções Odontológicas.",
};

/**
 * Tela de entrada da equipe.
 *
 * Fica dentro de /admin mas fora da guarda: o layout do painel devolve
 * `children` sem casca quando não há sessão (ver o comentário longo em
 * `(admin)/admin/layout.tsx`). Quem já está logado não tem o que fazer aqui e
 * volta para o painel.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ de?: string }>;
}) {
  const usuario = await sessaoStaff();
  if (usuario) redirect("/admin");

  const { de } = await searchParams;
  const destino = typeof de === "string" && de.startsWith("/admin") ? de : "/admin";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-graf-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo altura={44} prioridade />
          <h1 className="mt-6 text-2xl font-bold text-graf-950">Painel interno</h1>
          <p className="mt-1.5 text-sm text-graf-600">
            Entre com o e-mail da sua conta da equipe.
          </p>
        </div>

        <div className="rounded-xl border border-graf-200 bg-white p-6 shadow-card">
          <FormularioEntrarStaff destino={destino} />
        </div>

        <p className="mt-5 flex items-start justify-center gap-2 px-2 text-xs leading-relaxed text-graf-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>
            As tentativas de acesso são registradas. Depois de várias senhas erradas seguidas,
            o acesso deste e-mail fica bloqueado por 15 minutos.
          </span>
        </p>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-graf-600 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para o site
          </Link>
        </p>
      </div>
    </main>
  );
}
