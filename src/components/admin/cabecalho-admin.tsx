"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
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

/**
 * Barra superior do backoffice.
 *
 * Faixa única de 56px com o que se usa o tempo todo: abrir/fechar o menu,
 * busca global e identidade de quem está logado. Sem título decorativo — o
 * título é da página, não do topo.
 */

function BotaoSair() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        // `min-w-11`: abaixo de sm só o ícone aparece e o botão ficava com
        // 40px de largura, 4px abaixo do alvo mínimo de toque
        "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-graf-700 transition-colors",
        "hover:bg-graf-100 hover:text-jb-700",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <LogOut className="size-4" aria-hidden />
      <span className="hidden sm:inline">{pending ? "Saindo…" : "Sair"}</span>
      <span className="sr-only sm:hidden">Sair do painel</span>
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

  // "/" leva o foco para a busca, como em qualquer painel que se use de verdade
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "/" || evento.metaKey || evento.ctrlKey || evento.altKey) return;
      const alvo = evento.target as HTMLElement | null;
      const editando =
        alvo?.tagName === "INPUT" ||
        alvo?.tagName === "TEXTAREA" ||
        alvo?.tagName === "SELECT" ||
        alvo?.isContentEditable;
      if (editando) return;
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
    <header className="sticky top-0 z-30 border-b border-graf-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <BotaoIcone
          rotulo="Abrir menu"
          onClick={aoAbrirGaveta}
          className="size-11 lg:hidden"
          variante="texto"
        >
          <Menu className="size-5" aria-hidden />
        </BotaoIcone>

        <BotaoIcone
          rotulo={colapsado ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-pressed={colapsado}
          onClick={aoAlternarColapso}
          className="hidden size-11 lg:inline-flex"
          variante="texto"
        >
          {colapsado ? (
            <PanelLeftOpen className="size-5" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden />
          )}
        </BotaoIcone>

        {/* Busca global: funciona por navegação nativa mesmo sem JavaScript */}
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
          className="relative min-w-0 flex-1 sm:max-w-md"
        >
          <label htmlFor="busca-admin" className="sr-only">
            Buscar em pedidos, clientes, produtos, chamados e ordens de serviço
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graf-500"
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
              /* 44px: a busca é o primeiro controle do painel no celular. */
              "h-11 w-full rounded-lg border border-graf-450 bg-graf-50 pl-9 pr-12 text-base sm:text-sm text-graf-900",
              "placeholder:text-graf-500",
              "hover:border-graf-500 focus:border-jb-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/15",
            )}
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-graf-300 bg-white px-1.5 py-0.5 text-xs font-medium text-graf-500 sm:block"
          >
            /
          </kbd>
        </form>

        <div className="ml-auto flex items-center gap-1">
          {/* Fio entre a busca e o canto da conta: sem ele o campo de busca e o
              nome de quem está logado leem como um bloco só. */}
          <span className="mr-1 hidden h-6 w-px shrink-0 bg-graf-200 sm:block" aria-hidden />

          {/* Identidade de quem está logado é também a porta da própria conta:
              é onde a pessoa procura para trocar a senha. No telefone, onde o
              bloco com nome não cabe, sobra o botão redondo ao lado. */}
          <Link
            href="/admin/conta"
            title="Minha conta"
            className={cn(
              "hidden items-center gap-2.5 rounded-lg px-2 py-1 transition-colors sm:flex",
              "hover:bg-graf-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
            )}
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jb-50 text-[0.8125rem] font-bold text-jb-700 ring-1 ring-inset ring-jb-500/20"
            >
              {iniciais || "JB"}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block max-w-[10rem] truncate text-sm font-semibold text-graf-900">
                {nome}
              </span>
              <span className="block max-w-[10rem] truncate text-[0.8125rem] text-graf-500" title={email}>
                {papel}
              </span>
            </span>
            <span className="sr-only">— abrir minha conta</span>
          </Link>

          <Link
            href="/admin/conta"
            aria-label="Minha conta"
            title="Minha conta"
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-700 transition-colors sm:hidden",
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
