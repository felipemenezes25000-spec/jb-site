"use client";

import { usePathname } from "next/navigation";

import { MotionSystem } from "@/components/ui/motion-system";

/* ============================================================================
   Porteiro do Motion System legado

   O site público de assistência tem coreografia própria em `src/app/(site)`:
   reveal, barra de leitura, hover, touch e reduced-motion. Montar aqui também
   o motor que nasceu para vitrine/PDP deixava IntersectionObserver,
   MutationObserver e três superfícies globais (progress, beam e aura) vivos sem
   necessidade — inclusive uma segunda barra de progresso por cima da nova.

   Áreas operacionais continuam usando o sistema global. A antiga loja pública
   não entra nesta lista porque suas rotas respondem 410 antes de renderizar o
   app.
   ============================================================================ */

const PREFIXOS_COM_MOTION_GLOBAL = [
  "/admin",
  "/minha-jb",
  "/checkout",
  "/carrinho",
  "/entrar",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
] as const;

function dentroDe(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function MotionSystemPorRota() {
  const pathname = usePathname();
  const usaMotionGlobal = PREFIXOS_COM_MOTION_GLOBAL.some((base) => dentroDe(pathname, base));

  if (!usaMotionGlobal) return null;
  return <MotionSystem />;
}
