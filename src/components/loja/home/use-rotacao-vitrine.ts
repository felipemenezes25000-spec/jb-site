"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)";

function observarMovimento(notificar: () => void) {
  const consulta = window.matchMedia(CONSULTA_MOVIMENTO);
  consulta.addEventListener("change", notificar);
  return () => consulta.removeEventListener("change", notificar);
}

function observarVisibilidade(notificar: () => void) {
  document.addEventListener("visibilitychange", notificar);
  return () => document.removeEventListener("visibilitychange", notificar);
}

const lerMovimentoReduzido = () => window.matchMedia(CONSULTA_MOVIMENTO).matches;
const lerAbaVisivel = () => document.visibilityState === "visible";
const reduzirNoServidor = () => true;
const aguardarCliente = () => false;

/** O rodízio só trabalha enquanto o equipamento está sendo visto. */
export function useRotacaoVitrine(total: number) {
  const palcoRef = useRef<HTMLDivElement>(null);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [emTela, setEmTela] = useState(false);
  const reduzido = useSyncExternalStore(
    observarMovimento,
    lerMovimentoReduzido,
    reduzirNoServidor,
  );
  const abaVisivel = useSyncExternalStore(
    observarVisibilidade,
    lerAbaVisivel,
    aguardarCliente,
  );

  useEffect(() => {
    const palco = palcoRef.current;
    if (!palco || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      ([entrada]) => setEmTela(entrada.isIntersecting && entrada.intersectionRatio >= 0.35),
      { threshold: 0.35 },
    );
    observador.observe(palco);
    return () => observador.disconnect();
  }, [total]);

  const automatico = total > 1 && !pausado && !reduzido;

  useEffect(() => {
    if (!automatico || !abaVisivel || !emTela) return;

    const relogio = window.setInterval(() => {
      setIndice((atual) => (atual + 1) % total);
    }, 6000);
    return () => window.clearInterval(relogio);
  }, [automatico, abaVisivel, emTela, total]);

  return {
    palcoRef,
    indice: indice < total ? indice : 0,
    automatico,
    reduzido,
    pausar: () => setPausado(true),
    alternarPausa: () => setPausado((atual) => !atual),
    selecionar: (novoIndice: number) => {
      setIndice(novoIndice);
      setPausado(true);
    },
  };
}
