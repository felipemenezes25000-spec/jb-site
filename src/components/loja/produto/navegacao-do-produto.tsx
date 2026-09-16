"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Navegação da página do equipamento

   A página do equipamento ficou longa — e isso é correto: ficha técnica,
   pré-requisitos, o que vem na caixa, documentos, dúvidas, unidade física.
   Longa e sem mapa, porém, é a mesma coisa que curta e incompleta: ninguém
   rola dez telas para descobrir se a instalação está inclusa.

   Esta faixa é o mapa. Ela gruda logo abaixo do cabeçalho depois que a
   primeira dobra passa, mostra só as seções que aquela página realmente tem —
   seção vazia não vira âncora — e marca em qual delas a leitura está.

   POR QUE ÂNCORA E NÃO ABA

   Aba esconde conteúdo do buscador e de quem usa Ctrl+F. O escopo pede
   explicitamente para não esconder conteúdo crítico de SEO atrás de abas. Aqui
   tudo continua no HTML, numa página só; a faixa apenas leva até o pedaço.

   O destaque da seção atual usa `IntersectionObserver` com uma margem superior
   igual à altura grudada — sem isso, a seção "ativa" seria sempre a que está
   escondida atrás do cabeçalho.
   ============================================================================ */

export type AncoraDoProduto = { id: string; rotulo: string };

export function NavegacaoDoProduto({ ancoras }: { ancoras: AncoraDoProduto[] }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const trilhoRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (ancoras.length === 0) return;

    /* Mesma razão da barra de compra: as cópias escondidas do streaming
       repetem os ids, e observar uma delas travaria o destaque. */
    const alvos = ancoras
      .map((ancora) => document.querySelector<HTMLElement>(`main #${CSS.escape(ancora.id)}`))
      .filter((elemento): elemento is HTMLElement => elemento !== null);

    if (alvos.length === 0) return;

    /* A faixa de observação é uma tira no terço superior da tela, logo abaixo
       do que fica grudado. A seção que cruza essa tira é a que a pessoa está
       lendo — não a que está sob o cabeçalho, nem a que ainda vai chegar. */
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

  /* No celular a faixa rola na horizontal; a seção ativa precisa entrar no
     campo de visão sozinha, senão o destaque fica fora da tela. */
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
      /* `top-[72px]` é a altura do cabeçalho encolhido — e ele já está
         encolhido quando esta faixa encosta nele. */
      className="sticky top-[72px] z-30 border-y border-graf-200 bg-white/96 backdrop-blur-md"
    >
      <ul
        ref={trilhoRef}
        className="scrollbar-none container-jb flex gap-1 overflow-x-auto"
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
                  "foco-jb relative flex min-h-12 items-center whitespace-nowrap px-3 text-[0.875rem] font-semibold transition-colors duration-150",
                  atual
                    ? "text-jb-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-jb-500 after:content-['']"
                    : "text-graf-600 hover:text-graf-950",
                )}
              >
                {ancora.rotulo}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ==========================================================================
   Barra de compra do celular

   No desktop a caixa de compra fica grudada ao lado da galeria e nunca sai da
   tela. No celular ela some depois da primeira dobra, e a partir dali a pessoa
   lê ficha técnica, requisitos e dúvidas sem preço nem botão à vista — o
   momento exato em que a decisão amadurece.

   A barra devolve os dois. Ela não duplica a caixa de compra: leva de volta
   até ela. Duplicar significaria dois lugares para escolher serviço e
   quantidade, e um deles ia mentir sobre o outro.

   `--jb-barra-inferior` é publicada no elemento raiz enquanto a barra existe:
   é assim que a barra de comparação sabe subir e não ficar embaixo desta.
   ========================================================================== */

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
  /** id do elemento para onde a barra leva. */
  alvo?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const barraRef = useRef<HTMLDivElement>(null);

  /* A barra aparece quando a caixa de compra sai da tela — não a uma altura
     fixa de scroll. Página com galeria alta e página com galeria baixa têm o
     mesmo comportamento assim. */
  useEffect(() => {
    /* Dentro de `main`, e não `getElementById`: enquanto a página transmite,
       o React deixa no fim do `body` cópias escondidas do conteúdo de cada
       `<Suspense>`. Uma delas tem o mesmo id e mede zero — observar aquela
       faria a barra achar que a caixa de compra nunca está na tela. */
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/97 px-4 py-2.5 shadow-[0_-4px_16px_rgba(26,28,30,0.08)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3">
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
            "foco-jb inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg px-5 text-[0.9375rem] font-bold transition-colors duration-150",
            indisponivel
              ? "border border-graf-300 text-graf-800 hover:bg-graf-50"
              : "bg-jb-500 text-white hover:bg-jb-600",
          )}
        >
          {indisponivel ? null : <ShoppingCart className="size-[18px]" aria-hidden />}
          {indisponivel ? "Ver alternativas" : soOrcamento ? "Pedir orçamento" : "Comprar"}
        </a>
      </div>
    </div>
  );
}
