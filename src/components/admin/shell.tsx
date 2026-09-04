"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { sair } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

export const MENU_ADMIN = [
  { href: "/admin", label: "Painel", exato: true },
  { href: "/admin/banners", label: "Banners da home" },
  { href: "/admin/home", label: "Chamadas da home" },
  { href: "/admin/paginas", label: "Páginas" },
  { href: "/admin/solucoes", label: "Soluções" },
  { href: "/admin/cadastros", label: "Cadastros" },
  { href: "/admin/midia", label: "Mídia" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/usuarios", label: "Usuários", somenteAdmin: true },
];

export function Shell({
  user,
  children,
}: {
  user: { name: string; email: string; role: "admin" | "editor" };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const itens = MENU_ADMIN.filter((i) => !i.somenteAdmin || user.role === "admin");
  const ativo = (item: (typeof MENU_ADMIN)[number]) =>
    item.exato ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Barra lateral */}
      <aside
        className={cn(
          "bg-slate-900 text-slate-300 lg:w-64 lg:shrink-0",
          aberto ? "block" : "hidden lg:block",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="" className="h-9 w-auto rounded bg-white p-1" />
          <span className="text-sm font-semibold text-white">Painel</span>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {itens.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setAberto(false)}
                  aria-current={ativo(item) ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition-colors",
                    ativo(item)
                      ? "bg-jb-500 font-semibold text-white"
                      : "hover:bg-white/10 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-white/10 pt-4">
            <Link
              href="/"
              target="_blank"
              className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10 hover:text-white"
            >
              Ver o site ↗
            </Link>
            <Link
              href="/admin/conta"
              className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10 hover:text-white"
            >
              Minha conta
            </Link>
          </div>
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm lg:hidden"
          >
            Menu
          </button>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:block">
              {user.name}
              {user.role === "admin" ? (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  administrador
                </span>
              ) : null}
            </span>
            <form action={sair}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm transition-colors hover:border-slate-400"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export function TituloPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        {descricao ? <p className="mt-1 text-sm text-slate-500">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}
