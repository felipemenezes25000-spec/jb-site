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

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-lg bg-graf-200/70", className)}
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
                <ChevronRight className="size-3.5 shrink-0 text-graf-300" aria-hidden />
              ) : null}
              {item.href && !ultimo ? (
                <Link href={item.href} className="transition-colors hover:text-jb-700">
                  {item.rotulo}
                </Link>
              ) : (
                <span className={ultimo ? "font-medium text-graf-800" : undefined} aria-current={ultimo ? "page" : undefined}>
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
   ============================================================================ */

export function TituloSecao({
  sobretitulo,
  titulo,
  descricao,
  acao,
  centralizado,
  className,
}: {
  sobretitulo?: string;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  centralizado?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-8 gap-y-4",
        centralizado && "flex-col items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centralizado && "mx-auto")}>
        {sobretitulo ? (
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-jb-600">
            {sobretitulo}
          </p>
        ) : null}
        <h2 className="text-title leading-tight">{titulo}</h2>
        {descricao ? (
          <p className="mt-3 text-base leading-relaxed text-graf-600">{descricao}</p>
        ) : null}
      </div>
      {acao}
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
        const cor =
          passo.estado === "concluido"
            ? "bg-ok-500 text-white"
            : passo.estado === "atual"
              ? "bg-jb-500 text-white ring-4 ring-jb-500/15"
              : passo.estado === "cancelado"
                ? "bg-graf-400 text-white"
                : "bg-white text-graf-300 ring-1 ring-inset ring-graf-300";

        return (
          <li key={`${passo.titulo}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!ultimo ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5",
                  passo.estado === "concluido" ? "bg-ok-500/40" : "bg-graf-200",
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
