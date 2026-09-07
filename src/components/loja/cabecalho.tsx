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
  User,
  Wrench,
  X,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { classesBotao } from "@/components/ui/button";
import { useDialogo } from "@/components/ui/use-dialogo";
import {
  ATALHOS_CLIENTE,
  MENU_ASSISTENCIA,
  MENU_PRINCIPAL,
  rotaAtiva,
  type ChaveMega,
  type ItemMenu,
} from "@/lib/navegacao";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategoriaMenu = { slug: string; name: string; count: number };

export type CondicaoMenu = { slug: string; rotulo: string; total: number };

type Props = {
  categorias: CategoriaMenu[];
  /** Só as condições que têm equipamento — ver `condicoesDoMenu`. */
  condicoes: CondicaoMenu[];
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
  telefone: string;
  whatsapp: string;
  horario: string;
  desde: string;
  cidade: string;
};

/**
 * Faixa de recados do topo. O trilho é a lista repetida duas vezes andando
 * metade da própria largura: a emenda não aparece. Para no hover para quem
 * quiser ler, e some inteiro para quem pediu menos movimento.
 */
const CSS_FAIXA = `
@keyframes jb-faixa { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
.jb-faixa-trilho { animation: jb-faixa 34s linear infinite; will-change: transform; }
.jb-faixa:hover .jb-faixa-trilho { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .jb-faixa-trilho { animation: none; } }
`;

const MENSAGEM_WHATSAPP = "Olá! Vim pelo site da JB.";

/**
 * Recados da faixa.
 *
 * A régua aqui é estreita de propósito: a faixa aparece no topo de toda página,
 * e no Brasil oferta veiculada vincula quem anuncia (CDC art. 30 e 35). Então
 * cada frase só descreve o que o site já entrega — uma página que existe, um
 * dado que está no banco — e nunca promete prazo, cobertura ou serviço que na
 * verdade é vendido à parte. Instalação, por exemplo, é adicional de pedido:
 * anunciá-la aqui como se acompanhasse a entrega criaria obrigação.
 *
 * Cada recado só entra se o dado que o sustenta existir.
 */
function recadosDaFaixa(desde: string, cidade: string) {
  return [
    "Equipamentos, assistência e pós-venda no mesmo relacionamento.",
    "Cada anúncio traz a condição do equipamento.",
    cidade.trim()
      ? `Assistência técnica própria — equipe JB em ${cidade}.`
      : "Assistência técnica com equipe própria.",
    desde.trim() ? `Em atividade desde ${desde}.` : null,
    "Compare equipamentos lado a lado antes de decidir.",
    "Acompanhe seus equipamentos e chamados na Área da Clínica.",
  ].filter((frase): frase is string => Boolean(frase));
}

/**
 * Cabeçalho público.
 *
 * A navegação agora mora na mesma linha da marca, busca e ações. A antiga
 * segunda faixa de menu deixava o topo com aparência de dois cabeçalhos
 * empilhados e fazia a primeira dobra começar tarde demais. O mega menu segue
 * existindo, mas nasce da mesma linha principal.
 */
export function Cabecalho({
  categorias,
  condicoes,
  acessoDaConta,
  contadorDoCarrinho,
  telefone,
  whatsapp,
  horario,
  desde,
  cidade,
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

  const fecharMenu = useCallback(() => setMenuAberto(false), []);

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
    if (buscaAberta) campoBuscaMobile.current?.focus();
  }, [buscaAberta]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape" || menuAberto) return;

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

  useEffect(
    () => () => {
      if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    },
    [],
  );

  const ativo = (href: string) => rotaAtiva(pathname, href);

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const termo = String(dados.get("q") ?? "").trim();
    router.push(termo ? `/busca?q=${encodeURIComponent(termo)}` : "/loja");
    setBuscaAberta(false);
  }

  function aoPerderFoco(evento: React.FocusEvent<HTMLElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setMega(null);
  }

  function cancelarFechamento() {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  }

  function agendarFechamento() {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => {
      if (refCabecalho.current?.contains(document.activeElement)) return;
      setMega(null);
    }, 160);
  }

  const recados = recadosDaFaixa(desde, cidade);
  const temBarraUtilidade = Boolean(horario || telefone || whatsapp);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-jb-700 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {temBarraUtilidade ? (
        <div className="hidden bg-jb-600 text-white lg:block">
          <style>{CSS_FAIXA}</style>
          <div className="mx-auto flex h-11 max-w-[100rem] items-center gap-8 px-8 text-[0.82rem]">
            {horario ? (
              <p className="flex shrink-0 items-center gap-2 font-medium text-white/85">
                <Clock className="size-4 shrink-0" aria-hidden />
                {horario}
              </p>
            ) : (
              <span />
            )}

            <div
              className="jb-faixa relative hidden min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)] lg:block"
              aria-label="Destaques da JB"
            >
              <ul className="jb-faixa-trilho flex w-max items-center">
                {[0, 1].map((copia) =>
                  recados.map((recado, posicao) => (
                    <li
                      key={`${copia}-${posicao}`}
                      className="flex shrink-0 items-center gap-8 pr-8"
                      aria-hidden={copia === 1 ? true : undefined}
                    >
                      <span className="whitespace-nowrap font-semibold tracking-[-0.01em] text-white/95">
                        {recado}
                      </span>
                      <span className="size-1 shrink-0 rotate-45 bg-white/45" aria-hidden />
                    </li>
                  )),
                )}
              </ul>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-5">
              {telefone ? (
                <a
                  href={telHref(telefone)}
                  className="flex h-11 items-center gap-2 rounded-xs font-medium text-white/90 transition-colors hover:text-white"
                >
                  <Phone className="size-4 shrink-0" aria-hidden />
                  {telefone}
                </a>
              ) : null}

              {whatsapp ? (
                <a
                  href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center gap-2 rounded-xs font-semibold text-white transition-colors hover:text-white/80"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-white" aria-hidden />
                  WhatsApp {whatsapp}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <header
        ref={refCabecalho}
        onMouseLeave={agendarFechamento}
        onBlur={aoPerderFoco}
        className={cn(
          "sticky top-0 z-50 border-b border-graf-200/80 bg-white/97 backdrop-blur-xl transition-shadow duration-200",
          compacto && "shadow-card",
        )}
      >
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <div
            className={cn(
              "flex items-center gap-5 transition-[height] duration-200",
              compacto ? "h-[72px]" : "h-[88px]",
            )}
          >
            <Link
              href="/"
              aria-label="JB Soluções Odontológicas — início"
              className="flex min-h-11 shrink-0 items-center rounded-sm"
            >
              <Logo altura={compacto ? 38 : 46} prioridade />
            </Link>

            <nav aria-label="Principal" className="hidden shrink-0 items-center gap-4 2xl:flex">
              {MENU_PRINCIPAL.map((item) => {
                const chave = item.megaMenu;
                const aberto = chave !== undefined && mega === chave;
                const estaAtivo = ativo(item.href);

                return (
                  <div
                    key={item.href}
                    className="relative flex h-12 items-center"
                    onMouseEnter={() => {
                      cancelarFechamento();
                      setMega(chave ?? null);
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-current={estaAtivo ? "page" : undefined}
                      className={cn(
                        "relative flex h-12 items-center rounded-lg px-2 text-[0.8125rem] font-semibold transition-colors",
                        estaAtivo ? "text-jb-700" : "text-graf-800 hover:text-jb-700",
                      )}
                    >
                      {item.rotulo}
                      {estaAtivo ? (
                        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-jb-500" aria-hidden />
                      ) : null}
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
                        className="-ml-1 flex size-8 items-center justify-center rounded-full text-graf-500 transition-colors hover:bg-jb-50 hover:text-jb-700"
                      >
                        <ChevronDown
                          className={cn("size-3.5 transition-transform duration-200", aberto && "rotate-180")}
                          aria-hidden
                        />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </nav>

            <form
              onSubmit={buscar}
              role="search"
              className="ml-auto hidden min-w-0 max-w-[27rem] flex-1 lg:flex 2xl:ml-2"
            >
              <CampoBusca id="busca-cabecalho" compacto={compacto} />
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
              <button
                ref={botaoBusca}
                type="button"
                onClick={() => setBuscaAberta((v) => !v)}
                aria-expanded={buscaAberta}
                className="flex size-11 items-center justify-center rounded-xl text-graf-700 transition-colors hover:bg-jb-50 hover:text-jb-700 lg:hidden"
              >
                {buscaAberta ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
                <span className="sr-only">{buscaAberta ? "Fechar a busca" : "Buscar"}</span>
              </button>

              {acessoDaConta}
              {contadorDoCarrinho}

              <Link
                href="/assistencia-tecnica/solicitar"
                className={classesBotao(
                  "primario",
                  "sm",
                  "ml-1.5 hidden min-h-12 rounded-xl px-5 shadow-[0_10px_26px_rgba(220,38,38,0.16)] xl:inline-flex",
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
                className="ml-1 flex size-11 items-center justify-center rounded-xl border border-graf-200 text-graf-800 transition-colors hover:border-jb-200 hover:bg-jb-50 hover:text-jb-700 2xl:hidden"
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
              transition={{ duration: reduzido ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-graf-200 bg-white lg:hidden"
            >
              <form onSubmit={buscar} role="search" className="mx-auto max-w-[100rem] px-5 py-3 sm:px-8">
                <CampoBusca id="busca-celular" ref={campoBuscaMobile} compacto />
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {mega ? (
            <motion.div
              key="mega"
              initial={{ opacity: 0, y: reduzido ? 0 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduzido ? 0 : -6 }}
              transition={{ duration: reduzido ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={cancelarFechamento}
              className="absolute inset-x-0 top-full hidden max-h-[70dvh] overflow-y-auto overscroll-contain border-b border-jb-100 bg-white shadow-pop 2xl:block"
            >
              <div className="mx-auto max-w-[100rem] px-8 py-9">
                {mega === "catalogo" ? (
                  <MegaCatalogo categorias={categorias} condicoes={condicoes} />
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
        condicoes={condicoes}
        telefone={telefone}
        whatsapp={whatsapp}
        ativo={ativo}
        reduzido={Boolean(reduzido)}
      />
    </>
  );
}

function CampoBusca({
  id,
  ref,
  compacto,
}: {
  id: string;
  ref?: React.Ref<HTMLInputElement>;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center rounded-full border border-graf-300 bg-graf-50 transition-[height,border-color,background-color,box-shadow] duration-200",
        "hover:border-graf-400 hover:bg-white focus-within:border-jb-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-jb-500/8",
        compacto ? "h-11" : "h-12",
      )}
    >
      <Search className="ml-4 size-4.5 shrink-0 text-jb-600" aria-hidden />
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
        placeholder="Busque equipamentos, marcas, modelos ou peças..."
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-graf-900 lg:text-[0.875rem] outline-none placeholder:text-graf-500"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="mr-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-jb-600 transition-colors hover:bg-jb-50 hover:text-jb-800"
      >
        <Search className="size-4.5" aria-hidden />
      </button>
    </div>
  );
}

function MegaCatalogo({
  categorias,
  condicoes,
}: {
  categorias: CategoriaMenu[];
  condicoes: CondicaoMenu[];
}) {
  return (
    <div className="grid gap-10 xl:grid-cols-[1.7fr_1fr]">
      <div>
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-jb-700">Categorias</h2>
          <Link href="/loja" className="inline-flex items-center gap-1.5 text-sm font-bold text-jb-700 hover:text-jb-900">
            Ver o catálogo completo
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {categorias.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-jb-200 bg-jb-50/50 p-6">
            <p className="text-sm text-graf-600">As categorias ainda não foram publicadas.</p>
            <Link href="/loja" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-jb-700">
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
                  className="group flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-jb-50"
                >
                  <span className="text-sm font-semibold text-graf-800 transition-colors group-hover:text-jb-700">
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

      <div className="xl:border-l xl:border-jb-100 xl:pl-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-jb-700">Por condição</h2>
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-1">
          {condicoes.map((condicao) => (
            <li key={condicao.slug}>
              <Link
                href={`/${condicao.slug}`}
                className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-graf-800 transition-colors hover:bg-jb-50 hover:text-jb-700"
              >
                {condicao.rotulo}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-x-6 border-t border-jb-100 pt-4">
          <Link href="/marcas" className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-bold text-jb-700 hover:text-jb-900">
            Ver todas as marcas
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <Link href="/pecas-e-acessorios" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-graf-700 hover:text-jb-700">
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-jb-700">Assistência e manutenção</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {MENU_ASSISTENCIA.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex h-full flex-col rounded-2xl border border-jb-100 bg-white p-4 transition-colors hover:border-jb-300 hover:bg-jb-50/40"
              >
                <span className="text-sm font-bold text-graf-950">{item.rotulo}</span>
                {item.descricao ? <span className="mt-1 text-xs leading-relaxed text-graf-500">{item.descricao}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {temContato ? (
        <div className="flex flex-col rounded-2xl bg-jb-600 p-5 text-white">
          <p className="text-sm font-bold">Prefere falar com um técnico?</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/75">
            {horario ? `Equipe técnica própria. ${horario}.` : "Equipe técnica própria."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {whatsapp ? (
              <a
                href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-jb-700 transition-colors hover:bg-jb-50"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp {whatsapp}
              </a>
            ) : null}
            {telefone ? (
              <a
                href={telHref(telefone)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/50 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                <Phone className="size-4" aria-hidden />
                {telefone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuMobile({
  aberto,
  aoFechar,
  categorias,
  condicoes,
  telefone,
  whatsapp,
  ativo,
  reduzido,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categorias: CategoriaMenu[];
  condicoes: CondicaoMenu[];
  telefone: string;
  whatsapp: string;
  ativo: (href: string) => boolean;
  reduzido: boolean;
}) {
  const [secao, setSecao] = useState<ChaveMega | null>(null);
  const caixa = useDialogo(aberto, aoFechar);

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
            className="fixed inset-0 z-60 bg-jb-950/35 2xl:hidden"
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
            className="fixed inset-y-0 right-0 z-70 flex w-[min(24rem,92vw)] flex-col bg-white shadow-pop 2xl:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-jb-100 pl-5 pr-2">
              <Logo altura={34} />
              <button
                type="button"
                onClick={aoFechar}
                className="flex size-11 items-center justify-center rounded-xl text-graf-700 transition-colors hover:bg-jb-50 hover:text-jb-700"
              >
                <X className="size-5" aria-hidden />
                <span className="sr-only">Fechar o menu</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="border-b border-jb-100 p-4">
                <Link
                  href="/minha-jb"
                  className="flex items-center gap-3.5 rounded-2xl border border-jb-100 bg-jb-50/60 p-4 transition-colors hover:border-jb-200"
                >
                  <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-jb-600 ring-1 ring-inset ring-jb-100">
                    <User className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-graf-500">Área da Clínica</span>
                    <span className="block truncate text-base font-bold text-graf-950">Pedidos, equipamentos e chamados</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-jb-500" aria-hidden />
                </Link>

                <ul className="mt-2 grid grid-cols-2 gap-1.5">
                  {ATALHOS_CLIENTE.slice(0, 4).map((atalho) => (
                    <li key={atalho.href}>
                      <Link
                        href={atalho.href}
                        aria-current={ativo(atalho.href) ? "page" : undefined}
                        className="flex min-h-11 items-center rounded-xl border border-jb-100 px-3 text-[0.8125rem] font-semibold text-graf-700 transition-colors hover:border-jb-200 hover:text-jb-700"
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
                          className="flex min-h-13 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-jb-50/60"
                        >
                          <span className="min-w-0">
                            <span className="block text-base font-semibold text-graf-900">{item.rotulo}</span>
                            {item.descricao ? <span className="mt-0.5 block text-xs text-graf-500">{item.descricao}</span> : null}
                          </span>
                          <ChevronDown className={cn("size-4.5 shrink-0 text-jb-500 transition-transform duration-200", expandido && "rotate-180")} aria-hidden />
                        </button>

                        <div id={painel} hidden={!expandido}>
                          <ul className="mb-2 ml-3 border-l border-jb-100 pl-3">
                            <li>
                              <Link href={item.href} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-jb-700 transition-colors hover:bg-jb-50">
                                {chave === "catalogo" ? "Ver todos os equipamentos" : "Ver a assistência técnica"}
                              </Link>
                            </li>

                            {chave === "catalogo"
                              ? categorias.map((categoria) => (
                                  <li key={categoria.slug}>
                                    <Link href={`/categoria/${categoria.slug}`} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-graf-700 transition-colors hover:bg-jb-50">
                                      {categoria.name}
                                    </Link>
                                  </li>
                                ))
                              : MENU_ASSISTENCIA.map((sub) => (
                                  <li key={sub.href}>
                                    <Link href={sub.href} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-graf-700 transition-colors hover:bg-jb-50">
                                      {sub.rotulo}
                                    </Link>
                                  </li>
                                ))}

                            {chave === "catalogo" ? (
                              <li className="mt-1 border-t border-jb-100 pt-1">
                                <ul>
                                  {condicoes.map((condicao) => (
                                    <li key={condicao.slug}>
                                      <Link href={`/${condicao.slug}`} className="flex min-h-11 items-center rounded-xl px-3 text-sm text-graf-700 transition-colors hover:bg-jb-50">
                                        {condicao.rotulo}
                                      </Link>
                                    </li>
                                  ))}
                                  <li><Link href="/pecas-e-acessorios" className="flex min-h-11 items-center rounded-xl px-3 text-sm text-graf-700 hover:bg-jb-50">Peças e acessórios</Link></li>
                                  <li><Link href="/marcas" className="flex min-h-11 items-center rounded-xl px-3 text-sm text-graf-700 hover:bg-jb-50">Marcas</Link></li>
                                </ul>
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <ul className="mt-4 space-y-0.5 border-t border-jb-100 pt-4">
                  <li><LinhaMenu item={{ rotulo: "Favoritos", href: "/minha-jb/favoritos" }} ativo={ativo("/minha-jb/favoritos")} /></li>
                  <li><LinhaMenu item={{ rotulo: "Pedir orçamento", href: "/orcamento" }} ativo={ativo("/orcamento")} /></li>
                  <li><LinhaMenu item={{ rotulo: "Contato", href: "/contato" }} ativo={ativo("/contato")} /></li>
                </ul>
              </nav>
            </div>

            <div className="shrink-0 space-y-2 border-t border-jb-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link href="/assistencia-tecnica/solicitar" className={classesBotao("primario", "md", "w-full rounded-xl")}>
                <Wrench className="size-4 shrink-0" aria-hidden />
                Solicitar assistência
              </Link>
              {whatsapp ? (
                <a href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)} target="_blank" rel="noopener noreferrer" className={classesBotao("secundario", "md", "w-full rounded-xl")}>
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  Falar no WhatsApp
                </a>
              ) : telefone ? (
                <a href={telHref(telefone)} className={classesBotao("secundario", "md", "w-full rounded-xl")}>
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
        "flex min-h-13 flex-col justify-center rounded-xl px-3 py-2.5 transition-colors hover:bg-jb-50/60",
        ativo && "bg-jb-50",
      )}
    >
      <span className={cn("text-base font-semibold", ativo ? "text-jb-700" : "text-graf-900")}>{item.rotulo}</span>
      {item.descricao ? <span className="mt-0.5 text-xs text-graf-500">{item.descricao}</span> : null}
    </Link>
  );
}
