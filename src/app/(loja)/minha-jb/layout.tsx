import Link from "next/link";
import { Bell, LogOut, UserRound } from "lucide-react";

import { sairCliente } from "@/app/acoes/cliente";
import { Logo } from "@/components/ui/logo";
import { exigirCliente } from "@/lib/auth-cliente";
import { MENU_CLIENTE } from "@/lib/navegacao";
import { prisma } from "@/lib/prisma";

export default async function MinhaJbLayout({ children }: { children: React.ReactNode }) {
  const cliente = await exigirCliente("/minha-jb");
  const naoLidas = await prisma.notification.count({ where: { customerId: cliente.id, readAt: null } });

  return (
    <div className="bg-graf-50/70">
      <div className="container-jb py-6 lg:py-9">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-graf-950"><Logo altura={25} /></span>
            <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Área da Clínica</p><p className="mt-1 text-sm font-extrabold text-graf-950">{cliente.name}</p><p className="text-xs text-graf-500">{cliente.email}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/minha-jb/notificacoes" className="relative flex size-10 items-center justify-center rounded-xl border border-graf-200 text-graf-700 hover:bg-graf-50" aria-label="Notificações"><Bell className="size-4.5" aria-hidden />{naoLidas > 0 ? <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-jb-500 px-1 text-[9px] font-bold leading-4 text-white">{naoLidas > 9 ? "9+" : naoLidas}</span> : null}</Link>
            <form action={sairCliente}><button className="inline-flex h-10 items-center gap-2 rounded-xl border border-graf-200 px-3.5 text-xs font-extrabold text-graf-700 hover:bg-graf-50"><LogOut className="size-4" aria-hidden /> Sair</button></form>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[15.5rem_1fr]">
          <aside className="h-fit overflow-hidden rounded-2xl bg-graf-950 p-3 text-white lg:sticky lg:top-32">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"><UserRound className="size-4 text-jb-400" aria-hidden /><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-graf-500">Minha conta</p><p className="text-xs font-bold text-white">Gestão da clínica</p></div></div>
            <nav aria-label="Área da Clínica"><ul className="space-y-0.5">{MENU_CLIENTE.map((item) => <li key={item.href}><Link href={item.href} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-graf-400 transition hover:bg-white/8 hover:text-white">{item.rotulo}</Link></li>)}</ul></nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
