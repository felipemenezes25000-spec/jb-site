"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff, X, ZoomIn } from "lucide-react";

import { cn } from "@/lib/utils";

export type FotoProduto = { url: string; alt: string };

/** Galeria com miniaturas e ampliação. Teclado: setas trocam, Esc fecha. */
export function GaleriaProduto({ fotos, nome }: { fotos: FotoProduto[]; nome: string }) {
  const [atual, setAtual] = useState(0);
  const [ampliado, setAmpliado] = useState(false);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-graf-200 bg-graf-50 text-graf-300">
        <ImageOff className="size-10" aria-hidden />
        <span className="sr-only">Sem foto cadastrada</span>
      </div>
    );
  }

  const foto = fotos[atual];

  return (
    <div>
      <div className="group relative overflow-hidden rounded-xl border border-graf-200 bg-white">
        <div className="relative aspect-square">
          <Image
            src={foto.url}
            alt={foto.alt || nome}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-contain p-6"
          />
        </div>
        <button
          type="button"
          onClick={() => setAmpliado(true)}
          aria-label="Ampliar imagem"
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-lg border border-graf-200 bg-white/90 text-graf-600 opacity-0 backdrop-blur transition-opacity hover:text-jb-700 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ZoomIn className="size-4.5" />
        </button>
      </div>

      {fotos.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {fotos.map((f, i) => (
            <li key={f.url + i}>
              <button
                type="button"
                onClick={() => setAtual(i)}
                aria-label={`Ver imagem ${i + 1} de ${fotos.length}`}
                aria-current={i === atual}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-lg border bg-white transition-colors",
                  i === atual ? "border-jb-500" : "border-graf-200 hover:border-graf-400",
                )}
              >
                <Image
                  src={f.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
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
          className="fixed inset-0 z-90 flex items-center justify-center bg-graf-950/90 p-4"
          onClick={() => setAmpliado(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAmpliado(false);
            if (e.key === "ArrowRight") setAtual((v) => (v + 1) % fotos.length);
            if (e.key === "ArrowLeft") setAtual((v) => (v - 1 + fotos.length) % fotos.length);
          }}
          tabIndex={-1}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        >
          <button
            type="button"
            onClick={() => setAmpliado(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="size-6" />
          </button>
          <div className="relative size-full max-h-[85vh] max-w-4xl">
            <Image
              src={foto.url}
              alt={foto.alt || nome}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
