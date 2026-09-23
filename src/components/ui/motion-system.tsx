"use client";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { marcarCenaDoMotion } from "@/components/ui/motion-cena";

/* ============================================================================
   Motor do Motion System

   Três regras que vieram de defeito medido, não de gosto:

   1. Nada aqui escreve em nó que o React renderizou. O reveal gravava
      `data-jb-motion-*` e `--jb-motion-delay` direto nas seções — e numa página
      em streaming a seção chega ANTES de hidratar. O React encontrava atributo
      que não tinha renderizado e reprovava a hidratação da PDP inteira. O
      reveal agora é Web Animations: a animação vive no motor de animação do
      navegador, não no DOM.

   2. O repouso é o layout. O estado "espera" deixava seção fora da tela com
      deslocamento lateral, giro e escala até alguém rolar até ela: a home media
      1448px numa janela de 1440, cartões de 44px mediam 43,6 e a PDP
      desalinhava 18px. Agora só existe o quadro inicial de uma animação curta,
      num eixo só, e só enquanto ela roda.

   3. `<main>` não guarda transform. `fill: "both"` deixava
      `translate3d(0, 0, 0)` para sempre no `<main>` — e transform cria bloco de
      contenção para `position: fixed`: a barra de compra do celular passava a
      medir a partir do topo do `<main>` e ia parar em y=3237.
   ============================================================================ */

const SELETOR_REVELAVEL = [
  "main section",
  "main [data-motion-reveal]",
  "main [data-motion-chapter]",
  "main > article",
  "main > div > article",
].join(",");

/* --jb-motion-ease e --jb-motion-ease-spring */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_MOLA = "cubic-bezier(0.16, 1, 0.3, 1)";

const CONSULTA_REDUZIDA = "(prefers-reduced-motion: reduce)";

function assinarMovimentoReduzido(aoMudar: () => void) {
  const media = window.matchMedia(CONSULTA_REDUZIDA);
  media.addEventListener("change", aoMudar);
  return () => media.removeEventListener("change", aoMudar);
}

/* No servidor e na hidratação o motor fica desligado: nenhum efeito começa
   antes de o cliente saber a preferência real. */
function useMovimentoReduzido() {
  return useSyncExternalStore(
    assinarMovimentoReduzido,
    () => window.matchMedia(CONSULTA_REDUZIDA).matches,
    () => true,
  );
}

function animacaoViva(animacao: Animation) {
  return animacao.playState === "running" || animacao.pending;
}

export function MotionSystem() {
  const pathname = usePathname();
  const reduzido = useMovimentoReduzido();
  const rotaAnterior = useRef<string | null>(null);

  /* Cena e entrada de rota antes da pintura. Na primeira carga o `<script>` do
     `<head>` já marcou a cena e a página já foi pintada pelo servidor —
     esmaecer o `<main>` ali seria exatamente o piscar que este arquivo evita.
     A entrada só acontece em navegação no cliente, e só em opacidade. */
  useLayoutEffect(() => {
    marcarCenaDoMotion(pathname);

    const anterior = rotaAnterior.current;
    rotaAnterior.current = pathname;
    if (anterior === null || anterior === pathname) return;
    if (window.matchMedia(CONSULTA_REDUZIDA).matches) return;

    const principal = document.querySelector("main");
    if (!principal) return;
    const publico = document.documentElement.dataset.motionZone === "publico";
    const entrada = principal.animate([{ opacity: publico ? 0.72 : 0.86 }, { opacity: 1 }], {
      duration: publico ? 320 : 200,
      easing: EASE,
    });
    return () => entrada.cancel();
  }, [pathname]);

  useEffect(() => {
    const raiz = document.documentElement;
    if (reduzido) {
      raiz.dataset.motionReduced = "true";
      return;
    }
    delete raiz.dataset.motionReduced;

    const zona = raiz.dataset.motionZone;
    const publico = zona === "publico";
    const cenaHome = raiz.dataset.motionScene === "home";

    /* ---------------------------------------------------------------- reveal */

    const emCurso = new Map<Element, Animation[]>();
    const vistos = new WeakSet<Element>();
    const observados = new Set<Element>();

    const antepassadoEmCurso = (elemento: Element) => {
      for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
        if (emCurso.get(pai)?.some(animacaoViva)) return true;
      }
      return false;
    };

    const concluir = (elemento: Element) => {
      emCurso.get(elemento)?.forEach((animacao) => animacao.finish());
      emCurso.delete(elemento);
    };

    const revelar = (elemento: HTMLElement, ordem: number) => {
      const estilo = getComputedStyle(elemento);
      /* Quem já usa `translate` ou opacidade própria (centralização, estado
         esmaecido) não entra: a animação sobrescreveria o valor e ele saltaria
         no último quadro. */
      if (estilo.translate !== "none" || estilo.opacity !== "1") return;

      const atraso = Math.min(ordem, 5) * (publico ? 55 : 30);
      const animacoes = [
        elemento.animate(
          [
            { opacity: 0, translate: `0 ${publico ? 22 : 10}px` },
            { opacity: 1, translate: "0 0" },
          ],
          {
            duration: publico ? 640 : 360,
            delay: atraso,
            easing: EASE_MOLA,
            /* `backwards` segura o quadro inicial durante o atraso e some ao
               terminar: nenhum valor sobra no elemento. */
            fill: "backwards",
          },
        ),
      ];

      if (cenaHome && elemento.matches("[data-motion-chapter]")) {
        try {
          animacoes.push(
            elemento.animate(
              [
                { transform: "scaleX(0.16)", opacity: 0.38 },
                { transform: "scaleX(1)", opacity: 0.55 },
              ],
              { duration: 1100, delay: atraso, easing: EASE, fill: "backwards", pseudoElement: "::after" },
            ),
          );
        } catch {
          /* Sem animação de pseudo-elemento o traço só aparece pronto. */
        }
      }

      emCurso.set(elemento, animacoes);
      animacoes[0].finished.then(
        () => emCurso.delete(elemento),
        () => emCurso.delete(elemento),
      );
    };

    const observador = new IntersectionObserver(
      (entradas) => {
        let ordem = 0;
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const elemento = entrada.target as HTMLElement;
          observador.unobserve(elemento);
          observados.delete(elemento);

          /* A margem de 20% entrega o bloco ANTES de ele entrar na tela. Se ele
             já está visível quando o aviso chega (carga inicial, âncora, rolagem
             rápida), já foi pintado pronto — animar agora seria sumir e voltar. */
          if (entrada.boundingClientRect.top < window.innerHeight) continue;
          if (antepassadoEmCurso(elemento)) continue;
          revelar(elemento, ordem);
          ordem += 1;
        }
      },
      { rootMargin: "0px 0px 20% 0px" },
    );

    const preparar = (elemento: HTMLElement) => {
      if (vistos.has(elemento)) return;
      vistos.add(elemento);
      if (elemento.closest("[data-motion-ignore]")) return;
      /* Um capítulo é a unidade de coreografia da home: o que está dentro dele
         entra junto com ele, não por conta própria. */
      if (!elemento.matches("[data-motion-chapter]") && elemento.closest("[data-motion-chapter]")) {
        return;
      }
      observados.add(elemento);
      observador.observe(elemento);
    };

    const registrar = (origem: ParentNode) => {
      if (origem instanceof HTMLElement && origem.matches(SELETOR_REVELAVEL)) preparar(origem);
      origem.querySelectorAll<HTMLElement>(SELETOR_REVELAVEL).forEach(preparar);
    };

    registrar(document);

    /* Streaming e Suspense trazem seções depois da carga. Admin muda muito DOM
       por tabela e filtro e tem movimento deliberadamente sóbrio: lá não vale
       observar cada mutação da árvore. */
    const observadorDom =
      zona === "admin"
        ? null
        : new MutationObserver((mutacoes) => {
            let removeu = false;
            for (const mutacao of mutacoes) {
              for (const no of mutacao.addedNodes) {
                if (no instanceof HTMLElement) registrar(no);
              }
              if (mutacao.removedNodes.length > 0) removeu = true;
            }
            if (!removeu) return;
            for (const elemento of observados) {
              if (elemento.isConnected) continue;
              observador.unobserve(elemento);
              observados.delete(elemento);
            }
          });
    observadorDom?.observe(document.body, { childList: true, subtree: true });

    /* Foco ou clique dentro de um bloco em movimento encerra o movimento: quem
       chega por Tab, ou abre um diálogo lá dentro, não espera a coreografia. */
    const concluirNoCaminho = (evento: Event) => {
      if (emCurso.size === 0) return;
      for (let no = evento.target instanceof Element ? evento.target : null; no; no = no.parentElement) {
        if (emCurso.has(no)) concluir(no);
      }
    };
    document.addEventListener("focusin", concluirNoCaminho);
    document.addEventListener("pointerdown", concluirNoCaminho, { capture: true, passive: true });

    /* ------------------------------------------------------- aura e giro */

    const ponteiroFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const usaPonteiro = publico && ponteiroFino;
    const aura = usaPonteiro ? document.querySelector<HTMLElement>("[data-jb-motion-aura]") : null;

    /* O giro do cartão é uma animação das variáveis `--jb-tilt-*` (no cartão)
       e `--jb-pointer-*` (no `::before`), registradas e não herdáveis em
       `motion.css`. Quem decide se o giro aparece é a regra `:hover`: quando o
       ponteiro sai, o `:hover` acaba e o giro vai junto, mesmo que algum
       `pointerout` se perca.

       Antes as variáveis viviam numa regra de folha adotada, alterada a cada
       quadro. Cada mutação faz o navegador reprocessar a folha: medido com CPU
       4x mais lenta, 300 movimentos na grade davam 2845ms de recálculo de
       estilo e 46 tarefas longas; sem a folha, 1004ms e 4. Animação não é
       mutação de folha nem atributo no nó do React — e cada animação nova
       substitui a anterior, que o navegador descarta sozinho. */
    const ID_DO_GIRO = "jb-giro-do-cartao";
    const animaVariaveis = usaPonteiro && "animate" in Element.prototype;

    let quadro = 0;
    let ponteiroX = 0;
    let ponteiroY = 0;
    let alvo: EventTarget | null = null;
    let cartaoGirando: Element | null = null;
    let caixaDoCartao: DOMRect | null = null;

    const soltarCartao = (cartao: Element | null) => {
      if (!cartao) return;
      for (const animacao of cartao.getAnimations({ subtree: true })) {
        if (animacao.id === ID_DO_GIRO) animacao.cancel();
      }
    };

    const desenhar = () => {
      quadro = 0;
      if (aura) {
        aura.style.transform = `translate3d(${ponteiroX}px, ${ponteiroY}px, 0) translate(-50%, -50%)`;
        aura.dataset.visible = "true";
      }
      if (!animaVariaveis) return;

      const cartao = alvo instanceof Element ? alvo.closest("[data-cartao-produto]") : null;
      if (cartao !== cartaoGirando) {
        soltarCartao(cartaoGirando);
        cartaoGirando = cartao;
        caixaDoCartao = null;
      }
      if (!cartao) return;
      /* Uma leitura de layout por cartão, não por evento. */
      caixaDoCartao ??= cartao.getBoundingClientRect();
      const { left, top, width, height } = caixaDoCartao;
      if (width === 0 || height === 0) return;

      const x = Math.min(1, Math.max(0, (ponteiroX - left) / width));
      const y = Math.min(1, Math.max(0, (ponteiroY - top) / height));
      const giro = cartao.animate(
        [{ "--jb-tilt-x": `${((0.5 - y) * 3.2).toFixed(2)}deg`, "--jb-tilt-y": `${((x - 0.5) * 4.2).toFixed(2)}deg` }],
        { duration: 140, easing: "ease-out", fill: "forwards" },
      );
      giro.id = ID_DO_GIRO;
      const brilho = cartao.animate(
        [{ "--jb-pointer-x": `${(x * 100).toFixed(1)}%`, "--jb-pointer-y": `${(y * 100).toFixed(1)}%` }],
        { duration: 0, fill: "forwards", pseudoElement: "::before" },
      );
      brilho.id = ID_DO_GIRO;
    };

    const esconderAura = () => {
      if (aura) delete aura.dataset.visible;
    };

    const aoMoverPonteiro = (evento: PointerEvent) => {
      if (evento.pointerType === "touch") return;
      ponteiroX = evento.clientX;
      ponteiroY = evento.clientY;
      alvo = evento.target;
      if (quadro === 0) quadro = window.requestAnimationFrame(desenhar);
    };

    const aoSairDaJanela = (evento: PointerEvent) => {
      if (evento.relatedTarget === null) esconderAura();
    };

    /* Rolar move o cartão debaixo do ponteiro parado: a medida guardada vale
       até a próxima rolagem. */
    const aoRolar = () => {
      caixaDoCartao = null;
    };

    const aoMudarVisibilidade = () => {
      if (document.hidden) esconderAura();
    };

    /* Os loops decorativos da home (`motion-signature.css`) pausam enquanto a
       pessoa rola e voltam 180ms depois. Parados, o compositor dá conta deles;
       rolando, somavam de 23% a 39% do tempo da thread principal com CPU 4x
       mais lenta. Os ciclos são de 4 a 18s: a pausa não se vê. O atributo é
       gravado duas vezes por gesto de rolagem, não a cada evento. */
    let fimDaRolagem = 0;
    const aoRolarAHome = () => {
      if (raiz.dataset.motionRolando !== "true") raiz.dataset.motionRolando = "true";
      window.clearTimeout(fimDaRolagem);
      fimDaRolagem = window.setTimeout(() => {
        delete raiz.dataset.motionRolando;
      }, 180);
    };
    if (cenaHome) window.addEventListener("scroll", aoRolarAHome, { passive: true });

    if (usaPonteiro) {
      document.addEventListener("pointermove", aoMoverPonteiro, { passive: true });
      document.addEventListener("pointerout", aoSairDaJanela, { passive: true });
      window.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar, { passive: true });
      document.addEventListener("visibilitychange", aoMudarVisibilidade);
    }

    return () => {
      observador.disconnect();
      observadorDom?.disconnect();
      document.removeEventListener("focusin", concluirNoCaminho);
      document.removeEventListener("pointerdown", concluirNoCaminho, { capture: true });
      for (const elemento of [...emCurso.keys()]) concluir(elemento);

      if (usaPonteiro) {
        document.removeEventListener("pointermove", aoMoverPonteiro);
        document.removeEventListener("pointerout", aoSairDaJanela);
        window.removeEventListener("scroll", aoRolar);
        window.removeEventListener("resize", aoRolar);
        document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      }
      if (quadro) window.cancelAnimationFrame(quadro);
      if (cenaHome) window.removeEventListener("scroll", aoRolarAHome);
      window.clearTimeout(fimDaRolagem);
      delete raiz.dataset.motionRolando;
      esconderAura();
      soltarCartao(cartaoGirando);
    };
  }, [pathname, reduzido]);

  return (
    <>
      <span className="jb-motion-progress" aria-hidden="true" />
      <span key={pathname} className="jb-motion-route-beam" aria-hidden="true" />
      <span className="jb-motion-aura" data-jb-motion-aura aria-hidden="true" />
    </>
  );
}
