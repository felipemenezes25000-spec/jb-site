"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Circle,
  ClipboardList,
  FileText,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Menu,
  Package,
  Stethoscope,
  UserRound,
  Wrench,
  X,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { Logo } from "@/components/ui/logo";
import { useDialogo } from "@/components/ui/use-dialogo";
import { MENU_CLIENTE } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

export type ContadoresMenuCliente = Partial<Record<string, number>>;

type Icone = React.ComponentType<{ className?: string }>;

const ICONES: Record<string, Icone> = {
  "/minha-jb": LayoutDashboard,
  "/minha-jb/equipamentos": Stethoscope,
  "/minha-jb/assistencia": LifeBuoy,
  "/minha-jb/manutencoes": Wrench,
  "/minha-jb/documentos": FileText,
  "/minha-jb/pedidos": Package,
  "/minha-jb/orcamentos": ClipboardList,
  "/minha-jb/favoritos": Heart,
  "/minha-jb/enderecos": MapPin,
  "/minha-jb/perfil": UserRound,
};

const GRUPOS: { titulo: string; hrefs: string[] }[] = [
  {
    titulo: "A clínica",
    hrefs: [
      "/minha-jb/equipamentos",
      "/minha-jb/assistencia",
      "/minha-jb/manutencoes",
      "/minha-jb/documentos",
    ],
  },
  {
    titulo: "Compras",
    hrefs: ["/minha-jb/pedidos", "/minha-jb/orcamentos", "/minha-jb/favoritos"],
  },
  { titulo: "Conta", hrefs: ["/minha-jb/enderecos", "/minha-jb/perfil"] },
];

type ItemMontado = {
  href: string;
  rotulo: string;
  icone: Icone;
  ativo: boolean;
  quantidade: number | null;
};

function estaAtivo(href: string, caminho: string) {
  if (href === "/minha-jb") return caminho === href;
  return caminho === href || caminho.startsWith(`${href}/`);
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "JB";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

function Contador({ valor }: { valor: number }) {
  return (
    <Etiqueta tom="alerta" className="ml-auto shrink-0">
      <span className="tabular" aria-hidden>{valor}</span>
      <span className="sr-only">{valor} em aberto</span>
    </Etiqueta>
  );
}

function ItemMenu({ item, aoNavegar }: { item: ItemMontado; aoNavegar?: () => void }) {
  const Icone = item.icone;

  return (
    <li>
      <Link
        href={item.href}
        onClick={aoNavegar}
        aria-current={item.ativo ? "page" : undefined}
        className={cn(
          "group relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-[0.84rem] font-semibold transition-all duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
          item.ativo
            ? "bg-gradient-to-r from-jb-50 via-[#fff7f7] to-white text-jb-700 shadow-[inset_3px_0_0_#e51b23,0_1px_2px_rgba(18,24,35,0.025)]"
            : "text-graf-700 hover:bg-graf-50 hover:text-graf-950",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg transition-all",
            item.ativo
              ? "bg-white text-jb-600 shadow-sm ring-1 ring-inset ring-jb-500/10"
              : "text-graf-500 group-hover:bg-white group-hover:shadow-sm",
          )}
        >
          <Icone className="size-4" />
        </span>
        <span className="min-w-0 truncate">{item.rotulo}</span>
        {item.quantidade !== null ? <Contador valor={item.quantidade} /> : null}
      </Link>
    </li>
  );
}

function TituloGrupo({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-4 text-[0.66rem] font-extrabold uppercase tracking-[0.15em] text-graf-500">
      {children}
    </p>
  );
}

function Identidade({ nome, email, className }: { nome: string; email: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-graf-950 text-sm font-bold tracking-wide text-white"
      >
        {iniciais(nome)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-graf-950">{nome || "Área da Clínica"}</span>
        <span className="block truncate text-xs text-graf-500">{email}</span>
      </span>
    </div>
  );
}

export function MenuLateral({
  contadores,
  identidade,
  sair,
  className,
}: {
  contadores?: ContadoresMenuCliente;
  identidade: { nome: string; email: string };
  sair?: React.ReactNode;
  className?: string;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [entrou, setEntrou] = useState(false);

  const fechar = useCallback(() => setAberto(false), []);
  const painelRef = useDialogo(aberto, fechar);

  useEffect(() => {
    if (!aberto) {
      setEntrou(false);
      return;
    }
    const quadro = requestAnimationFrame(() => setEntrou(true));
    return () => cancelAnimationFrame(quadro);
  }, [aberto]);

  useEffect(() => {
    setAberto(false);
  }, [caminho]);

  useEffect(() => {
    if (!aberto) return;
    const consulta = window.matchMedia("(min-width: 64rem)");
    if (consulta.matches) {
      setAberto(false);
      return;
    }
    const aoMudar = (evento: MediaQueryListEvent) => {
      if (evento.matches) setAberto(false);
    };
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, [aberto]);

  const itens: ItemMontado[] = MENU_CLIENTE.map((item) => {
    const quantidade = contadores?.[item.href];
    return {
      href: item.href,
      rotulo: item.rotulo,
      icone: ICONES[item.href] ?? Circle,
      ativo: estaAtivo(item.href, caminho),
      quantidade: typeof quantidade === "number" && quantidade > 0 ? quantidade : null,
    };
  });

  const porHref = new Map(itens.map((item) => [item.href, item]));
  const visaoGeral = porHref.get("/minha-jb");
  const agrupados = new Set<string>(visaoGeral ? ["/minha-jb"] : []);

  const grupos = GRUPOS.map((grupo) => {
    const lista = grupo.hrefs
      .map((href) => porHref.get(href))
      .filter((item): item is ItemMontado => Boolean(item));
    for (const item of lista) agrupados.add(item.href);
    return { titulo: grupo.titulo, itens: lista };
  }).filter((grupo) => grupo.itens.length > 0);

  const restantes = itens.filter((item) => !agrupados.has(item.href));
  if (restantes.length > 0) grupos.push({ titulo: "Mais", itens: restantes });

  const atual = itens.find((item) => item.ativo) ?? visaoGeral ?? itens[0];
  const pendencias = itens.reduce((soma, item) => soma + (item.quantidade ?? 0), 0);
  const IconeAtual = atual?.icone ?? LayoutDashboard;

  const navegacao = (dentroDaGaveta: boolean) => (
    <>
      {visaoGeral ? (
        <ul className="space-y-1">
          <ItemMenu item={visaoGeral} aoNavegar={dentroDaGaveta ? fechar : undefined} />
        </ul>
      ) : null}

      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <TituloGrupo>{grupo.titulo}</TituloGrupo>
          <ul className="space-y-1">
            {grupo.itens.map((item) => (
              <ItemMenu key={item.href} item={item} aoNavegar={dentroDaGaveta ? fechar : undefined} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );

  return (
    <div className={className}>
      <nav
        aria-label="Área da Clínica"
        className="fixed inset-y-0 left-0 z-[60] hidden w-[16rem] border-r border-graf-200/80 bg-white shadow-[8px_0_32px_-28px_rgba(18,24,35,0.28)] lg:block"
      >
        <div className="flex h-dvh flex-col overflow-hidden px-4 pb-4 pt-4">
          <Link
            href="/minha-jb"
            className="mb-4 flex min-h-12 items-center gap-3 rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <Logo altura={32} />
            <span className="min-w-0 border-l border-graf-200 pl-3">
              <span className="block truncate text-[0.86rem] font-extrabold tracking-[-0.015em] text-graf-950">Área da Clínica</span>
              <span className="mt-0.5 block truncate text-[0.66rem] font-medium text-graf-500">Tecnologia que cuida</span>
            </span>
          </Link>

          <Link
            href="/minha-jb/assistencia/novo"
            className="mb-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-jb-500 px-4 text-sm font-bold text-white shadow-[0_9px_22px_-12px_rgba(229,27,35,0.72)] transition-all hover:-translate-y-px hover:bg-jb-600 hover:shadow-[0_12px_26px_-12px_rgba(229,27,35,0.78)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <span className="text-lg leading-none">+</span>
            Abrir chamado
          </Link>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{navegacao(false)}</div>

          <div className="mt-4 rounded-2xl border border-graf-200/90 bg-gradient-to-br from-[#fffafa] via-white to-graf-50 p-3.5 shadow-[0_14px_38px_-30px_rgba(18,24,35,0.38)]">
            <span className="mb-2.5 flex size-9 items-center justify-center rounded-full bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-500/10">
              <HeartHandshake className="size-[18px]" aria-hidden />
            </span>
            <p className="text-sm font-extrabold text-graf-950">Conte com a JB</p>
            <p className="mt-0.5 text-xs leading-relaxed text-graf-500">Soluções completas para o seu consultório.</p>
            <Link
              href="/contato"
              className="mt-2.5 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-jb-700 transition-colors hover:text-jb-800"
            >
              Falar com um especialista
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {sair ? <div className="mt-3 border-t border-graf-200 pt-3">{sair}</div> : null}
        </div>
      </nav>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          aria-controls={aberto ? "mj-gaveta" : undefined}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-graf-200/90 bg-white px-4 py-2 text-left shadow-[0_10px_28px_-24px_rgba(18,24,35,0.35)] transition-all hover:border-graf-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <IconeAtual className="size-5 shrink-0 text-jb-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.72rem] font-bold uppercase tracking-[0.1em] text-graf-500">Área da Clínica</span>
            <span className="block truncate text-sm font-bold text-graf-950">{atual?.rotulo ?? "Visão geral"}</span>
          </span>
          {pendencias > 0 ? (
            <Etiqueta tom="alerta" className="shrink-0">
              <span className="tabular" aria-hidden>{pendencias}</span>
              <span className="sr-only">{pendencias} itens em aberto</span>
            </Etiqueta>
          ) : null}
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
            <Menu className="size-[18px]" />
          </span>
          <span className="sr-only">Abrir o menu da área do cliente</span>
        </button>

        {aberto ? (
          <>
            <div
              className={cn(
                "fixed inset-0 z-60 bg-graf-950/40 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none",
                entrou ? "opacity-100" : "opacity-0",
              )}
              onClick={fechar}
              aria-hidden
            />

            <div
              id="mj-gaveta"
              ref={painelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mj-gaveta-titulo"
              tabIndex={-1}
              className={cn(
                "fixed inset-x-0 bottom-0 z-70 flex max-h-[88dvh] flex-col rounded-t-[1.5rem] bg-white shadow-pop",
                "transition-transform duration-200 ease-out motion-reduce:transition-none",
                entrou ? "translate-y-0" : "translate-y-full",
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-graf-200 px-4 py-3.5">
                <div className="min-w-0">
                  <h2 id="mj-gaveta-titulo" className="text-sm font-bold text-graf-950">Área da Clínica</h2>
                  <Identidade nome={identidade.nome} email={identidade.email} className="mt-2.5" />
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-graf-700 transition-colors hover:bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <X className="size-5" aria-hidden />
                  <span className="sr-only">Fechar o menu</span>
                </button>
              </div>

              <nav aria-label="Área da Clínica" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
                {navegacao(true)}
              </nav>

              <div className="space-y-3 border-t border-graf-200 px-4 py-4">
                <LinkBotao href="/minha-jb/assistencia/novo" larguraTotal onClick={fechar}>
                  <LifeBuoy className="size-4" aria-hidden />
                  Abrir chamado
                </LinkBotao>
                {sair}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
