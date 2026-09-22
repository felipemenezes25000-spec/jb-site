"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/* ============================================================================
   Número que conta até o valor quando entra na tela

   O texto final já vem no HTML do servidor: sem JavaScript, ou com movimento
   reduzido, a pessoa vê o número certo parado. Com movimento, ele volta a zero
   e sobe só quando aparece, uma vez. O DOM é escrito direto pelo `animate`,
   sem re-renderizar o React a cada quadro.
   ============================================================================ */

export function Contador({
  valor,
  duracao = 1.6,
  className,
}: {
  valor: number;
  duracao?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const visivel = useInView(ref, { once: true, amount: 0.6 });
  const reduzir = useReducedMotion();

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || reduzir || !visivel) return;
    const controle = animate(0, valor, {
      duration: duracao,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (atual) => {
        elemento.textContent = Math.round(atual).toLocaleString("pt-BR");
      },
    });
    return () => controle.stop();
  }, [visivel, reduzir, valor, duracao]);

  return (
    <span ref={ref} className={className}>
      {valor.toLocaleString("pt-BR")}
    </span>
  );
}
