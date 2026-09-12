"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AncoraDoProduto = { id: string; rotulo: string };

const ROTULOS_COMPACTOS: Record<string, string> = {
  "visao-geral": "Visão geral",
  "ficha-tecnica": "Especificações",
  preparo: "Antes de comprar",
  "entrega-e-garantia": "Entrega e garantia",
  duvidas: "Dúvidas",
};

/** Altura das faixas grudadas no topo, lida do token de `globals.css`. */
function ocupadoNoTopo() {
  const bruto = getComputedStyle(document.documentElement).getPropertyValue("--jb-topo-secoes");
  return Number.parseInt(bruto, 10) || 136;
}

export type CompraDaBarra = {
  precoCents: number;
  parcelas: { parcelas: number; valorCents: number } | null;
  soOrcamento: boolean;
  indisponivel: boolean;
};

/**
 * A caixa de compra sai de vista e não volta — no desktop.
 *
 * `.compra` é `position: sticky` dentro do grid do topo, e o grid termina onde
 * termina a coluna mais alta: da barra de seções para baixo (especificações,
 * instalação, entrega, dúvidas, comparação, avaliações, cross-sell) não havia
 * preço nem botão em ~5.400px de página a 1440. O celular tinha
 * `BarraCompraMobile`; o desktop não tinha nada.
 *
 * As fichas medidas resolvem isso sem inventar uma segunda faixa: a Peloton
 * gruda 1440×72 com título, âncoras e "Add to cart" no mesmo trilho; a Herman
 * Miller usa 1440×86 com título e âncoras; a Kabum gruda a própria caixa
 * (320×240 em `top:96`). O denominador comum é *uma* faixa, não duas.
 *
 * Por isso o preço e o botão entram aqui dentro, à direita das âncoras, na
 * faixa que já existe e já está grudada — sem nenhum pixel a mais de altura.
 */
function useForaDeVista(alvo: string) {
  const [fora, setFora] = useState(false);

  useEffect(() => {
    const caixa = document.querySelector<HTMLElement>(`main #${CSS.escape(alvo)}`);
    if (!caixa) return;

    const observador = new IntersectionObserver(
      ([entrada]) => setFora(!entrada.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observador.observe(caixa);
    return () => observador.disconnect();
  }, [alvo]);

  return fora;
}

export function NavegacaoDoProduto({
  ancoras,
  compra,
  alvoDaCompra = "caixa-de-compra",
}: {
  ancoras: AncoraDoProduto[];
  compra?: CompraDaBarra;
  alvoDaCompra?: string;
}) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const trilhoRef = useRef<HTMLUListElement>(null);
  const compraForaDeVista = useForaDeVista(alvoDaCompra);

  const ancorasEfetivas = useMemo(() => {
    return ancoras.filter((ancora) => ancora.id !== "relacionados");
  }, [ancoras]);

  useEffect(() => {
    if (ancorasEfetivas.length === 0) return;

    const alvos = ancorasEfetivas
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
      // A margem superior é a mesma altura que o `scroll-mt` das seções: o
      // que está atrás do cabeçalho e da barra não conta como visível.
      { rootMargin: `-${ocupadoNoTopo()}px 0px -60% 0px`, threshold: 0 },
    );

    for (const alvo of alvos) observador.observe(alvo);
    return () => observador.disconnect();
  }, [ancorasEfetivas]);

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

  if (ancorasEfetivas.length < 2) return null;

  const mostrarCompra = Boolean(compra) && compraForaDeVista;

  return (
    <nav
      aria-label="Seções deste produto"
      className="sticky top-[var(--jb-topo)] z-30 border-y border-graf-200 bg-white/95 backdrop-blur"
    >
      <div className="container-loja flex items-stretch gap-4">
        <ul
          ref={trilhoRef}
          className="scrollbar-none flex min-h-12 min-w-0 flex-1 gap-5 overflow-x-auto"
        >
          {ancorasEfetivas.map((ancora) => (
            <li key={ancora.id} className="shrink-0">
              <a
                href={`#${ancora.id}`}
                data-ancora={ancora.id}
                aria-current={ativa === ancora.id ? "true" : undefined}
                className="foco-jb flex min-h-12 items-center whitespace-nowrap border-b-2 border-transparent text-sm font-semibold text-graf-600 transition-colors hover:text-graf-950 aria-[current=true]:border-jb-500 aria-[current=true]:text-jb-700"
              >
                {ROTULOS_COMPACTOS[ancora.id] ?? ancora.rotulo}
              </a>
            </li>
          ))}
        </ul>

        {/* Só no desktop: no celular quem faz esse papel é `BarraCompraMobile`,
            que fica no rodapé, onde o polegar alcança. */}
        {compra ? (
          <div
            aria-hidden={!mostrarCompra}
            className={cn(
              "hidden shrink-0 items-center gap-3 transition-opacity duration-150 lg:flex",
              mostrarCompra ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {compra.indisponivel ? (
              <span className="text-sm font-bold text-graf-600">Indisponível</span>
            ) : compra.soOrcamento ? (
              <span className="text-sm font-bold text-graf-950">Sob orçamento</span>
            ) : (
              <span className="hidden text-right leading-tight xl:block">
                <span className="tabular block text-sm font-extrabold text-graf-950">
                  {formatarPreco(compra.precoCents)}
                </span>
                {compra.parcelas ? (
                  <span className="tabular block text-xs text-graf-500">
                    {compra.parcelas.parcelas}× de {formatarPreco(compra.parcelas.valorCents)}
                  </span>
                ) : null}
              </span>
            )}

            <a
              href={`#${alvoDaCompra}`}
              tabIndex={mostrarCompra ? undefined : -1}
              className={cn(
                "foco-jb inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-extrabold transition-colors",
                compra.indisponivel
                  ? "border border-graf-300 text-graf-800 hover:bg-graf-50"
                  : "bg-jb-500 text-white hover:bg-jb-600",
              )}
            >
              {compra.indisponivel ? null : <ShoppingCart className="size-4" aria-hidden />}
              {compra.indisponivel
                ? "Ver alternativas"
                : compra.soOrcamento
                  ? "Pedir orçamento"
                  : "Comprar"}
            </a>
          </div>
        ) : null}
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
  const visivel = useForaDeVista(alvo);
  const barraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    const corpo = document.body;
    if (!visivel) {
      raiz.style.removeProperty("--jb-barra-inferior");
      corpo.style.removeProperty("padding-bottom");
      return;
    }
    const altura = barraRef.current?.offsetHeight ?? 0;
    raiz.style.setProperty("--jb-barra-inferior", `${altura}px`);
    corpo.style.paddingBottom = `${altura}px`;
    return () => {
      raiz.style.removeProperty("--jb-barra-inferior");
      corpo.style.removeProperty("padding-bottom");
    };
  }, [visivel]);

  if (!visivel) return null;

  return (
    <div
      ref={barraRef}
      data-pdp-barra-compra
      className="fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 px-4 py-2.5 shadow-[0_-10px_30px_rgba(15,23,42,0.1)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          {soOrcamento ? (
            <p className="text-base font-bold text-graf-950">Sob orçamento</p>
          ) : (
            <>
              <p className="tabular text-lg font-extrabold leading-tight text-graf-950">
                {formatarPreco(precoCents)}
              </p>
              {parcelas ? (
                <p className="tabular truncate text-xs text-graf-500">
                  {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)} sem juros
                </p>
              ) : null}
            </>
          )}
        </div>

        <a
          href={`#${alvo}`}
          className={cn(
            "foco-jb inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-5 text-corpo font-bold shadow-sm transition-all duration-150",
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
