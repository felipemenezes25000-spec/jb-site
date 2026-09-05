"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Etiqueta } from "@/components/ui/data";
import { MENU_CLIENTE } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

/**
 * Navegação da área do cliente.
 *
 * Coluna fixa no desktop, barra rolável no mobile — e um só componente para os
 * dois, porque a lista é a mesma (MENU_CLIENTE). Só um dos dois blocos fica
 * visível por vez, então o leitor de tela nunca ouve os links duplicados.
 *
 * `contadores` é indexado pelo href do item, exatamente como está em
 * MENU_CLIENTE. Ex.: `{ "/minha-jb/pedidos": 2 }` marca 2 pedidos em aberto.
 * Contador ausente, zero ou negativo não desenha etiqueta nenhuma.
 */

export type ContadoresMenuCliente = Partial<Record<string, number>>;

function estaAtivo(href: string, caminho: string) {
  // a visão geral é a raiz da área: só casa exata, senão fica sempre acesa
  if (href === "/minha-jb") return caminho === href;
  return caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ valor }: { valor: number }) {
  return (
    <Etiqueta tom="alerta" className="ml-auto shrink-0">
      <span className="tabular" aria-hidden>
        {valor}
      </span>
      <span className="sr-only">{valor} em aberto</span>
    </Etiqueta>
  );
}

export function MenuLateral({
  contadores,
  className,
}: {
  contadores?: ContadoresMenuCliente;
  className?: string;
}) {
  const caminho = usePathname();
  const barraRef = useRef<HTMLDivElement>(null);
  const itemAtivoRef = useRef<HTMLAnchorElement>(null);

  // no mobile, o item atual pode estar fora da área visível da barra
  useEffect(() => {
    const barra = barraRef.current;
    const item = itemAtivoRef.current;
    if (!barra || !item) return;
    barra.scrollLeft = Math.max(0, item.offsetLeft - 16);
  }, [caminho]);

  const itens = MENU_CLIENTE.map((item) => {
    const quantidade = contadores?.[item.href];
    return {
      ...item,
      ativo: estaAtivo(item.href, caminho),
      quantidade: typeof quantidade === "number" && quantidade > 0 ? quantidade : null,
    };
  });

  return (
    <nav aria-label="Minha JB" className={className}>
      {/* mobile: barra rolável horizontal */}
      <div
        ref={barraRef}
        className="-mx-4 overflow-x-auto scrollbar-none px-4 lg:hidden"
      >
        <ul className="flex w-max gap-2 pb-1">
          {itens.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                ref={item.ativo ? itemAtivoRef : undefined}
                aria-current={item.ativo ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border px-4 text-sm font-semibold transition-colors",
                  item.ativo
                    ? "border-jb-500 bg-jb-50 text-jb-800"
                    : "border-graf-200 bg-white text-graf-700 hover:border-graf-300 hover:text-graf-900",
                )}
              >
                {item.rotulo}
                {item.quantidade !== null ? <Contador valor={item.quantidade} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* desktop: coluna fixa */}
      <div className="hidden lg:block">
        <ul className="sticky top-28 space-y-1">
          {itens.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-lg border-l-2 py-2.5 pl-4 pr-3 text-sm font-semibold transition-colors",
                  item.ativo
                    ? "border-jb-500 bg-jb-50 text-jb-800"
                    : "border-transparent text-graf-600 hover:bg-graf-50 hover:text-graf-900",
                )}
              >
                <span className="min-w-0 truncate">{item.rotulo}</span>
                {item.quantidade !== null ? <Contador valor={item.quantidade} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
