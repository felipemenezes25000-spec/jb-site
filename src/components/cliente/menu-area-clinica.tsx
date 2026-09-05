"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  FileText,
  FolderOpen,
  Heart,
  LayoutDashboard,
  MapPin,
  PackageCheck,
  ShoppingBag,
  UserRound,
  Wrench,
} from "lucide-react";

import { MENU_CLIENTE } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

const ICONES = {
  "/minha-jb": LayoutDashboard,
  "/minha-jb/pedidos": ShoppingBag,
  "/minha-jb/equipamentos": PackageCheck,
  "/minha-jb/assistencia": Wrench,
  "/minha-jb/manutencoes": CalendarClock,
  "/minha-jb/orcamentos": FileText,
  "/minha-jb/documentos": FolderOpen,
  "/minha-jb/favoritos": Heart,
  "/minha-jb/enderecos": MapPin,
  "/minha-jb/perfil": UserRound,
} as const;

function estaAtivo(pathname: string, href: string) {
  if (href === "/minha-jb") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MenuAreaClinica() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Navegação da Área da Clínica"
        className="-mx-1 overflow-x-auto pb-1 scrollbar-none lg:hidden"
      >
        <ul className="flex min-w-max gap-2 px-1">
          {MENU_CLIENTE.map((item) => {
            const Icone = ICONES[item.href as keyof typeof ICONES] ?? LayoutDashboard;
            const ativo = estaAtivo(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-extrabold transition",
                    ativo
                      ? "border-graf-950 bg-graf-950 text-white shadow-card"
                      : "border-graf-200 bg-white text-graf-600 hover:border-graf-300 hover:text-graf-950",
                  )}
                >
                  <Icone className={cn("size-4", ativo ? "text-jb-400" : "text-graf-400")} aria-hidden />
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <aside className="hidden h-fit overflow-hidden rounded-2xl bg-graf-950 p-3 text-white shadow-raised lg:sticky lg:top-32 lg:block">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <UserRound className="size-4 text-jb-400" aria-hidden />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-graf-500">Minha conta</p>
            <p className="text-xs font-bold text-white">Gestão da clínica</p>
          </div>
        </div>

        <nav aria-label="Área da Clínica">
          <ul className="space-y-0.5">
            {MENU_CLIENTE.map((item) => {
              const Icone = ICONES[item.href as keyof typeof ICONES] ?? LayoutDashboard;
              const ativo = estaAtivo(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      ativo
                        ? "bg-white text-graf-950 shadow-card"
                        : "text-graf-400 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icone className={cn("size-4 shrink-0", ativo ? "text-jb-600" : "text-graf-500")} aria-hidden />
                    <span>{item.rotulo}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
