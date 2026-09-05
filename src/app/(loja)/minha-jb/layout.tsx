import Link from "next/link";
import { Bell, LogOut } from "lucide-react";

import { sairCliente } from "@/app/acoes/cliente";
import { MenuAreaClinica } from "@/components/cliente/menu-area-clinica";
import { Logo } from "@/components/ui/logo";
import { exigirCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";

export default async function MinhaJbLayout({ children }: { children: React.ReactNode }) {
  const cliente = await exigirCliente("/minha-jb");
  const naoLidas = await prisma.notification.count({
    where: { customerId: cliente.id, readAt: null },
  });

  return (
    <div className="min-h-[70vh] bg-graf-50/70">
      <div className="container-jb py-5 sm:py-6 lg:py-9">
        <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-graf-200 bg-white p-4 shadow-card sm:mb-6 sm:p-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-950 sm:size-11">
              <Logo altura={23} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-jb-600 sm:text-xs">
                Área da Clínica
              </p>
              <p className="mt-0.5 truncate text-sm font-extrabold text-graf-950">{cliente.name}</p>
              <p className="hidden truncate text-xs text-graf-500 sm:block">{cliente.email}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/minha-jb/notificacoes"
              className="relative flex size-10 items-center justify-center rounded-xl border border-graf-200 text-graf-700 transition hover:bg-graf-50"
              aria-label={naoLidas > 0 ? `${naoLidas} notificações não lidas` : "Notificações"}
            >
              <Bell className="size-4.5" aria-hidden />
              {naoLidas > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-jb-500 px-1 text-[9px] font-bold leading-4 text-white">
                  {naoLidas > 9 ? "9+" : naoLidas}
                </span>
              ) : null}
            </Link>
            <form action={sairCliente}>
              <button
                className="inline-flex size-10 items-center justify-center rounded-xl border border-graf-200 text-graf-700 transition hover:bg-graf-50 sm:w-auto sm:px-3.5"
                aria-label="Sair da conta"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="ml-2 hidden text-xs font-extrabold sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mb-5 lg:hidden">
          <MenuAreaClinica />
        </div>

        <div className="grid gap-6 lg:grid-cols-[16.5rem_1fr] lg:gap-8">
          <div className="hidden lg:block">
            <MenuAreaClinica />
          </div>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
