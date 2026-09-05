"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  HardHat,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MonitorCog,
  Newspaper,
  Package,
  ScrollText,
  Send,
  Settings,
  ShoppingCart,
  Stethoscope,
  TicketPercent,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { GrupoMenu } from "@/lib/permissoes";

/**
 * Menu do backoffice.
 *
 * Recebe os grupos já filtrados pelo servidor (ver `menuDoUsuario`): o cliente
 * nunca decide permissão, só desenha o que chegou. O mesmo componente serve o
 * trilho fixo do desktop e a gaveta do mobile.
 */

/** Lista fechada — evita arrastar a biblioteca inteira de ícones para o bundle. */
const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Users,
  LifeBuoy,
  FileText,
  TicketPercent,
  Truck,
  Package,
  Boxes,
  Stethoscope,
  ClipboardList,
  CalendarDays,
  CalendarClock,
  MonitorCog,
  HardHat,
  Newspaper,
  Inbox,
  UserCog,
  Settings,
  Send,
  ScrollText,
};

function estaAtivo(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MenuAdmin({
  grupos,
  colapsado = false,
  aoNavegar,
  className,
}: {
  grupos: GrupoMenu[];
  colapsado?: boolean;
  /** Fecha a gaveta no mobile depois de escolher um item. */
  aoNavegar?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Áreas do painel" className={cn("flex flex-col gap-5 py-4", className)}>
      {grupos.map((grupo) => (
        <div key={grupo.grupo}>
          {colapsado ? (
            <div className="mx-3 mb-2 h-px bg-graf-200" role="presentation" />
          ) : (
            <p className="label-mono mb-1.5 px-3 uppercase text-graf-500">{grupo.rotulo}</p>
          )}

          <ul className="space-y-0.5 px-2">
            {grupo.itens.map((item) => {
              const Icone = ICONES[item.icone] ?? LayoutDashboard;
              const ativo = estaAtivo(pathname, item.href);

              return (
                <li key={item.area}>
                  <Link
                    href={item.href}
                    onClick={aoNavegar}
                    aria-current={ativo ? "page" : undefined}
                    title={colapsado ? item.rotulo : undefined}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                      colapsado ? "justify-center px-0" : "px-3",
                      ativo
                        ? "bg-jb-50 font-semibold text-jb-800"
                        : "text-graf-700 hover:bg-graf-100 hover:text-graf-950",
                    )}
                  >
                    {/* barra do item ativo — o estado não depende só da cor de fundo */}
                    {ativo ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-jb-500"
                      />
                    ) : null}

                    <Icone
                      className={cn(
                        "size-[18px] shrink-0",
                        ativo ? "text-jb-600" : "text-graf-500 group-hover:text-graf-700",
                      )}
                      aria-hidden
                    />

                    {colapsado ? (
                      <span className="sr-only">{item.rotulo}</span>
                    ) : (
                      <>
                        <span className="truncate">{item.rotulo}</span>
                        {item.somenteLeitura ? (
                          <span
                            className="ml-auto shrink-0 rounded bg-graf-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-graf-500"
                            title="Você abre esta área apenas para consulta"
                          >
                            leitura
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
