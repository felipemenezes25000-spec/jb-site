"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { classesBotao, type Tamanho, type Variante } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ============================================================================
   Copiar para a área de transferência
   Código do pedido, número da OS, chave Pix, link de rastreio — coisas que a
   pessoa vai colar em outro lugar e não deveria precisar digitar à mão.

   A API moderna só existe em contexto seguro (https ou localhost); fora dele
   cai no textarea + execCommand. E se nem isso funcionar, a mensagem diz o
   que houve em vez de fingir sucesso.
   ============================================================================ */

type Estado = "parado" | "copiado" | "falhou";

function copiarPorTextarea(valor: string) {
  const area = document.createElement("textarea");
  area.value = valor;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, valor.length);

  let deuCerto = false;
  try {
    deuCerto = document.execCommand("copy");
  } catch {
    deuCerto = false;
  }
  document.body.removeChild(area);
  return deuCerto;
}

export function BotaoCopiar({
  texto,
  rotulo = "Copiar",
  rotuloCopiado = "Copiado",
  variante = "secundario",
  tamanho = "sm",
  somenteIcone = false,
  className,
}: {
  texto: string;
  rotulo?: string;
  rotuloCopiado?: string;
  variante?: Variante;
  tamanho?: Tamanho;
  /** Mantém só o ícone na tela — o rótulo continua existindo para leitor de tela. */
  somenteIcone?: boolean;
  className?: string;
}) {
  const [estado, setEstado] = useState<Estado>("parado");
  const refRelogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refRelogio.current) clearTimeout(refRelogio.current);
    };
  }, []);

  function agendarVolta() {
    if (refRelogio.current) clearTimeout(refRelogio.current);
    refRelogio.current = setTimeout(() => setEstado("parado"), 2200);
  }

  async function copiar() {
    let deuCerto = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        deuCerto = true;
      } else {
        deuCerto = copiarPorTextarea(texto);
      }
    } catch {
      deuCerto = copiarPorTextarea(texto);
    }
    setEstado(deuCerto ? "copiado" : "falhou");
    agendarVolta();
  }

  const copiado = estado === "copiado";
  const falhou = estado === "falhou";
  const visivel = copiado ? rotuloCopiado : falhou ? "Não deu para copiar" : rotulo;

  return (
    <>
      <button
        type="button"
        onClick={() => void copiar()}
        aria-label={somenteIcone ? `${rotulo}: ${texto}` : undefined}
        title={somenteIcone ? rotulo : undefined}
        className={classesBotao(
          variante,
          tamanho,
          cn(somenteIcone && "aspect-square px-0", copiado && "text-ok-700", className),
        )}
      >
        {copiado ? (
          <Check className="size-4 shrink-0" aria-hidden />
        ) : (
          <Copy className="size-4 shrink-0" aria-hidden />
        )}
        {somenteIcone ? null : visivel}
      </button>

      <span role="status" aria-live="polite" className="sr-only">
        {copiado
          ? `${rotulo} concluído. Texto copiado.`
          : falhou
            ? "Não foi possível copiar. Selecione o texto e copie manualmente."
            : ""}
      </span>
    </>
  );
}
