"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  ChartColumn,
  ClipboardCheck,
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
  Star,
  Stethoscope,
  TicketPercent,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { GrupoMenu } from "@/lib/permissoes";

const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  ChartColumn,
  ClipboardCheck,
  Star,
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
  aoNavegar?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Áreas do painel"
      className={cn("flex flex-col gap-3.5 pb-5 pt-2", className)}
    >
      {grupos.map((grupo, indice) => (
        <div key={grupo.grupo}>
          {colapsado ? (
            indice > 0 ? (
              <div className="mx-4 mb-2.5 h-px bg-graf-200/80" role="presentation" />
            ) : null
          ) : (
            <p className="sticky top-0 z-10 bg-white/95 px-4 pb-1.5 pt-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-graf-500 backdrop-blur-sm">
              {grupo.rotulo}
            </p>
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
                      "group relative flex h-9 items-center gap-2.5 rounded-lg text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-150",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
                      colapsado ? "justify-center px-0" : "pl-2.5 pr-2",
                      ativo
                        ? "bg-gradient-to-r from-jb-50 via-[#fff1f2] to-[#fff5f5] font-semibold text-jb-800 shadow-[inset_0_0_0_1px_rgba(224,20,27,0.045)]"
                        : "text-graf-700 hover:bg-graf-100/85 hover:text-graf-950",
                    )}
                  >
                    {ativo ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full bg-jb-500"
                      />
                    ) : null}

                    <Icone
                      className={cn(
                        "size-[16px] shrink-0 transition-colors",
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
                          <>
                            <span
                              aria-hidden
                              className="ml-auto shrink-0 rounded-full bg-graf-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-graf-600"
                            >
                              leitura
                            </span>
                            <span className="sr-only">— você abre esta área apenas para consulta</span>
                          </>
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
