"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Siren } from "lucide-react";

import { cn } from "@/lib/utils";

const CHAVE_RASCUNHO = "jb:chamado:rascunho";

function prepararChamadoUrgente() {
  try {
    const salvo = window.sessionStorage.getItem(CHAVE_RASCUNHO);
    const atual: Record<string, unknown> = salvo ? JSON.parse(salvo) : {};

    window.sessionStorage.setItem(
      CHAVE_RASCUNHO,
      JSON.stringify({
        ...atual,
        /* No domínio da assistência, equipamento fora de operação é o estado
           `parado`. Manter os dois campos coerentes evita um instante em que a
           interface diz uma coisa e a prioridade persistida diz outra. */
        urgencia: "parado",
        aindaOpera: "nao",
      }),
    );
  } catch {
    // O SOS continua funcionando mesmo quando o armazenamento da aba é bloqueado.
  }
}

export function SosAbrirChamado({
  urgente = false,
  children,
  className,
}: {
  urgente?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/assistencia-tecnica/solicitar"
      onClick={() => {
        if (urgente) prepararChamadoUrgente();
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

/**
 * Atalho de emergência operacional para a vitrine pública.
 *
 * Ele aparece só no celular e some nas próprias telas de assistência para não
 * competir com o formulário, com o dock de conversão ou com a leitura da
 * etiqueta. O botão não promete SLA nem cria prioridade escondida: ele apenas
 * leva para a triagem correta em um toque.
 */
export function SosEquipamentoFlutuante() {
  const pathname = usePathname();

  const esconder =
    pathname.startsWith("/assistencia-tecnica") ||
    pathname.startsWith("/sos-equipamento") ||
    pathname.startsWith("/comparar") ||
    pathname.startsWith("/carrinho");

  if (esconder) return null;

  return (
    <Link
      href="/sos-equipamento"
      aria-label="SOS Equipamento: abrir atendimento para equipamento odontológico parado"
      className={cn(
        "foco-jb fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-3 z-40 md:hidden",
        "inline-flex min-h-12 items-center gap-2 rounded-full border border-jb-300 bg-graf-950 px-4",
        "text-sm font-extrabold text-white shadow-2xl shadow-graf-950/25",
        "transition-[transform,box-shadow] duration-200 active:scale-[0.97] motion-reduce:transition-none",
      )}
    >
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-jb-500 opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2.5 rounded-full bg-jb-500" />
      </span>
      <Siren className="size-4 text-jb-400" aria-hidden />
      SOS Equipamento
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}
