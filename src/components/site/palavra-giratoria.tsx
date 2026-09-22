"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/* ============================================================================
   Palavra que gira no título

   "Autoclave parou?", "Compressor parou?", "Cadeira parou?". Quem chegou por
   causa de uma autoclave se reconhece no título em segundos, e o movimento
   diz, sem texto extra, que a JB atende várias máquinas.

   A palavra ocupa uma linha só dela, com altura fixa: trocar "Cadeira" por
   "Equipamento" não empurra o resto do título. Leitor de tela não ouve o
   giro: o h1 carrega o texto estável em `sr-only`, e esta peça é
   `aria-hidden`. Com movimento reduzido, fica parada na primeira palavra.
   ============================================================================ */

const INTERVALO_MS = 2200;

export function PalavraGiratoria({ palavras }: { palavras: readonly string[] }) {
  const reduzir = useReducedMotion();
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (reduzir || palavras.length < 2) return;
    const relogio = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setIndice((atual) => (atual + 1) % palavras.length);
    }, INTERVALO_MS);
    return () => window.clearInterval(relogio);
  }, [reduzir, palavras.length]);

  const palavra = palavras[indice] ?? palavras[0];

  return (
    <span aria-hidden className="relative block h-[1.12em] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={palavra}
          initial={{ y: "105%", opacity: 0, rotate: 2 }}
          animate={{ y: "0%", opacity: 1, rotate: 0 }}
          exit={{ y: "-105%", opacity: 0, rotate: -2 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 top-0 block origin-left whitespace-nowrap"
        >
          {palavra}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
