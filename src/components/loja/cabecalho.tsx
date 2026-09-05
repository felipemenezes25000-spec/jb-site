"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Clock,
  Heart,
  Menu,
  Phone,
  Search,
  ShoppingCart,
  User,
  Wrench,
  X,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { usarDialogo } from "@/components/ui/usar-dialogo";
import { classesBotao } from "@/components/ui/button";
import {
  CONDICOES,
  MENU_ASSISTENCIA,
  MENU_PRINCIPAL,
  type ItemMenu,
} from "@/lib/navegacao";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategoriaMenu = { slug: string; name: string; count: number };

type Props = {
  categorias: CategoriaMenu[];
  itensNoCarrinho: number;
  clienteNome: string | null;
  telefone: string;
  whatsapp: string;
  horario: string;
};

export function Cabecalho({
  categorias,
  itensNoCarrinho,
  clienteNome,
  telefone,
  whatsapp,
  horario,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [compacto, setCompacto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [mega, setMega] = useState<null | "catalogo" | "assistencia">(null);
  const fecharTimer = useRef<number | null>(null);

  useEffect(() => {
    const aoRolar = () => setCompacto(window.scrollY > 12);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    setMenuAberto(false);
    setMega(null);
    setBuscaAberta(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(null);
        setMenuAberto(false);
        setBuscaAberta(false);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  // pequeno atraso ao sair evita o mega menu piscando ao atravessar o vão
  const agendarFechamento = () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => setMega(null), 160);
  };
  const cancelarFechamento = () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  };

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const termo = String(dados.get("q") ?? "").trim();
    router.push(termo ? `/busca?q=${encodeURIComponent(termo)}` : "/loja");
    setBuscaAberta(false);
  }

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-graf-950 focus:px-4 focus:py-3 focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {/* Barra de utilidade */}
      <div className="hidden border-b border-graf-200 bg-graf-50 lg:block">
        <div className="container-jb flex h-9 items-center justify-between text-xs text-graf-600">
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-graf-500" aria-hidden />
            {horario}
          </p>
          <div className="flex items-center gap-5">
            {telefone ? (
              <a href={telHref(telefone)} className="flex items-center gap-1.5 hover:text-jb-700">
                <Phone className="size-3.5 text-graf-500" aria-hidden />
                {telefone}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={whatsappHref(whatsapp, "Olá! Vim pelo site da JB.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-graf-700 hover:text-jb-700"
              >
                <span className="size-1.5 rounded-full bg-ok-500" aria-hidden />
                WhatsApp {whatsapp}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow duration-200",
          compacto ? "border-graf-200 shadow-card" : "border-graf-200/70",
        )}
        onMouseLeave={agendarFechamento}
      >
        <div className="container-jb">
          <div
            className={cn(
              "flex items-center gap-4 transition-[height] duration-200",
              compacto ? "h-16" : "h-20",
            )}
          >
            <Link href="/" aria-label="JB Soluções Odontológicas — início" className="shrink-0">
              <Logo altura={compacto ? 34 : 42} prioridade />
            </Link>

            {/* Busca — desktop */}
            <form onSubmit={buscar} role="search" className="hidden min-w-0 flex-1 md:block">
              <div className="relative mx-auto max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  placeholder="Busque equipamento, marca, modelo ou peça"
                  aria-label="Buscar no catálogo"
                  className="h-11 w-full rounded-lg border border-graf-300 bg-graf-50 pl-10 pr-3 text-sm transition-colors placeholder:text-graf-500 hover:border-graf-400 focus:border-jb-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/15"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBuscaAberta((v) => !v)}
                aria-label="Buscar"
                aria-expanded={buscaAberta}
                className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 md:hidden"
              >
                <Search className="size-5" />
              </button>

              <Link
                href="/minha-jb/favoritos"
                aria-label="Favoritos"
                className="hidden size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 sm:flex"
              >
                <Heart className="size-5" />
              </Link>

              <Link
                href={clienteNome ? "/minha-jb" : "/entrar"}
                className="flex h-11 items-center gap-2 rounded-lg px-2.5 text-graf-700 transition-colors hover:bg-graf-100"
              >
                <User className="size-5 shrink-0" aria-hidden />
                <span className="hidden text-left leading-tight lg:block">
                  <span className="block text-[0.6875rem] text-graf-500">
                    {clienteNome ? "Olá," : "Entrar em"}
                  </span>
                  <span className="block text-xs font-bold">
                    {clienteNome ? clienteNome.split(" ")[0] : "Minha JB"}
                  </span>
                </span>
              </Link>

              <Link
                href="/carrinho"
                aria-label={`Carrinho com ${itensNoCarrinho} ${itensNoCarrinho === 1 ? "item" : "itens"}`}
                className="relative flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100"
              >
                <ShoppingCart className="size-5" />
                {itensNoCarrinho > 0 ? (
                  <span className="absolute right-1 top-1 flex min-w-4.5 items-center justify-center rounded-full bg-jb-500 px-1 text-[10px] font-bold leading-4.5 text-white">
                    {itensNoCarrinho > 9 ? "9+" : itensNoCarrinho}
                  </span>
                ) : null}
              </Link>

              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao("primario", "sm", "ml-2 hidden xl:inline-flex")}
              >
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </Link>

              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                aria-label="Abrir menu"
                className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </div>
          </div>

          {/* Navegação — desktop */}
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="-mb-px flex items-center gap-1">
              {MENU_PRINCIPAL.map((item) => {
                const temMega = Boolean(item.megaMenu);
                const estaAtivo = ativo(item.href);
                return (
                  <li
                    key={item.href}
                    onMouseEnter={() => {
                      cancelarFechamento();
                      setMega(item.megaMenu ?? null);
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-current={estaAtivo ? "page" : undefined}
                      aria-expanded={temMega ? mega === item.megaMenu : undefined}
                      className={cn(
                        "flex items-center gap-1 border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
                        estaAtivo
                          ? "border-jb-500 text-jb-700"
                          : "border-transparent text-graf-700 hover:border-graf-300 hover:text-graf-950",
                      )}
                    >
                      {item.rotulo}
                      {temMega ? (
                        <ChevronDown
                          className={cn(
                            "size-3.5 text-graf-500 transition-transform",
                            mega === item.megaMenu && "rotate-180",
                          )}
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Mega menu */}
        <AnimatePresence>
          {mega ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={cancelarFechamento}
              className="absolute inset-x-0 top-full hidden border-b border-graf-200 bg-white shadow-pop lg:block"
            >
              <div className="container-jb py-8">
                {mega === "catalogo" ? (
                  <MegaCatalogo categorias={categorias} />
                ) : (
                  <MegaAssistencia />
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      {/* Busca — mobile */}
      <AnimatePresence>
        {buscaAberta ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-graf-200 bg-white md:hidden"
          >
            <form onSubmit={buscar} role="search" className="container-jb py-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
                  aria-hidden
                />
                <input
                  autoFocus
                  type="search"
                  name="q"
                  placeholder="Buscar equipamento ou peça"
                  aria-label="Buscar no catálogo"
                  className="h-11 w-full rounded-lg border border-graf-300 bg-graf-50 pl-10 pr-3 text-sm focus:border-jb-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/15"
                />
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Menu mobile */}
      <MenuMobile
        aberto={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        categorias={categorias}
        clienteNome={clienteNome}
        whatsapp={whatsapp}
      />
    </>
  );
}

/* ------------------------------------------------------------------ mega */

function MegaCatalogo({ categorias }: { categorias: CategoriaMenu[] }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-graf-500">
          Categorias
        </p>
        {categorias.length === 0 ? (
          <p className="text-sm text-graf-500">
            Nenhuma categoria publicada ainda.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-graf-50"
                >
                  <span className="text-sm font-medium text-graf-800 group-hover:text-jb-700">
                    {categoria.name}
                  </span>
                  <span className="text-xs tabular text-graf-500">{categoria.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:border-l lg:border-graf-200 lg:pl-8">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-graf-500">
          Por condição
        </p>
        <ul className="space-y-1">
          {CONDICOES.map((condicao) => (
            <li key={condicao.slug}>
              <Link
                href={`/${condicao.slug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-graf-800 transition-colors hover:bg-graf-50 hover:text-jb-700"
              >
                {condicao.rotulo}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/marcas"
          className="mt-4 inline-flex items-center gap-1.5 px-3 text-sm font-semibold text-jb-700 hover:text-jb-800"
        >
          Ver todas as marcas →
        </Link>
      </div>
    </div>
  );
}

function MegaAssistencia() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {MENU_ASSISTENCIA.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl border border-graf-200 p-4 transition-colors hover:border-jb-300 hover:bg-jb-50/40"
        >
          <p className="text-sm font-bold text-graf-900">{item.rotulo}</p>
          {item.descricao ? (
            <p className="mt-1 text-xs leading-relaxed text-graf-500">{item.descricao}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- mobile */

function MenuMobile({
  aberto,
  aoFechar,
  categorias,
  clienteNome,
  whatsapp,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categorias: CategoriaMenu[];
  clienteNome: string | null;
  whatsapp: string;
}) {
  const [secao, setSecao] = useState<string | null>(null);
  // foco preso, Esc e devolução do foco: `role="dialog"` sozinho não faz nada disso
  const caixa = usarDialogo(aberto, aoFechar);

  return (
    <AnimatePresence>
      {aberto ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={aoFechar}
            className="fixed inset-0 z-60 bg-graf-950/40 lg:hidden"
            aria-hidden
          />
          <motion.div
            ref={caixa}
            role="dialog"
            aria-label="Menu"
            aria-modal="true"
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-70 flex w-[min(22rem,90vw)] flex-col bg-white lg:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-graf-200 px-4">
              <Logo altura={32} />
              <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar menu"
                className="flex size-10 items-center justify-center rounded-lg text-graf-700 hover:bg-graf-100"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {MENU_PRINCIPAL.map((item) =>
                  item.megaMenu === "catalogo" ? (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => setSecao(secao === "cat" ? null : "cat")}
                        aria-expanded={secao === "cat"}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-semibold text-graf-800 hover:bg-graf-50"
                      >
                        {item.rotulo}
                        <ChevronDown
                          className={cn(
                            "size-4 text-graf-500 transition-transform",
                            secao === "cat" && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      {secao === "cat" ? (
                        <ul className="mb-2 ml-3 border-l border-graf-200 pl-3">
                          <li>
                            <Link
                              href="/loja"
                              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-jb-700 hover:bg-graf-50"
                            >
                              Ver tudo
                            </Link>
                          </li>
                          {categorias.map((categoria) => (
                            <li key={categoria.slug}>
                              <Link
                                href={`/categoria/${categoria.slug}`}
                                className="block rounded-lg px-3 py-2.5 text-sm text-graf-700 hover:bg-graf-50"
                              >
                                {categoria.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ) : (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="block rounded-lg px-3 py-3 text-base font-semibold text-graf-800 hover:bg-graf-50"
                      >
                        {item.rotulo}
                      </Link>
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-6 border-t border-graf-200 pt-4">
                <Link
                  href={clienteNome ? "/minha-jb" : "/entrar"}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold text-graf-800 hover:bg-graf-50"
                >
                  <User className="size-5 text-graf-500" aria-hidden />
                  {clienteNome ? "Minha JB" : "Entrar ou criar conta"}
                </Link>
                <Link
                  href="/minha-jb/favoritos"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-semibold text-graf-800 hover:bg-graf-50"
                >
                  <Heart className="size-5 text-graf-500" aria-hidden />
                  Favoritos
                </Link>
              </div>
            </nav>

            <div className="shrink-0 space-y-2 border-t border-graf-200 p-4">
              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao("primario", "md", "w-full")}
              >
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </Link>
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, "Olá! Vim pelo site da JB.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao("secundario", "md", "w-full")}
                >
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
