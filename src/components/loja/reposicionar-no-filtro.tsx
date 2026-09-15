"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/* ============================================================================
   Filtrou, a lista volta para o começo

   A auditoria filtrou estando no fim da página. A lista encolheu de 10 itens
   para 1 e a janela continuou no rodapé: na tela, nada tinha acontecido. O
   filtro funcionava; o que faltava era a página dizer isso.

   Os links de filtro usam `scroll={false}` de propósito — rolar até o topo
   absoluto jogaria a pessoa no cabeçalho, longe da barra que ela acabou de
   usar. O certo é o meio-termo: rolar até o começo da GRADE, que é onde o
   resultado mudou.

   Só reage a mudança de filtro depois do primeiro render, e nunca na chegada
   por link — quem abre `/loja?marca=gnatus` numa aba nova não teve nada
   mudando debaixo dos olhos.
   ============================================================================ */

export function ReposicionarNoFiltro({ alvo }: { alvo: string }) {
  const parametros = useSearchParams();
  const assinatura = parametros.toString();
  const anterior = useRef<string | null>(null);

  useEffect(() => {
    if (anterior.current === null) {
      anterior.current = assinatura;
      return;
    }
    if (anterior.current === assinatura) return;
    anterior.current = assinatura;

    const elemento = document.getElementById(alvo);
    if (!elemento) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    elemento.scrollIntoView({
      behavior: reduzido ? "auto" : "smooth",
      block: "start",
    });
  }, [assinatura, alvo]);

  return null;
}
