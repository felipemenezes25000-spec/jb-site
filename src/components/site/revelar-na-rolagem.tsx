"use client";

import { useEffect } from "react";

/* ============================================================================
   Revelação na rolagem, para quem não tem `animation-timeline`

   O `.jb-revela` do `site.css` é CSS puro, amarrado à rolagem por
   `animation-timeline: view()`. Safari antes do 26 e Firefox não conhecem
   isso, e ali a página ficava parada: correta, mas sem vida, justamente no
   iPhone de quem chega do anúncio. Este componente faz o mesmo efeito com
   IntersectionObserver só nesses navegadores.

   Três cuidados:
   - só esconde o que ainda está abaixo da tela. O que já aparece na primeira
     tela não pisca: fica como veio do servidor;
   - a marca no `<html>` e em cada bloco é posta aqui, depois da hidratação.
     Sem JavaScript, ou se isto falhar, tudo continua visível;
   - movimento reduzido desliga tudo.
   ============================================================================ */

export function RevelarNaRolagem() {
  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const abaixoDaTela = [...document.querySelectorAll<HTMLElement>(".jb-revela")].filter(
      (bloco) => bloco.getBoundingClientRect().top > window.innerHeight,
    );
    if (abaixoDaTela.length === 0) return;

    document.documentElement.setAttribute("data-revela-js", "");
    for (const bloco of abaixoDaTela) bloco.dataset.revela = "esperando";

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          (entrada.target as HTMLElement).dataset.revela = "visto";
          observador.unobserve(entrada.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    for (const bloco of abaixoDaTela) observador.observe(bloco);

    return () => {
      observador.disconnect();
      for (const bloco of abaixoDaTela) delete bloco.dataset.revela;
    };
  }, []);

  return null;
}
