import Link from "next/link";
import { Bell, ChevronDown, LogOut, Search, Store } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "JB";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

export function TopoClinica({
  nome,
  email,
  naoLidas,
  sair,
}: {
  nome: string;
  email: string;
  naoLidas: number;
  sair: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-xl focus:bg-graf-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="clinic-topbar sticky top-0 z-50 border-b border-graf-200/70 bg-white/92 shadow-[0_1px_0_rgba(18,24,35,0.025)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/84">
        <div className="container-jb flex h-16 items-center gap-3 sm:gap-4">
          <Link
            href="/minha-jb"
            aria-label="Área da Clínica — visão geral"
            className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 lg:hidden"
          >
            <Logo altura={30} />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-extrabold text-graf-950">Área da Clínica</span>
              <span className="mt-0.5 block truncate text-[0.68rem] font-medium text-graf-500">Tecnologia que cuida</span>
            </span>
          </Link>

          <form
            action="/minha-jb/equipamentos"
            method="get"
            role="search"
            className="clinic-search relative hidden min-w-0 flex-1 lg:block lg:max-w-xl"
          >
            <label htmlFor="busca-area-clinica" className="sr-only">Buscar equipamento</label>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-graf-400"
              aria-hidden
            />
            <input
              id="busca-area-clinica"
              type="search"
              name="q"
              placeholder="Buscar equipamentos..."
              className="h-10 w-full rounded-xl border border-transparent bg-graf-50 pl-10 pr-14 text-sm text-graf-900 outline-none transition-all placeholder:text-graf-400 hover:border-graf-200 hover:bg-white focus:border-jb-300 focus:bg-white focus:ring-4 focus:ring-jb-500/10"
            />
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-graf-200 bg-white px-1.5 py-0.5 text-[0.65rem] font-bold text-graf-500 shadow-sm"
            >
              ⌘ K
            </kbd>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <Link
              href="/minha-jb#avisos"
              aria-label={
                naoLidas > 0
                  ? `Avisos — ${naoLidas} ${naoLidas === 1 ? "não lido" : "não lidos"}`
                  : "Avisos"
              }
              className="relative flex size-10 items-center justify-center rounded-xl text-graf-700 transition-colors hover:bg-graf-100"
            >
              <Bell className="size-[18px]" aria-hidden />
              {naoLidas > 0 ? (
                <span
                  aria-hidden
                  className="tabular absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-jb-500 px-1 text-[0.62rem] font-bold leading-none text-white ring-2 ring-white"
                >
                  {naoLidas > 99 ? "99+" : naoLidas}
                </span>
              ) : null}
            </Link>

            <span aria-hidden className="mx-1 hidden h-7 w-px bg-graf-200/80 md:block" />

            <Link
              href="/loja"
              className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-graf-700 transition-all hover:bg-graf-50 hover:text-graf-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 md:inline-flex"
            >
              <Store className="size-[17px] shrink-0" aria-hidden />
              Ir para a loja
            </Link>

            <Link
              href="/loja"
              aria-label="Ir para a loja"
              className="flex size-10 items-center justify-center rounded-xl text-graf-700 transition-colors hover:bg-graf-100 md:hidden"
            >
              <Store className="size-5" aria-hidden />
            </Link>

            <span aria-hidden className="mx-1 hidden h-7 w-px bg-graf-200/80 lg:block" />

            <Link
              href="/minha-jb/perfil"
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-xl border border-transparent px-1.5 transition-all hover:border-graf-200 hover:bg-graf-50/90",
                "lg:pr-2.5",
              )}
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-graf-800 to-graf-950 text-xs font-bold tracking-wide text-white shadow-sm ring-1 ring-inset ring-white/10"
              >
                {iniciais(nome)}
              </span>
              <span className="hidden max-w-44 text-left leading-tight lg:block">
                <span className="block truncate text-sm font-bold text-graf-950">{nome || "Minha conta"}</span>
                <span className="block truncate text-[0.6875rem] text-graf-500">{email}</span>
              </span>
              <ChevronDown className="hidden size-4 text-graf-400 xl:block" aria-hidden />
              <span className="sr-only">Meus dados</span>
            </Link>

            <div className="lg:hidden">{sair}</div>
          </div>
        </div>
      </header>
    </>
  );
}

export function BotaoSairTopo() {
  return (
    <button
      type="submit"
      aria-label="Sair da Área da Clínica"
      title="Sair da Área da Clínica"
      className="flex size-10 items-center justify-center rounded-xl text-graf-600 transition-colors hover:bg-jb-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <LogOut className="size-5" aria-hidden />
    </button>
  );
}

export function RodapeClinica({ telefone, whatsapp }: { telefone: string; whatsapp: string }) {
  return (
    <footer className="mt-auto border-t border-graf-200/80 bg-white/95">
      <div className="container-jb flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-graf-500">JB Soluções Odontológicas · Área da Clínica</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {telefone ? (
            <a href={telHref(telefone)} className="inline-flex min-h-11 items-center font-semibold text-graf-700 transition-colors hover:text-jb-700">
              {telefone}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsappHref(whatsapp, "Olá! Sou cliente da JB e vim pela Área da Clínica.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-graf-700 transition-colors hover:text-jb-700"
            >
              WhatsApp
            </a>
          ) : null}
          <Link href="/privacidade" className="inline-flex min-h-11 items-center text-graf-500 transition-colors hover:text-graf-800">Privacidade</Link>
          <Link href="/termos" className="inline-flex min-h-11 items-center text-graf-500 transition-colors hover:text-graf-800">Termos</Link>
        </div>
      </div>
    </footer>
  );
}
