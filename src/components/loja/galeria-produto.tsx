"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type FotoProduto = { url: string; alt: string };

export function GaleriaProduto({ fotos, nome }: { fotos: FotoProduto[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const [ampliado, setAmpliado] = useState(false);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[1.08/1] items-center justify-center rounded-2xl border border-graf-200 bg-gradient-to-b from-white to-graf-50 text-graf-300 shadow-card">
        <ImageOff className="size-11" aria-hidden />
        <span className="sr-only">Sem foto cadastrada</span>
      </div>
    );
  }

  const foto = fotos[atual];
  const trocar = (direcao: 1 | -1) => setAtual((v) => (v + direcao + fotos.length) % fotos.length);

  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl border border-graf-200 bg-gradient-to-b from-white to-graf-50/80 shadow-card">
        <div className="relative aspect-[1.08/1]">
          <Image
            src={foto.url}
            alt={foto.alt || nome}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 48vw"
            className="object-contain p-7 drop-shadow-[0_18px_24px_rgba(23,25,27,0.09)] sm:p-10 lg:p-12"
          />
        </div>

        <div className="absolute left-4 top-4 rounded-full border border-graf-200 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-graf-500 backdrop-blur">
          Foto {atual + 1} de {fotos.length}
        </div>

        <button
          type="button"
          onClick={() => setAmpliado(true)}
          aria-label="Ampliar imagem"
          className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl border border-graf-200 bg-white/90 text-graf-700 shadow-card backdrop-blur transition hover:border-graf-300 hover:bg-white hover:text-jb-700"
        >
          <Maximize2 className="size-4.5" />
        </button>

        {fotos.length > 1 ? (
          <>
            <button type="button" onClick={() => trocar(-1)} aria-label="Imagem anterior" className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/90 text-graf-700 opacity-0 shadow-card backdrop-blur transition hover:text-jb-700 group-hover:opacity-100 focus-visible:opacity-100"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => trocar(1)} aria-label="Próxima imagem" className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-graf-200 bg-white/90 text-graf-700 opacity-0 shadow-card backdrop-blur transition hover:text-jb-700 group-hover:opacity-100 focus-visible:opacity-100"><ChevronRight className="size-5" /></button>
          </>
        ) : null}
      </div>

      {fotos.length > 1 ? (
        <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((f, i) => (
            <li key={f.url + i} className="shrink-0">
              <button
                type="button"
                onClick={() => setAtual(i)}
                aria-label={`Ver imagem ${i + 1} de ${fotos.length}`}
                aria-current={i === atual}
                className={cn(
                  "relative size-20 overflow-hidden rounded-xl border bg-white transition sm:size-24",
                  i === atual ? "border-jb-500 ring-2 ring-jb-500/10" : "border-graf-200 hover:border-graf-400",
                )}
              >
                <Image src={f.url} alt="" fill sizes="96px" className="object-contain p-2.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {ampliado ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Imagem ampliada: ${nome}`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-graf-950/95 p-4 backdrop-blur"
          onClick={() => setAmpliado(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAmpliado(false);
            if (e.key === "ArrowRight") trocar(1);
            if (e.key === "ArrowLeft") trocar(-1);
          }}
          tabIndex={-1}
          autoFocus
        >
          <button type="button" onClick={() => setAmpliado(false)} aria-label="Fechar" className="absolute right-5 top-5 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"><X className="size-6" /></button>
          {fotos.length > 1 ? <><button type="button" onClick={(e) => { e.stopPropagation(); trocar(-1); }} aria-label="Imagem anterior" className="absolute left-5 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"><ChevronLeft className="size-6" /></button><button type="button" onClick={(e) => { e.stopPropagation(); trocar(1); }} aria-label="Próxima imagem" className="absolute right-5 z-10 flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"><ChevronRight className="size-6" /></button></> : null}
          <div className="relative size-full max-h-[88vh] max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image src={foto.url} alt={foto.alt || nome} fill sizes="94vw" className="object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
