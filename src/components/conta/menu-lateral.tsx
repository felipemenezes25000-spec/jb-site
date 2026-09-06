"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Circle,
  ClipboardList,
  FileText,
  Heart,
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
import { useDialogo } from "@/components/ui/use-dialogo";
import { MENU_CLIENTE } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

/**
 * Navegação da Área da Clínica.
 *
 * Duas formas para o mesmo conteúdo, porque as duas telas pedem coisas
 * diferentes: no desktop uma coluna que fica na tela o tempo todo, com o rosto
 * da conta em cima e as áreas agrupadas por assunto; no celular um seletor de
 * área que abre uma gaveta inteira — barra rolável horizontal esconde metade
 * dos destinos e obriga a arrastar para descobrir o que existe.
 *
 * Só um dos dois blocos fica visível por vez, então o leitor de tela nunca
 * ouve a lista duas vezes.
 *
 * `contadores` é indexado pelo href do item, exatamente como está em
 * MENU_CLIENTE. Ex.: `{ "/minha-jb/pedidos": 2 }` marca 2 pedidos em aberto.
 * Contador ausente, zero ou negativo não desenha etiqueta nenhuma.
 */

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

/**
 * Agrupamento por assunto. A ordem de MENU_CLIENTE é a da loja inteira e não
 * muda aqui; o que muda é a leitura: quem entra procura "a clínica" ou "a
 * compra", não uma lista de dez itens sem degrau.
 */
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
  // a visão geral é a raiz da área: só casa exata, senão fica sempre acesa
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
      <span className="tabular" aria-hidden>
        {valor}
      </span>
      <span className="sr-only">{valor} em aberto</span>
    </Etiqueta>
  );
}

/** Uma linha da navegação. O mesmo desenho na coluna e na gaveta. */
function ItemMenu({ item, aoNavegar }: { item: ItemMontado; aoNavegar?: () => void }) {
  const Icone = item.icone;

  return (
    <li>
      <Link
        href={item.href}
        onClick={aoNavegar}
        aria-current={item.ativo ? "page" : undefined}
        className={cn(
          "relative flex min-h-11 items-center gap-2.5 rounded-lg py-2.5 pl-4 pr-3 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
          item.ativo
            ? "bg-jb-50 text-graf-950"
            : "text-graf-700 hover:bg-graf-100 hover:text-graf-950",
        )}
      >
        {item.ativo ? (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-jb-500"
          />
        ) : null}
        <Icone
          className={cn(
            "size-[18px] shrink-0",
            item.ativo ? "text-jb-600" : "text-graf-500",
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate">{item.rotulo}</span>
        {item.quantidade !== null ? <Contador valor={item.quantidade} /> : null}
      </Link>
    </li>
  );
}

/** Cabeçalho de grupo — o degrau que transforma dez links em três assuntos. */
function TituloGrupo({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1.5 pt-5 text-[0.75rem] font-bold uppercase tracking-[0.08em] text-graf-500">
      {children}
    </p>
  );
}

function Identidade({
  nome,
  email,
  className,
}: {
  nome: string;
  email: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-graf-950 text-sm font-bold tracking-wide text-white"
      >
        {iniciais(nome)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-graf-950">
          {nome || "Área da Clínica"}
        </span>
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
  /** Formulário de sair, montado no servidor e desenhado nos dois formatos. */
  sair?: React.ReactNode;
  className?: string;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [entrou, setEntrou] = useState(false);

  const fechar = useCallback(() => setAberto(false), []);
  const painelRef = useDialogo(aberto, fechar);

  // a gaveta desliza para dentro em vez de aparecer de estalo; quem pede menos
  // movimento recebe a troca direta (motion-reduce zera a transição)
  useEffect(() => {
    if (!aberto) {
      setEntrou(false);
      return;
    }
    const quadro = requestAnimationFrame(() => setEntrou(true));
    return () => cancelAnimationFrame(quadro);
  }, [aberto]);

  // trocar de página fecha a gaveta — senão ela cobre a tela que acabou de abrir
  useEffect(() => {
    setAberto(false);
  }, [caminho]);

  /*
   * Girar o tablet com a gaveta aberta esconde a gaveta (ela é `lg:hidden`) mas
   * deixaria a trava de rolagem ligada — a página ficaria presa sem nada na
   * frente. Ao cruzar para o desktop, a gaveta se fecha de verdade.
   */
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

  // item novo em MENU_CLIENTE não pode sumir da navegação por não estar mapeado
  const restantes = itens.filter((item) => !agrupados.has(item.href));
  if (restantes.length > 0) grupos.push({ titulo: "Mais", itens: restantes });

  const atual = itens.find((item) => item.ativo) ?? visaoGeral ?? itens[0];
  const pendencias = itens.reduce((soma, item) => soma + (item.quantidade ?? 0), 0);
  const IconeAtual = atual?.icone ?? LayoutDashboard;

  const navegacao = (dentroDaGaveta: boolean) => (
    <>
      {visaoGeral ? (
        <ul className="space-y-1">
          <ItemMenu
            item={visaoGeral}
            aoNavegar={dentroDaGaveta ? fechar : undefined}
          />
        </ul>
      ) : null}

      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <TituloGrupo>{grupo.titulo}</TituloGrupo>
          <ul className="space-y-1">
            {grupo.itens.map((item) => (
              <ItemMenu
                key={item.href}
                item={item}
                aoNavegar={dentroDaGaveta ? fechar : undefined}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );

  return (
    <div className={className}>
      {/* ==================================================== desktop */}
      <nav aria-label="Área da Clínica" className="hidden lg:block">
        {/* top-20: 64px do topo fixo da área mais 16px de folga. A identidade
            de quem está logado não se repete aqui — ela já está no topo, e
            duplicá-la gastava a primeira dobra da coluna com informação que a
            pessoa acabou de ler. */}
        <div className="sticky top-20 flex max-h-[calc(100dvh-6.5rem)] flex-col overflow-y-auto rounded-2xl border border-graf-200 bg-white p-3">
          <LinkBotao href="/minha-jb/assistencia/novo" tamanho="sm" larguraTotal>
            <LifeBuoy className="size-4" aria-hidden />
            Abrir chamado
          </LinkBotao>

          <div className="mt-3 flex-1">{navegacao(false)}</div>

          {sair ? <div className="mt-5 border-t border-graf-200 pt-3">{sair}</div> : null}
        </div>
      </nav>

      {/* ===================================================== celular */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          /* enquanto fechada a gaveta não está no DOM: apontar para um id
             inexistente é pior do que não apontar. `aria-haspopup` e
             `aria-expanded` já dizem o essencial. */
          aria-controls={aberto ? "mj-gaveta" : undefined}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-graf-200 bg-white px-4 py-2 text-left shadow-card transition-colors hover:border-graf-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <IconeAtual className="size-5 shrink-0 text-jb-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.75rem] font-bold uppercase tracking-[0.08em] text-graf-500">
              Área da Clínica
            </span>
            <span className="block truncate text-sm font-bold text-graf-950">
              {atual?.rotulo ?? "Visão geral"}
            </span>
          </span>
          {pendencias > 0 ? (
            <Etiqueta tom="alerta" className="shrink-0">
              <span className="tabular" aria-hidden>
                {pendencias}
              </span>
              <span className="sr-only">{pendencias} itens em aberto</span>
            </Etiqueta>
          ) : null}
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-700"
          >
            <Menu className="size-[18px]" />
          </span>
          <span className="sr-only">Abrir o menu da área do cliente</span>
        </button>

        {aberto ? (
          <>
            <div
              className={cn(
                "fixed inset-0 z-60 bg-graf-950/40 transition-opacity duration-200 motion-reduce:transition-none",
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
                "fixed inset-x-0 bottom-0 z-70 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-pop",
                "transition-transform duration-200 ease-out motion-reduce:transition-none",
                entrou ? "translate-y-0" : "translate-y-full",
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-graf-200 px-4 py-3.5">
                <div className="min-w-0">
                  <h2 id="mj-gaveta-titulo" className="text-sm font-bold text-graf-950">
                    Área da Clínica
                  </h2>
                  <Identidade
                    nome={identidade.nome}
                    email={identidade.email}
                    className="mt-2.5"
                  />
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <X className="size-5" aria-hidden />
                  <span className="sr-only">Fechar o menu</span>
                </button>
              </div>

              <nav
                aria-label="Área da Clínica"
                className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1"
              >
                {navegacao(true)}
              </nav>

              <div className="space-y-3 border-t border-graf-200 px-4 py-4">
                <LinkBotao
                  href="/minha-jb/assistencia/novo"
                  larguraTotal
                  onClick={fechar}
                >
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
