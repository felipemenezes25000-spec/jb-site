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
import styles from "./galeria-produto.module.css";

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
  const dialogoRef = useRef<HTMLDialogElement>(null);
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
    const focoAnterior = document.activeElement;
    const dialogo = dialogoRef.current;
    dialogo?.showModal();
    document.body.style.overflow = "hidden";
    fecharRef.current?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Tab") {
        const controles = dialogo?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        const primeiro = controles?.[0];
        const ultimo = controles?.[controles.length - 1];
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo?.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro?.focus();
        }
      } else if (evento.key === "Escape") {
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
      dialogo?.close();
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) focoAnterior.focus();
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
    <div className="grid min-w-0 gap-4">
      <div className="relative min-w-0 overflow-hidden rounded-2xl bg-surface">
        <div
          data-pdp-gallery-main
          data-palco-imagem-produto
          className={cn("relative aspect-square", styles.palco)}
          onTouchStart={aoEncostar}
          onTouchEnd={aoSoltar}
        >
          <Image
            key={foto.url}
            data-imagem-produto
            src={imagemProdutoSemFundo(foto.url)}
            alt={foto.alt || nome}
            fill
            loading="eager"
            fetchPriority={atual === 0 ? "high" : "auto"}
            sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1679px) 54vw, 850px"
            className={styles.foto}
            onLoad={(evento) => { evento.currentTarget.dataset.carregada = "true"; }}
          />

          <button
            type="button"
            onClick={() => setAmpliado(true)}
            aria-label={`Ampliar imagem ${atual + 1} de ${total}`}
            className="foco-jb absolute inset-0 z-10 cursor-zoom-in rounded-2xl"
          >
            <span className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-900">
              <ZoomIn className="size-[18px]" aria-hidden />
            </span>
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
                className="foco-jb absolute bottom-4 left-4 z-20 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-700 transition-colors hover:border-jb-500 hover:text-jb-700"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => irPara(1)}
                aria-label="Próxima imagem"
                className="foco-jb absolute bottom-4 left-17 z-20 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-700 transition-colors hover:border-jb-500 hover:text-jb-700"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <span className="pointer-events-none absolute bottom-6 right-5 z-10 text-sm font-semibold tabular text-graf-950" aria-hidden>
                {String(atual + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </>
          ) : null}
        </div>
        {total > 1 ? (
          <div className={styles.progresso} aria-hidden>
            <span style={{ transform: `scaleX(${(atual + 1) / total})` }} />
          </div>
        ) : null}
      </div>

      {total > 1 ? (
        <ul
          aria-label={`Imagens de ${nome}`}
          className="flex flex-wrap gap-2.5"
        >
          {fotos.map((imagem, indice) => (
            <li key={`${imagem.url}-${indice}`} className="w-14 min-w-0 sm:w-18">
              <button
                data-palco-imagem-produto
                type="button"
                onClick={() => setAtual(indice)}
                aria-label={`Ver imagem ${indice + 1} de ${total}`}
                aria-current={indice === atual ? "true" : undefined}
                className={cn(
                  "foco-jb relative block aspect-square w-full overflow-hidden rounded-lg border bg-surface transition-colors",
                  indice === atual
                    ? "border-jb-500 ring-2 ring-jb-500/15"
                    : "border-graf-200 hover:border-graf-450",
                )}
              >
                <Image
                  data-imagem-produto
                  src={imagemProdutoSemFundo(imagem.url)}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 56px, 72px"
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
        <div className="flex items-start gap-2.5 border-t border-graf-200 py-3">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jb-700" aria-hidden />
          <p className="text-xs leading-5 text-graf-600">
            <strong className="font-extrabold text-graf-900">Fotos reais da unidade.</strong>{" "}
            Quando marcada, a imagem é do equipamento exato que será enviado — não de uma unidade genérica do catálogo.
          </p>
        </div>
      ) : null}

      {ampliado && typeof document !== "undefined"
        ? createPortal(
            <dialog
              ref={dialogoRef}
              aria-label={`${nome} — imagem ampliada`}
              className={styles.dialogo}
              onCancel={() => setAmpliado(false)}
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
                  key={foto.url}
                  src={imagemProdutoSemFundo(foto.url)}
                  alt={foto.alt || nome}
                  fill
                  sizes="92vw"
                  className={styles.foto}
                  onLoad={(evento) => { evento.currentTarget.dataset.carregada = "true"; }}
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
              <p className="absolute bottom-5 left-1/2 max-w-[75vw] -translate-x-1/2 text-center text-sm text-graf-900" aria-live="polite">
                {atual + 1} / {total} · {foto.alt || nome}
              </p>
            </dialog>,
            document.body,
          )
        : null}
    </div>
  );
}
