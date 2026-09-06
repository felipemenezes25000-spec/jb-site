"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Menu,
  MessageCircle,
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
  ATALHOS_CLIENTE,
  CONDICOES,
  MENU_ASSISTENCIA,
  MENU_PRINCIPAL,
  rotaAtiva,
  type ChaveMega,
  type ItemMenu,
} from "@/lib/navegacao";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategoriaMenu = { slug: string; name: string; count: number };

type Props = {
  categorias: CategoriaMenu[];
  /**
   * As duas peças que dependem de quem está do outro lado, já renderizadas
   * pelo servidor dentro do seu próprio `<Suspense>`.
   *
   * Chegam como nó pronto, e não como número e nome, para que o cabeçalho —
   * que é componente de cliente — não precise esperar por uma leitura de
   * cookie para existir. Ver `cabecalho-pessoal.tsx`.
   */
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
  telefone: string;
  whatsapp: string;
  horario: string;
};

const MENSAGEM_WHATSAPP = "Olá! Vim pelo site da JB.";

/* ==========================================================================
   Cabeçalho da loja

   Três acessos disputam o topo e cada um tem um peso diferente:
   catálogo (a navegação), busca (o atalho de quem já sabe o que quer) e a
   área da clínica (o cliente que volta). O carrinho e o pedido de assistência
   são as duas ações — uma comercial, uma técnica.

   O mega menu é um disclosure de verdade: abre no mouse, mas também no
   clique e no teclado, com `aria-expanded` no gatilho e Esc devolvendo o foco.
   Link e gatilho são elementos separados de propósito — clicar no rótulo leva
   ao catálogo, clicar na seta abre o painel.
   ========================================================================== */

export function Cabecalho({
  categorias,
  acessoDaConta,
  contadorDoCarrinho,
  telefone,
  whatsapp,
  horario,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const reduzido = useReducedMotion();

  const [compacto, setCompacto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [mega, setMega] = useState<ChaveMega | null>(null);

  const fecharTimer = useRef<number | null>(null);
  const refCabecalho = useRef<HTMLElement>(null);
  const gatilhosMega = useRef<Partial<Record<ChaveMega, HTMLButtonElement | null>>>({});
  const botaoBusca = useRef<HTMLButtonElement>(null);
  const campoBuscaMobile = useRef<HTMLInputElement>(null);

  // identidade estável: `usarDialogo` reage à função, e uma nova a cada
  // render devolveria o foco ao topo da gaveta a cada rolagem da página
  const fecharMenu = useCallback(() => setMenuAberto(false), []);

  useEffect(() => {
    const aoRolar = () => setCompacto(window.scrollY > 12);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  // navegou: nada de painel aberto sobrando por cima da página nova
  useEffect(() => {
    setMenuAberto(false);
    setMega(null);
    setBuscaAberta(false);
  }, [pathname]);

  useEffect(() => {
    if (buscaAberta) campoBuscaMobile.current?.focus();
  }, [buscaAberta]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      // a gaveta tem o próprio Esc, dentro de usarDialogo
      if (menuAberto) return;

      if (mega) {
        const gatilho = gatilhosMega.current[mega];
        setMega(null);
        gatilho?.focus();
        return;
      }
      if (buscaAberta) {
        setBuscaAberta(false);
        botaoBusca.current?.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [mega, buscaAberta, menuAberto]);

  /**
   * Um respiro ao sair evita o painel piscando quando o ponteiro atravessa o
   * vão entre o rótulo e o painel. Quem abriu pelo teclado não perde o menu
   * por um passar de mouse: se o foco ainda está no cabeçalho, nada fecha.
   */
  const agendarFechamento = () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => {
      if (refCabecalho.current?.contains(document.activeElement)) return;
      setMega(null);
    }, 160);
  };
  const cancelarFechamento = () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  };

  useEffect(() => () => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  }, []);

  const ativo = (href: string) => rotaAtiva(pathname, href);

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const termo = String(dados.get("q") ?? "").trim();
    router.push(termo ? `/busca?q=${encodeURIComponent(termo)}` : "/loja");
    setBuscaAberta(false);
  }

  // o foco saiu do cabeçalho inteiro: fecha o painel que estava aberto
  function aoPerderFoco(evento: React.FocusEvent<HTMLElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setMega(null);
  }

  const temBarraUtilidade = Boolean(horario || telefone || whatsapp);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-graf-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {/* ---------------------------------------------- barra de utilidade */}
      {temBarraUtilidade ? (
        <div className="hidden border-b border-graf-200 bg-graf-50 lg:block">
          <div className="container-jb flex h-10 items-center justify-between gap-6 text-[0.8125rem]">
            {horario ? (
              <p className="flex items-center gap-2 text-graf-600">
                <Clock className="size-3.5 shrink-0 text-graf-400" aria-hidden />
                {horario}
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-6">
              {telefone ? (
                <a
                  href={telHref(telefone)}
                  /* h-10 (a altura da barra): sem isso o alvo tem só a altura
                     da linha, 16px, abaixo dos 24px que a WCAG 2.5.8 pede.
                     Altura fixa e não h-full porque o pai flex não tem altura
                     própria — a porcentagem cairia em `auto`. O desenho não
                     muda: o link passa a ocupar a barra que já existia. */
                  className="flex h-10 items-center gap-2 rounded-xs text-graf-600 transition-colors hover:text-jb-700"
                >
                  <Phone className="size-3.5 shrink-0 text-graf-400" aria-hidden />
                  {telefone}
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center gap-2 rounded-xs font-semibold text-graf-700 transition-colors hover:text-jb-700"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-ok-500" aria-hidden />
                  WhatsApp {whatsapp}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* --------------------------------------------------------- cabeçalho */}
      <header
        ref={refCabecalho}
        onMouseLeave={agendarFechamento}
        onBlur={aoPerderFoco}
        className={cn(
          "sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow duration-200",
          compacto ? "border-graf-200 shadow-card" : "border-graf-200/70",
        )}
      >
        <div className="container-jb">
          <div
            className={cn(
              "flex items-center gap-3 transition-[height] duration-200 sm:gap-5",
              compacto ? "h-15" : "h-20",
            )}
          >
            <Link
              href="/"
              aria-label="JB Soluções Odontológicas — início"
              /* A logo mede 34–42px de altura; o link precisa de 44 para ser
                 tocável no celular sem que a marca cresça junto. */
              className="flex min-h-11 shrink-0 items-center rounded-sm"
            >
              <Logo altura={compacto ? 32 : 42} prioridade />
            </Link>

            {/* Busca — a partir do tablet ela mora no topo, sempre visível */}
            <form onSubmit={buscar} role="search" className="hidden min-w-0 flex-1 md:flex">
              <CampoBusca id="busca-cabecalho" compacto={compacto} />
            </form>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <button
                ref={botaoBusca}
                type="button"
                onClick={() => setBuscaAberta((v) => !v)}
                aria-expanded={buscaAberta}
                className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 md:hidden"
              >
                {buscaAberta ? (
                  <X className="size-5" aria-hidden />
                ) : (
                  <Search className="size-5" aria-hidden />
                )}
                <span className="sr-only">{buscaAberta ? "Fechar a busca" : "Buscar"}</span>
              </button>

              {/* Área da clínica e carrinho: renderizados no servidor, cada um
                  no seu Suspense. O cabeçalho só reserva o lugar. */}
              {acessoDaConta}

              {contadorDoCarrinho}

              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao("primario", "sm", "ml-1.5 hidden lg:inline-flex")}
              >
                <Wrench className="size-4 shrink-0" aria-hidden />
                Solicitar assistência
              </Link>

              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                aria-haspopup="dialog"
                aria-expanded={menuAberto}
                className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 lg:hidden"
              >
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Abrir o menu</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------ navegação — desktop */}
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="-mb-px flex items-center gap-1">
              {MENU_PRINCIPAL.map((item) => {
                const chave = item.megaMenu;
                const aberto = chave !== undefined && mega === chave;
                const estaAtivo = ativo(item.href);

                return (
                  <li
                    key={item.href}
                    onMouseEnter={() => {
                      cancelarFechamento();
                      setMega(chave ?? null);
                    }}
                  >
                    <div
                      className={cn(
                        "flex items-center border-b-2 transition-colors",
                        estaAtivo
                          ? "border-jb-500"
                          : aberto
                            ? "border-graf-400"
                            : "border-transparent",
                      )}
                    >
                      <Link
                        href={item.href}
                        aria-current={estaAtivo ? "page" : undefined}
                        className={cn(
                          "rounded-t-md px-3 text-[0.9375rem] font-semibold transition-colors",
                          compacto ? "py-2" : "py-4",
                          estaAtivo ? "text-jb-700" : "text-graf-700 hover:text-graf-950",
                        )}
                      >
                        {item.rotulo}
                      </Link>

                      {chave ? (
                        <button
                          type="button"
                          ref={(el) => {
                            gatilhosMega.current[chave] = el;
                          }}
                          aria-expanded={aberto}
                          aria-label={`${aberto ? "Fechar" : "Abrir"} o menu de ${item.rotulo}`}
                          onFocus={cancelarFechamento}
                          onClick={() => setMega(aberto ? null : chave)}
                          /* 44x44: em 1024px quem navega já está no toque
                             (tablet deitado), e 28px de largura era chute. */
                          className={cn(
                            "-ml-2 flex w-11 items-center justify-center rounded-t-md text-graf-500 transition-colors hover:text-graf-950",
                            compacto ? "h-9" : "h-13",
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform duration-200",
                              aberto && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* ------------------------------------------------- busca — celular */}
        <AnimatePresence initial={false}>
          {buscaAberta ? (
            <motion.div
              key="busca-celular"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduzido ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-graf-200 bg-white md:hidden"
            >
              <form onSubmit={buscar} role="search" className="container-jb py-3">
                <CampoBusca id="busca-celular" ref={campoBuscaMobile} compacto />
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ---------------------------------------------------- mega menu */}
        <AnimatePresence>
          {mega ? (
            <motion.div
              key="mega"
              initial={{ opacity: 0, y: reduzido ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduzido ? 0 : -6 }}
              transition={{ duration: reduzido ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={cancelarFechamento}
              /* O cabeçalho é `sticky`, então este painel fica colado abaixo
                 dele e não acompanha a rolagem da página: sem teto de altura,
                 num notebook de 1024x600 as duas últimas linhas de categoria
                 ficavam fora da tela e inalcançáveis. */
              className="absolute inset-x-0 top-full hidden max-h-[70dvh] overflow-y-auto overscroll-contain border-b border-graf-200 bg-white shadow-pop lg:block"
            >
              <div className="container-jb py-9">
                {mega === "catalogo" ? (
                  <MegaCatalogo categorias={categorias} />
                ) : (
                  <MegaAssistencia telefone={telefone} whatsapp={whatsapp} horario={horario} />
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <MenuMobile
        aberto={menuAberto}
        aoFechar={fecharMenu}
        categorias={categorias}
        telefone={telefone}
        whatsapp={whatsapp}
        ativo={ativo}
        reduzido={Boolean(reduzido)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ busca */

/**
 * Um só campo para o topo e para a gaveta do celular: área de clique larga,
 * botão de enviar dentro da caixa e o foco marcado em dois sinais (borda e
 * anel), que é o que sobrevive à rolagem.
 */
function CampoBusca({
  id,
  ref,
  compacto,
}: {
  id: string;
  ref?: React.Ref<HTMLInputElement>;
  /** No topo já rolado a caixa perde 8px de altura, junto com o cabeçalho. */
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-xl items-center rounded-full border border-graf-450 bg-graf-50",
        "transition-[height,border-color,background-color] duration-200",
        "hover:border-graf-500 focus-within:border-jb-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-jb-500/15",
        compacto ? "h-11" : "h-12",
      )}
    >
      <Search className="ml-4.5 hidden size-4.5 shrink-0 text-graf-500 lg:block" aria-hidden />
      <label htmlFor={id} className="sr-only">
        Buscar no catálogo
      </label>
      <input
        ref={ref}
        id={id}
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Busque equipamento, marca, modelo ou peça"
        className="h-full min-w-0 flex-1 bg-transparent px-4 text-base text-graf-900 outline-none placeholder:text-graf-500 sm:text-[0.9375rem] lg:pl-3"
      />
      {/* Alvo de toque de 44px dentro de uma caixa de 44–48: o botão ocupa a
          altura inteira e o raio acompanha a caixa, sem virar pastilha preta
          disputando atenção com o CTA vermelho do topo. */}
      <button
        type="submit"
        aria-label="Buscar"
        /* 44px: é alvo de toque, e a caixa tem 44–48px de altura — daí o
           recuo de 2px só na versão alta. */
        className="mr-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-graf-600 transition-colors hover:bg-graf-200 hover:text-graf-950 active:bg-graf-300"
      >
        <Search className="size-4.5" aria-hidden />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- mega menu */

function MegaCatalogo({ categorias }: { categorias: CategoriaMenu[] }) {
  return (
    <div className="grid gap-10 xl:grid-cols-[1.7fr_1fr]">
      <div>
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-graf-500">Categorias</h2>
          <Link
            href="/loja"
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-jb-700 transition-colors hover:text-jb-800"
          >
            Ver o catálogo completo
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {categorias.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-graf-300 bg-graf-50 p-6">
            <p className="text-sm text-graf-600">
              As categorias ainda não foram publicadas. O catálogo continua aberto para
              navegação.
            </p>
            <Link
              href="/loja"
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-jb-700 hover:text-jb-800"
            >
              Ver todos os equipamentos
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="group flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-graf-50"
                >
                  <span className="text-sm font-medium text-graf-800 transition-colors group-hover:text-jb-700">
                    {categoria.name}
                  </span>
                  {categoria.count > 0 ? (
                    <span className="tabular shrink-0 text-xs text-graf-500">
                      {categoria.count}
                      <span className="sr-only"> equipamentos</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="xl:border-l xl:border-graf-200 xl:pl-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-graf-500">Por condição</h2>
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-1">
          {CONDICOES.map((condicao) => (
            <li key={condicao.slug}>
              <Link
                href={`/${condicao.slug}`}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-graf-800 transition-colors hover:bg-graf-50 hover:text-jb-700"
              >
                {condicao.rotulo}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-x-6 border-t border-graf-200 pt-4">
          <Link
            href="/marcas"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-jb-700 transition-colors hover:text-jb-800"
          >
            Ver todas as marcas
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <Link
            href="/pecas-e-acessorios"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-graf-700 transition-colors hover:text-jb-700"
          >
            Peças e acessórios
          </Link>
        </div>
      </div>
    </div>
  );
}

function MegaAssistencia({
  telefone,
  whatsapp,
  horario,
}: {
  telefone: string;
  whatsapp: string;
  horario: string;
}) {
  const temContato = Boolean(telefone || whatsapp);

  return (
    <div className={cn("grid gap-8", temContato && "xl:grid-cols-[2.3fr_1fr]")}>
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-graf-500">
          Assistência e manutenção
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {MENU_ASSISTENCIA.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-xl border border-graf-200 bg-white p-4 transition-[border-color,background-color] hover:border-jb-300 hover:bg-jb-50/50"
              >
                <span className="text-sm font-bold text-graf-950">{item.rotulo}</span>
                {item.descricao ? (
                  <span className="mt-1 text-xs leading-relaxed text-graf-500">
                    {item.descricao}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {temContato ? (
        <div className="on-dark flex flex-col rounded-xl bg-graf-950 p-5">
          <p className="text-sm font-bold text-white">Prefere falar com um técnico?</p>
          <p className="mt-1.5 text-xs leading-relaxed text-graf-300">
            {horario ? `Equipe técnica própria. ${horario}.` : "Equipe técnica própria."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {whatsapp ? (
              <a
                href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao("claro", "sm", "w-full")}
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden />
                WhatsApp {whatsapp}
              </a>
            ) : null}
            {telefone ? (
              <a
                href={telHref(telefone)}
                className={classesBotao("contorno-claro", "sm", "w-full")}
              >
                <Phone className="size-4 shrink-0" aria-hidden />
                {telefone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- gaveta */

function MenuMobile({
  aberto,
  aoFechar,
  categorias,
  telefone,
  whatsapp,
  ativo,
  reduzido,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categorias: CategoriaMenu[];
  telefone: string;
  whatsapp: string;
  ativo: (href: string) => boolean;
  reduzido: boolean;
}) {
  const [secao, setSecao] = useState<ChaveMega | null>(null);
  // foco preso, Esc, devolução do foco e rolagem travada:
  // `role="dialog"` sozinho não faz nada disso
  const caixa = usarDialogo(aberto, aoFechar);

  useEffect(() => {
    if (!aberto) setSecao(null);
  }, [aberto]);

  const alternar = (chave: ChaveMega) => setSecao((atual) => (atual === chave ? null : chave));

  return (
    <AnimatePresence>
      {aberto ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduzido ? 0 : 0.2 }}
            onClick={aoFechar}
            className="fixed inset-0 z-60 bg-graf-950/50 lg:hidden"
            aria-hidden
          />
          <motion.div
            ref={caixa}
            role="dialog"
            aria-label="Menu de navegação"
            aria-modal="true"
            tabIndex={-1}
            initial={{ x: reduzido ? 0 : "100%", opacity: reduzido ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduzido ? 0 : "100%", opacity: reduzido ? 0 : 1 }}
            transition={{ type: "tween", duration: reduzido ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-70 flex w-[min(23rem,92vw)] flex-col bg-white shadow-pop lg:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-graf-200 pl-5 pr-2">
              <Logo altura={32} />
              <button
                type="button"
                onClick={aoFechar}
                className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Fechar o menu</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Área da clínica primeiro: é o motivo mais comum de voltar.
                  O destino é sempre `/minha-jb`: com sessão, a área abre; sem
                  sessão, o proxy manda para `/entrar` já com o caminho de
                  volta. Antes o menu decidia isso pelo nome do cliente, que
                  vinha do layout e obrigava a casca inteira a esperar por uma
                  leitura de cookie. Um link que funciona nos dois casos custa
                  menos que um prerender perdido. */}
              <div className="border-b border-graf-200 p-4">
                <Link
                  href="/minha-jb"
                  className="flex items-center gap-3.5 rounded-xl border border-graf-200 bg-graf-50 p-4 transition-colors hover:border-graf-300 hover:bg-graf-100"
                >
                  <span
                    aria-hidden
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100"
                  >
                    <User className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-graf-500">
                      Área da Clínica
                    </span>
                    <span className="block truncate text-base font-bold text-graf-950">
                      Pedidos, equipamentos e chamados
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-graf-400" aria-hidden />
                </Link>

                {/* Os atalhos aparecem para todo mundo: cada um leva à rota
                    real, que pede login quando é o caso. Escondê-los de quem
                    não tem sessão exigiria saber quem é a pessoa aqui. */}
                <ul className="mt-2 grid grid-cols-2 gap-1.5">
                  {ATALHOS_CLIENTE.slice(0, 4).map((atalho) => (
                    <li key={atalho.href}>
                      <Link
                        href={atalho.href}
                        aria-current={ativo(atalho.href) ? "page" : undefined}
                        className="flex min-h-11 items-center rounded-lg border border-graf-200 px-3 text-[0.8125rem] font-semibold text-graf-700 transition-colors hover:border-graf-300 hover:text-jb-700"
                      >
                        {atalho.rotulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <nav aria-label="Menu principal" className="p-4">
                <ul className="space-y-0.5">
                  {MENU_PRINCIPAL.map((item) => {
                    const chave = item.megaMenu;
                    if (!chave) {
                      return (
                        <li key={item.href}>
                          <LinhaMenu item={item} ativo={ativo(item.href)} />
                        </li>
                      );
                    }

                    const expandido = secao === chave;
                    const painel = `gaveta-${chave}`;

                    return (
                      <li key={item.href}>
                        <button
                          type="button"
                          onClick={() => alternar(chave)}
                          aria-expanded={expandido}
                          aria-controls={painel}
                          className="flex min-h-13 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-graf-50"
                        >
                          <span className="min-w-0">
                            <span className="block text-base font-semibold text-graf-900">
                              {item.rotulo}
                            </span>
                            {item.descricao ? (
                              <span className="mt-0.5 block text-xs text-graf-500">
                                {item.descricao}
                              </span>
                            ) : null}
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-4.5 shrink-0 text-graf-500 transition-transform duration-200",
                              expandido && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>

                        <div id={painel} hidden={!expandido}>
                          <ul className="mb-2 ml-3 border-l border-graf-200 pl-3">
                            <li>
                              <Link
                                href={item.href}
                                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-jb-700 transition-colors hover:bg-graf-50"
                              >
                                {chave === "catalogo"
                                  ? "Ver todos os equipamentos"
                                  : "Ver a assistência técnica"}
                              </Link>
                            </li>

                            {chave === "catalogo"
                              ? categorias.map((categoria) => (
                                  <li key={categoria.slug}>
                                    <Link
                                      href={`/categoria/${categoria.slug}`}
                                      className="flex min-h-11 items-center rounded-lg px-3 text-sm text-graf-700 transition-colors hover:bg-graf-50"
                                    >
                                      {categoria.name}
                                    </Link>
                                  </li>
                                ))
                              : MENU_ASSISTENCIA.map((sub) => (
                                  <li key={sub.href}>
                                    <Link
                                      href={sub.href}
                                      className="flex min-h-11 items-center rounded-lg px-3 text-sm text-graf-700 transition-colors hover:bg-graf-50"
                                    >
                                      {sub.rotulo}
                                    </Link>
                                  </li>
                                ))}

                            {chave === "catalogo" ? (
                              <li className="mt-1 border-t border-graf-200 pt-1">
                                <ul>
                                  {CONDICOES.map((condicao) => (
                                    <li key={condicao.slug}>
                                      <Link
                                        href={`/${condicao.slug}`}
                                        className="flex min-h-11 items-center rounded-lg px-3 text-sm text-graf-700 transition-colors hover:bg-graf-50"
                                      >
                                        {condicao.rotulo}
                                      </Link>
                                    </li>
                                  ))}
                                  {/* Peças saiu da barra principal e vive aqui.
                                      Na gaveta do celular ela precisa aparecer
                                      explicitamente: sem esta linha, o único
                                      caminho seria a busca. */}
                                  <li>
                                    <Link
                                      href="/pecas-e-acessorios"
                                      className="flex min-h-11 items-center rounded-lg px-3 text-sm text-graf-700 transition-colors hover:bg-graf-50"
                                    >
                                      Peças e acessórios
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      href="/marcas"
                                      className="flex min-h-11 items-center rounded-lg px-3 text-sm text-graf-700 transition-colors hover:bg-graf-50"
                                    >
                                      Marcas
                                    </Link>
                                  </li>
                                </ul>
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <ul className="mt-4 space-y-0.5 border-t border-graf-200 pt-4">
                  <li>
                    <LinhaMenu
                      item={{ rotulo: "Favoritos", href: "/minha-jb/favoritos" }}
                      ativo={ativo("/minha-jb/favoritos")}
                    />
                  </li>
                  <li>
                    <LinhaMenu
                      item={{ rotulo: "Pedir orçamento", href: "/orcamento" }}
                      ativo={ativo("/orcamento")}
                    />
                  </li>
                  <li>
                    <LinhaMenu
                      item={{ rotulo: "Contato", href: "/contato" }}
                      ativo={ativo("/contato")}
                    />
                  </li>
                </ul>
              </nav>
            </div>

            {/* O que importa fica no alcance do polegar */}
            <div className="shrink-0 space-y-2 border-t border-graf-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao("primario", "md", "w-full")}
              >
                <Wrench className="size-4 shrink-0" aria-hidden />
                Solicitar assistência
              </Link>
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao("secundario", "md", "w-full")}
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  Falar no WhatsApp
                </a>
              ) : telefone ? (
                <a href={telHref(telefone)} className={classesBotao("secundario", "md", "w-full")}>
                  <Phone className="size-4 shrink-0" aria-hidden />
                  Ligar para {telefone}
                </a>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function LinhaMenu({ item, ativo }: { item: ItemMenu; ativo: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex min-h-13 flex-col justify-center rounded-lg px-3 py-2.5 transition-colors hover:bg-graf-50",
        ativo && "bg-jb-50",
      )}
    >
      <span
        className={cn("text-base font-semibold", ativo ? "text-jb-700" : "text-graf-900")}
      >
        {item.rotulo}
      </span>
      {item.descricao ? (
        <span className="mt-0.5 text-xs text-graf-500">{item.descricao}</span>
      ) : null}
    </Link>
  );
}
