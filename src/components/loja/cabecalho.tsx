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
  /**
   * A Central Técnica tem publicação no ar.
   *
   * Sem isso, ela some da direção principal: um dos cinco lugares do
   * cabeçalho estava reservado a uma página que só sabia dizer que ainda não
   * tem conteúdo. Continua no rodapé e no mapa do site — o que ela perde é o
   * destaque comercial, não a existência. É a mesma regra que já vale para
   * categoria sem equipamento no mega menu.
   */
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
    cidade.trim() ? `Assistência técnica própria — equipe JB em ${cidade}.` : "Assistência técnica com equipe própria.",
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
  const [mega, setMega] = useState<ChaveMegaPremium | null>(null);
  const fecharTimer = useRef<number | null>(null);
  const refCabecalho = useRef<HTMLElement>(null);
  const gatilhosMega = useRef<Partial<Record<ChaveMegaPremium, HTMLButtonElement | null>>>({});
  const botaoBusca = useRef<HTMLButtonElement>(null);

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

  function cancelarFechamento() {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  }

  function agendarFechamento() {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => {
      /* A guarda é para o teclado, não para o mouse.
         Ela existia para o painel não fechar embaixo de quem está tabulando
         dentro dele — mas testava só "o foco está no cabeçalho", e um CLIQUE
         no gatilho também deixa o foco lá. Resultado: quem abria o mega menu
         clicando via o painel continuar aberto depois de tirar o ponteiro,
         até clicar em outro lugar.

         `:focus-visible` é exatamente a diferença entre os dois casos: o
         navegador só o aplica quando o foco veio de teclado. Com ele, tabular
         segura o painel e clicar não segura. */
      const focado = document.activeElement;
      const focoDeTeclado =
        focado instanceof HTMLElement &&
        refCabecalho.current?.contains(focado) &&
        focado.matches(":focus-visible");
      if (focoDeTeclado) return;
      setMega(null);
    }, 180);
  }

  function aoPerderFoco(evento: React.FocusEvent<HTMLElement>) {
    if (!evento.currentTarget.contains(evento.relatedTarget)) setMega(null);
  }

  const menu = centralPublicada
    ? MENU_PRINCIPAL
    : MENU_PRINCIPAL.filter((item) => item.href !== "/central-tecnica");

  const recados = recadosDaFaixa(desde, cidade);
  const temBarraUtilidade = Boolean(horario || telefone || whatsapp);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-xl focus:bg-jb-700 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {/* ------------------------------------------------- nível 1: utilidade

          Era uma faixa vermelha com cinco recados em rolagem infinita. Três
          problemas, todos visíveis nas capturas da auditoria: o texto entrava
          e saía cortado no meio da palavra sob os blocos fixos das pontas; o
          movimento disputava atenção com a vitrine, que é onde a JB quer o
          olho; e uma frase que passa não pode ser lida por quem chega depois
          dela. Agora é uma linha parada — horário à esquerda, uma afirmação
          da empresa no meio, telefone e WhatsApp à direita. O movimento
          expressivo fica reservado à descoberta e às vitrines. */}
      {temBarraUtilidade ? (
        <div
          data-jb-utility-bar="true"
          className="hidden bg-jb-700 text-white lg:block"
        >
          <div className="mx-auto flex h-9 max-w-[105rem] items-center gap-7 px-8 text-[0.75rem] lg:px-10">
            {horario ? (
              <p className="flex shrink-0 items-center gap-2 font-semibold text-white/90">
                <Clock className="size-4" aria-hidden />
                {horario}
              </p>
            ) : <span />}

            {recados[0] ? (
              <p className="hidden min-w-0 flex-1 truncate font-semibold tracking-[-0.01em] text-white/90 xl:block">
                {recados[0]}
              </p>
            ) : null}

            <div className="ml-auto flex shrink-0 items-center gap-4">
              {telefone ? (
                <a href={telHref(telefone)} className="flex h-10 items-center gap-2 font-semibold text-white/90 transition hover:text-white">
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

      {/* Os ganchos de acabamento são atributo e classe, nunca a posição da
          `div` na árvore. `header-premium.css` chegou escrito em cima da
          estrutura — `> div:first-of-type > div > a:first-child` para o
          logotipo — e essa é a forma de estilo que quebra sem avisar: basta
          alguém envolver o logo num `span` para o acabamento sumir sem
          nenhum erro em lugar nenhum. */}
      <header
        ref={refCabecalho}
        data-jb-premium-header="true"
        onMouseLeave={agendarFechamento}
        onBlur={aoPerderFoco}
        className={cn(
          "sticky top-0 z-50 border-b border-graf-200/70 bg-white/96 backdrop-blur-xl transition-shadow duration-200",
          compacto && "shadow-[0_10px_35px_rgba(25,28,32,0.08)]",
        )}
      >
        <div className="mx-auto max-w-[105rem] px-5 sm:px-8 lg:px-10">
          <div className={cn("flex items-center gap-4 transition-[height] duration-200", compacto ? "h-[60px]" : "h-[70px]")}>
            <Link href="/" aria-label="JB Soluções Odontológicas — início" className="jb-logo flex min-h-11 shrink-0 items-center rounded-lg">
              <Logo altura={compacto ? 32 : 38} prioridade />
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

        {/* ------------------------------------------- nível 3: navegação

            A direção do catálogo tinha a própria fileira só a partir de
            1700px: em 1440px — a largura de trabalho mais comum — o site
            inteiro caía no botão de menu, e o desktop navegava como celular.
            Empilhada com busca, conta, carrinho e o botão de assistência na
            MESMA linha, ela também disputava atenção com tudo o que estava do
            lado. Aqui ela ganha um nível só dela, aparece a partir de 1024px
            e o botão de menu volta a ser o que sempre foi: a saída do
            celular. */}
        <div className="hidden border-t border-graf-200/70 lg:block">
          <div className="mx-auto max-w-[105rem] px-5 sm:px-8 lg:px-10">
            <nav aria-label="Principal" className="flex items-center">
              {menu.map((item) => {
                const chave = chaveDoItem(item);
                const aberto = mega === chave;
                const estaAtivo = ativo(item.href);
                return (
                  <div
                    key={item.href}
                    /* Numa fileira própria o item não precisa mais parecer
                       botão: pastilha branca com sombra, dentro de uma cápsula
                       cinza, ao lado de outros quatro, era o que fazia cinco
                       seções do site pesarem tanto quanto a ação principal do
                       cabeçalho. Aqui é texto, com um filete vermelho embaixo
                       de quem está aberto ou ativo — o mesmo sinal que a
                       marca usa em todo o resto do site. */
                    className="relative flex h-11 items-center"
                    onMouseEnter={() => {
                      cancelarFechamento();
                      setMega(chave);
                    }}
                  >
                    <Link
                      href={item.href}
                      aria-current={estaAtivo ? "page" : undefined}
                      className={cn(
                        "group relative flex h-11 items-center gap-2 rounded-t-lg px-3 text-[0.8125rem] font-bold transition-colors",
                        "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors after:content-['']",
                        aberto || estaAtivo
                          ? "text-jb-700 after:bg-jb-500"
                          : "text-graf-700 after:bg-transparent hover:text-jb-700",
                      )}
                    >
                      <IconeMenu
                        chave={chave}
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          aberto || estaAtivo ? "text-jb-600" : "text-graf-500 group-hover:text-jb-600",
                        )}
                      />
                      <span className="whitespace-nowrap">{item.rotulo}</span>
                    </Link>
                    <button
                      type="button"
                      ref={(el) => { gatilhosMega.current[chave] = el; }}
                      aria-expanded={aberto}
                      aria-label={`${aberto ? "Fechar" : "Abrir"} o menu de ${item.rotulo}`}
                      onFocus={cancelarFechamento}
                      onClick={() => setMega(aberto ? null : chave)}
                      className={cn(
                        "-ml-2 mr-1 flex size-8 items-center justify-center rounded-lg transition-colors",
                        aberto ? "text-jb-700" : "text-graf-400 hover:text-jb-700",
                      )}
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform duration-200", aberto && "rotate-180")} aria-hidden />
                    </button>
                  </div>
                );
              })}
            </nav>
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
              <div className="mx-auto max-w-[105rem] px-5 py-3 sm:px-8">
                <BuscaComSugestoes id="busca-celular" compacto focoInicial />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {mega ? (
            <motion.div
              key={mega}
              initial={{ opacity: 0, y: reduzido ? 0 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduzido ? 0 : -6 }}
              transition={{ duration: reduzido ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={cancelarFechamento}
              className="jb-mega-painel absolute inset-x-0 top-full hidden px-4 pt-3 lg:block"
            >
              <div className="mx-auto max-h-[72dvh] max-w-[101rem] overflow-y-auto overscroll-contain rounded-[1.6rem] border border-graf-200/80 bg-white shadow-[0_22px_65px_rgba(26,28,30,0.16)]">
                <PainelMega
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

function PainelMega({
  chave,
  categorias,
  condicoes,
  telefone,
  whatsapp,
  horario,
}: {
  chave: ChaveMegaPremium;
  categorias: CategoriaMenu[];
  condicoes: CondicaoMenu[];
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

function TituloMega({ etiqueta, titulo, descricao }: { etiqueta: string; titulo: string; descricao?: string }) {
  return (
    <div>
      <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-jb-600">{etiqueta}</p>
      <h2 className="mt-2 text-[1.35rem] font-extrabold tracking-[-0.03em] text-graf-950">{titulo}</h2>
      {descricao ? <p className="mt-1.5 max-w-[48rem] text-sm leading-relaxed text-graf-500">{descricao}</p> : null}
    </div>
  );
}

function MegaCatalogo({ categorias, condicoes }: { categorias: CategoriaMenu[]; condicoes: CondicaoMenu[] }) {
  const destaques = categorias.slice(0, 6);
  return (
    <div className="grid gap-0 xl:grid-cols-[1.7fr_0.8fr_0.9fr]">
      <section className="p-7 pr-8">
        <div className="flex items-start justify-between gap-6">
          <TituloMega etiqueta="Categorias" titulo="Encontre pelo tipo de equipamento" descricao="Navegue pelas categorias da loja sem sair do contexto da clínica." />
          <Link href="/loja" className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold text-jb-700 transition hover:bg-jb-50 hover:text-jb-900">
            Catálogo completo <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>

        {destaques.length ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {destaques.map((categoria, indice) => (
              <li key={categoria.slug}>
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-graf-200/80 bg-gradient-to-br from-white to-graf-50/70 p-4 transition-all hover:-translate-y-0.5 hover:border-jb-200 hover:shadow-[0_10px_24px_rgba(26,28,30,0.08)]"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-jb-50 text-jb-600 ring-1 ring-jb-100">
                    {indice % 2 === 0 ? <Package className="size-5" aria-hidden /> : <Settings className="size-5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.92rem] font-extrabold leading-tight text-graf-900 transition-colors group-hover:text-jb-700">{categoria.name}</span>
                    <span className="mt-1 block text-xs text-graf-500">Ver equipamentos desta categoria</span>
                  </span>
                  {categoria.count > 0 ? <span className="tabular rounded-full bg-white px-2.5 py-1 text-[0.7rem] font-bold text-graf-500 ring-1 ring-graf-200">{categoria.count}</span> : null}
                  <ArrowRight className="size-4 shrink-0 text-graf-400 transition group-hover:translate-x-0.5 group-hover:text-jb-600" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-jb-200 bg-jb-50/50 p-6 text-sm text-graf-600">As categorias ainda não foram publicadas.</div>
        )}
      </section>

      <section className="border-l border-graf-200/80 p-7">
        <TituloMega etiqueta="Por condição" titulo="Escolha como quer comprar" />
        <ul className="mt-5 space-y-2.5">
          {condicoes.slice(0, 4).map((condicao, indice) => (
            <li key={condicao.slug}>
              <Link href={`/${condicao.slug}`} className="group flex items-center gap-3 rounded-2xl border border-graf-200/80 p-3.5 transition hover:border-jb-200 hover:bg-jb-50/50">
                <span className="flex size-10 items-center justify-center rounded-xl bg-graf-50 text-graf-700 group-hover:bg-white group-hover:text-jb-700">
                  {indice === 0 ? <ShieldCheck className="size-4.5" aria-hidden /> : <RefreshCw className="size-4.5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-graf-900 group-hover:text-jb-700">{condicao.rotulo}</span>
                  {condicao.total > 0 ? <span className="mt-0.5 block text-xs text-graf-500">{condicao.total} disponíveis</span> : <span className="mt-0.5 block text-xs text-graf-500">Explorar seleção</span>}
                </span>
                <ChevronDown className="size-4 -rotate-90 text-graf-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-2 border-t border-graf-200 pt-4">
          <Link href="/marcas" className="group flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-bold text-graf-700 hover:bg-graf-50 hover:text-jb-700"><Tag className="size-4 text-jb-600" aria-hidden /> Marcas <ArrowRight className="ml-auto size-3.5 opacity-50 group-hover:opacity-100" aria-hidden /></Link>
          <Link href="/pecas-e-acessorios" className="group flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-bold text-graf-700 hover:bg-graf-50 hover:text-jb-700"><Settings className="size-4 text-jb-600" aria-hidden /> Peças e acessórios <ArrowRight className="ml-auto size-3.5 opacity-50 group-hover:opacity-100" aria-hidden /></Link>
        </div>
      </section>

      <aside className="m-4 ml-0 flex min-h-[360px] flex-col overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-jb-50 via-white to-jb-100/60 p-6 ring-1 ring-jb-100">
        <div className="relative flex flex-1 flex-col">
          <div className="absolute -right-12 -top-10 size-44 rounded-full bg-jb-200/35 blur-2xl" aria-hidden />
          <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.11em] text-jb-700 shadow-sm ring-1 ring-jb-100"><Sparkles className="size-3.5" aria-hidden /> Tecnologia para a clínica</span>
          <h3 className="relative mt-5 max-w-[18rem] text-[1.8rem] font-extrabold leading-[1.04] tracking-[-0.045em] text-graf-950">Equipamentos que acompanham o seu dia a dia.</h3>
          <p className="relative mt-3 text-sm leading-relaxed text-graf-600">Compare opções, condições e categorias antes de decidir.</p>
          <div className="relative mt-auto pt-6">
            <Link href="/loja" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-jb-600 px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(196,14,21,0.2)] transition hover:bg-jb-700">Ver catálogo completo <ArrowRight className="size-4" aria-hidden /></Link>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-jb-100 pt-4 text-center text-[0.68rem] font-semibold leading-tight text-graf-600">
              <span>Marcas<br />selecionadas</span><span>Condições<br />claras</span><span>Suporte<br />JB</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MegaSeminovos({ categorias }: { categorias: CategoriaMenu[] }) {
  return (
    <div className="grid gap-0 xl:grid-cols-[1.1fr_1.2fr_0.8fr]">
      <section className="p-7">
        <TituloMega etiqueta="Seminovos JB" titulo="Uma seleção com contexto técnico" descricao="Entre direto na vitrine de seminovos e compare alternativas por categoria." />
        <div className="mt-6 rounded-[1.4rem] bg-gradient-to-br from-graf-950 to-graf-800 p-6 text-white">
          <RefreshCw className="size-6 text-jb-300" aria-hidden />
          <h3 className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-white">Compare antes de escolher.</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">Use a comparação e o simulador de custo para enxergar melhor as alternativas disponíveis.</p>
          <Link href="/seminovos" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-graf-950 transition hover:bg-jb-50">Ver seminovos <ArrowRight className="size-4" aria-hidden /></Link>
        </div>
      </section>

      <section className="border-l border-graf-200/80 p-7">
        <TituloMega etiqueta="Atalhos" titulo="Procure pelo que a clínica precisa" />
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {categorias.slice(0, 6).map((categoria) => (
            <li key={categoria.slug}>
              <Link href={`/categoria/${categoria.slug}`} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-graf-200/80 p-3.5 transition hover:border-jb-200 hover:bg-jb-50/40">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-graf-50 text-jb-600"><Package className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1 text-sm font-extrabold text-graf-900 group-hover:text-jb-700">{categoria.name}</span>
                <ArrowRight className="size-3.5 text-graf-400 group-hover:text-jb-600" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <aside className="border-l border-graf-200/80 p-7">
        <TituloMega etiqueta="Decisão" titulo="Ferramentas úteis" />
        <div className="mt-5 space-y-3">
          <AtalhoCard href="/comparar" icone={<Package className="size-4" aria-hidden />} titulo="Comparar equipamentos" descricao="Coloque opções lado a lado." />
          <AtalhoCard href="/simulador-de-custo" icone={<RefreshCw className="size-4" aria-hidden />} titulo="Reparar, seminovo ou novo" descricao="Abra o simulador de custo." />
          <AtalhoCard href="/marcas" icone={<Tag className="size-4" aria-hidden />} titulo="Ver marcas" descricao="Navegue pela marca do equipamento." />
        </div>
      </aside>
    </div>
  );
}

function MegaAssistencia({ telefone, whatsapp, horario }: { telefone: string; whatsapp: string; horario: string }) {
  const temContato = Boolean(telefone || whatsapp);
  return (
    <div className={cn("grid gap-0", temContato && "xl:grid-cols-[1.6fr_0.75fr]")}>
      <section className="p-7">
        <TituloMega etiqueta="Assistência técnica" titulo="Do chamado ao acompanhamento, tudo no mesmo lugar" descricao="Escolha o caminho certo para abrir atendimento, entender o fluxo ou cuidar da manutenção preventiva." />
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {MENU_ASSISTENCIA.map((item, indice) => (
            <li key={item.href}>
              <Link href={item.href} className="group flex min-h-[108px] items-start gap-4 rounded-2xl border border-graf-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-jb-200 hover:shadow-[0_10px_24px_rgba(26,28,30,0.07)]">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-jb-50 text-jb-600">{indice === 0 ? <Wrench className="size-5" aria-hidden /> : <Settings className="size-5" aria-hidden />}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-graf-950 group-hover:text-jb-700">{item.rotulo}</span>{item.descricao ? <span className="mt-1.5 block text-xs leading-relaxed text-graf-500">{item.descricao}</span> : null}</span>
                <ArrowRight className="mt-1 size-4 text-graf-400 group-hover:text-jb-600" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {temContato ? (
        <aside className="m-4 ml-0 flex flex-col rounded-[1.4rem] bg-gradient-to-br from-jb-700 to-jb-950 p-6 text-white shadow-[0_16px_34px_rgba(111,15,19,0.2)]">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><User className="size-5" aria-hidden /></span>
          <h3 className="mt-5 text-xl font-extrabold tracking-[-0.03em] text-white">Prefere falar com a equipe?</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{horario ? `Equipe técnica JB. ${horario}.` : "Equipe técnica JB."}</p>
          <div className="mt-auto space-y-2 pt-6">
            {whatsapp ? <a href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-jb-800 transition hover:bg-jb-50"><MessageCircle className="size-4" aria-hidden /> WhatsApp {whatsapp}</a> : null}
            {telefone ? <a href={telHref(telefone)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-extrabold text-white transition hover:bg-white/10"><Phone className="size-4" aria-hidden /> {telefone}</a> : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function MegaManutencao() {
  return (
    <div className="grid gap-0 xl:grid-cols-[1.4fr_0.9fr]">
      <section className="p-7">
        <TituloMega etiqueta="Manutenção" titulo="Organize o cuidado antes da parada" descricao="Acesse manutenção preventiva, planos, serviços e orçamento sem procurar em várias páginas." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <AtalhoCard href="/manutencao-preventiva" icone={<Settings className="size-4" aria-hidden />} titulo="Manutenção preventiva" descricao="Entenda o serviço e como funciona." />
          <AtalhoCard href="/planos-de-manutencao" icone={<ShieldCheck className="size-4" aria-hidden />} titulo="Planos de manutenção" descricao="Veja as opções de acompanhamento." />
          <AtalhoCard href="/servicos" icone={<Wrench className="size-4" aria-hidden />} titulo="Serviços técnicos" descricao="Conheça os serviços disponíveis." />
          <AtalhoCard href="/orcamento" icone={<ArrowRight className="size-4" aria-hidden />} titulo="Pedir orçamento" descricao="Leve sua necessidade para a equipe JB." />
        </div>
      </section>
      <aside className="m-4 ml-0 overflow-hidden rounded-[1.4rem] border border-jb-100 bg-gradient-to-br from-jb-50 via-white to-graf-50 p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-jb-700 ring-1 ring-jb-100"><ShieldCheck className="size-3.5" aria-hidden /> Cuidado contínuo</span>
        <h3 className="mt-5 max-w-[22rem] text-2xl font-extrabold tracking-[-0.035em] text-graf-950">Uma rota clara para manter a operação organizada.</h3>
        <p className="mt-3 max-w-[28rem] text-sm leading-relaxed text-graf-600">Centralize os próximos passos e encontre rapidamente o serviço mais adequado ao equipamento.</p>
        <Link href="/manutencao-preventiva" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-jb-600 px-4 text-sm font-extrabold text-white transition hover:bg-jb-700">Conhecer manutenção preventiva <ArrowRight className="size-4" aria-hidden /></Link>
      </aside>
    </div>
  );
}

function MegaCentral() {
  return (
    <div className="grid gap-0 xl:grid-cols-[1.35fr_0.95fr]">
      <section className="p-7">
        <TituloMega etiqueta="Central Técnica" titulo="Conteúdo técnico sem cara de menu institucional" descricao="Acesse aprendizados da bancada, casos, dúvidas e estrutura a partir de um só ponto." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AtalhoCard href="/central-tecnica" icone={<BookOpen className="size-4" aria-hidden />} titulo="Central Técnica" descricao="Artigos e conteúdo da equipe." />
          <AtalhoCard href="/cases" icone={<Sparkles className="size-4" aria-hidden />} titulo="Cases técnicos" descricao="Veja casos e experiências publicadas." />
          <AtalhoCard href="/faq" icone={<MessageCircle className="size-4" aria-hidden />} titulo="Dúvidas frequentes" descricao="Encontre respostas rápidas." />
          <AtalhoCard href="/estrutura" icone={<Settings className="size-4" aria-hidden />} titulo="Nossa estrutura" descricao="Conheça a estrutura da JB." />
          <AtalhoCard href="/sobre" icone={<User className="size-4" aria-hidden />} titulo="Sobre a JB" descricao="História e posicionamento." />
          <AtalhoCard href="/contato" icone={<Phone className="size-4" aria-hidden />} titulo="Contato" descricao="Fale com a equipe." />
        </div>
      </section>
      <aside className="m-4 ml-0 flex flex-col rounded-[1.4rem] border border-jb-100 bg-jb-50/60 p-6">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-jb-600 ring-1 ring-jb-100"><BookOpen className="size-5" aria-hidden /></span>
        <h3 className="mt-5 text-2xl font-extrabold tracking-[-0.035em] text-graf-950">O que a bancada aprende vira referência.</h3>
        <p className="mt-3 text-sm leading-relaxed text-graf-600">Use a Central Técnica para aprofundar a decisão e entender melhor os equipamentos.</p>
        <Link href="/central-tecnica" className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-jb-500 px-4 text-sm font-extrabold text-white transition hover:bg-jb-600">Explorar Central Técnica <ArrowRight className="size-4" aria-hidden /></Link>
      </aside>
    </div>
  );
}

function AtalhoCard({ href, icone, titulo, descricao }: { href: string; icone: React.ReactNode; titulo: string; descricao: string }) {
  return (
    <Link href={href} className="group flex min-h-[94px] items-start gap-3 rounded-2xl border border-graf-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-jb-200 hover:bg-jb-50/35 hover:shadow-[0_8px_20px_rgba(26,28,30,0.06)]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600 ring-1 ring-jb-100">{icone}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold leading-tight text-graf-950 group-hover:text-jb-700">{titulo}</span><span className="mt-1.5 block text-xs leading-relaxed text-graf-500">{descricao}</span></span>
      <ArrowRight className="mt-1 size-3.5 shrink-0 text-graf-400 transition group-hover:translate-x-0.5 group-hover:text-jb-600" aria-hidden />
    </Link>
  );
}

function subitensMobile(chave: ChaveMegaPremium, categorias: CategoriaMenu[], condicoes: CondicaoMenu[]): ItemMenu[] {
  if (chave === "catalogo") {
    return [
      ...categorias.slice(0, 5).map((categoria) => ({ rotulo: categoria.name, href: `/categoria/${categoria.slug}` })),
      ...condicoes.slice(0, 2).map((condicao) => ({ rotulo: condicao.rotulo, href: `/${condicao.slug}` })),
      { rotulo: "Marcas", href: "/marcas" },
      { rotulo: "Peças e acessórios", href: "/pecas-e-acessorios" },
    ];
  }
  if (chave === "seminovos") return [
    { rotulo: "Ver seminovos", href: "/seminovos" },
    { rotulo: "Comparar equipamentos", href: "/comparar" },
    { rotulo: "Simulador de custo", href: "/simulador-de-custo" },
  ];
  if (chave === "assistencia") return MENU_ASSISTENCIA;
  if (chave === "manutencao") return [
    { rotulo: "Manutenção preventiva", href: "/manutencao-preventiva" },
    { rotulo: "Planos de manutenção", href: "/planos-de-manutencao" },
    { rotulo: "Serviços", href: "/servicos" },
    { rotulo: "Pedir orçamento", href: "/orcamento" },
  ];
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
  /** A mesma direção da fileira do desktop — ver `centralPublicada`. */
  menu: ItemMenu[];
  telefone: string;
  whatsapp: string;
  ativo: (href: string) => boolean;
  reduzido: boolean;
}) {
  const [secao, setSecao] = useState<ChaveMegaPremium | null>(null);
  const caixa = useDialogo(aberto, aoFechar);

  useEffect(() => { if (!aberto) setSecao(null); }, [aberto]);

  return (
    <AnimatePresence>
      {aberto ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduzido ? 0 : 0.2 }} onClick={aoFechar} className="fixed inset-0 z-60 bg-graf-950/45 backdrop-blur-[2px] lg:hidden" aria-hidden />
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
            className="fixed inset-y-0 right-0 z-70 flex w-[min(25rem,94vw)] flex-col bg-white shadow-[0_0_70px_rgba(26,28,30,0.25)] lg:hidden"
          >
            <div className="flex h-17 shrink-0 items-center justify-between border-b border-graf-200 px-5 pr-3">
              <Logo altura={35} />
              <button type="button" onClick={aoFechar} className="flex size-11 items-center justify-center rounded-xl text-graf-700 transition hover:bg-jb-50 hover:text-jb-700"><X className="size-5" aria-hidden /><span className="sr-only">Fechar o menu</span></button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 pb-2">
                <Link href="/minha-jb" className="flex items-center gap-3.5 rounded-2xl border border-jb-100 bg-gradient-to-r from-jb-50 to-white p-4">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-jb-700 shadow-sm ring-1 ring-jb-100"><User className="size-5" aria-hidden /></span>
                  <span><span className="block text-sm font-extrabold text-graf-950">Área da Clínica</span><span className="mt-0.5 block text-xs text-graf-500">Pedidos, equipamentos e chamados</span></span>
                  <ArrowRight className="ml-auto size-4 text-jb-600" aria-hidden />
                </Link>
              </div>

              <nav aria-label="Menu principal no celular" className="p-4 pt-2">
                <ul className="space-y-2">
                  {menu.map((item) => {
                    const chave = chaveDoItem(item);
                    const abertoSecao = secao === chave;
                    return (
                      <li key={item.href} className="overflow-hidden rounded-2xl border border-graf-200/80 bg-white">
                        <div className="flex items-stretch">
                          <Link href={item.href} aria-current={ativo(item.href) ? "page" : undefined} className={cn("flex min-w-0 flex-1 items-center gap-3 p-3.5", ativo(item.href) && "bg-jb-50")}>
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-50 text-jb-600"><IconeMenu chave={chave} className="size-4" /></span>
                            <span className="min-w-0"><span className={cn("block text-sm font-extrabold", ativo(item.href) ? "text-jb-700" : "text-graf-950")}>{item.rotulo}</span>{item.descricao ? <span className="mt-0.5 block text-[0.7rem] leading-snug text-graf-500">{item.descricao}</span> : null}</span>
                          </Link>
                          <button type="button" onClick={() => setSecao(abertoSecao ? null : chave)} aria-expanded={abertoSecao} aria-label={`${abertoSecao ? "Fechar" : "Abrir"} opções de ${item.rotulo}`} className="flex w-12 shrink-0 items-center justify-center border-l border-graf-200 text-graf-500 hover:bg-jb-50 hover:text-jb-700"><ChevronDown className={cn("size-4 transition-transform", abertoSecao && "rotate-180")} aria-hidden /></button>
                        </div>
                        <AnimatePresence initial={false}>
                          {abertoSecao ? (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduzido ? 0 : 0.18 }} className="overflow-hidden border-t border-graf-200 bg-graf-50/70">
                              <ul className="p-2">
                                {subitensMobile(chave, categorias, condicoes).map((sub) => (
                                  <li key={sub.href}><Link href={sub.href} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-graf-700 transition hover:bg-white hover:text-jb-700">{sub.rotulo}<ArrowRight className="ml-auto size-3.5 opacity-40" aria-hidden /></Link></li>
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
                  <p className="px-2 text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-graf-500">Área da Clínica</p>
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {ATALHOS_CLIENTE.map((item) => <li key={item.href}><Link href={item.href} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-graf-700 hover:bg-jb-50 hover:text-jb-700">{item.rotulo}</Link></li>)}
                  </ul>
                </div>
              </nav>
            </div>

            <div className="shrink-0 space-y-2 border-t border-graf-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link href="/assistencia-tecnica/solicitar" className={classesBotao("primario", "md", "w-full rounded-xl")}><Wrench className="size-4 shrink-0" aria-hidden /> Solicitar assistência</Link>
              {whatsapp ? (
                <a href={whatsappHref(whatsapp, MENSAGEM_WHATSAPP)} target="_blank" rel="noopener noreferrer" className={classesBotao("secundario", "md", "w-full rounded-xl")}><MessageCircle className="size-4 shrink-0" aria-hidden /> Falar no WhatsApp</a>
              ) : telefone ? (
                <a href={telHref(telefone)} className={classesBotao("secundario", "md", "w-full rounded-xl")}><Phone className="size-4 shrink-0" aria-hidden /> Ligar para {telefone}</a>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
