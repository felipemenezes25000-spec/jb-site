"use client";

import { useEffect } from "react";

/* ============================================================================
   Luz e ímã do ponteiro (só computador)

   Um ouvinte só, na página inteira, e um quadro de animação por vez. Ele não
   anima nada: escreve a posição do mouse em variáveis CSS, e o desenho fica
   todo na folha (`acabamento.css`):

   · `[data-luz]`: o elemento recebe `--mx`/`--my` (posição do mouse dentro
     dele) e `data-luz-ativo` enquanto o mouse está em cima. A lente do
     raio-X e a malha da abertura leem isso.
   · `[data-luz-grupo]`: todos os `[data-luz-item]` de dentro recebem a
     posição, cada um relativa a si — a borda do cartão vizinho acende quando
     o mouse chega perto, não só a do cartão de baixo dele.
   · botão de WhatsApp (e `[data-ima]`): puxa poucos pixels na direção do
     mouse, pelo `translate`, que não briga com o `transform` do hover.

   Celular e tablet não têm mouse: nada disso liga lá, e o ouvinte nem é
   registrado. Movimento reduzido mantém a luz (ela não se move sozinha, só
   acompanha a mão) e desliga o ímã.
   ============================================================================ */

/** Botões de WhatsApp de verdade: link de texto (rodapé, erro) e a barra do celular ficam parados. */
const IMA = [
  "cabecalho",
  "abertura",
  "diagnostico",
  "defeito",
  "secao",
  "fechamento",
]
  .map((posicao) => `a[data-whatsapp^="${posicao}"]`)
  .concat("[data-ima]")
  .join(", ");

export function EfeitosDoPonteiro() {
  useEffect(() => {
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fino.matches) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");

    let x = 0;
    let y = 0;
    let quadro = 0;
    let alvo: Element | null = null;
    let luzes: HTMLElement[] = [];
    let grupo: HTMLElement | null = null;
    let ima: HTMLElement | null = null;

    function soltarIma() {
      if (!ima) return;
      ima.style.removeProperty("--ix");
      ima.style.removeProperty("--iy");
      ima = null;
    }

    function trocarAlvo(novo: Element | null) {
      alvo = novo;
      const proximas: HTMLElement[] = [];
      for (let no = novo?.closest<HTMLElement>("[data-luz]"); no; no = no.parentElement?.closest<HTMLElement>("[data-luz]")) {
        proximas.push(no);
      }
      for (const antiga of luzes) if (!proximas.includes(antiga)) antiga.removeAttribute("data-luz-ativo");
      for (const nova of proximas) nova.setAttribute("data-luz-ativo", "");
      luzes = proximas;

      const proximoGrupo = novo?.closest<HTMLElement>("[data-luz-grupo]") ?? null;
      if (proximoGrupo !== grupo) {
        grupo?.removeAttribute("data-luz-ativo");
        proximoGrupo?.setAttribute("data-luz-ativo", "");
        grupo = proximoGrupo;
      }

      const proximoIma = reduzido.matches ? null : (novo?.closest<HTMLElement>(IMA) ?? null);
      if (proximoIma !== ima) soltarIma();
      ima = proximoIma;
    }

    function pintar() {
      quadro = 0;
      for (const luz of luzes) {
        const caixa = luz.getBoundingClientRect();
        luz.style.setProperty("--mx", `${(x - caixa.left).toFixed(1)}px`);
        luz.style.setProperty("--my", `${(y - caixa.top).toFixed(1)}px`);
      }
      if (grupo) {
        for (const item of grupo.querySelectorAll<HTMLElement>("[data-luz-item]")) {
          const caixa = item.getBoundingClientRect();
          item.style.setProperty("--mx", `${(x - caixa.left).toFixed(1)}px`);
          item.style.setProperty("--my", `${(y - caixa.top).toFixed(1)}px`);
        }
      }
      if (ima) {
        const caixa = ima.getBoundingClientRect();
        const dx = (x - (caixa.left + caixa.width / 2)) / (caixa.width / 2);
        const dy = (y - (caixa.top + caixa.height / 2)) / (caixa.height / 2);
        ima.style.setProperty("--ix", `${(Math.max(-1, Math.min(1, dx)) * 6).toFixed(2)}px`);
        ima.style.setProperty("--iy", `${(Math.max(-1, Math.min(1, dy)) * 4).toFixed(2)}px`);
      }
    }

    function mover(evento: PointerEvent) {
      if (evento.pointerType !== "mouse") return;
      x = evento.clientX;
      y = evento.clientY;
      const sob = evento.target instanceof Element ? evento.target : null;
      if (sob !== alvo) trocarAlvo(sob);
      if (!quadro) quadro = requestAnimationFrame(pintar);
    }

    function sair() {
      trocarAlvo(null);
    }

    /* Rolar com o mouse parado move a página sob ele: a luz acompanha. */
    function rolar() {
      if (alvo && !quadro) quadro = requestAnimationFrame(pintar);
    }

    document.addEventListener("pointermove", mover, { passive: true });
    document.documentElement.addEventListener("pointerleave", sair);
    window.addEventListener("scroll", rolar, { passive: true });
    return () => {
      document.removeEventListener("pointermove", mover);
      document.documentElement.removeEventListener("pointerleave", sair);
      window.removeEventListener("scroll", rolar);
      cancelAnimationFrame(quadro);
      trocarAlvo(null);
    };
  }, []);

  return null;
}
