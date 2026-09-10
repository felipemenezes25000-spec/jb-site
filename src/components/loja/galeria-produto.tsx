"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn } from "lucide-react";

import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import { cn } from "@/lib/utils";

export type FotoProduto = {
  url: string;
  alt: string;
  daUnidade?: boolean;
};

export function GaleriaProduto({ fotos, nome }: { fotos: FotoProduto[]; nome: string }) {
  const total = fotos.length;
  const [atual, setAtual] = useState(0);
  const [ampliado, setAmpliado] = useState(false);
  const toqueRef = useRef<{ x: number; y: number } | null>(null);
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

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAmpliado(false);
      } else if (evento.key === "ArrowRight") {
        irPara(1);
      } else if (evento.key === "ArrowLeft") {
        irPara(-1);
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [ampliado, irPara]);

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
    if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy)) return;
    irPara(dx < 0 ? 1 : -1);
  }

  if (total === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-graf-300 bg-graf-50 px-6 py-14 text-center lg:min-h-96">
        <ImageOff className="size-8 text-graf-400" aria-hidden />
        <p className="text-sm font-semibold text-graf-700">Foto em cadastro</p>
        <p className="max-w-xs text-xs leading-5 text-graf-500">
          Fale com a JB se precisar de imagens deste produto antes da compra.
        </p>
      </div>
    );
  }

  const foto = fotos[atual];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start lg:gap-3">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-graf-150 bg-white">
        <div
          data-pdp-gallery-main
          data-palco-imagem-produto
          className="relative aspect-square bg-[linear-gradient(180deg,#fff_0%,#fff_72%,var(--color-graf-50)_100%)]"
          onTouchStart={aoEncostar}
          onTouchEnd={aoSoltar}
        >
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(foto.url)}
            alt={foto.alt || nome}
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 48vw"
            className="object-contain p-5 sm:p-7 lg:p-8"
          />

          <button
            type="button"
            onClick={() => setAmpliado(true)}
            aria-label={`Ampliar imagem ${atual + 1} de ${total}`}
            className="foco-jb absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full border border-graf-200 bg-white/95 text-graf-700 shadow-sm backdrop-blur transition-colors hover:border-graf-300 hover:text-jb-700"
          >
            <ZoomIn className="size-[18px]" aria-hidden />
          </button>

          {foto.daUnidade ? (
            <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-graf-950/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
              Foto desta unidade
            </span>
          ) : null}

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => irPara(-1)}
                aria-label="Imagem anterior"
                className="foco-jb absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/95 text-graf-700 shadow-sm backdrop-blur hover:text-jb-700"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => irPara(1)}
                aria-label="Próxima imagem"
                className="foco-jb absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/95 text-graf-700 shadow-sm backdrop-blur hover:text-jb-700"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-graf-950/80 px-2.5 py-1 text-xs font-semibold tabular text-white backdrop-blur">
                {atual + 1}/{total}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {total > 1 ? (
        <ul
          aria-label={`Imagens de ${nome}`}
          className="scrollbar-none flex gap-2 overflow-x-auto pb-1 lg:max-h-[34rem] lg:w-[4.25rem] lg:shrink-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0"
        >
          {fotos.map((imagem, indice) => (
            <li key={`${imagem.url}-${indice}`} className="shrink-0 lg:w-full">
              <button
                data-palco-imagem-produto
                type="button"
                onClick={() => setAtual(indice)}
                aria-label={`Ver imagem ${indice + 1} de ${total}`}
                aria-current={indice === atual ? "true" : undefined}
                className={cn(
                  "foco-jb relative block size-16 overflow-hidden rounded-lg border bg-white transition-colors lg:aspect-square lg:size-auto lg:w-full",
                  indice === atual
                    ? "border-jb-500 ring-1 ring-inset ring-jb-500"
                    : "border-graf-200 hover:border-graf-400",
                )}
              >
                <Image
                  data-imagem-produto
                  src={imagemProdutoSemFundo(imagem.url)}
                  alt=""
                  fill
                  sizes="68px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {ampliado && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${nome} — imagem ampliada`}
              className="fixed inset-0 z-100 flex items-center justify-center bg-graf-950/95 p-4 backdrop-blur-sm sm:p-8"
              onClick={(evento) => {
                if (evento.target === evento.currentTarget) setAmpliado(false);
              }}
            >
              <button
                ref={fecharRef}
                type="button"
                onClick={() => setAmpliado(false)}
                aria-label="Fechar imagem ampliada"
                className="foco-jb absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-full bg-white text-graf-900 shadow-lg sm:right-6 sm:top-6"
              >
                <X className="size-5" aria-hidden />
              </button>

              <div className="relative h-[82vh] w-[92vw] max-w-7xl">
                <Image
                  src={imagemProdutoSemFundo(foto.url)}
                  alt={foto.alt || nome}
                  fill
                  sizes="92vw"
                  className="object-contain"
                />
              </div>

              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => irPara(-1)}
                    aria-label="Imagem anterior"
                    className="foco-jb absolute left-4 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-graf-900 shadow-lg sm:left-6"
                  >
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => irPara(1)}
                    aria-label="Próxima imagem"
                    className="foco-jb absolute right-4 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-graf-900 shadow-lg sm:right-6"
                  >
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
