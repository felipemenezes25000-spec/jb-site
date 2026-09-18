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

/**
 * Instrumenta o funil sem acoplar analytics ao formulário de domínio.
 *
 * O assistente mantém todas as etapas montadas para não perder estado e muda
 * apenas o atributo `hidden`. Isso permite observar qual etapa ficou visível
 * sem ler nenhum valor digitado pelo cliente. O payload leva somente o número
 * lógico da etapa, que já está na lista de permissão da taxonomia.
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

    const formulario = document.querySelector("form");
    if (!formulario) return;

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

    return () => observador.disconnect();
  }, [pathname]);

  return null;
}
