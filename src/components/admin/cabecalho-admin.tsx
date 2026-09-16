"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  ChevronDown,
  CircleUser,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";

import { sairStaff } from "@/app/acoes/staff";
import { BotaoIcone } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function BotaoSair() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-graf-600 transition-all",
        "hover:bg-jb-50 hover:text-jb-700",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden xl:inline">{pending ? "Saindo…" : "Sair"}</span>
      <span className="sr-only xl:hidden">Sair do painel</span>
    </button>
  );
}

export function CabecalhoAdmin({
  nome,
  email,
  papel,
  colapsado,
  aoAlternarColapso,
  aoAbrirGaveta,
}: {
  nome: string;
  email: string;
  papel: string;
  colapsado: boolean;
  aoAlternarColapso: () => void;
  aoAbrirGaveta: () => void;
}) {
  const router = useRouter();
  const busca = useRef<HTMLInputElement>(null);
  const [termo, setTermo] = useState("");

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null;
      const editando =
        alvo?.tagName === "INPUT" ||
        alvo?.tagName === "TEXTAREA" ||
        alvo?.tagName === "SELECT" ||
        alvo?.isContentEditable;
      if (editando) return;

      const atalhoBusca =
        evento.key === "/" ||
        ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k");

      if (!atalhoBusca || evento.altKey) return;
      evento.preventDefault();
      busca.current?.focus();
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b border-graf-200/70 bg-white/90 shadow-[0_1px_0_rgba(20,24,32,0.02)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-[112rem] items-center gap-2.5 px-3 sm:px-5 lg:px-6">
        <BotaoIcone
          rotulo="Abrir menu"
          onClick={aoAbrirGaveta}
          className="size-11 rounded-xl lg:hidden"
          variante="texto"
        >
          <Menu className="size-5" aria-hidden />
        </BotaoIcone>

        <BotaoIcone
          rotulo={colapsado ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-pressed={colapsado}
          onClick={aoAlternarColapso}
          className="hidden size-11 rounded-xl lg:inline-flex"
          variante="texto"
        >
          {colapsado ? (
            <PanelLeftOpen className="size-5" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden />
          )}
        </BotaoIcone>

        <form
          action="/admin/busca"
          method="get"
          role="search"
          onSubmit={(evento) => {
            evento.preventDefault();
            const valor = termo.trim();
            if (!valor) {
              busca.current?.focus();
              return;
            }
            router.push(`/admin/busca?q=${encodeURIComponent(valor)}`);
          }}
          className="relative min-w-0 flex-1 sm:max-w-xl lg:ml-1"
        >
          <label htmlFor="busca-admin" className="sr-only">
            Buscar em pedidos, clientes, produtos, chamados e ordens de serviço
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-graf-500"
            aria-hidden
          />
          <input
            id="busca-admin"
            ref={busca}
            name="q"
            type="search"
            autoComplete="off"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Buscar pedido, cliente, produto, OS…"
            className={cn(
              "h-11 w-full rounded-xl border border-graf-200 bg-graf-50/80 pl-10 pr-16 text-base text-graf-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:text-sm",
              "placeholder:text-graf-500",
              "transition-[background-color,border-color,box-shadow] hover:border-graf-300 hover:bg-white",
              "focus:border-jb-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/10",
            )}
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-graf-200 bg-white px-2 py-1 text-[0.6875rem] font-semibold text-graf-500 shadow-sm md:block"
          >
            ⌘K
          </kbd>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden h-7 w-px shrink-0 bg-graf-200/80 sm:block" aria-hidden />

          <Link
            href="/admin/conta"
            title="Minha conta"
            className={cn(
              "hidden items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all sm:flex",
              "hover:bg-graf-100/80",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jb-50 to-jb-100 text-[0.8125rem] font-bold text-jb-700 ring-1 ring-inset ring-jb-500/15"
            >
              {iniciais || "JB"}
            </span>
            <span className="hidden min-w-0 leading-tight md:block">
              <span className="block max-w-[11rem] truncate text-sm font-semibold text-graf-900">
                {nome}
              </span>
              <span
                className="block max-w-[11rem] truncate text-[0.75rem] text-graf-500"
                title={email}
              >
                {papel}
              </span>
            </span>
            <ChevronDown className="hidden size-4 text-graf-400 md:block" aria-hidden />
            <span className="sr-only">— abrir minha conta</span>
          </Link>

          <Link
            href="/admin/conta"
            aria-label="Minha conta"
            title="Minha conta"
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-graf-700 transition-colors sm:hidden",
              "hover:bg-graf-100 hover:text-jb-700",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            <CircleUser className="size-5" aria-hidden />
          </Link>

          <form action={sairStaff}>
            <BotaoSair />
          </form>
        </div>
      </div>
    </header>
  );
}
