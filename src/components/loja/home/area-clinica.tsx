import Link from "next/link";
import {
  CalendarClock,
  Check,
  FileText,
  FolderOpen,
  Headset,
  Package,
  Wrench,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Simbolo } from "@/components/ui/logo";
import { Secao } from "@/components/ui/secao";
import { cn } from "@/lib/utils";

/* ============================================================================
   Área da clínica

   A vantagem competitiva da JB: depois da venda, o cliente não fica com um
   e-mail de confirmação e mais nada. A Área da Clínica é onde equipamento, pedido,
   chamado, orçamento, manutenção e documento continuam existindo.

   O painel à direita é a cara real do produto — as seções que existem de
   fato, com os mesmos rótulos do menu do cliente. A coluna estreita é
   decorativa (não são links, para não duplicar navegação nem criar paradas de
   tabulação escondidas); os atalhos com link são os cartões, e todos levam
   para a rota real, que pede login quando é o caso.
   ============================================================================ */

const VANTAGENS = [
  "Cada equipamento com ficha, documentos e o histórico do que já foi feito nele",
  "Pedidos e chamados acompanhados etapa por etapa, sem precisar ligar",
  "Orçamentos aprovados ou recusados pelo site, com o registro da decisão",
  "Manutenções programadas e as que já foram realizadas, no mesmo lugar",
];

/** Mesmos rótulos do menu do cliente — a coluna estreita imita o painel real. */
const MENU_ILUSTRADO = [
  "Visão geral",
  "Pedidos",
  "Meus equipamentos",
  "Assistência",
  "Manutenções",
  "Orçamentos",
  "Documentos",
  "Favoritos",
];

const ATALHOS: {
  rotulo: string;
  descricao: string;
  href: string;
  icone: React.ComponentType<{ className?: string }>;
}[] = [
  {
    rotulo: "Pedidos",
    descricao: "Itens, valores e a etapa em que cada compra está.",
    href: "/minha-jb/pedidos",
    icone: Package,
  },
  {
    rotulo: "Meus equipamentos",
    descricao: "A ficha de cada máquina da clínica, com histórico.",
    href: "/minha-jb/equipamentos",
    icone: Wrench,
  },
  {
    rotulo: "Assistência",
    descricao: "Chamados abertos e o andamento de cada um.",
    href: "/minha-jb/assistencia",
    icone: Headset,
  },
  {
    rotulo: "Manutenções",
    descricao: "Visitas programadas e as já realizadas.",
    href: "/minha-jb/manutencoes",
    icone: CalendarClock,
  },
  {
    rotulo: "Orçamentos",
    descricao: "Propostas para aprovar ou recusar pelo site.",
    href: "/minha-jb/orcamentos",
    icone: FileText,
  },
  {
    rotulo: "Documentos",
    descricao: "Notas, manuais e laudos guardados por equipamento.",
    href: "/minha-jb/documentos",
    icone: FolderOpen,
  },
];

export function SecaoAreaClinica() {
  return (
    <Secao fundo="grafite" espaco="xl" padraoDeFundo rotuladoPor="area-da-clinica">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
        <div>
          <p className="sobretitulo">Área da clínica</p>
          <h2 id="area-da-clinica" className="mt-4 text-display text-white">
            Depois da compra, o equipamento continua tendo dono — e história.
          </h2>
          <p className="texto-guia mt-6 max-w-xl text-graf-300">
            A Área da Clínica é a área da sua clínica dentro da JB. É onde o pós-venda deixa de
            ser troca de mensagem e vira registro: o que você tem, o que está em
            atendimento e o que vem pela frente.
          </p>

          <ul className="mt-8 space-y-4">
            {VANTAGENS.map((vantagem) => (
              <li key={vantagem} className="flex gap-3 text-[0.9375rem] leading-relaxed text-graf-300">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-jb-500/15 text-jb-300"
                >
                  <Check className="size-3" />
                </span>
                {vantagem}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/cadastro" variante="claro" tamanho="lg">
              Criar a conta da clínica
            </LinkBotao>
            <LinkBotao href="/entrar" variante="contorno-claro" tamanho="lg">
              Já tenho conta
            </LinkBotao>
          </div>
        </div>

        <PainelMinhaJB />
      </div>
    </Secao>
  );
}

function PainelMinhaJB() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-white/10">
      <div className="flex items-center justify-between gap-3 border-b border-graf-200 bg-graf-50 px-4 py-3">
        <span className="flex items-center gap-2.5">
          <Simbolo tamanho={22} />
          <span className="text-sm font-bold text-graf-950">Área da Clínica</span>
        </span>
        <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-graf-500 ring-1 ring-inset ring-graf-200">
          Área da clínica
        </span>
      </div>

      <div className="grid sm:grid-cols-[10.5rem_minmax(0,1fr)]">
        {/* Ilustração do menu do cliente — sem link, sem foco, sem duplicar rota. */}
        <div aria-hidden className="hidden border-r border-graf-200 bg-white p-3 sm:block">
          <ul className="space-y-0.5">
            {MENU_ILUSTRADO.map((item, i) => (
              <li key={item}>
                <span
                  className={cn(
                    "block truncate rounded-md px-3 py-2 text-[0.8125rem] font-semibold",
                    i === 0 ? "bg-jb-50 text-jb-700" : "text-graf-600",
                  )}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface-muted p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
            O que você encontra lá dentro
          </p>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {ATALHOS.map((atalho) => {
              const Icone = atalho.icone;
              return (
                <li key={atalho.href} className="flex">
                  <Link
                    href={atalho.href}
                    className="group flex w-full flex-col rounded-xl border border-graf-200 bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-jb-200 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 items-center justify-center rounded-lg bg-graf-100 text-graf-700 transition-colors group-hover:bg-jb-50 group-hover:text-jb-600"
                    >
                      <Icone className="size-[18px]" />
                    </span>
                    <span className="mt-3 text-sm font-bold text-graf-950">{atalho.rotulo}</span>
                    <span className="mt-1 text-xs leading-relaxed text-graf-500">
                      {atalho.descricao}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
