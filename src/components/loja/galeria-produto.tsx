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

  const irPara = useCallback(
    (passo: number) => {
      if (total < 2) return;
      setAtual((indice) => (indice + passo + total) % total);
    },
    [total],
  );

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

  // Sem foto o palco não precisa ser quadrado: um vazio de 790px de altura no
  // desktop seria mais chamativo que o próprio equipamento.
  if (total === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-graf-300 bg-graf-50 px-6 py-16 text-center lg:min-h-96">
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
    <div>
      <div className="relative overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card">
        <div
          className="relative aspect-square"
          /* Halo discreto por trás da peça, para o recorte não flutuar num
             branco chapado. Estilo em atributo porque é um valor único desta
             tela — o CSP do projeto libera `style` do React de propósito. */
          style={{
            background:
              "radial-gradient(circle at 50% 38%, #ffffff 0%, var(--color-graf-100) 100%)",
          }}
        >
          <Image
            src={foto.url}
            alt={foto.alt || nome}
            fill
            priority
            /* No desktop a galeria ocupa 7 das 12 colunas do container de
               1440px — cerca de 58vw. Pedir menos entregaria imagem borrada
               justamente na peça que a pessoa está avaliando. */
            sizes="(max-width: 1023px) 100vw, 58vw"
            /* Respiro curto de propósito: a foto é o argumento da página, e
               cada pixel de moldura sai do equipamento. */
            className="object-contain p-4 sm:p-6 lg:p-8"
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
          className="scrollbar-none mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1"
        >
          {fotos.map((imagem, indice) => (
            <li key={`${imagem.url}-${indice}`} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setAtual(indice)}
                aria-label={`Ver imagem ${indice + 1} de ${total}`}
                aria-current={indice === atual ? "true" : undefined}
                className={cn(
                  "foco-jb relative block size-16 overflow-hidden rounded-lg border bg-white transition-colors duration-150 sm:size-18",
                  indice === atual
                    ? "border-jb-500 ring-1 ring-inset ring-jb-500"
                    : "border-graf-200 hover:border-graf-400",
                )}
              >
                <Image
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

              <div className="relative min-h-0 flex-1">
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
