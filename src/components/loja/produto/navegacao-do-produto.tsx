"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AncoraDoProduto = { id: string; rotulo: string };

export function NavegacaoDoProduto({ ancoras }: { ancoras: AncoraDoProduto[] }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const trilhoRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (ancoras.length === 0) return;

    const alvos = ancoras
      .map((ancora) => document.querySelector<HTMLElement>(`main #${CSS.escape(ancora.id)}`))
      .filter((elemento): elemento is HTMLElement => elemento !== null);

    if (alvos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis[0]) setAtiva(visiveis[0].target.id);
      },
      { rootMargin: "-136px 0px -60% 0px", threshold: 0 },
    );

    for (const alvo of alvos) observador.observe(alvo);
    return () => observador.disconnect();
  }, [ancoras]);

  useEffect(() => {
    if (!ativa) return;
    const trilho = trilhoRef.current;
    const item = trilho?.querySelector<HTMLElement>(`[data-ancora="${ativa}"]`);
    if (!trilho || !item) return;

    const foraAEsquerda = item.offsetLeft < trilho.scrollLeft;
    const foraADireita =
      item.offsetLeft + item.offsetWidth > trilho.scrollLeft + trilho.clientWidth;

    if (foraAEsquerda || foraADireita) {
      trilho.scrollTo({ left: Math.max(0, item.offsetLeft - 16), behavior: "smooth" });
    }
  }, [ativa]);

  if (ancoras.length < 2) return null;

  return (
    <nav
      aria-label="Seções deste equipamento"
      className="sticky top-[72px] z-30 border-b border-graf-200/80 bg-white/88 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.035)] backdrop-blur-xl"
    >
      <div className="container-jb">
        <ul
          ref={trilhoRef}
          className="scrollbar-none flex gap-1.5 overflow-x-auto rounded-2xl border border-graf-200 bg-graf-50/75 p-1.5"
        >
          {ancoras.map((ancora) => {
            const atual = ativa === ancora.id;
            return (
              <li key={ancora.id} className="shrink-0">
                <a
                  href={`#${ancora.id}`}
                  data-ancora={ancora.id}
                  aria-current={atual ? "true" : undefined}
                  className={cn(
                    "foco-jb flex min-h-10 items-center whitespace-nowrap rounded-xl px-3.5 text-[0.8125rem] font-bold transition-all duration-150",
                    atual
                      ? "bg-white text-jb-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-graf-200"
                      : "text-graf-500 hover:bg-white/70 hover:text-graf-950",
                  )}
                >
                  {ancora.rotulo}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function BarraCompraMobile({
  precoCents,
  parcelas,
  soOrcamento,
  indisponivel,
  alvo = "caixa-de-compra",
}: {
  precoCents: number;
  parcelas: { parcelas: number; valorCents: number } | null;
  soOrcamento: boolean;
  indisponivel: boolean;
  alvo?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const barraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const caixa = document.querySelector<HTMLElement>(`main #${CSS.escape(alvo)}`);
    if (!caixa) return;

    const observador = new IntersectionObserver(
      ([entrada]) => setVisivel(!entrada.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [alvo]);

  useEffect(() => {
    const raiz = document.documentElement;
    if (!visivel) {
      raiz.style.removeProperty("--jb-barra-inferior");
      return;
    }
    const altura = barraRef.current?.offsetHeight ?? 0;
    raiz.style.setProperty("--jb-barra-inferior", `${altura}px`);
    return () => {
      raiz.style.removeProperty("--jb-barra-inferior");
    };
  }, [visivel]);

  if (!visivel) return null;

  return (
    <div
      ref={barraRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 px-4 py-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          {soOrcamento ? (
            <p className="text-[0.9375rem] font-bold text-graf-950">Sob orçamento</p>
          ) : (
            <>
              <p className="tabular text-lg font-extrabold leading-tight text-graf-950">
                {formatarPreco(precoCents)}
              </p>
              {parcelas ? (
                <p className="tabular truncate text-[0.75rem] text-graf-500">
                  {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)} sem juros
                </p>
              ) : null}
            </>
          )}
        </div>

        <a
          href={`#${alvo}`}
          className={cn(
            "foco-jb inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-5 text-[0.9375rem] font-bold shadow-sm transition-all duration-150",
            indisponivel
              ? "border border-graf-300 bg-white text-graf-800 hover:bg-graf-50"
              : "bg-jb-500 text-white hover:-translate-y-0.5 hover:bg-jb-600",
          )}
        >
          {indisponivel ? null : <ShoppingCart className="size-[18px]" aria-hidden />}
          {indisponivel ? "Ver alternativas" : soOrcamento ? "Pedir orçamento" : "Comprar"}
        </a>
      </div>
    </div>
  );
}
