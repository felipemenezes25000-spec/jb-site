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
 * qual seção ficou visível. A região `aria-live` do uploader já informa quantos
 * arquivos chegaram inteiros; lemos apenas esse contador, nunca nome, conteúdo
 * ou id do arquivo. O submit vira conversão somente depois do redirect para o
 * protocolo, em `ConfirmarConversaoAssistencia`.
 */
export function TelemetriaAssistencia() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/assistencia-tecnica/solicitar") return;

    medir("assistance_start", { etapa: 0 });

    const formulario = document.querySelector<HTMLFormElement>("form");
    if (!formulario) return;

    const vistos = new Set<number>();
    let midiasConfirmadas = 0;

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

    function registrarMidia() {
      const regioes = formulario.querySelectorAll<HTMLElement>('p.sr-only[aria-live="polite"]');
      for (const regiao of regioes) {
        const texto = regiao.textContent ?? "";
        const encontrado = texto.match(/(\d+)\s+arquivo(?:s)?\s+pronto/i);
        if (!encontrado) continue;

        const quantidade = Number(encontrado[1]);
        if (!Number.isFinite(quantidade) || quantidade <= midiasConfirmadas) continue;
        midiasConfirmadas = quantidade;
        medir("assistance_media_added", { quantidade });
      }
    }

    registrarEtapa();
    registrarMidia();

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
      if (
        mutacoes.some(
          (mutacao) => mutacao.type === "childList" || mutacao.type === "characterData",
        )
      ) {
        registrarMidia();
      }
    });

    observador.observe(formulario, {
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
      childList: true,
      characterData: true,
    });

    return () => {
      observador.disconnect();
      formulario.removeEventListener("submit", marcarSubmit);
    };
  }, [pathname]);

  return null;
}
