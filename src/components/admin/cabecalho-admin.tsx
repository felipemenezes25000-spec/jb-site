"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  Bell,
  ChevronDown,
  CircleHelp,
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
      aria-label={pending ? "Saindo do painel" : "Sair do painel"}
      title={pending ? "Saindo…" : "Sair"}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg text-graf-500 transition-colors",
        "hover:bg-jb-50 hover:text-jb-700",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <LogOut className="size-[17px]" aria-hidden />
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
    <header className="sticky top-0 z-30 border-b border-graf-200/80 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/88">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-6 xl:px-7 2xl:px-8">
        <BotaoIcone
          rotulo="Abrir menu"
          onClick={aoAbrirGaveta}
          className="size-10 rounded-lg lg:hidden"
          variante="texto"
        >
          <Menu className="size-[18px]" aria-hidden />
        </BotaoIcone>

        <BotaoIcone
          rotulo={colapsado ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-pressed={colapsado}
          onClick={aoAlternarColapso}
          className="hidden size-9 rounded-lg lg:inline-flex"
          variante="texto"
        >
          {colapsado ? (
            <PanelLeftOpen className="size-[17px]" aria-hidden />
          ) : (
            <PanelLeftClose className="size-[17px]" aria-hidden />
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
          className="relative min-w-0 flex-1 sm:max-w-[38rem]"
        >
          <label htmlFor="busca-admin" className="sr-only">
            Buscar em pedidos, clientes, produtos, chamados e ordens de serviço
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-graf-500"
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
              "h-9 w-full rounded-lg border border-graf-200 bg-[#f7f8fa] pl-9 pr-14 text-sm text-graf-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
              "placeholder:text-graf-500",
              "transition-[background-color,border-color,box-shadow] hover:border-graf-300 hover:bg-white",
              "focus:border-jb-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/8",
            )}
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-graf-200 bg-white px-1.5 py-0.5 text-[0.625rem] font-semibold text-graf-500 shadow-sm md:block"
          >
            ⌘ K
          </kbd>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/admin/mensagens"
            aria-label="Notificações e mensagens"
            className="relative hidden size-10 items-center justify-center rounded-lg text-graf-600 transition-colors hover:bg-graf-100 hover:text-graf-950 sm:flex"
          >
            <Bell className="size-[18px]" aria-hidden />
          </Link>

          <Link
            href="/admin/suporte"
            aria-label="Ajuda"
            className="hidden size-10 items-center justify-center rounded-lg text-graf-600 transition-colors hover:bg-graf-100 hover:text-graf-950 md:flex"
          >
            <CircleHelp className="size-[18px]" aria-hidden />
          </Link>

          <span className="mx-1 hidden h-6 w-px shrink-0 bg-graf-200 sm:block" aria-hidden />

          <Link
            href="/admin/conta"
            title="Minha conta"
            className={cn(
              "hidden h-11 items-center gap-2.5 rounded-lg px-1.5 pr-2 transition-colors sm:flex",
              "hover:bg-graf-100/80",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-jb-50 to-[#ffe4e6] text-[0.72rem] font-bold text-jb-700 ring-1 ring-inset ring-jb-500/10"
            >
              {iniciais || "JB"}
            </span>
            <span className="hidden min-w-0 leading-tight lg:block">
              <span className="block max-w-[10rem] truncate text-[0.8125rem] font-semibold text-graf-900">
                {nome}
              </span>
              <span className="block max-w-[10rem] truncate text-[0.65rem] text-graf-500" title={email}>
                {papel}
              </span>
            </span>
            <ChevronDown className="hidden size-3.5 text-graf-400 lg:block" aria-hidden />
            <span className="sr-only">— abrir minha conta</span>
          </Link>

          <Link
            href="/admin/conta"
            aria-label="Minha conta"
            title="Minha conta"
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-graf-700 transition-colors sm:hidden",
              "hover:bg-graf-100 hover:text-jb-700",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            <CircleUser className="size-[18px]" aria-hidden />
          </Link>

          <form action={sairStaff}>
            <BotaoSair />
          </form>
        </div>
      </div>
    </header>
  );
}
