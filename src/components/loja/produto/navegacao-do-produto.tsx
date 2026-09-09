"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AncoraDoProduto = { id: string; rotulo: string };

const ROTULOS_COMPACTOS: Record<string, string> = {
  "visao-geral": "Visão geral",
  sobre: "Sobre",
  "ficha-tecnica": "Especificações",
  preparo: "Antes de comprar",
  "entrega-e-garantia": "Entrega e garantia",
  duvidas: "Dúvidas",
  "comparacao-rapida": "Comparar",
  "avaliacoes-verificadas": "Avaliações",
  "acessorios-compativeis": "Acessórios",
  "produtos-complementares": "Use junto",
};

const EXTRAS_DA_PDP: AncoraDoProduto[] = [
  { id: "comparacao-rapida", rotulo: "Comparar" },
  { id: "avaliacoes-verificadas", rotulo: "Avaliações" },
  { id: "acessorios-compativeis", rotulo: "Acessórios" },
  { id: "produtos-complementares", rotulo: "Use junto" },
];

export function NavegacaoDoProduto({ ancoras }: { ancoras: AncoraDoProduto[] }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const [extrasVisiveis, setExtrasVisiveis] = useState<string[]>([]);
  const trilhoRef = useRef<HTMLUListElement>(null);

  /*
   * Comparação/avaliações podem vir do layout servidor, enquanto acessórios e
   * complementos chegam depois de uma consulta cliente. Um MutationObserver
   * mantém a barra fiel ao que existe de verdade, sem aba vazia e sem depender
   * da ordem de hidratação.
   */
  useEffect(() => {
    function sincronizarExtras() {
      const ids = EXTRAS_DA_PDP
        .filter((ancora) => document.querySelector(`main #${CSS.escape(ancora.id)}`))
        .map((ancora) => ancora.id);

      setExtrasVisiveis((atuais) =>
        atuais.length === ids.length && atuais.every((id, indice) => id === ids[indice]) ? atuais : ids,
      );
    }

    sincronizarExtras();
    const main = document.querySelector("main");
    if (!main) return;

    const observador = new MutationObserver(sincronizarExtras);
    observador.observe(main, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, []);

  const ancorasEfetivas = useMemo(() => {
    // O chamador antigo ainda declara `relacionados` durante a migração, mas o
    // bloco genérico foi aposentado: alternativas/complementos/acessórios têm
    // experiências próprias. Filtrar aqui evita uma âncora sem destino.
    const base = ancoras.filter((ancora) => ancora.id !== "relacionados");
    const existentes = new Set(base.map((ancora) => ancora.id));
    return [
      ...base,
      ...EXTRAS_DA_PDP.filter(
        (ancora) => extrasVisiveis.includes(ancora.id) && !existentes.has(ancora.id),
      ),
    ];
  }, [ancoras, extrasVisiveis]);

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
      { rootMargin: "-136px 0px -60% 0px", threshold: 0 },
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

  function abrirSecao(id: string) {
    const secao = document.querySelector<HTMLElement>(`main #${CSS.escape(id)}`);
    const detalhes = secao?.querySelector<HTMLDetailsElement>("details");
    if (detalhes) detalhes.open = true;
  }

  if (ancorasEfetivas.length < 2) return null;

  return (
    <nav
      aria-label="Seções deste equipamento"
      className="sticky top-[72px] z-30 border-y border-graf-200 bg-white/95 backdrop-blur"
    >
      <ul
        ref={trilhoRef}
        className="container-jb scrollbar-none flex min-h-12 max-w-[112rem] gap-5 overflow-x-auto"
      >
        {ancorasEfetivas.map((ancora) => (
          <li key={ancora.id} className="shrink-0">
            <a
              href={`#${ancora.id}`}
              data-ancora={ancora.id}
              aria-current={ativa === ancora.id ? "true" : undefined}
              onClick={() => abrirSecao(ancora.id)}
              className="foco-jb flex min-h-12 items-center whitespace-nowrap border-b-2 border-transparent text-sm font-semibold text-graf-600 transition-colors hover:text-graf-950 aria-[current=true]:border-jb-500 aria-[current=true]:text-jb-700"
            >
              {ROTULOS_COMPACTOS[ancora.id] ?? ancora.rotulo}
            </a>
          </li>
        ))}
      </ul>
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
