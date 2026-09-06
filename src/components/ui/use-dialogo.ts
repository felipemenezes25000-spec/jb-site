"use client";

import { useEffect, useRef } from "react";

/**
 * O que faz um `role="dialog"` ser realmente um diálogo.
 *
 * A marcação sozinha não basta: sem o resto, quem navega por teclado abre a
 * gaveta e o foco continua atrás dela, tabulando por links invisíveis; e quem
 * usa leitor de tela não tem como sair. Este gancho fecha as cinco pontas:
 *
 *   1. leva o foco para dentro ao abrir;
 *   2. prende o Tab no conteúdo, dando a volta nas duas direções;
 *   3. fecha no Esc;
 *   4. devolve o foco a quem abriu;
 *   5. trava a rolagem do fundo enquanto está aberto.
 *
 * Devolve a ref que deve ir no elemento do diálogo.
 */
export function useDialogo(aberto: boolean, aoFechar: () => void) {
  const referencia = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!aberto) return;

    const caixa = referencia.current;
    focoAnterior.current = document.activeElement as HTMLElement | null;

    const focaveis = () =>
      Array.from(
        caixa?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // o primeiro elemento útil recebe o foco; sem nenhum, o próprio painel
    const primeiro = focaveis()[0];
    if (primeiro) primeiro.focus();
    else caixa?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        aoFechar();
        return;
      }

      if (evento.key !== "Tab") return;

      const lista = focaveis();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }

      const inicio = lista[0];
      const fim = lista[lista.length - 1];
      const atual = document.activeElement;

      if (evento.shiftKey && (atual === inicio || !caixa?.contains(atual))) {
        evento.preventDefault();
        fim.focus();
      } else if (!evento.shiftKey && atual === fim) {
        evento.preventDefault();
        inicio.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);

    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagemAnterior;
      // devolve o foco a quem abriu, se o elemento ainda existir na página
      const voltar = focoAnterior.current;
      if (voltar && document.contains(voltar)) voltar.focus();
    };
  }, [aberto, aoFechar]);

  return referencia;
}
