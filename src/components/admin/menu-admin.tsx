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
    <nav aria-label="Áreas do painel" className={cn("flex flex-col gap-6 pb-6 pt-3", className)}>
      {grupos.map((grupo, indice) => (
        <div key={grupo.grupo}>
          {colapsado ? (
            /* Recolhido não há espaço para o nome do grupo; um fio separa as
               famílias de ícones. O primeiro grupo não leva fio — encostaria
               na borda de baixo do logotipo e viraria uma linha dupla. */
            indice > 0 ? <div className="mx-4 mb-3 h-px bg-graf-200" role="presentation" /> : null
          ) : (
            /* Grudado no topo enquanto o grupo rola: com seis famílias e mais
               de vinte áreas, o menu passa da altura da tela e sem isto a
               pessoa perde de vista em qual parte do painel está olhando. */
            <p className="sticky top-0 z-10 bg-white px-4 pb-2 pt-1 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-graf-500">
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
                      "group relative flex h-11 items-center gap-3 rounded-lg text-[0.9375rem] font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
                      colapsado ? "justify-center px-0" : "pl-3.5 pr-2.5",
                      ativo
                        ? "bg-jb-50 font-semibold text-jb-800"
                        : "text-graf-700 hover:bg-graf-100 hover:text-graf-950",
                    )}
                  >
                    {/* barra do item ativo — o estado não depende só da cor de fundo */}
                    {ativo ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-jb-500"
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
                          <>
                            <span
                              aria-hidden
                              className="ml-auto shrink-0 rounded-full bg-graf-100 px-2 py-0.5 text-xs font-medium text-graf-600"
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
