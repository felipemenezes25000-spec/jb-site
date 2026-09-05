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
  MessageCircle,
  Search,
  ShoppingBag,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { classesBotao } from "@/components/ui/button";
import { CONDICOES, MENU_ASSISTENCIA, MENU_PRINCIPAL } from "@/lib/navegacao";
import { whatsappHref } from "@/lib/format";
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

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const agendarFechamento = () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => setMega(null), 140);
  };

  const cancelarFechamento = () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  };

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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-graf-950 focus:px-4 focus:py-3 focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <div className="hidden border-b border-graf-200 bg-graf-950 text-white lg:block">
        <div className="container-jb flex h-8 items-center justify-between text-[11px]">
          <p className="flex items-center gap-2 text-graf-300">
            <Clock className="size-3.5 text-graf-500" aria-hidden />
            {horario}
          </p>
          <div className="flex items-center gap-5">
            <span className="text-graf-400">Equipamentos, assistência técnica e pós-venda para clínicas odontológicas</span>
            {whatsapp ? (
              <a
                href={whatsappHref(whatsapp, "Olá! Vim pelo site da JB.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-white hover:text-jb-300"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                Falar no WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 border-b border-graf-200 bg-white/97 backdrop-blur-xl",
          compacto && "shadow-card",
        )}
        onMouseLeave={agendarFechamento}
      >
        <div className="container-jb">
          <div className={cn("flex items-center gap-4 transition-[height] duration-200", compacto ? "h-16" : "h-[4.75rem]") }>
            <Link href="/" aria-label="JB Soluções Odontológicas — início" className="shrink-0">
              <Logo altura={compacto ? 36 : 42} prioridade />
            </Link>

            <form onSubmit={buscar} role="search" className="hidden min-w-0 flex-1 md:block">
              <div className="relative mx-auto max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden />
                <input
                  type="search"
                  name="q"
                  placeholder="Buscar equipamentos, marcas, modelos ou peças"
                  aria-label="Buscar no catálogo"
                  className="h-11 w-full rounded-xl border border-graf-300 bg-graf-50 pl-11 pr-4 text-sm transition placeholder:text-graf-400 hover:border-graf-400 focus:border-jb-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/10"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBuscaAberta((v) => !v)}
                aria-label="Buscar"
                aria-expanded={buscaAberta}
                className="flex size-11 items-center justify-center rounded-xl text-graf-700 hover:bg-graf-100 md:hidden"
              >
                <Search className="size-5" />
              </button>

              <Link
                href="/minha-jb/favoritos"
                aria-label="Favoritos"
                className="hidden size-11 items-center justify-center rounded-xl text-graf-700 hover:bg-graf-100 sm:flex"
              >
                <Heart className="size-5" />
              </Link>

              <Link
                href={clienteNome ? "/minha-jb" : "/entrar"}
                className="hidden h-11 items-center gap-2.5 rounded-xl px-3 text-graf-800 transition-colors hover:bg-graf-100 lg:flex"
              >
                <UserRound className="size-5 shrink-0" aria-hidden />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-graf-500">
                    {clienteNome ? "Olá" : "Acessar"}
                  </span>
                  <span className="block max-w-28 truncate text-xs font-extrabold">
                    {clienteNome ? clienteNome.split(" ")[0] : "Área da Clínica"}
                  </span>
                </span>
              </Link>

              <Link
                href="/carrinho"
                aria-label={`Carrinho com ${itensNoCarrinho} ${itensNoCarrinho === 1 ? "item" : "itens"}`}
                className="relative flex h-11 items-center gap-2 rounded-xl px-3 text-graf-800 hover:bg-graf-100"
              >
                <ShoppingBag className="size-5" />
                <span className="hidden text-xs font-extrabold xl:inline">Carrinho</span>
                {itensNoCarrinho > 0 ? (
                  <span className="absolute right-0.5 top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-jb-500 px-1 text-[10px] font-bold leading-[18px] text-white">
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
                className="flex size-11 items-center justify-center rounded-xl text-graf-700 hover:bg-graf-100 lg:hidden"
              >
                <Menu className="size-5" />
              </button>
            </div>
          </div>

          <nav aria-label="Principal" className="hidden border-t border-graf-100 lg:block">
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
                        "flex h-11 items-center gap-1.5 border-b-2 px-3.5 text-[13px] font-bold transition-colors",
                        estaAtivo
                          ? "border-jb-500 text-jb-700"
                          : "border-transparent text-graf-700 hover:border-graf-300 hover:text-graf-950",
                      )}
                    >
                      {item.rotulo}
                      {temMega ? (
                        <ChevronDown className={cn("size-3.5 text-graf-400 transition-transform", mega === item.megaMenu && "rotate-180")} aria-hidden />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

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
                {mega === "catalogo" ? <MegaCatalogo categorias={categorias} /> : <MegaAssistencia />}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

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
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-graf-400" aria-hidden />
                <input
                  autoFocus
                  type="search"
                  name="q"
                  placeholder="Buscar equipamento ou peça"
                  aria-label="Buscar no catálogo"
                  className="h-12 w-full rounded-xl border border-graf-300 bg-graf-50 pl-11 pr-4 text-sm focus:border-jb-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-jb-500/10"
                />
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MenuMobile
        aberto={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        categorias={categorias}
        clienteNome={clienteNome}
        whatsapp={whatsapp}
        itensNoCarrinho={itensNoCarrinho}
      />
    </>
  );
}

function MegaCatalogo({ categorias }: { categorias: CategoriaMenu[] }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.7fr_0.8fr]">
      <div>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Catálogo</p>
            <p className="mt-1 text-sm text-graf-500">Encontre o equipamento pela necessidade da clínica.</p>
          </div>
          <Link href="/loja" className="text-sm font-bold text-jb-700 hover:text-jb-500">Ver tudo →</Link>
        </div>
        {categorias.length === 0 ? (
          <p className="text-sm text-graf-500">Nenhuma categoria publicada ainda.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-3.5 py-3 transition hover:border-graf-200 hover:bg-graf-50"
                >
                  <span className="text-sm font-bold text-graf-800 group-hover:text-jb-700">{categoria.name}</span>
                  <span className="rounded-full bg-graf-100 px-2 py-0.5 text-[10px] font-bold tabular text-graf-500">{categoria.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-graf-50 p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-graf-500">Por condição</p>
        <ul className="mt-3 space-y-1">
          {CONDICOES.map((condicao) => (
            <li key={condicao.slug}>
              <Link href={`/${condicao.slug}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-bold text-graf-800 hover:bg-white hover:text-jb-700">
                {condicao.rotulo}
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/marcas" className="mt-4 inline-flex px-3 text-sm font-bold text-jb-700 hover:text-jb-500">Todas as marcas →</Link>
      </div>
    </div>
  );
}

function MegaAssistencia() {
  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Assistência JB</p>
        <p className="mt-1 text-sm text-graf-500">Do chamado ao acompanhamento do serviço.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MENU_ASSISTENCIA.map((item) => (
          <Link key={item.href} href={item.href} className="hover-lift rounded-2xl border border-graf-200 bg-white p-5">
            <Wrench className="size-5 text-jb-600" aria-hidden />
            <p className="mt-4 text-sm font-extrabold text-graf-950">{item.rotulo}</p>
            {item.descricao ? <p className="mt-2 text-xs leading-5 text-graf-500">{item.descricao}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MenuMobile({
  aberto,
  aoFechar,
  categorias,
  clienteNome,
  whatsapp,
  itensNoCarrinho,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categorias: CategoriaMenu[];
  clienteNome: string | null;
  whatsapp: string;
  itensNoCarrinho: number;
}) {
  const [secao, setSecao] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {aberto ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={aoFechar}
            className="fixed inset-0 z-[60] bg-graf-950/45 backdrop-blur-[2px] lg:hidden"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-label="Menu"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(24rem,92vw)] flex-col bg-white lg:hidden"
          >
            <div className="flex h-17 shrink-0 items-center justify-between border-b border-graf-200 px-5">
              <Logo altura={34} />
              <button type="button" onClick={aoFechar} aria-label="Fechar menu" className="flex size-10 items-center justify-center rounded-xl text-graf-700 hover:bg-graf-100">
                <X className="size-5" />
              </button>
            </div>

            <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-4">
              <Link
                href={clienteNome ? "/minha-jb" : "/entrar"}
                className="mb-3 flex items-center gap-3 rounded-xl bg-graf-950 px-4 py-4 text-white"
              >
                <UserRound className="size-5" aria-hidden />
                <div>
                  <p className="text-xs text-graf-400">{clienteNome ? `Olá, ${clienteNome.split(" ")[0]}` : "Sua conta"}</p>
                  <p className="text-sm font-extrabold">Área da Clínica</p>
                </div>
              </Link>

              <Link href="/carrinho" className="mb-5 flex items-center justify-between rounded-xl border border-graf-200 px-4 py-3 text-sm font-extrabold text-graf-800">
                <span className="flex items-center gap-3"><ShoppingBag className="size-5 text-graf-500" aria-hidden /> Carrinho</span>
                {itensNoCarrinho > 0 ? <span className="rounded-full bg-jb-500 px-2 py-0.5 text-xs text-white">{itensNoCarrinho}</span> : null}
              </Link>

              <ul className="space-y-1">
                {MENU_PRINCIPAL.map((item) =>
                  item.megaMenu === "catalogo" ? (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => setSecao(secao === "cat" ? null : "cat")}
                        aria-expanded={secao === "cat"}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-base font-extrabold text-graf-900 hover:bg-graf-50"
                      >
                        {item.rotulo}
                        <ChevronDown className={cn("size-4 text-graf-400 transition-transform", secao === "cat" && "rotate-180")} aria-hidden />
                      </button>
                      {secao === "cat" ? (
                        <ul className="mb-3 ml-3 border-l border-graf-200 pl-3">
                          <li><Link href="/loja" className="block rounded-lg px-3 py-2.5 text-sm font-bold text-jb-700">Ver tudo</Link></li>
                          {categorias.map((categoria) => (
                            <li key={categoria.slug}><Link href={`/categoria/${categoria.slug}`} className="block rounded-lg px-3 py-2.5 text-sm text-graf-700 hover:bg-graf-50">{categoria.name}</Link></li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ) : (
                    <li key={item.href}><Link href={item.href} className="block rounded-xl px-3 py-3.5 text-base font-extrabold text-graf-900 hover:bg-graf-50">{item.rotulo}</Link></li>
                  ),
                )}
              </ul>
            </nav>

            <div className="shrink-0 space-y-2 border-t border-graf-200 bg-graf-50 p-4">
              <Link href="/assistencia-tecnica/solicitar" className={classesBotao("primario", "md", "w-full")}>
                <Wrench className="size-4" aria-hidden /> Solicitar assistência
              </Link>
              {whatsapp ? (
                <a href={whatsappHref(whatsapp, "Olá! Vim pelo site da JB.")} target="_blank" rel="noopener noreferrer" className={classesBotao("secundario", "md", "w-full")}>
                  <MessageCircle className="size-4" aria-hidden /> Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
