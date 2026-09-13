"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
  ZoomIn,
} from "lucide-react";

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
  const temFotosDaUnidade = fotos.some((foto) => foto.daUnidade);

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
      <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-graf-300 bg-graf-50 px-6 text-center">
        <ImageOff className="size-8 text-graf-400" aria-hidden />
        <p className="text-sm font-semibold text-graf-700">Foto em cadastro</p>
        <p className="texto-apoio max-w-xs text-graf-500">
          Fale com a JB se precisar de imagens deste produto antes da compra.
        </p>
      </div>
    );
  }

  const foto = fotos[atual];

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3",
        total > 1 && "lg:grid-cols-[4.75rem_minmax(0,1fr)] lg:items-start",
      )}
    >
      <div
        className={cn(
          "relative min-w-0 overflow-hidden rounded-3xl border border-graf-200 bg-surface shadow-[0_18px_60px_-38px_rgba(15,23,42,0.38)]",
          total > 1 && "lg:col-start-2 lg:row-start-1",
        )}
      >
        <div
          data-pdp-gallery-main
          data-palco-imagem-produto
          className="relative aspect-square bg-[radial-gradient(circle_at_50%_40%,rgba(248,250,252,0.25),rgba(248,250,252,0.8))]"
          onTouchStart={aoEncostar}
          onTouchEnd={aoSoltar}
        >
          <Image
            data-imagem-produto
            src={imagemProdutoSemFundo(foto.url)}
            alt={foto.alt || nome}
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, (max-width: 1680px) 40vw, 620px"
            className="object-contain p-5 sm:p-7 lg:p-9"
          />

          <button
            type="button"
            onClick={() => setAmpliado(true)}
            aria-label={`Ampliar imagem ${atual + 1} de ${total}`}
            className="foco-jb absolute right-3 top-3 z-10 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white/95 text-graf-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-graf-300 hover:text-jb-700 hover:shadow-md"
          >
            <ZoomIn className="size-[18px]" aria-hidden />
          </button>

          {foto.daUnidade ? (
            <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-graf-950/88 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur">
              <Camera className="size-3.5" aria-hidden />
              Foto desta unidade
            </span>
          ) : null}

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => irPara(-1)}
                aria-label="Imagem anterior"
                className="foco-jb absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/95 text-graf-700 shadow-sm backdrop-blur transition hover:scale-105 hover:text-jb-700"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => irPara(1)}
                aria-label="Próxima imagem"
                className="foco-jb absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/95 text-graf-700 shadow-sm backdrop-blur transition hover:scale-105 hover:text-jb-700"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-graf-950/82 px-2.5 py-1 text-xs font-semibold tabular text-white backdrop-blur">
                {atual + 1}/{total}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {total > 1 ? (
        <ul
          aria-label={`Imagens de ${nome}`}
          className="scrollbar-none order-2 grid grid-cols-5 gap-2.5 overflow-x-auto sm:grid-cols-7 lg:order-none lg:col-start-1 lg:row-start-1 lg:max-h-[39rem] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1"
        >
          {fotos.map((imagem, indice) => (
            <li key={`${imagem.url}-${indice}`} className="min-w-0">
              <button
                data-palco-imagem-produto
                type="button"
                onClick={() => setAtual(indice)}
                aria-label={`Ver imagem ${indice + 1} de ${total}`}
                aria-current={indice === atual ? "true" : undefined}
                className={cn(
                  "foco-jb relative block aspect-square w-full overflow-hidden rounded-xl border bg-surface transition-all",
                  indice === atual
                    ? "border-jb-500 ring-2 ring-jb-500/15"
                    : "border-graf-200 hover:-translate-y-0.5 hover:border-graf-400",
                )}
              >
                <Image
                  data-imagem-produto
                  src={imagemProdutoSemFundo(imagem.url)}
                  alt=""
                  fill
                  sizes="76px"
                  className="object-contain p-1.5"
                />
                {imagem.daUnidade ? (
                  <span className="absolute bottom-1 right-1 size-2 rounded-full bg-jb-600 ring-2 ring-white" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {total > 1 ? `Imagem ${atual + 1} de ${total}. ${foto.alt || nome}` : ""}
      </p>

      {temFotosDaUnidade ? (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-2xl border border-graf-200 bg-graf-50/70 px-4 py-3",
            total > 1 && "lg:col-start-2",
          )}
        >
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
          <p className="text-xs leading-5 text-graf-600">
            <strong className="font-extrabold text-graf-900">Fotos reais da unidade.</strong>{" "}
            Quando marcada, a imagem é do equipamento exato que será enviado — não de uma unidade genérica do catálogo.
          </p>
        </div>
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
