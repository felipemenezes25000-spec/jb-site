"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type ZonaDeMotion = "publico" | "checkout" | "clinica" | "admin" | "acesso";

const SELETOR_REVELAVEL = [
  "main section",
  "main [data-motion-reveal]",
  "main [data-motion-chapter]",
  "main > article",
  "main > div > article",
  '[role="dialog"][aria-modal="true"]',
].join(",");

function zonaDaRota(pathname: string): ZonaDeMotion {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/minha-jb")) return "clinica";
  if (pathname.startsWith("/checkout") || pathname.startsWith("/carrinho")) return "checkout";
  if (
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/recuperar-senha") ||
    pathname.startsWith("/redefinir-senha")
  ) {
    return "acesso";
  }
  return "publico";
}

function cenaDaRota(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/loja" || pathname.startsWith("/categoria/") || pathname === "/seminovos") return "catalogo";
  if (pathname.startsWith("/loja/")) return "produto";
  if (pathname.startsWith("/comparar")) return "comparador";
  if (pathname.startsWith("/minha-jb")) return "clinica";
  if (pathname.startsWith("/checkout") || pathname.startsWith("/carrinho")) return "checkout";
  if (pathname.startsWith("/admin")) return "admin";
  return "institucional";
}

function tipoDoElemento(elemento: HTMLElement) {
  if (elemento.matches("[data-motion-chapter]")) return "capitulo";
  if (elemento.matches('[role="dialog"]')) return "dialogo";
  if (elemento.matches("section")) return "secao";
  return "bloco";
}

export function MotionSystem() {
  const pathname = usePathname();

  useEffect(() => {
    const raiz = document.documentElement;
    const zona = zonaDaRota(pathname);
    const cena = cenaDaRota(pathname);
    const mediaMovimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mediaPonteiroFino = window.matchMedia("(pointer: fine)");
    const movimentoReduzido = mediaMovimentoReduzido.matches;

    raiz.dataset.motionEnhanced = "true";
    raiz.dataset.motionZone = zona;
    raiz.dataset.motionScene = cena;
    raiz.dataset.motionPointer = mediaPonteiroFino.matches ? "fine" : "coarse";

    if (movimentoReduzido) {
      raiz.dataset.motionReduced = "true";
      return () => {
        delete raiz.dataset.motionReduced;
      };
    }

    delete raiz.dataset.motionReduced;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const elemento = entrada.target as HTMLElement;
          elemento.dataset.jbMotionState = "visivel";
          observador.unobserve(elemento);
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    let contador = 0;

    const preparar = (elemento: HTMLElement) => {
      if (elemento.dataset.jbMotion === "true") return;
      if (elemento.closest("[data-motion-ignore]")) return;

      /* Um capítulo é a unidade de coreografia. Se ele já envolve uma section,
         revelar os dois ao mesmo tempo duplica deslocamento, blur e atraso. */
      if (!elemento.matches("[data-motion-chapter]") && elemento.closest("[data-motion-chapter]")) {
        return;
      }

      elemento.dataset.jbMotion = "true";
      elemento.dataset.jbMotionKind = tipoDoElemento(elemento);

      const atrasoBase = zona === "publico" ? 58 : 34;
      const capitulo = elemento.dataset.motionChapter;
      const acrescimoDeCapitulo = capitulo ? 18 : 0;
      const atraso = (contador % 6) * atrasoBase + acrescimoDeCapitulo;
      contador += 1;
      elemento.style.setProperty("--jb-motion-delay", `${atraso}ms`);

      const caixa = elemento.getBoundingClientRect();
      const jaNaTela = caixa.top < window.innerHeight * 0.93 && caixa.bottom > 0;

      if (jaNaTela) {
        elemento.dataset.jbMotionState = "visivel";
      } else {
        elemento.dataset.jbMotionState = "espera";
        observador.observe(elemento);
      }
    };

    const registrar = (origem: ParentNode) => {
      if (origem instanceof HTMLElement && origem.matches(SELETOR_REVELAVEL)) {
        preparar(origem);
      }

      origem.querySelectorAll<HTMLElement>(SELETOR_REVELAVEL).forEach(preparar);
    };

    registrar(document);

    const observadorDom = new MutationObserver((mutacoes) => {
      for (const mutacao of mutacoes) {
        for (const no of mutacao.addedNodes) {
          if (no instanceof HTMLElement) registrar(no);
        }
      }
    });
    observadorDom.observe(document.body, { childList: true, subtree: true });

    const principal = document.querySelector<HTMLElement>("main");
    if (principal) {
      const publico = zona === "publico";
      principal.animate(
        publico
          ? [
              { opacity: 0.72, transform: "translate3d(0, 12px, 0)", filter: "blur(4px)" },
              { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
            ]
          : [
              { opacity: 0.88, transform: "translate3d(0, 6px, 0)" },
              { opacity: 1, transform: "translate3d(0, 0, 0)" },
            ],
        {
          duration: publico ? 560 : 260,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      );
    }

    let cartaoAtivo: HTMLElement | null = null;
    let quadroDoCursor = 0;
    let cursorX = 0;
    let cursorY = 0;
    const aura = document.querySelector<HTMLElement>("[data-jb-motion-aura]");

    const limparCartao = (cartao: HTMLElement | null) => {
      if (!cartao) return;
      delete cartao.dataset.jbTilt;
      cartao.style.removeProperty("--jb-pointer-x");
      cartao.style.removeProperty("--jb-pointer-y");
      cartao.style.removeProperty("--jb-tilt-x");
      cartao.style.removeProperty("--jb-tilt-y");
    };

    const aoMoverPonteiro = (evento: PointerEvent) => {
      if (!mediaPonteiroFino.matches) return;

      cursorX = evento.clientX;
      cursorY = evento.clientY;

      if (zona === "publico" && aura && quadroDoCursor === 0) {
        quadroDoCursor = window.requestAnimationFrame(() => {
          aura.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate3d(-50%, -50%, 0)`;
          aura.dataset.visible = "true";
          quadroDoCursor = 0;
        });
      }

      if (zona !== "publico") return;
      const alvo = evento.target instanceof Element ? evento.target : null;
      const cartao = alvo?.closest<HTMLElement>("[data-cartao-produto]") ?? null;

      if (cartaoAtivo && cartaoAtivo !== cartao) limparCartao(cartaoAtivo);
      cartaoAtivo = cartao;
      if (!cartao) return;

      const caixa = cartao.getBoundingClientRect();
      if (caixa.width === 0 || caixa.height === 0) return;

      const x = Math.min(1, Math.max(0, (evento.clientX - caixa.left) / caixa.width));
      const y = Math.min(1, Math.max(0, (evento.clientY - caixa.top) / caixa.height));
      const giroX = (0.5 - y) * 3.2;
      const giroY = (x - 0.5) * 4.2;

      cartao.dataset.jbTilt = "true";
      cartao.style.setProperty("--jb-pointer-x", `${x * 100}%`);
      cartao.style.setProperty("--jb-pointer-y", `${y * 100}%`);
      cartao.style.setProperty("--jb-tilt-x", `${giroX.toFixed(2)}deg`);
      cartao.style.setProperty("--jb-tilt-y", `${giroY.toFixed(2)}deg`);
    };

    const aoSairDoPonteiro = (evento: PointerEvent) => {
      if (!cartaoAtivo) return;
      const relacionado = evento.relatedTarget;
      if (relacionado instanceof Node && cartaoAtivo.contains(relacionado)) return;
      limparCartao(cartaoAtivo);
      cartaoAtivo = null;
    };

    document.addEventListener("pointermove", aoMoverPonteiro, { passive: true });
    document.addEventListener("pointerout", aoSairDoPonteiro, { passive: true });

    return () => {
      observador.disconnect();
      observadorDom.disconnect();
      document.removeEventListener("pointermove", aoMoverPonteiro);
      document.removeEventListener("pointerout", aoSairDoPonteiro);
      if (quadroDoCursor) window.cancelAnimationFrame(quadroDoCursor);
      limparCartao(cartaoAtivo);
      if (aura) delete aura.dataset.visible;
    };
  }, [pathname]);

  return (
    <>
      <span className="jb-motion-progress" aria-hidden="true" />
      <span key={pathname} className="jb-motion-route-beam" aria-hidden="true" />
      <span className="jb-motion-aura" data-jb-motion-aura aria-hidden="true" />
    </>
  );
}
