"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Headset, ShieldCheck, Tag, Truck } from "lucide-react";

const DESTAQUES = [
  {
    titulo: "Ofertas especiais",
    descricao: "Equipamentos com condições exclusivas",
    Icone: Tag,
  },
  {
    titulo: "Frete para todo o Brasil",
    descricao: "Agilidade e segurança na entrega",
    Icone: Truck,
  },
  {
    titulo: "Suporte especializado",
    descricao: "Fale com a equipe técnica JB",
    Icone: Headset,
  },
  {
    titulo: "Pós-venda de confiança",
    descricao: "Seu consultório sempre funcionando",
    Icone: ShieldCheck,
  },
] as const;

const TEMPO_DESTAQUE_MS = 4600;

function localizarCabecalhoDaLoja() {
  const chamada = document.querySelector<HTMLAnchorElement>(
    'header a[href="/assistencia-tecnica/solicitar"]',
  );
  return chamada?.closest<HTMLElement>("header") ?? null;
}

/**
 * Acabamento progressivo do cabeçalho público.
 *
 * Mantém o estado e toda a lógica comercial do cabeçalho original intactos,
 * adicionando apenas o ticker e uma correção defensiva para o mega menu de
 * desktop. Assim busca, conta, carrinho e navegação continuam usando os mesmos
 * componentes e rotas.
 */
export function CabecalhoEnhancements() {
  const reduzido = useReducedMotion();
  const [cabecalho, setCabecalho] = useState<HTMLElement | null>(null);
  const [destaque, setDestaque] = useState(0);

  useEffect(() => {
    let observador: MutationObserver | null = null;

    const encontrar = () => {
      const encontrado = localizarCabecalhoDaLoja();
      if (!encontrado) return false;

      encontrado.dataset.jbPremiumHeader = "true";
      const faixaUtilidade = encontrado.previousElementSibling;
      if (faixaUtilidade instanceof HTMLDivElement) {
        faixaUtilidade.dataset.jbUtilityBar = "true";
      }

      setCabecalho(encontrado);
      return true;
    };

    if (!encontrar()) {
      observador = new MutationObserver(() => {
        if (!encontrar()) return;
        observador?.disconnect();
        observador = null;
      });
      observador.observe(document.body, { childList: true, subtree: true });
    }

    return () => observador?.disconnect();
  }, []);

  useEffect(() => {
    if (!cabecalho) return;

    const atualizarCompacto = () => {
      cabecalho.dataset.jbCompact = window.scrollY > 12 ? "true" : "false";
    };

    atualizarCompacto();
    window.addEventListener("scroll", atualizarCompacto, { passive: true });
    return () => window.removeEventListener("scroll", atualizarCompacto);
  }, [cabecalho]);

  useEffect(() => {
    if (!cabecalho) return;

    let temporizador: number | null = null;

    const cancelar = () => {
      if (temporizador !== null) window.clearTimeout(temporizador);
      temporizador = null;
    };

    const fecharMegaAoSair = () => {
      cancelar();
      temporizador = window.setTimeout(() => {
        if (cabecalho.matches(":hover")) return;

        const gatilhoAberto = Array.from(
          cabecalho.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"]'),
        ).find((botao) => botao.getAttribute("aria-label")?.startsWith("Fechar o menu de"));

        // Usa o próprio gatilho do componente: fecha pelo mesmo estado React
        // do mega menu, sem manter um segundo estado paralelo. Não bloqueamos
        // pelo focus-within aqui: um clique deixa foco no gatilho e era isso
        // que fazia o painel poder continuar aberto depois da saída do mouse.
        gatilhoAberto?.click();
      }, 70);
    };

    cabecalho.addEventListener("pointerenter", cancelar);
    cabecalho.addEventListener("pointerleave", fecharMegaAoSair);

    return () => {
      cancelar();
      cabecalho.removeEventListener("pointerenter", cancelar);
      cabecalho.removeEventListener("pointerleave", fecharMegaAoSair);
    };
  }, [cabecalho]);

  useEffect(() => {
    if (reduzido) return;
    const timer = window.setInterval(
      () => setDestaque((atual) => (atual + 1) % DESTAQUES.length),
      TEMPO_DESTAQUE_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduzido]);

  if (!cabecalho) return null;

  return createPortal(
    <section className="jb-promo-ticker" aria-label="Destaques da JB">
      <div className="jb-promo-ticker__desktop" aria-hidden="true">
        {DESTAQUES.map(({ titulo, descricao, Icone }, indice) => (
          <div className="jb-promo-ticker__item" key={titulo}>
            <span className="jb-promo-ticker__icon">
              <Icone aria-hidden />
            </span>
            <span className="jb-promo-ticker__copy">
              <strong>{titulo}</strong>
              <small>{descricao}</small>
            </span>
            {indice < DESTAQUES.length - 1 ? (
              <span className="jb-promo-ticker__divider" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>

      <div className="jb-promo-ticker__compact">
        <AnimatePresence mode="wait" initial={false}>
          {(() => {
            const { titulo, descricao, Icone } = DESTAQUES[destaque];
            return (
              <motion.div
                key={titulo}
                initial={reduzido ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduzido ? undefined : { opacity: 0, y: -7 }}
                transition={{ duration: reduzido ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="jb-promo-ticker__compact-item"
              >
                <span className="jb-promo-ticker__icon">
                  <Icone aria-hidden />
                </span>
                <span className="jb-promo-ticker__copy">
                  <strong>{titulo}</strong>
                  <small>{descricao}</small>
                </span>
                <span className="jb-promo-ticker__progress" aria-hidden>
                  {DESTAQUES.map((item, indice) => (
                    <i key={item.titulo} data-active={indice === destaque ? "true" : "false"} />
                  ))}
                </span>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </section>,
    cabecalho,
  );
}
