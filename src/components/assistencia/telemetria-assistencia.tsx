"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { medir } from "@/lib/analytics/cliente";
import type { NomeDeEvento } from "@/lib/analytics/taxonomia";

const ETAPAS = [
  "etapa-equipamento",
  "etapa-problema",
  "etapa-fotos",
  "etapa-local",
  "etapa-revisao",
] as const;

export const CHAVE_SUBMIT_ASSISTENCIA = "jb:assistencia:submit-em-andamento";

/**
 * Instrumenta o funil sem tocar no conteúdo digitado.
 *
 * As etapas continuam montadas e alternam apenas `hidden`, então basta observar
 * qual seção ficou visível. O submit não é contado aqui como conversão: este
 * componente grava apenas um marcador efêmero na aba. O evento de negócio só
 * sai quando a navegação realmente chega à página do protocolo.
 */
export function TelemetriaAssistencia() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/assistencia-tecnica/solicitar") return;

    medir("assistance_start", { etapa: 0 });

    const vistos = new Set<number>();

    function registrarEtapa() {
      for (const [indice, id] of ETAPAS.entries()) {
        const titulo = document.getElementById(id);
        const secao = titulo?.closest("section");
        if (!secao || secao.hidden) continue;

        const etapa = indice + 1;
        if (vistos.has(etapa)) return;
        vistos.add(etapa);

        medir(`assistance_step_${etapa}` as NomeDeEvento, { etapa });
        return;
      }
    }

    registrarEtapa();

    const formulario = document.querySelector<HTMLFormElement>("form");
    if (!formulario) return;

    function marcarSubmit() {
      const botao = formulario.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!botao) return;
      try {
        sessionStorage.setItem(CHAVE_SUBMIT_ASSISTENCIA, String(Date.now()));
      } catch {
        // Analytics nunca bloqueia o fluxo principal.
      }
    }

    formulario.addEventListener("submit", marcarSubmit);

    const observador = new MutationObserver((mutacoes) => {
      if (mutacoes.some((mutacao) => mutacao.attributeName === "hidden")) {
        registrarEtapa();
      }
    });

    observador.observe(formulario, {
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });

    return () => {
      observador.disconnect();
      formulario.removeEventListener("submit", marcarSubmit);
    };
  }, [pathname]);

  return null;
}
