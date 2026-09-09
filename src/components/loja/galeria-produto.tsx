"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Galeria do equipamento

   Palco grande em proporção quadrada — equipamento odontológico é fotografado
   recortado, e `object-contain` sobre fundo claro é o que mostra a peça
   inteira sem cortar pé de cadeira nem mangueira. A tira de miniaturas fica
   abaixo, na mesma ordem do DOM em que aparece na tela.

   A ampliação abre em `createPortal` no `body` de propósito: as faixas da
   página usam `isolate`, e um `fixed` preso dentro de uma delas ficaria ATRÁS
   do cabeçalho fixo. No portal, o diálogo cobre a tela inteira, prende o foco,
   fecha no Esc e devolve o foco para onde estava.
   ============================================================================ */

export type FotoProduto = {
  url: string;
  alt: string;
  /** Foto da unidade física à venda, não da linha do produto. */
  daUnidade?: boolean;
};

export function GaleriaProduto({
  fotos,
  nome,
}: {
  fotos: FotoProduto[];
  nome: string;
}) {
  const total = fotos.length;
  const [atual, setAtual] = useState(0);
  const [ampliado, setAmpliado] = useState(false);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  /* Ponto onde o dedo encostou. `null` enquanto não há gesto em andamento. */
  const toqueRef = useRef<{ x: number; y: number } | null>(null);
  /* Posição do cursor sobre o palco, em %. `null` = lupa desligada. */
  const [lente, setLente] = useState<{ x: number; y: number } | null>(null);
  const [temMouse, setTemMouse] = useState(false);

  const irPara = useCallback(
    (passo: number) => {
      if (total < 2) return;
      setAtual((indice) => (indice + passo + total) % total);
    },
    [total],
  );

  /* A lupa é para ponteiro fino.
     No toque não existe "passar o mouse": tentar ampliar no `touchmove` roubaria
     o gesto de arrastar, que é como se troca de foto no celular. Lá o caminho é
     tocar e abrir em tela cheia. */
  useEffect(() => {
    const consulta = window.matchMedia("(pointer: fine)");
    const aplicar = () => setTemMouse(consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    if (!ampliado) return;

    const focoAnterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setAmpliado(false);
        return;
      }
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        irPara(1);
        return;
      }
      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        irPara(-1);
        return;
      }
      if (evento.key !== "Tab") return;

      // Foco preso dentro do diálogo: sem isto o Tab sai para a página que
      // continua atrás da cortina, e quem usa teclado se perde.
      const caixa = dialogoRef.current;
      if (!caixa) return;
      const focaveis = Array.from(
        caixa.querySelectorAll<HTMLElement>("button:not([disabled])"),
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus?.();
    };
  }, [ampliado, irPara]);

  /* ------------------------------------------------------------- gesto

     Arrastar a foto para o lado é como se troca de imagem no celular, e a
     galeria só respondia a botão — alvos de 44px sobre a própria foto, que é
     justamente o que a pessoa quer ver.

     Duas condições para o gesto contar: percorrer pelo menos 44px na
     horizontal e ser mais horizontal que vertical. Sem a segunda, rolar a
     página com o dedo em cima da foto trocaria a imagem sem querer. E como
     nada aqui chama `preventDefault`, a rolagem vertical continua nativa. */
  const LIMIAR = 44;

  function aoEncostar(evento: React.TouchEvent) {
    const toque = evento.touches[0];
    toqueRef.current = toque ? { x: toque.clientX, y: toque.clientY } : null;
  }

  function aoSoltar(evento: React.TouchEvent) {
    const inicio = toqueRef.current;
    toqueRef.current = null;
    const fim = evento.changedTouches[0];
    if (!inicio || !fim) return;

    const dx = fim.clientX - inicio.x;
    const dy = fim.clientY - inicio.y;
    if (Math.abs(dx) < LIMIAR || Math.abs(dx) <= Math.abs(dy)) return;

    irPara(dx < 0 ? 1 : -1);
  }

  // Sem foto o palco não precisa ser quadrado: um vazio de 790px de altura no
  // desktop seria mais chamativo que o próprio equipamento.
  if (total === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-graf-300 bg-graf-50 px-6 py-16 text-center lg:min-h-96">
        <ImageOff className="size-9 text-graf-500" aria-hidden />
        <p className="text-sm font-semibold text-graf-700">
          Ainda não há foto deste equipamento
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-graf-500">
          A equipe da JB pode mandar fotos e detalhes deste equipamento — é só usar os
          contatos desta página.
        </p>
      </div>
    );
  }

  const foto = fotos[atual];

  return (
    /* Trilha de miniaturas à esquerda no desktop, embaixo no celular.

       `flex-row-reverse` mantém o palco em PRIMEIRO no DOM — quem lê por
       teclado ou leitor de tela chega à foto principal antes da tira de
       miniaturas, que é uma lista de atalhos para ela. No celular a tira volta
       para baixo, onde o polegar alcança. */
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start lg:gap-4">
      <div className="placa relative min-w-0 flex-1 overflow-hidden">
        <div
          data-pdp-gallery-main
          data-palco-imagem-produto
          className="group/palco relative aspect-square"
          onTouchStart={aoEncostar}
          onTouchEnd={aoSoltar}
          onMouseMove={(evento) => {
            if (!temMouse) return;
            const caixa = evento.currentTarget.getBoundingClientRect();
            setLente({
              x: ((evento.clientX - caixa.left) / caixa.width) * 100,
              y: ((evento.clientY - caixa.top) / caixa.height) * 100,
            });
          }}
          onMouseLeave={() => setLente(null)}
          /* Fundo quase branco, com o cinza só na base.

             Antes era um degradê radial de branco ao cinza-claro. A intenção
             era dar volume, mas equipamento odontológico é fotografado
             recortado em branco — e o campo radial acendia cada resíduo de
             recorte da foto como um halo em volta da peça. Um degradê vertical
             curtíssimo faz o mesmo trabalho de assentar a peça sem revelar o
             que a foto tem de imperfeito. */
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #ffffff 62%, var(--color-graf-50) 100%)",
          }}
        >
          <Image
            data-imagem-produto
            src={foto.url}
            alt={foto.alt || nome}
            fill
            priority
            /* No desktop a galeria ocupa 7 das 12 colunas do container, menos
               a coluna de miniaturas — cerca de 54vw. Pedir menos entregaria
               imagem borrada justamente na peça que a pessoa está avaliando. */
            sizes="(max-width: 1023px) 100vw, 54vw"
            /* Respiro curto de propósito: a foto é o argumento da página, e
               cada pixel de moldura sai do equipamento. */
            className="object-contain p-4 transition-transform duration-100 ease-out sm:p-6 lg:p-8"
            /* A lupa amplia 2,2× com a origem no cursor: o detalhe que a
               pessoa está apontando fica sob o ponteiro em vez de fugir para
               o centro. 100ms de transição é curto o bastante para acompanhar
               o movimento e longo o bastante para a entrada não dar tranco. */
            style={
              lente
                ? { transform: "scale(2.2)", transformOrigin: `${lente.x}% ${lente.y}%` }
                : undefined
            }
          />

          <button
            type="button"
            onClick={() => setAmpliado(true)}
            aria-label={`Ampliar a imagem ${atual + 1} de ${total}`}
            className="foco-jb absolute inset-0 flex cursor-zoom-in items-start justify-end p-3"
          >
            <span className="flex size-11 items-center justify-center rounded-lg border border-graf-200 bg-white/85 text-graf-600 shadow-card backdrop-blur transition-colors duration-150 hover:text-jb-700">
              <ZoomIn className="size-[18px]" aria-hidden />
            </span>
            {/* Dica só para quem tem mouse: no toque a lupa não existe. */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full bg-white/85 px-3 py-1.5 text-[0.75rem] font-semibold text-graf-600 opacity-0 shadow-card backdrop-blur transition-opacity duration-200 group-hover/palco:opacity-100 lg:block"
            >
              Passe o mouse para ampliar · clique para tela cheia
            </span>
          </button>
        </div>

        {foto.daUnidade ? (
          <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-graf-950/85 px-3 py-1.5 text-[0.8125rem] font-semibold text-white backdrop-blur">
            Foto desta unidade
          </span>
        ) : null}

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => irPara(-1)}
              aria-label="Imagem anterior"
              className="foco-jb absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/90 text-graf-700 shadow-card backdrop-blur transition-colors duration-150 hover:border-graf-400 hover:text-jb-700"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => irPara(1)}
              aria-label="Próxima imagem"
              className="foco-jb absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/90 text-graf-700 shadow-card backdrop-blur transition-colors duration-150 hover:border-graf-400 hover:text-jb-700"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <p
              aria-live="polite"
              className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-graf-950/80 px-3 py-1.5 text-[0.8125rem] font-semibold tabular text-white backdrop-blur"
            >
              <span className="sr-only">Imagem </span>
              {atual + 1} de {total}
            </p>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <ul
          aria-label={`Imagens de ${nome}`}
          className={cn(
            "scrollbar-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1",
            "lg:w-[4.75rem] lg:shrink-0 lg:snap-none lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0",
            // teto na coluna para uma dúzia de fotos não esticar a página
            "lg:max-h-[34rem]",
          )}
        >
          {fotos.map((imagem, indice) => (
            <li key={`${imagem.url}-${indice}`} className="shrink-0 snap-start lg:w-full">
              <button
                data-palco-imagem-produto
                type="button"
                onClick={() => setAtual(indice)}
                aria-label={`Ver imagem ${indice + 1} de ${total}`}
                aria-current={indice === atual ? "true" : undefined}
                className={cn(
                  "foco-jb relative block size-16 overflow-hidden rounded-lg border bg-white transition-colors duration-150 sm:size-18",
                  "lg:aspect-square lg:size-auto lg:w-full",
                  indice === atual
                    ? "border-jb-500 ring-1 ring-inset ring-jb-500"
                    : "border-graf-200 hover:border-graf-400",
                )}
              >
                <Image
                  data-imagem-produto
                  src={imagem.url}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-contain p-1.5"
                />
                {imagem.daUnidade ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 bg-graf-950/75 py-0.5 text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-white"
                  >
                    unidade
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {ampliado && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dialogoRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${nome} — imagem ampliada`}
              className="fixed inset-0 z-100 flex flex-col bg-graf-950/95 backdrop-blur-sm"
              onClick={(evento) => {
                if (evento.target === evento.currentTarget) setAmpliado(false);
              }}
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <p className="text-sm font-semibold text-white/80">
                  <span className="tabular">{atual + 1}</span> de{" "}
                  <span className="tabular">{total}</span>
                  {foto.daUnidade ? (
                    <span className="ml-3 rounded-full bg-white/15 px-2.5 py-1 text-[0.8125rem] font-semibold text-white">
                      Foto desta unidade
                    </span>
                  ) : null}
                </p>
                <button
                  ref={fecharRef}
                  type="button"
                  onClick={() => setAmpliado(false)}
                  aria-label="Fechar imagem ampliada"
                  className="flex size-11 items-center justify-center rounded-lg text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <X className="size-6" aria-hidden />
                </button>
              </div>

              <div
                className="relative min-h-0 flex-1"
                onTouchStart={aoEncostar}
                onTouchEnd={aoSoltar}
              >
                <Image
                  src={foto.url}
                  alt={foto.alt || nome}
                  fill
                  sizes="100vw"
                  className="object-contain p-4"
                />
              </div>

              {total > 1 ? (
                <div className="flex items-center justify-center gap-3 px-4 pb-5 pt-3">
                  <button
                    type="button"
                    onClick={() => irPara(-1)}
                    aria-label="Imagem anterior"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>

                  <ul className="scrollbar-none flex min-w-0 gap-2 overflow-x-auto">
                    {fotos.map((imagem, indice) => (
                      <li key={`ampliada-${imagem.url}-${indice}`} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setAtual(indice)}
                          aria-label={`Ver imagem ${indice + 1} de ${total}`}
                          aria-current={indice === atual ? "true" : undefined}
                          className={cn(
                            "relative block size-14 overflow-hidden rounded-md border-2 bg-white/95 transition-colors duration-150",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                            indice === atual
                              ? "border-white"
                              : "border-white/25 hover:border-white/60",
                          )}
                        >
                          <Image
                            src={imagem.url}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-contain p-1"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => irPara(1)}
                    aria-label="Próxima imagem"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
