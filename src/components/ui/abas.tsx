"use client";

import { useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/* ============================================================================
   Abas
   Duas versões, mesma casca: AbasLocais guarda a escolha em estado (bom para
   recorte visual dentro de uma tela) e AbasPorUrl guarda na query string
   (bom quando a aba precisa sobreviver ao F5, ao voltar e ao link colado).

   Teclado como manda o padrão: setas andam entre as abas, Home e End vão às
   pontas, Tab pula direto para o painel. Todos os painéis ficam montados e o
   inativo sai com `hidden` — assim aria-controls sempre aponta para algo real.
   ============================================================================ */

export type Aba = {
  chave: string;
  rotulo: string;
  icone?: React.ComponentType<{ className?: string }>;
  /** Número ao lado do rótulo — pendências, itens, mensagens. */
  contador?: number;
  conteudo: React.ReactNode;
};

function ListaDeAbas({
  abas,
  ativa,
  aoTrocar,
  base,
  rotuloDaLista,
  pendente,
  className,
}: {
  abas: Aba[];
  ativa: string;
  aoTrocar: (chave: string) => void;
  base: string;
  rotuloDaLista: string;
  pendente?: boolean;
  className?: string;
}) {
  const refBotoes = useRef<Record<string, HTMLButtonElement | null>>({});

  function aoTeclar(evento: React.KeyboardEvent<HTMLDivElement>) {
    const indice = abas.findIndex((aba) => aba.chave === ativa);
    if (indice < 0) return;

    let destino = -1;
    if (evento.key === "ArrowRight") destino = (indice + 1) % abas.length;
    else if (evento.key === "ArrowLeft") destino = (indice - 1 + abas.length) % abas.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = abas.length - 1;
    else return;

    evento.preventDefault();
    const alvo = abas[destino];
    aoTrocar(alvo.chave);
    refBotoes.current[alvo.chave]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={rotuloDaLista}
      aria-busy={pendente || undefined}
      onKeyDown={aoTeclar}
      className={cn(
        "scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-graf-200 px-1",
        className,
      )}
    >
      {abas.map((aba) => {
        const selecionada = aba.chave === ativa;
        const Icone = aba.icone;
        return (
          <button
            key={aba.chave}
            ref={(elemento) => {
              refBotoes.current[aba.chave] = elemento;
            }}
            type="button"
            role="tab"
            id={`${base}-aba-${aba.chave}`}
            aria-selected={selecionada}
            aria-controls={`${base}-painel-${aba.chave}`}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => aoTrocar(aba.chave)}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              selecionada
                ? "border-jb-500 text-jb-700"
                : "border-transparent text-graf-500 hover:border-graf-300 hover:text-graf-800",
            )}
          >
            {Icone ? <Icone className="size-4 shrink-0" /> : null}
            {aba.rotulo}
            {typeof aba.contador === "number" ? (
              <span
                className={cn(
                  "tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                  selecionada ? "bg-jb-100 text-jb-700" : "bg-graf-100 text-graf-600",
                )}
              >
                {aba.contador}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Paineis({ abas, ativa, base }: { abas: Aba[]; ativa: string; base: string }) {
  return (
    <>
      {abas.map((aba) => (
        <div
          key={aba.chave}
          role="tabpanel"
          id={`${base}-painel-${aba.chave}`}
          aria-labelledby={`${base}-aba-${aba.chave}`}
          tabIndex={0}
          hidden={aba.chave !== ativa}
          className="pt-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          {aba.conteudo}
        </div>
      ))}
    </>
  );
}

/** Abas com estado interno — a escolha não sai da tela. */
export function AbasLocais({
  abas,
  inicial,
  rotuloDaLista = "Seções",
  className,
}: {
  abas: Aba[];
  inicial?: string;
  rotuloDaLista?: string;
  className?: string;
}) {
  const base = useId();
  const primeira = abas[0]?.chave ?? "";
  const [ativa, setAtiva] = useState(
    inicial && abas.some((aba) => aba.chave === inicial) ? inicial : primeira,
  );

  if (abas.length === 0) return null;
  const atual = abas.some((aba) => aba.chave === ativa) ? ativa : primeira;

  return (
    <div className={className}>
      <ListaDeAbas
        abas={abas}
        ativa={atual}
        aoTrocar={setAtiva}
        base={base}
        rotuloDaLista={rotuloDaLista}
      />
      <Paineis abas={abas} ativa={atual} base={base} />
    </div>
  );
}

/** Abas com a escolha na query string — sobrevive ao recarregar e ao compartilhar. */
export function AbasPorUrl({
  abas,
  parametro = "aba",
  rotuloDaLista = "Seções",
  empilharNoHistorico = false,
  className,
}: {
  abas: Aba[];
  parametro?: string;
  rotuloDaLista?: string;
  /** Por padrão troca a entrada atual: trocar de aba não enche o botão "voltar". */
  empilharNoHistorico?: boolean;
  className?: string;
}) {
  const base = useId();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  if (abas.length === 0) return null;

  const primeira = abas[0].chave;
  const daUrl = params.get(parametro);
  const atual = daUrl && abas.some((aba) => aba.chave === daUrl) ? daUrl : primeira;

  function trocar(chave: string) {
    const novos = new URLSearchParams(params.toString());
    if (chave === primeira) novos.delete(parametro);
    else novos.set(parametro, chave);
    const consulta = novos.toString();
    const destino = consulta ? `${pathname}?${consulta}` : pathname;
    iniciar(() => {
      if (empilharNoHistorico) router.push(destino, { scroll: false });
      else router.replace(destino, { scroll: false });
    });
  }

  return (
    <div className={className}>
      <ListaDeAbas
        abas={abas}
        ativa={atual}
        aoTrocar={trocar}
        base={base}
        rotuloDaLista={rotuloDaLista}
        pendente={pendente}
      />
      <Paineis abas={abas} ativa={atual} base={base} />
    </div>
  );
}
