"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  const [direcao, setDirecao] = useState(1);
  const [ampliado, setAmpliado] = useState(false);
  const reduzido = useReducedMotion();
  const toqueRef = useRef<{ x: number; y: number } | null>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const temFotosDaUnidade = fotos.some((foto) => foto.daUnidade);

  const irPara = useCallback(
    (passo: number) => {
      if (total < 2) return;
      setDirecao(passo >= 0 ? 1 : -1);
      setAtual((indice) => (indice + passo + total) % total);
    },
    [total],
  );

  const selecionar = useCallback(
    (indice: number) => {
      if (indice === atual) return;
      setDirecao(indice > atual ? 1 : -1);
      setAtual(indice);
    },
    [atual],
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

  const imagemAnimada = (
    <AnimatePresence initial={false} mode="popLayout" custom={direcao}>
      <motion.div
        key={foto.url}
        custom={direcao}
        initial={
          reduzido
            ? false
            : { opacity: 0, x: direcao * 18, scale: 0.986, filter: "blur(4px)" }
        }
        animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
        exit={
          reduzido
            ? { opacity: 1 }
            : { opacity: 0, x: direcao * -10, scale: 0.992, filter: "blur(2px)" }
        }
        transition={
          reduzido
            ? { duration: 0 }
            : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }
        }
        className="absolute inset-0"
      >
        <Image
          data-imagem-produto
          src={imagemProdutoSemFundo(foto.url)}
          alt={foto.alt || nome}
          fill
          loading="eager"
          fetchPriority={atual === 0 ? "high" : "auto"}
          sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1679px) 54vw, 850px"
          className={styles.foto}
          onLoad={(evento) => {
            evento.currentTarget.dataset.carregada = "true";
          }}
        />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="grid min-w-0 gap-4" data-motion-pdp-gallery>
      <div className="relative min-w-0 overflow-hidden rounded-2xl bg-surface">
        <div
          data-pdp-gallery-main
          data-palco-imagem-produto
          className={cn("relative aspect-square", styles.palco)}
          onTouchStart={aoEncostar}
          onTouchEnd={aoSoltar}
        >
          {imagemAnimada}

          <button
            type="button"
            onClick={() => setAmpliado(true)}
            aria-label={`Ampliar imagem ${atual + 1} de ${total}`}
            className="foco-jb absolute inset-0 z-10 cursor-zoom-in rounded-2xl"
          >
            <span className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-900 transition-[transform,box-shadow,border-color] duration-200 hover:scale-105 hover:border-jb-300 hover:shadow-card motion-reduce:transform-none">
              <ZoomIn className="size-[18px]" aria-hidden />
            </span>
          </button>

          {foto.daUnidade ? (
            <motion.span
              key={`unidade-${foto.url}`}
              initial={reduzido ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-graf-950/88 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur"
            >
              <Camera className="size-3.5" aria-hidden />
              Foto desta unidade
            </motion.span>
          ) : null}

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => irPara(-1)}
                aria-label="Imagem anterior"
                className="foco-jb absolute bottom-4 left-4 z-20 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-700 transition-[transform,border-color,color] duration-200 hover:-translate-x-0.5 hover:border-jb-500 hover:text-jb-700 motion-reduce:transform-none"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => irPara(1)}
                aria-label="Próxima imagem"
                className="foco-jb absolute bottom-4 left-17 z-20 flex size-11 items-center justify-center rounded-full border border-graf-200 bg-white text-graf-700 transition-[transform,border-color,color] duration-200 hover:translate-x-0.5 hover:border-jb-500 hover:text-jb-700 motion-reduce:transform-none"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <motion.span
                key={`contador-${atual}`}
                initial={reduzido ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute bottom-6 right-5 z-10 text-sm font-semibold tabular text-graf-950"
                aria-hidden
              >
                {String(atual + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </motion.span>
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
        <ul aria-label={`Imagens de ${nome}`} className="flex flex-wrap gap-2.5" data-motion-pdp-thumbnails>
          {fotos.map((imagem, indice) => (
            <li key={`${imagem.url}-${indice}`} className="w-14 min-w-0 sm:w-18">
              <button
                data-palco-imagem-produto
                type="button"
                onClick={() => selecionar(indice)}
                aria-label={`Ver imagem ${indice + 1} de ${total}`}
                aria-current={indice === atual ? "true" : undefined}
                className={cn(
                  "foco-jb relative block aspect-square w-full overflow-hidden rounded-lg border bg-surface transition-[transform,border-color,box-shadow] duration-200",
                  indice === atual
                    ? "-translate-y-0.5 border-jb-500 shadow-card ring-2 ring-jb-500/15"
                    : "border-graf-200 hover:-translate-y-0.5 hover:border-graf-450",
                  "motion-reduce:transform-none",
                )}
              >
                <Image
                  data-imagem-produto
                  src={imagemProdutoSemFundo(imagem.url)}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 56px, 72px"
                  className={cn(
                    "object-contain p-1.5 transition-transform duration-300",
                    indice === atual ? "scale-[1.04]" : "hover:scale-[1.03]",
                    "motion-reduce:transform-none",
                  )}
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
                className="foco-jb absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-full bg-white text-graf-900 shadow-lg transition-transform hover:scale-105 motion-reduce:transform-none sm:right-6 sm:top-6"
              >
                <X className="size-5" aria-hidden />
              </button>

              <div className="relative h-[82vh] w-[92vw] max-w-7xl overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout" custom={direcao}>
                  <motion.div
                    key={`ampliada-${foto.url}`}
                    initial={reduzido ? false : { opacity: 0, x: direcao * 22, scale: 0.99 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={reduzido ? { opacity: 1 } : { opacity: 0, x: direcao * -16, scale: 0.995 }}
                    transition={reduzido ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={imagemProdutoSemFundo(foto.url)}
                      alt={foto.alt || nome}
                      fill
                      sizes="92vw"
                      className={styles.foto}
                      onLoad={(evento) => {
                        evento.currentTarget.dataset.carregada = "true";
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
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
