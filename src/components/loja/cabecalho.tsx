"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock,
  GitCompareArrows,
  Heart,
  Menu,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Search,
  Settings,
  User,
  Wrench,
  X,
} from "lucide-react";

import { BuscaComSugestoes } from "@/components/loja/busca-sugestoes";
import { Logo } from "@/components/ui/logo";
import { classesBotao } from "@/components/ui/button";
import { useDialogo } from "@/components/ui/use-dialogo";
import {
  ATALHOS_CLIENTE,
  MENU_ASSISTENCIA,
  MENU_PRINCIPAL,
  rotaAtiva,
  type ItemMenu,
} from "@/lib/navegacao";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategoriaMenu = { slug: string; name: string; count: number };
export type CondicaoMenu = { slug: string; rotulo: string; total: number };

type Props = {
  categorias: CategoriaMenu[];
  condicoes: CondicaoMenu[];
  centralPublicada?: boolean;
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
  telefone: string;
  whatsapp: string;
  horario: string;
  desde: string;
  cidade: string;
};

type ChaveMegaPremium = "catalogo" | "seminovos" | "assistencia" | "manutencao" | "central";

const MENSAGEM_WHATSAPP = "Olá! Vim pelo site da JB.";

function chaveDoItem(item: ItemMenu): ChaveMegaPremium {
  if (item.href === "/loja") return "catalogo";
  if (item.href === "/seminovos") return "seminovos";
  if (item.href === "/assistencia-tecnica") return "assistencia";
  if (item.href === "/manutencao-preventiva") return "manutencao";
  return "central";
}

function recadosDaFaixa(desde: string, cidade: string) {
  return [
    "Equipamentos, assistência e pós-venda no mesmo relacionamento.",
    "Compare equipamentos lado a lado antes de decidir.",
    cidade.trim()
      ? `Assistência técnica própria — equipe JB em ${cidade}.`
      : "Assistência técnica com equipe própria.",
    desde.trim() ? `Em atividade desde ${desde}.` : null,
    "Acompanhe seus equipamentos e chamados na Área da Clínica.",
  ].filter((frase): frase is string => Boolean(frase));
}

function IconeMenu({ chave, className }: { chave: ChaveMegaPremium; className?: string }) {
  if (chave === "catalogo") return <Package className={className} aria-hidden />;
  if (chave === "seminovos") return <RefreshCw className={className} aria-hidden />;
  if (chave === "assistencia") return <Wrench className={className} aria-hidden />;
  if (chave === "manutencao") return <Settings className={className} aria-hidden />;
  return <BookOpen className={className} aria-hidden />;
}

/* ============================================================================
   Ticker da faixa superior

   A faixa já foi cinco recados em rolagem infinita, e a auditoria pegou o
   defeito: num marquee horizontal as frases entram e saem CORTADAS pela borda,
   e em 1440px a pessoa lia "…no mesmo relacionamento." de um lado e
   "Assistência técnica p…" do outro. Máscara de fade não resolve — troca o
   corte seco por um corte esmaecido, e segue ilegível.

   Então o movimento voltou, mas mudou de eixo: em vez de a frase atravessar a
   faixa, ela TROCA no lugar. Cada recado aparece inteiro, fica parado o tempo
   de ser lido e some para o próximo entrar. Nunca há meia palavra na tela.

   Três cuidados:
   · a lista inteira vive num `sr-only` estático, e a parte visível é
     `aria-hidden` — leitor de tela lê tudo uma vez em vez de ser interrompido a
     cada troca;
   · para o ponteiro e para o teclado, a rotação pausa: quem está lendo não
     perde a frase no meio;
   · com `prefers-reduced-motion` não há troca nenhuma — fica o primeiro recado,
     que é exatamente o comportamento anterior.
   ============================================================================ */
const INTERVALO_DO_TICKER = 5200;

/* Abaixo disto a faixa não tem largura para a frase inteira.
   Medido: a mais longa pede ~372px e sobram 280px a 320 e 350 a 390 — o texto
   sai com reticências. Uma frase cortada parada já era o comportamento
   anterior; CINCO frases cortadas passando seria pior que não ter ticker.
   A partir de 640px sobram ~600px e todas cabem. */
const LARGURA_MINIMA_DO_TICKER = 640;

function TickerDaFaixa({ recados }: { recados: string[] }) {
  const reduzido = useReducedMotion();
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [cabe, setCabe] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia(`(min-width: ${LARGURA_MINIMA_DO_TICKER}px)`);
    const aplicar = () => {
      setCabe(consulta.matches);
      if (!consulta.matches) setIndice(0);
    };
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    if (reduzido || pausado || !cabe || recados.length < 2) return;
    const id = window.setInterval(
      () => setIndice((i) => (i + 1) % recados.length),
      INTERVALO_DO_TICKER,
    );
    return () => window.clearInterval(id);
  }, [reduzido, pausado, cabe, recados.length]);

  if (recados.length === 0) return null;

  const atual = recados[Math.min(indice, recados.length - 1)];

  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {/* o que o leitor de tela recebe: a lista inteira, uma vez, sem rotação */}
      <span className="sr-only">{recados.join(" · ")}</span>

      <div aria-hidden className="grid px-5 py-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={atual}
            initial={reduzido ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzido ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduzido ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="col-start-1 row-start-1 truncate text-center text-[0.75rem] font-semibold text-white/95"
          >
            {atual}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function Cabecalho({
  categorias,
  condicoes,
  centralPublicada = true,
  acessoDaConta,
  contadorDoCarrinho,
  telefone,
  whatsapp,
  horario,
  desde,
  cidade,
}: Props) {
  const pathname = usePathname();
  const reduzido = useReducedMotion();
  const [compacto, setCompacto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const refCabecalho = useRef<HTMLElement>(null);
  const botaoBusca = useRef<HTMLButtonElement>(null);

  const fecharMenu = useCallback(() => setMenuAberto(false), []);

  useEffect(() => {
    const aoRolar = () => setCompacto(window.scrollY > 12);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  /* Fecha o que estiver aberto ao trocar de rota — mas nunca na montagem.

     O efeito também roda uma vez quando o componente monta, e é aí que ele
     fazia estrago: quem toca em "Abrir o menu" antes de a hidratação terminar
     abre a gaveta e vê o efeito de montagem fechá-la no mesmo instante. Dá
     uma gaveta que entra deslizando e volta sozinha, sem toque nenhum — 2 em
     10 aberturas, medido. Os três estados nascem fechados, então na montagem
     não há nada para fechar: pular a primeira passagem não perde nada. */
  const jaMontou = useRef(false);
  useEffect(() => {
    if (!jaMontou.current) {
      jaMontou.current = true;
      return;
    }
    setMenuAberto(false);
    setBuscaAberta(false);
  }, [pathname]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape" || menuAberto) return;
      if (buscaAberta) {
        setBuscaAberta(false);
        botaoBusca.current?.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [buscaAberta, menuAberto]);

  const ativo = (href: string) => rotaAtiva(pathname, href);

  const menu = centralPublicada
    ? MENU_PRINCIPAL
    : MENU_PRINCIPAL.filter((item) => item.href !== "/central-tecnica");

  const recados = recadosDaFaixa(desde, cidade);
  const temBarraUtilidade = recados.length > 0 || Boolean(horario || telefone || whatsapp);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-xl focus:bg-jb-700 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {temBarraUtilidade ? (
        <div data-jb-utility-bar="true" className="overflow-hidden bg-jb-700 text-white">
          <div className="mx-auto flex min-h-9 max-w-[105rem] items-center lg:px-10">
            {horario ? (
              <p className="hidden shrink-0 items-center gap-2 pr-6 text-[0.75rem] font-semibold text-white/90 lg:flex">
                <Clock className="size-4" aria-hidden />
                {horario}
              </p>
            ) : null}

            <TickerDaFaixa recados={recados} />

            <div className="ml-auto hidden shrink-0 items-center gap-4 pl-6 lg:flex">
              {telefone ? (
                <a
                  href={telHref(telefone)}
                  className="flex h-10 items-center gap-2 font-semibold text-white/90 transition hover:text-white"
                >
                  <Phone className="size-4" aria-hidden />
                  {telefone}
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center gap-2 font-bold text-white transition hover:text-white/80"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp {whatsapp}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <header
        ref={refCabecalho}
        data-jb-premium-header="true"
        className={cn(
          "sticky top-0 z-50 border-b border-graf-200/70 bg-white/96 backdrop-blur-xl transition-shadow duration-200",
          compacto && "shadow-[0_10px_35px_rgba(25,28,32,0.08)]",
        )}
      >
        <div className="mx-auto max-w-[105rem] px-5 sm:px-8 lg:px-10">
          <div
            className={cn(
              "flex items-center gap-4 transition-[height] duration-200",
              compacto ? "h-[60px]" : "h-[70px]",
            )}
          >
            <Link
              href="/"
              aria-label="JB Soluções Odontológicas — início"
              className="jb-logo flex min-h-11 shrink-0 items-center gap-3 rounded-lg"
            >
              <Logo altura={compacto ? 32 : 38} prioridade />
              {/* Assinatura em texto ao lado da marca, separada por um filete.
                  Some abaixo de 1024 porque ali a linha é do logo, da busca e
                  do menu — e volta no desktop, onde sobra largura e a marca
                  ganha em dizer o que vende. */}
              <span
                aria-hidden
                className="hidden border-l border-graf-200 pl-3 leading-tight xl:block"
              >
                <span className="block text-[0.7rem] font-bold text-graf-700">Soluções</span>
                <span className="block text-[0.7rem] font-black tracking-[0.08em] text-graf-950 uppercase">
                  Odontológicas
                </span>
              </span>
            </Link>

            <div className="jb-busca-topo ml-auto hidden min-w-0 max-w-[32rem] flex-1 lg:block">
              <BuscaComSugestoes id="busca-cabecalho" compacto={compacto} />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
              <button
                ref={botaoBusca}
                type="button"
                onClick={() => setBuscaAberta((v) => !v)}
                aria-expanded={buscaAberta}
                className="flex size-11 items-center justify-center rounded-xl text-graf-700 transition-colors hover:bg-jb-50 hover:text-jb-700 lg:hidden"
              >
                {buscaAberta ? (
                  <X className="size-5" aria-hidden />
                ) : (
                  <Search className="size-5" aria-hidden />
                )}
                <span className="sr-only">{buscaAberta ? "Fechar a busca" : "Buscar"}</span>
              </button>

              {/* Comparar e favoritos, os dois atalhos que o desenho do
                  protótipo traz ao lado do carrinho. As duas telas já
                  existiam — só não tinham porta no topo: comparar dependia de
                  achar a barra flutuante, e favoritos, de entrar na conta.
                  Escondidos abaixo de 1024 porque lá a linha é do logo, da
                  busca e do menu. */}
              <Link
                href="/comparar"
                className="hidden size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 lg:flex"
              >
                <GitCompareArrows className="size-5" aria-hidden />
                <span className="sr-only">Comparar equipamentos</span>
              </Link>
              <Link
                href="/minha-jb/favoritos"
                className="hidden size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 lg:flex"
              >
                <Heart className="size-5" aria-hidden />
                <span className="sr-only">Meus favoritos</span>
              </Link>

              {acessoDaConta}
              {contadorDoCarrinho}

              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao(
                  "primario",
                  "sm",
                  "jb-cta-topo ml-1.5 hidden min-h-11 rounded-xl px-4 shadow-[0_12px_28px_rgba(196,14,21,0.2)] lg:inline-flex xl:min-h-12 xl:px-5",
                )}
              >
                <Wrench className="size-4 shrink-0" aria-hidden />
                Solicitar assistência
              </Link>

              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                aria-haspopup="dialog"
                aria-expanded={menuAberto}
                className="ml-1 flex size-11 items-center justify-center rounded-xl border border-graf-200 text-graf-800 transition-colors hover:border-jb-200 hover:bg-jb-50 hover:text-jb-700 lg:hidden"
              >
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Abrir o menu</span>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {buscaAberta ? (
            <motion.div
              key="busca-celular"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: reduzido ? 0 : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden border-t border-graf-200 bg-white lg:hidden"
            >
              <div className="mx-auto max-w-[105rem] px-5 py-3 sm:px-8">
                <BuscaComSugestoes id="busca-celular" compacto focoInicial />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <MenuMobile
        aberto={menuAberto}
        aoFechar={fecharMenu}
        categorias={categorias}
        condicoes={condicoes}
        menu={menu}
        telefone={telefone}
        whatsapp={whatsapp}
        ativo={ativo}
        reduzido={Boolean(reduzido)}
      />
    </>
  );
}

function subitensMobile(
  chave: ChaveMegaPremium,
  categorias: CategoriaMenu[],
  condicoes: CondicaoMenu[],
): ItemMenu[] {
  if (chave === "catalogo") {
    return [
      ...categorias.slice(0, 5).map((categoria) => ({
        rotulo: categoria.name,
        href: `/categoria/${categoria.slug}`,
      })),
      ...condicoes.slice(0, 2).map((condicao) => ({
        rotulo: condicao.rotulo,
        href: `/${condicao.slug}`,
      })),
      { rotulo: "Marcas", href: "/marcas" },
      { rotulo: "Peças e acessórios", href: "/pecas-e-acessorios" },
    ];
  }
  if (chave === "seminovos") {
    return [
      { rotulo: "Ver seminovos", href: "/seminovos" },
      { rotulo: "Comparar equipamentos", href: "/comparar" },
      { rotulo: "Simulador de custo", href: "/simulador-de-custo" },
    ];
  }
  if (chave === "assistencia") return MENU_ASSISTENCIA;
  if (chave === "manutencao") {
    return [
      { rotulo: "Manutenção preventiva", href: "/manutencao-preventiva" },
      { rotulo: "Planos de manutenção", href: "/planos-de-manutencao" },
      { rotulo: "Serviços", href: "/servicos" },
      { rotulo: "Pedir orçamento", href: "/orcamento" },
    ];
  }
  return [
    { rotulo: "Central Técnica", href: "/central-tecnica" },
    { rotulo: "Cases técnicos", href: "/cases" },
    { rotulo: "Dúvidas frequentes", href: "/faq" },
    { rotulo: "Nossa estrutura", href: "/estrutura" },
  ];
}

function MenuMobile({
  aberto,
  aoFechar,
  categorias,
  condicoes,
  menu,
  telefone,
  whatsapp,
  ativo,
  reduzido,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categorias: CategoriaMenu[];
  condicoes: CondicaoMenu[];
  menu: ItemMenu[];
  telefone: string;
  whatsapp: string;
  ativo: (href: string) => boolean;
  reduzido: boolean;
}) {
  const [secao, setSecao] = useState<ChaveMegaPremium | null>(null);
  const caixa = useDialogo(aberto, aoFechar);

  useEffect(() => {
    if (!aberto) setSecao(null);
  }, [aberto]);

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
            className="fixed inset-0 z-60 bg-graf-950/45 backdrop-blur-[2px] lg:hidden"
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
            transition={{
              type: "tween",
              duration: reduzido ? 0 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="fixed inset-y-0 right-0 z-70 flex w-[min(25rem,94vw)] flex-col bg-white shadow-[0_0_70px_rgba(26,28,30,0.25)] lg:hidden"
          >
            <div className="flex h-17 shrink-0 items-center justify-between border-b border-graf-200 px-5 pr-3">
              <Logo altura={35} />
              <button
                type="button"
                onClick={aoFechar}
                className="flex size-11 items-center justify-center rounded-xl text-graf-700 transition hover:bg-jb-50 hover:text-jb-700"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Fechar o menu</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 pb-2">
                <Link
                  href="/minha-jb"
                  className="flex items-center gap-3.5 rounded-2xl border border-jb-100 bg-gradient-to-r from-jb-50 to-white p-4"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-jb-700 shadow-sm ring-1 ring-jb-100">
                    <User className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-graf-950">
                      Área da Clínica
                    </span>
                    <span className="mt-0.5 block text-xs text-graf-500">
                      Pedidos, equipamentos e chamados
                    </span>
                  </span>
                  <ArrowRight className="ml-auto size-4 text-jb-600" aria-hidden />
                </Link>
              </div>

              <nav aria-label="Menu principal no celular" className="p-4 pt-2">
                <ul className="space-y-2">
                  {menu.map((item) => {
                    const chave = chaveDoItem(item);
                    const abertoSecao = secao === chave;
                    return (
                      <li
                        key={item.href}
                        className="overflow-hidden rounded-2xl border border-graf-200/80 bg-white"
                      >
                        <div className="flex items-stretch">
                          <Link
                            href={item.href}
                            aria-current={ativo(item.href) ? "page" : undefined}
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-3 p-3.5",
                              ativo(item.href) && "bg-jb-50",
                            )}
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-50 text-jb-600">
                              <IconeMenu chave={chave} className="size-4" />
                            </span>
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block text-sm font-extrabold",
                                  ativo(item.href) ? "text-jb-700" : "text-graf-950",
                                )}
                              >
                                {item.rotulo}
                              </span>
                              {item.descricao ? (
                                <span className="mt-0.5 block text-[0.7rem] leading-snug text-graf-500">
                                  {item.descricao}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSecao(abertoSecao ? null : chave)}
                            aria-expanded={abertoSecao}
                            aria-label={`${abertoSecao ? "Fechar" : "Abrir"} opções de ${item.rotulo}`}
                            className="flex w-12 shrink-0 items-center justify-center border-l border-graf-200 text-graf-500 hover:bg-jb-50 hover:text-jb-700"
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                abertoSecao && "rotate-180",
                              )}
                              aria-hidden
                            />
                          </button>
                        </div>
                        <AnimatePresence initial={false}>
                          {abertoSecao ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: reduzido ? 0 : 0.18 }}
                              className="overflow-hidden border-t border-graf-200 bg-graf-50/70"
                            >
                              <ul className="p-2">
                                {subitensMobile(chave, categorias, condicoes).map((sub) => (
                                  <li key={sub.href}>
                                    <Link
                                      href={sub.href}
                                      className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-graf-700 transition hover:bg-white hover:text-jb-700"
                                    >
                                      {sub.rotulo}
                                      <ArrowRight className="ml-auto size-3.5 opacity-40" aria-hidden />
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 border-t border-graf-200 pt-4">
                  <p className="px-2 text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-graf-500">
                    Área da Clínica
                  </p>
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {ATALHOS_CLIENTE.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-graf-700 hover:bg-jb-50 hover:text-jb-700"
                        >
                          {item.rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>
            </div>

            <div className="shrink-0 space-y-2 border-t border-graf-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao("primario", "md", "w-full rounded-xl")}
              >
                <Wrench className="size-4 shrink-0" aria-hidden /> Solicitar assistência
              </Link>
              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classesBotao("secundario", "md", "w-full rounded-xl")}
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden /> Falar no WhatsApp
                </a>
              ) : telefone ? (
                <a
                  href={telHref(telefone)}
                  className={classesBotao("secundario", "md", "w-full rounded-xl")}
                >
                  <Phone className="size-4 shrink-0" aria-hidden /> Ligar para {telefone}
                </a>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
