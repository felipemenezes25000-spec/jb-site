"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LayoutDashboard, Wrench, X } from "lucide-react";

const CHAVE_FECHADO = "jb:assistencia:dock-fechado";

export function DockConversaoAssistencia() {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(false);
  const [fechado, setFechado] = useState(true);

  const naLanding = pathname === "/assistencia-tecnica";

  useEffect(() => {
    if (!naLanding) return;

    let foiFechado = false;
    try {
      foiFechado = sessionStorage.getItem(CHAVE_FECHADO) === "1";
    } catch {
      // Armazenamento bloqueado não impede o CTA de funcionar.
    }
    setFechado(foiFechado);

    const atualizar = () => setVisivel(window.scrollY > 520);
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => window.removeEventListener("scroll", atualizar);
  }, [naLanding]);

  if (!naLanding || fechado || !visivel) return null;

  function fechar() {
    setFechado(true);
    try {
      sessionStorage.setItem(CHAVE_FECHADO, "1");
    } catch {
      // O fechamento continua valendo nesta renderização.
    }
  }

  return (
    <aside
      data-assistencia-dock
      aria-label="Atalhos da assistência técnica"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-graf-200 bg-white/95 p-2 shadow-2xl shadow-graf-950/15 backdrop-blur-xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[28rem]"
    >
      <div className="flex items-center gap-2">
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700 sm:flex">
          <Wrench className="size-4.5" aria-hidden />
        </span>

        <div className="hidden min-w-0 flex-1 px-1 sm:block">
          <p className="text-sm font-bold leading-tight text-graf-950">Precisa da equipe técnica?</p>
          <p className="mt-0.5 truncate text-xs text-graf-500">Abra ou acompanhe seu atendimento.</p>
        </div>

        <Link
          href="/minha-jb/assistencia"
          className="foco-jb inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-graf-700 transition-colors hover:bg-graf-100 sm:flex-none"
        >
          <LayoutDashboard className="size-3.5" aria-hidden />
          Acompanhar
        </Link>

        <Link
          href="/assistencia-tecnica/solicitar"
          className="foco-jb inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-jb-600 px-4 text-sm font-extrabold text-white shadow-sm transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-jb-700 hover:shadow-lg sm:flex-none"
        >
          Abrir chamado
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>

        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar atalhos da assistência"
          className="foco-jb flex size-11 shrink-0 items-center justify-center rounded-xl text-graf-400 transition-colors hover:bg-graf-100 hover:text-graf-700"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
