"use client";

import { useEffect, useRef } from "react";

/**
 * Aplica stagger visual a filhos diretos que sejam cartões de produto.
 * O HTML continua estático e acessível; o atraso é só uma variável CSS.
 */
export function MotionGrid({ children }: { children: React.ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const atual = raiz.current;
    if (!atual) return;

    atual.querySelectorAll<HTMLElement>(":scope > [data-cartao-produto]").forEach((cartao, indice) => {
      cartao.style.setProperty("--jb-card-index", String(indice));
      cartao.dataset.motionGridItem = "true";
    });
  }, []);

  return <div ref={raiz} data-motion-grid>{children}</div>;
}
