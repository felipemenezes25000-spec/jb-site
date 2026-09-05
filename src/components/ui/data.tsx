import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Badges de estado
   Cinco tons e nada além: verde concluído, âmbar aguardando, azul em
   andamento, vermelho urgente, cinza inativo. E sempre com texto — nunca
   apenas cor, para quem não distingue matiz.
   ============================================================================ */

export type Tom = "ok" | "aguardando" | "andamento" | "alerta" | "neutro" | "marca";

const TONS: Record<Tom, string> = {
  ok: "bg-ok-50 text-ok-700 ring-ok-500/20",
  aguardando: "bg-warn-50 text-warn-700 ring-warn-500/20",
  andamento: "bg-info-50 text-info-700 ring-info-500/20",
  alerta: "bg-jb-50 text-jb-700 ring-jb-500/20",
  neutro: "bg-graf-100 text-graf-600 ring-graf-500/15",
  marca: "bg-jb-500 text-white ring-jb-700/20",
};

export function Etiqueta({
  tom = "neutro",
  className,
  children,
  ponto,
}: {
  tom?: Tom;
  className?: string;
  children: React.ReactNode;
  ponto?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        TONS[tom],
        className,
      )}
    >
      {ponto ? (
        <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

/* ============================================================================
   Cartão
   ============================================================================ */

export function Cartao({
  className,
  children,
  interativo,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interativo?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border border-graf-200 bg-white shadow-card",
        interativo &&
          "transition-[box-shadow,border-color] duration-200 hover:border-graf-300 hover:shadow-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CabecalhoCartao({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-graf-200 px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-bold text-graf-950">{titulo}</h2>
        {descricao ? <p className="mt-0.5 text-sm text-graf-500">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}

/* ============================================================================
   Estados de tela
   ============================================================================ */

export function Vazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-graf-300 bg-graf-50/60 px-6 py-14 text-center",
        className,
      )}
    >
      {Icone ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-graf-500 shadow-card">
          <Icone className="size-5" />
        </span>
      ) : null}
      <p className="text-base font-semibold text-graf-800">{titulo}</p>
      {descricao ? (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-graf-500">
          {descricao}
        </p>
      ) : null}
      {acao ? <div className="mt-6">{acao}</div> : null}
    </div>
  );
}

/**
 * Bloco de carregamento.
 *
 * Peça solta: dê a altura e a largura do que vai entrar no lugar. Para
 * espelhar uma tela inteira — grade de produto, tabela, painel de métricas —
 * use os esqueletos prontos em `@/components/ui/esqueletos`.
 */
export function Esqueleto({
  className,
  circular,
}: {
  className?: string;
  /** Avatar, ícone, selo redondo. */
  circular?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("esqueleto", circular ? "rounded-full" : "rounded-lg", className)}
    />
  );
}

/* ============================================================================
   Trilha de navegação
   ============================================================================ */

export type Migalha = { rotulo: string; href?: string };

export function Trilha({ itens, className }: { itens: Migalha[]; className?: string }) {
  return (
    <nav aria-label="Você está em" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-graf-500">
        {itens.map((item, i) => {
          const ultimo = i === itens.length - 1;
          return (
            <li key={`${item.rotulo}-${i}`} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 text-graf-400" aria-hidden />
              ) : null}
              {item.href && !ultimo ? (
                <Link
                  href={item.href}
                  /* 44px de altura: no celular a trilha é o caminho de volta e
                     precisa ser tocável, não só legível. */
                  className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-jb-700"
                >
                  {item.rotulo}
                </Link>
              ) : (
                <span
                  className={ultimo ? "font-medium text-graf-800" : undefined}
                  aria-current={ultimo ? "page" : undefined}
                >
                  {item.rotulo}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ============================================================================
   Cabeçalho de seção da página pública

   O degrau completo: sobretítulo curto em caixa alta, título na escala de
   seção (36–44px no desktop) e uma linha de apoio. Em faixa grafite basta
   envolver com `.on-dark` — as cores se invertem sozinhas.
   ============================================================================ */

export type TamanhoTitulo = "secao" | "titulo" | "display";

const TAMANHO_TITULO: Record<TamanhoTitulo, string> = {
  secao: "text-section",
  titulo: "text-title",
  display: "text-display",
};

export function TituloSecao({
  sobretitulo,
  titulo,
  descricao,
  acao,
  centralizado,
  tamanho = "secao",
  como = "h2",
  className,
}: {
  sobretitulo?: string;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  centralizado?: boolean;
  /** Escala do título. O padrão é a de seção; use `titulo` em blocos internos. */
  tamanho?: TamanhoTitulo;
  /** Nível do heading — a ordem da página manda, não o tamanho. */
  como?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const Heading = como;

  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-8 gap-y-5",
        centralizado && "flex-col items-center text-center",
        className,
      )}
    >
      {/* `min-w-0`: sem ele o item de flex tem largura mínima igual ao seu
          conteúdo, e um título com palavra longa alarga a seção inteira. */}
      <div className={cn("min-w-0 max-w-2xl", centralizado && "mx-auto")}>
        {sobretitulo ? <p className="sobretitulo mb-3">{sobretitulo}</p> : null}
        <Heading className={cn(TAMANHO_TITULO[tamanho], "texto-forte")}>{titulo}</Heading>
        {descricao ? (
          <p className="texto-guia texto-suave mt-4 max-w-prose">{descricao}</p>
        ) : null}
      </div>
      {acao ? <div className="min-w-0 max-w-full shrink-0">{acao}</div> : null}
    </div>
  );
}

/* ============================================================================
   Linha do tempo — pedido, chamado, OS
   ============================================================================ */

export type PassoLinha = {
  titulo: string;
  descricao?: string;
  quando?: string;
  estado: "concluido" | "atual" | "futuro" | "cancelado";
};

const ESTADO_EM_PALAVRAS: Record<PassoLinha["estado"], string> = {
  concluido: "Etapa concluída:",
  atual: "Etapa atual:",
  futuro: "Etapa ainda não iniciada:",
  cancelado: "Etapa cancelada:",
};

export function LinhaDoTempo({ passos }: { passos: PassoLinha[] }) {
  return (
    <ol className="relative">
      {passos.map((passo, i) => {
        const ultimo = i === passos.length - 1;
        /* Os tons escuros (700 / 600) e não os 500: o marcador carrega um
           glifo branco, e branco sobre ok-500 dá 2,54:1 e sobre graf-400 dá
           2,61:1 — abaixo do 3:1 que a WCAG 1.4.11 pede para elemento gráfico
           que comunica estado. ok-700 dá 5,48:1 e graf-600, 5,61:1. */
        const cor =
          passo.estado === "concluido"
            ? "bg-ok-700 text-white"
            : passo.estado === "atual"
              ? "bg-jb-500 text-white ring-4 ring-jb-500/15"
              : passo.estado === "cancelado"
                ? "bg-graf-600 text-white"
                : "bg-white text-graf-500 ring-1 ring-inset ring-graf-450";

        return (
          <li key={`${passo.titulo}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!ultimo ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5",
                  passo.estado === "concluido" ? "bg-ok-700/40" : "bg-graf-200",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                cor,
              )}
              aria-hidden
            >
              {passo.estado === "concluido" ? "✓" : passo.estado === "atual" ? "●" : ""}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-semibold",
                  passo.estado === "futuro" ? "text-graf-500" : "text-graf-900",
                )}
              >
                {/* o estado da etapa é dito por escrito, não só pela cor e pelo
                    marcador — que é aria-hidden e some para o leitor de tela */}
                <span className="sr-only">{ESTADO_EM_PALAVRAS[passo.estado]} </span>
                {passo.titulo}
              </p>
              {passo.descricao ? (
                <p className="mt-0.5 text-sm leading-relaxed text-graf-600">{passo.descricao}</p>
              ) : null}
              {passo.quando ? (
                <p className="mt-1 text-xs text-graf-500">{passo.quando}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
