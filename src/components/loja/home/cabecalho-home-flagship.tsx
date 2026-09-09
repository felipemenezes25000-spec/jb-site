"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  Clock3,
  Menu,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import { BuscaComSugestoes } from "@/components/loja/busca-sugestoes";
import { Logo } from "@/components/ui/logo";
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

import styles from "./cabecalho-home-flagship.module.css";

export type CategoriaMenuHome = { slug: string; name: string; count: number };
export type CondicaoMenuHome = { slug: string; rotulo: string; total: number };

type Props = {
  categorias: CategoriaMenuHome[];
  condicoes: CondicaoMenuHome[];
  centralPublicada?: boolean;
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
  telefone: string;
  whatsapp: string;
  horario: string;
  desde: string;
  cidade: string;
};

type Chave = "catalogo" | "seminovos" | "assistencia" | "manutencao" | "central";

const MENSAGEM_WHATSAPP = "Olá! Vim pelo site da JB.";

function chaveDoItem(item: ItemMenu): Chave {
  if (item.href === "/loja") return "catalogo";
  if (item.href === "/seminovos") return "seminovos";
  if (item.href === "/assistencia-tecnica") return "assistencia";
  if (item.href === "/manutencao-preventiva") return "manutencao";
  return "central";
}

function IconeMenu({ chave, className }: { chave: Chave; className?: string }) {
  if (chave === "catalogo") return <Package className={className} aria-hidden />;
  if (chave === "seminovos") return <RefreshCw className={className} aria-hidden />;
  if (chave === "assistencia") return <Wrench className={className} aria-hidden />;
  if (chave === "manutencao") return <Settings className={className} aria-hidden />;
  return <BookOpen className={className} aria-hidden />;
}

function mensagensTicker(cidade: string, desde: string) {
  return [
    "Equipamentos + assistência + pós-venda",
    "Compare até 3 equipamentos lado a lado",
    "Seminovos revisados pela JB",
    cidade.trim() ? `Assistência técnica própria em ${cidade}` : "Assistência técnica própria",
    "Área da Clínica para pedidos e chamados",
    desde.trim() ? `JB em atividade desde ${desde}` : "Compra com continuidade técnica",
  ];
}

export function CabecalhoHomeFlagship({
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
  const [mega, setMega] = useState<Chave | null>(null);
  const [menuMobile, setMenuMobile] = useState(false);
  const [buscaMobile, setBuscaMobile] = useState(false);
  const fecharTimer = useRef<number | null>(null);
  const botaoBusca = useRef<HTMLButtonElement>(null);

  const menu = centralPublicada
    ? MENU_PRINCIPAL
    : MENU_PRINCIPAL.filter((item) => item.href !== "/central-tecnica");

  const mensagens = mensagensTicker(cidade, desde);

  useEffect(() => {
    const aoRolar = () => setCompacto(window.scrollY > 56);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    setMega(null);
    setMenuMobile(false);
    setBuscaMobile(false);
  }, [pathname]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (mega) {
        setMega(null);
        return;
      }
      if (buscaMobile) {
        setBuscaMobile(false);
        botaoBusca.current?.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [mega, buscaMobile]);

  useEffect(
    () => () => {
      if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    },
    [],
  );

  const cancelarFechamento = useCallback(() => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  }, []);

  const agendarFechamento = useCallback(() => {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => setMega(null), 150);
  }, []);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-jb-700 focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <div className="relative z-[61] bg-gradient-to-r from-jb-800 via-jb-500 to-jb-700 text-white">
        <div className="mx-auto grid h-10 max-w-[112rem] grid-cols-[minmax(0,1fr)] items-center px-4 sm:px-6 lg:grid-cols-[max-content_minmax(0,1fr)_max-content] lg:gap-7 lg:px-10">
          <div className="hidden items-center gap-2 border-r border-white/15 pr-5 text-[0.68rem] font-extrabold text-white/90 lg:flex">
            <Clock3 className="size-3.5" aria-hidden />
            {horario || "Atendimento JB"}
          </div>

          <div className={styles.tickerViewport} aria-label="Diferenciais da JB">
            <div className={styles.tickerTrack}>
              {[0, 1].map((grupo) => (
                <div key={grupo} className={styles.tickerGroup} aria-hidden={grupo === 1}>
                  {mensagens.map((mensagem) => (
                    <span key={`${grupo}-${mensagem}`} className={styles.tickerItem}>
                      <span className={styles.tickerDot} aria-hidden />
                      {mensagem}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-4 border-l border-white/15 pl-5 text-[0.68rem] font-extrabold lg:flex">
            {telefone ? (
              <a href={telHref(telefone)} className="inline-flex items-center gap-1.5 text-white/90 transition hover:text-white">
                <Phone className="size-3.5" aria-hidden />
                {telefone}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-white transition hover:text-white/75"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-[60] border-b border-jb-100/90 bg-white/97 backdrop-blur-2xl transition-shadow duration-200",
          compacto && "shadow-[0_18px_50px_-38px_rgba(92,8,14,0.45)]",
        )}
        onMouseLeave={agendarFechamento}
        onMouseEnter={cancelarFechamento}
        data-jb-home-header-v2="true"
      >
        <span className={styles.brandHalo} aria-hidden />

        <div className="mx-auto max-w-[112rem] px-4 sm:px-6 lg:px-10">
          <div
            className={cn(
              "grid items-center gap-3 transition-[height] duration-200 lg:grid-cols-[minmax(10.5rem,14rem)_minmax(24rem,1fr)_max-content] lg:gap-5 xl:grid-cols-[minmax(13rem,16rem)_minmax(28rem,1fr)_max-content] xl:gap-7",
              compacto ? "h-[64px]" : "h-[78px]",
            )}
          >
            <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
              <Link href="/" aria-label="JB Soluções Odontológicas — início" className="group flex min-h-12 shrink-0 items-center">
                <Logo altura={compacto ? 32 : 38} prioridade />
                <span className="ml-4 hidden border-l border-jb-100 pl-4 text-[0.52rem] font-black uppercase leading-[1.28] tracking-[0.13em] text-jb-700 2xl:block">
                  Marketplace<br />odontológico
                </span>
              </Link>

              <div className="ml-auto flex items-center gap-1 lg:hidden">
                <button
                  ref={botaoBusca}
                  type="button"
                  onClick={() => setBuscaMobile((valor) => !valor)}
                  aria-expanded={buscaMobile}
                  className="grid size-11 place-items-center rounded-full text-graf-950 transition hover:bg-jb-50 hover:text-jb-700"
                >
                  {buscaMobile ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
                  <span className="sr-only">{buscaMobile ? "Fechar busca" : "Abrir busca"}</span>
                </button>
                <div className="contents">{acessoDaConta}</div>
                <div className="contents">{contadorDoCarrinho}</div>
                <button
                  type="button"
                  onClick={() => setMenuMobile(true)}
                  aria-haspopup="dialog"
                  aria-expanded={menuMobile}
                  className="grid size-11 place-items-center rounded-full bg-jb-50 text-jb-700 transition hover:bg-jb-100"
                >
                  <Menu className="size-5" aria-hidden />
                  <span className="sr-only">Abrir menu</span>
                </button>
              </div>
            </div>

            <div className="hidden min-w-0 lg:block">
              <BuscaComSugestoes
                id="busca-home-flagship"
                compacto={compacto}
                placeholder="Busque equipamento, marca, modelo, peça ou SKU"
                className="w-full"
              />
            </div>

            <div className="hidden items-center justify-end gap-1.5 lg:flex">
              <div className="rounded-full transition hover:bg-jb-50">{acessoDaConta}</div>
              <div className="rounded-full transition hover:bg-jb-50">{contadorDoCarrinho}</div>
              <Link
                href="/assistencia-tecnica/solicitar"
                className="ml-1.5 inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-jb-500 to-jb-700 px-5 text-[0.76rem] font-black text-white shadow-[0_18px_34px_-24px_rgba(150,8,18,0.7)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_-22px_rgba(150,8,18,0.72)]"
              >
                <Wrench className="size-4" aria-hidden />
                Solicitar assistência
              </Link>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {buscaMobile ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduzido ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-jb-100 bg-white lg:hidden"
            >
              <div className="mx-auto max-w-[112rem] px-4 py-3 sm:px-6">
                <BuscaComSugestoes id="busca-home-mobile" compacto focoInicial />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className={cn("hidden border-t border-jb-100/90 bg-white/88 lg:block", compacto && "2xl:hidden")}>
          <div className="mx-auto flex min-h-[54px] max-w-[112rem] items-center justify-between gap-5 px-8 lg:px-10">
            <nav aria-label="Principal da home" className="flex min-w-0 flex-1 items-center justify-center gap-1 xl:gap-2">
              {menu.map((item) => {
                const chave = chaveDoItem(item);
                const aberto = mega === chave;
                const ativo = rotaAtiva(pathname, item.href);
                return (
                  <div
                    key={item.href}
                    className={cn(
                      "relative flex h-11 items-center rounded-full transition",
                      (aberto || ativo) && "bg-jb-50",
                    )}
                    onMouseEnter={() => {
                      cancelarFechamento();
                      setMega(chave);
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      onFocus={() => setMega(chave)}
                      className={cn(
                        "group flex h-11 items-center gap-2 rounded-full pl-4 pr-2 text-[0.78rem] font-extrabold transition xl:px-4",
                        aberto || ativo ? "text-jb-700" : "text-graf-950 hover:text-jb-700",
                      )}
                    >
                      <IconeMenu chave={chave} className="size-4 shrink-0 text-jb-600 transition-transform group-hover:-translate-y-0.5" />
                      <span className="whitespace-nowrap">{item.rotulo}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMega(aberto ? null : chave)}
                      onFocus={() => setMega(chave)}
                      aria-expanded={aberto}
                      aria-label={`${aberto ? "Fechar" : "Abrir"} menu de ${item.rotulo}`}
                      className="mr-1 grid size-8 place-items-center rounded-full text-graf-950/55 transition hover:bg-white hover:text-jb-700"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", aberto && "rotate-180")} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </nav>

            <div className="hidden shrink-0 items-center gap-2 2xl:flex">
              <Link href="/comparar" className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[0.69rem] font-black uppercase tracking-[0.08em] text-jb-700 transition hover:bg-jb-50">
                <Sparkles className="size-3.5" aria-hidden /> Comparar
              </Link>
              <Link href="/marcas" className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[0.69rem] font-black uppercase tracking-[0.08em] text-graf-950 transition hover:bg-jb-50 hover:text-jb-700">
                <Tag className="size-3.5" aria-hidden /> Marcas
              </Link>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mega ? (
            <motion.div
              key={mega}
              initial={{ opacity: 0, y: reduzido ? 0 : -8, scaleY: reduzido ? 1 : 0.985 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: reduzido ? 0 : -5, scaleY: reduzido ? 1 : 0.99 }}
              transition={{ duration: reduzido ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={cancelarFechamento}
              onMouseLeave={agendarFechamento}
              className="absolute inset-x-0 top-full hidden px-4 pt-2 lg:block"
            >
              <div className={cn(styles.megaPanel, "relative mx-auto max-h-[75dvh] max-w-[108rem] overflow-y-auto rounded-[2rem] border border-jb-100 bg-white shadow-[0_38px_88px_-48px_rgba(61,7,12,0.42)]")}>
                <MegaHome
                  chave={mega}
                  categorias={categorias}
                  condicoes={condicoes}
                  telefone={telefone}
                  whatsapp={whatsapp}
                  horario={horario}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <MenuMobileHome
        aberto={menuMobile}
        aoFechar={() => setMenuMobile(false)}
        menu={menu}
        categorias={categorias}
        condicoes={condicoes}
        telefone={telefone}
        whatsapp={whatsapp}
        reduzido={Boolean(reduzido)}
      />
    </>
  );
}

function CabecalhoMega({ etiqueta, titulo, texto }: { etiqueta: string; titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-[0.64rem] font-black uppercase tracking-[0.17em] text-jb-700">{etiqueta}</p>
      <h2 className="mt-2 max-w-[22ch] font-display text-[clamp(1.55rem,2.1vw,2.35rem)] font-black leading-[0.98] tracking-[-0.045em] text-graf-950">{titulo}</h2>
      <p className="mt-3 max-w-[45rem] text-sm font-medium leading-relaxed text-graf-950/62">{texto}</p>
    </div>
  );
}

function LinkLinha({
  href,
  icone,
  titulo,
  apoio,
  final,
}: {
  href: string;
  icone: React.ReactNode;
  titulo: string;
  apoio?: string;
  final?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex min-h-[66px] items-center gap-3 border-b border-jb-100 py-3.5 last:border-b-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-700 transition group-hover:bg-jb-500 group-hover:text-white">{icone}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-black text-graf-950 transition group-hover:text-jb-700">{titulo}</strong>
        {apoio ? <small className="mt-1 block text-[0.72rem] font-semibold leading-snug text-graf-950/55">{apoio}</small> : null}
      </span>
      {final ?? <ArrowRight className="size-3.5 shrink-0 text-jb-600 transition-transform group-hover:translate-x-1" aria-hidden />}
    </Link>
  );
}

function MegaHome({
  chave,
  categorias,
  condicoes,
  telefone,
  whatsapp,
  horario,
}: {
  chave: Chave;
  categorias: CategoriaMenuHome[];
  condicoes: CondicaoMenuHome[];
  telefone: string;
  whatsapp: string;
  horario: string;
}) {
  if (chave === "catalogo") return <MegaCatalogo categorias={categorias} condicoes={condicoes} />;
  if (chave === "seminovos") return <MegaSeminovos categorias={categorias} />;
  if (chave === "assistencia") return <MegaAssistencia telefone={telefone} whatsapp={whatsapp} horario={horario} />;
  if (chave === "manutencao") return <MegaManutencao />;
  return <MegaCentral />;
}

function MegaCatalogo({ categorias, condicoes }: { categorias: CategoriaMenuHome[]; condicoes: CondicaoMenuHome[] }) {
  return (
    <div className="grid xl:grid-cols-[1.55fr_0.8fr_0.72fr]">
      <section className="p-7 xl:p-8">
        <CabecalhoMega etiqueta="Catálogo" titulo="Encontre o equipamento pelo que a clínica precisa." texto="Categorias, condição de compra e ferramentas de decisão no mesmo menu — sem transformar a navegação numa parede de caixas." />
        <div className="mt-6 grid gap-x-7 sm:grid-cols-2">
          {categorias.slice(0, 8).map((categoria, indice) => (
            <LinkLinha
              key={categoria.slug}
              href={`/categoria/${categoria.slug}`}
              icone={indice % 2 === 0 ? <Package className="size-4" aria-hidden /> : <Settings className="size-4" aria-hidden />}
              titulo={categoria.name}
              apoio={categoria.count > 0 ? `${categoria.count} equipamentos publicados` : "Explorar categoria"}
            />
          ))}
        </div>
        <Link href="/loja" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-jb-500 px-5 text-sm font-black text-white transition hover:bg-jb-600">
          Ver catálogo completo <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <section className="border-l border-jb-100 bg-[#fffafa] p-7 xl:p-8">
        <p className="text-[0.63rem] font-black uppercase tracking-[0.16em] text-jb-700">Condição</p>
        <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-graf-950">Como quer comprar?</h3>
        <div className="mt-5">
          {condicoes.slice(0, 4).map((condicao) => (
            <LinkLinha
              key={condicao.slug}
              href={`/${condicao.slug}`}
              icone={<BadgeCheck className="size-4" aria-hidden />}
              titulo={condicao.rotulo}
              apoio={condicao.total > 0 ? `${condicao.total} disponíveis agora` : "Explorar seleção"}
            />
          ))}
        </div>
      </section>

      <aside className="relative overflow-hidden border-l border-jb-100 p-7 xl:p-8">
        <div className="absolute -right-16 -top-16 size-52 rounded-full bg-jb-50 blur-2xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-jb-50 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.13em] text-jb-700">
            <Sparkles className="size-3.5" aria-hidden /> Decisão
          </span>
          <h3 className="mt-5 font-display text-[1.75rem] font-black leading-[1.02] tracking-[-0.045em] text-graf-950">Compare antes de gastar.</h3>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-graf-950/58">Preço, condição e características lado a lado.</p>
          <div className="mt-6">
            <LinkLinha href="/comparar" icone={<Package className="size-4" aria-hidden />} titulo="Comparar equipamentos" apoio="Até 3 opções lado a lado" />
            <LinkLinha href="/marcas" icone={<Tag className="size-4" aria-hidden />} titulo="Explorar por marca" apoio="Navegue pelo fabricante" />
            <LinkLinha href="/pecas-e-acessorios" icone={<Settings className="size-4" aria-hidden />} titulo="Peças e acessórios" apoio="Encontre por necessidade" />
          </div>
        </div>
      </aside>
    </div>
  );
}

function MegaSeminovos({ categorias }: { categorias: CategoriaMenuHome[] }) {
  return (
    <div className="grid xl:grid-cols-[0.92fr_1.25fr_0.72fr]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff3f3] to-white p-8">
        <div className="absolute -left-12 top-1/2 size-52 -translate-y-1/2 rounded-full bg-jb-100/55 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="grid size-12 place-items-center rounded-full bg-white text-jb-700 shadow-[0_18px_36px_-30px_rgba(108,8,14,0.55)] ring-1 ring-jb-100"><RefreshCw className="size-5" aria-hidden /></span>
          <h2 className="mt-6 max-w-[12ch] font-display text-[2.2rem] font-black leading-[0.95] tracking-[-0.05em] text-graf-950">Seminovo não precisa parecer aposta.</h2>
          <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-graf-950/62">Entre pela seleção JB, compare alternativas e veja a condição declarada antes de decidir.</p>
          <Link href="/seminovos" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-jb-500 px-5 text-sm font-black text-white transition hover:bg-jb-600">Ver seminovos <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </section>

      <section className="border-l border-jb-100 p-8">
        <p className="text-[0.63rem] font-black uppercase tracking-[0.16em] text-jb-700">Por categoria</p>
        <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-graf-950">Vá direto ao tipo de equipamento.</h3>
        <div className="mt-5 grid gap-x-7 sm:grid-cols-2">
          {categorias.slice(0, 6).map((categoria) => (
            <LinkLinha key={categoria.slug} href={`/categoria/${categoria.slug}`} icone={<Package className="size-4" aria-hidden />} titulo={categoria.name} apoio={categoria.count > 0 ? `${categoria.count} no catálogo` : "Explorar"} />
          ))}
        </div>
      </section>

      <aside className="border-l border-jb-100 bg-[#fffafa] p-8">
        <p className="text-[0.63rem] font-black uppercase tracking-[0.16em] text-jb-700">Ferramentas</p>
        <div className="mt-4">
          <LinkLinha href="/comparar" icone={<Sparkles className="size-4" aria-hidden />} titulo="Comparar" apoio="Novo x seminovo lado a lado" />
          <LinkLinha href="/simulador-de-custo" icone={<RefreshCw className="size-4" aria-hidden />} titulo="Simular decisão" apoio="Reparar, seminovo ou novo" />
          <LinkLinha href="/marcas" icone={<Tag className="size-4" aria-hidden />} titulo="Ver marcas" apoio="Filtre por fabricante" />
        </div>
      </aside>
    </div>
  );
}

function MegaAssistencia({ telefone, whatsapp, horario }: { telefone: string; whatsapp: string; horario: string }) {
  return (
    <div className="grid xl:grid-cols-[1.25fr_0.72fr_0.65fr]">
      <section className="p-8">
        <CabecalhoMega etiqueta="Assistência técnica" titulo="Resolva sem procurar o caminho certo em cinco páginas." texto="Abra chamado, entenda o fluxo, cuide da prevenção e acompanhe a operação da clínica pela JB." />
        <div className="mt-6 grid gap-x-8 sm:grid-cols-2">
          {MENU_ASSISTENCIA.map((item, indice) => (
            <LinkLinha key={item.href} href={item.href} icone={indice === 0 ? <Wrench className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />} titulo={item.rotulo} apoio={item.descricao} />
          ))}
        </div>
      </section>

      <section className="border-l border-jb-100 bg-[#fffafa] p-8">
        <p className="text-[0.63rem] font-black uppercase tracking-[0.16em] text-jb-700">Fluxo JB</p>
        <ol className="mt-6 space-y-5">
          {["Abra o chamado", "A equipe analisa", "Você acompanha"].map((etapa, indice) => (
            <li key={etapa} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-jb-500 text-xs font-black text-white">0{indice + 1}</span>
              <div>
                <strong className="text-sm font-black text-graf-950">{etapa}</strong>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-graf-950/55">{indice === 0 ? "Informe equipamento e necessidade." : indice === 1 ? "Diagnóstico e próximo passo organizados." : "Status e histórico na Área da Clínica."}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="flex flex-col bg-gradient-to-br from-jb-600 to-jb-800 p-8 text-white">
        <span className="grid size-11 place-items-center rounded-full bg-white/12 ring-1 ring-white/18"><UserRound className="size-5" aria-hidden /></span>
        <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-white">Quer falar com a equipe?</h3>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-white/75">{horario || "Atendimento técnico JB"}</p>
        <div className="mt-auto space-y-2 pt-7">
          {whatsapp ? <a href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-jb-800"><MessageCircle className="size-4" aria-hidden /> WhatsApp</a> : null}
          {telefone ? <a href={telHref(telefone)} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-4 text-sm font-black text-white transition hover:bg-white/10"><Phone className="size-4" aria-hidden /> {telefone}</a> : null}
        </div>
      </aside>
    </div>
  );
}

function MegaManutencao() {
  const links = [
    ["/manutencao-preventiva", "Manutenção preventiva", "Planeje antes da parada", Settings],
    ["/planos-de-manutencao", "Planos de manutenção", "Acompanhamento contínuo", ShieldCheck],
    ["/servicos", "Serviços técnicos", "Veja o que a JB executa", Wrench],
    ["/orcamento", "Pedir orçamento", "Leve a necessidade para a equipe", ArrowRight],
  ] as const;

  return (
    <div className="grid xl:grid-cols-[1.4fr_0.75fr]">
      <section className="p-8">
        <CabecalhoMega etiqueta="Manutenção" titulo="A melhor parada é a que foi evitada." texto="Centralize prevenção, planos, serviços e orçamento num caminho que faça sentido para quem cuida da operação." />
        <div className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {links.map(([href, titulo, apoio, Icone]) => <LinkLinha key={href} href={href} icone={<Icone className="size-4" aria-hidden />} titulo={titulo} apoio={apoio} />)}
        </div>
      </section>
      <aside className="relative overflow-hidden border-l border-jb-100 bg-[#fffafa] p-8">
        <div className="absolute -right-14 -top-14 size-52 rounded-full bg-jb-100/70 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.13em] text-jb-700 ring-1 ring-jb-100"><ShieldCheck className="size-3.5" aria-hidden /> Continuidade</span>
          <h3 className="mt-5 max-w-[14ch] font-display text-[2rem] font-black leading-[0.98] tracking-[-0.045em] text-graf-950">Compra, instalação e manutenção no mesmo relacionamento.</h3>
          <Link href="/manutencao-preventiva" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-jb-500 px-5 text-sm font-black text-white">Conhecer manutenção <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </aside>
    </div>
  );
}

function MegaCentral() {
  const links = [
    ["/central-tecnica", "Central Técnica", "Conteúdo da bancada", BookOpen],
    ["/cases", "Cases técnicos", "Experiências publicadas", Sparkles],
    ["/faq", "Dúvidas frequentes", "Respostas rápidas", MessageCircle],
    ["/estrutura", "Nossa estrutura", "Conheça a JB por dentro", Settings],
    ["/sobre", "Sobre a JB", "História e posicionamento", UserRound],
    ["/contato", "Contato", "Fale com a equipe", Phone],
  ] as const;

  return (
    <div className="grid xl:grid-cols-[1.35fr_0.72fr]">
      <section className="p-8">
        <CabecalhoMega etiqueta="Central Técnica" titulo="Conhecimento técnico também faz parte da compra." texto="Conteúdo, casos, dúvidas e estrutura organizados para aprofundar a decisão sem virar menu institucional." />
        <div className="mt-6 grid gap-x-9 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(([href, titulo, apoio, Icone]) => <LinkLinha key={href} href={href} icone={<Icone className="size-4" aria-hidden />} titulo={titulo} apoio={apoio} />)}
        </div>
      </section>
      <aside className="relative overflow-hidden border-l border-jb-100 bg-gradient-to-br from-[#fff4f4] to-white p-8">
        <span className="grid size-12 place-items-center rounded-full bg-white text-jb-700 shadow-sm ring-1 ring-jb-100"><BookOpen className="size-5" aria-hidden /></span>
        <h3 className="mt-6 max-w-[13ch] font-display text-[2rem] font-black leading-[0.98] tracking-[-0.045em] text-graf-950">O que a bancada aprende vira referência.</h3>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-graf-950/58">A Central Técnica conecta produto, manutenção e conhecimento real da operação.</p>
        <Link href="/central-tecnica" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-jb-500 px-5 text-sm font-black text-white">Explorar conteúdo <ArrowRight className="size-4" aria-hidden /></Link>
      </aside>
    </div>
  );
}

function subitensMobile(chave: Chave, categorias: CategoriaMenuHome[], condicoes: CondicaoMenuHome[]) {
  if (chave === "catalogo") return [
    ...categorias.slice(0, 5).map((item) => ({ href: `/categoria/${item.slug}`, rotulo: item.name })),
    ...condicoes.slice(0, 2).map((item) => ({ href: `/${item.slug}`, rotulo: item.rotulo })),
    { href: "/marcas", rotulo: "Marcas" },
    { href: "/comparar", rotulo: "Comparar" },
  ];
  if (chave === "seminovos") return [
    { href: "/seminovos", rotulo: "Ver seminovos" },
    { href: "/comparar", rotulo: "Comparar equipamentos" },
    { href: "/simulador-de-custo", rotulo: "Simulador de custo" },
  ];
  if (chave === "assistencia") return MENU_ASSISTENCIA.map(({ href, rotulo }) => ({ href, rotulo }));
  if (chave === "manutencao") return [
    { href: "/manutencao-preventiva", rotulo: "Manutenção preventiva" },
    { href: "/planos-de-manutencao", rotulo: "Planos" },
    { href: "/servicos", rotulo: "Serviços" },
    { href: "/orcamento", rotulo: "Pedir orçamento" },
  ];
  return [
    { href: "/central-tecnica", rotulo: "Central Técnica" },
    { href: "/cases", rotulo: "Cases" },
    { href: "/faq", rotulo: "FAQ" },
    { href: "/estrutura", rotulo: "Estrutura" },
  ];
}

function MenuMobileHome({
  aberto,
  aoFechar,
  menu,
  categorias,
  condicoes,
  telefone,
  whatsapp,
  reduzido,
}: {
  aberto: boolean;
  aoFechar: () => void;
  menu: ItemMenu[];
  categorias: CategoriaMenuHome[];
  condicoes: CondicaoMenuHome[];
  telefone: string;
  whatsapp: string;
  reduzido: boolean;
}) {
  const [secao, setSecao] = useState<Chave | null>(null);
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
            transition={{ duration: reduzido ? 0 : 0.18 }}
            onClick={aoFechar}
            className="fixed inset-0 z-[80] bg-jb-950/18 backdrop-blur-[2px] lg:hidden"
            aria-hidden
          />
          <motion.div
            ref={caixa}
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            tabIndex={-1}
            initial={{ x: reduzido ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduzido ? 0 : "100%" }}
            transition={{ duration: reduzido ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[90] flex w-[min(27rem,94vw)] flex-col bg-gradient-to-b from-white to-[#fffafa] shadow-[0_0_70px_rgba(72,7,12,0.22)] lg:hidden"
          >
            <div className="flex min-h-18 items-center justify-between border-b border-jb-100 px-5">
              <Logo altura={35} />
              <button type="button" onClick={aoFechar} className="grid size-11 place-items-center rounded-full bg-jb-50 text-jb-700"><X className="size-5" aria-hidden /><span className="sr-only">Fechar menu</span></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <Link href="/minha-jb" className="flex items-center gap-3 rounded-[1.4rem] bg-gradient-to-r from-[#fff1f1] to-white p-4 ring-1 ring-jb-100">
                <span className="grid size-11 place-items-center rounded-full bg-white text-jb-700 ring-1 ring-jb-100"><UserRound className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-graf-950">Área da Clínica</strong><small className="mt-1 block text-xs font-semibold text-graf-950/55">Pedidos, equipamentos e chamados</small></span>
                <ArrowRight className="size-4 text-jb-600" aria-hidden />
              </Link>

              <nav aria-label="Navegação da home no celular" className="mt-5">
                <ul className="divide-y divide-jb-100 border-y border-jb-100">
                  {menu.map((item) => {
                    const chave = chaveDoItem(item);
                    const abertoSecao = secao === chave;
                    return (
                      <li key={item.href}>
                        <div className="flex min-h-[62px] items-center gap-2">
                          <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-3 py-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-jb-50 text-jb-700"><IconeMenu chave={chave} className="size-4" /></span>
                            <span className="min-w-0"><strong className="block text-sm font-black text-graf-950">{item.rotulo}</strong><small className="mt-0.5 block truncate text-[0.68rem] font-semibold text-graf-950/50">{item.descricao}</small></span>
                          </Link>
                          <button type="button" onClick={() => setSecao(abertoSecao ? null : chave)} aria-expanded={abertoSecao} className="grid size-10 place-items-center rounded-full text-graf-950/55 hover:bg-jb-50 hover:text-jb-700"><ChevronDown className={cn("size-4 transition-transform", abertoSecao && "rotate-180")} aria-hidden /><span className="sr-only">Opções de {item.rotulo}</span></button>
                        </div>
                        <AnimatePresence initial={false}>
                          {abertoSecao ? (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduzido ? 0 : 0.16 }} className="overflow-hidden">
                              <div className="mb-3 ml-12 border-l border-jb-100 pl-3">
                                {subitensMobile(chave, categorias, condicoes).map((sub) => <Link key={sub.href} href={sub.href} className="flex min-h-10 items-center text-sm font-bold text-graf-950/72 transition hover:text-jb-700">{sub.rotulo}<ArrowRight className="ml-auto size-3.5 text-jb-600" aria-hidden /></Link>)}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="mt-5">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-jb-700">Minha JB</p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {ATALHOS_CLIENTE.map((item) => <Link key={item.href} href={item.href} className="flex min-h-10 items-center rounded-full px-3 text-sm font-bold text-graf-950 transition hover:bg-jb-50 hover:text-jb-700">{item.rotulo}</Link>)}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-jb-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link href="/assistencia-tecnica/solicitar" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-jb-500 px-4 text-sm font-black text-white"><Wrench className="size-4" aria-hidden /> Solicitar assistência</Link>
              {whatsapp ? <a href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-jb-100 px-4 text-sm font-black text-jb-700"><MessageCircle className="size-4" aria-hidden /> Falar no WhatsApp</a> : telefone ? <a href={telHref(telefone)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-jb-100 px-4 text-sm font-black text-jb-700"><Phone className="size-4" aria-hidden /> {telefone}</a> : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
