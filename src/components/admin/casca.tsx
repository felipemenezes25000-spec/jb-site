"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { CabecalhoAdmin } from "@/components/admin/cabecalho-admin";
import { MenuAdmin } from "@/components/admin/menu-admin";
import { Logo, Simbolo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import type { GrupoMenu } from "@/lib/permissoes";

/**
 * Casca do backoffice: trilho lateral no desktop, gaveta no mobile e barra
 * superior fixa. Só isto — nenhuma regra de permissão mora aqui; o layout do
 * servidor já entrega o menu filtrado.
 *
 * O estado recolhido do menu fica em localStorage e é lido depois da
 * hidratação, para o HTML do servidor e o do cliente saírem iguais na primeira
 * pintura.
 */

const CHAVE_COLAPSO = "jb:admin:menu-colapsado";

export type UsuarioCasca = {
  nome: string;
  email: string;
  papel: string;
};

export function Casca({
  usuario,
  grupos,
  children,
}: {
  usuario: UsuarioCasca;
  grupos: GrupoMenu[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      setColapsado(window.localStorage.getItem(CHAVE_COLAPSO) === "1");
    } catch {
      // navegador com armazenamento bloqueado: segue com o menu aberto
    }
  }, []);

  const alternarColapso = useCallback(() => {
    setColapsado((atual) => {
      const proximo = !atual;
      try {
        window.localStorage.setItem(CHAVE_COLAPSO, proximo ? "1" : "0");
      } catch {
        // sem persistência, o estado ainda vale para esta sessão
      }
      return proximo;
    });
  }, []);

  // trocar de página fecha a gaveta
  useEffect(() => {
    setGaveta(false);
  }, [pathname]);

  // Esc fecha, e o fundo não rola enquanto a gaveta está aberta
  useEffect(() => {
    if (!gaveta) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setGaveta(false);
    }

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", aoTeclar);
    fechar.current?.focus();

    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [gaveta]);

  return (
    <div className="min-h-dvh bg-graf-50">
      <a
        href="#conteudo-admin"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-jb-700 focus:shadow-raised"
      >
        Ir para o conteúdo
      </a>

      {/* ---------------------------------------------------------- desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-graf-200 bg-white lg:flex",
          "transition-[width] duration-200 ease-out",
          colapsado ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-graf-200",
            colapsado ? "justify-center px-2" : "px-4",
          )}
        >
          <Link
            href="/admin"
            aria-label="Painel JB Soluções Odontológicas"
            className="flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            {colapsado ? <Simbolo tamanho={28} /> : <Logo altura={26} />}
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MenuAdmin grupos={grupos} colapsado={colapsado} />
        </div>

        {!colapsado ? (
          <p className="border-t border-graf-200 px-4 py-3 text-xs leading-snug text-graf-500">
            Painel interno · JB Soluções Odontológicas
          </p>
        ) : null}
      </aside>

      {/* ----------------------------------------------------------- gaveta */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          gaveta ? "pointer-events-auto" : "pointer-events-none",
        )}
        inert={!gaveta}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden={!gaveta}
          onClick={() => setGaveta(false)}
          className={cn(
            "absolute inset-0 bg-graf-950/40 transition-opacity duration-200",
            gaveta ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="sr-only">Fechar menu</span>
        </button>

        <div
          role="dialog"
          aria-modal={gaveta || undefined}
          aria-label="Menu do painel"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[17rem] max-w-[85vw] flex-col bg-white shadow-pop",
            "transition-transform duration-200 ease-out",
            gaveta ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-graf-200 pl-4 pr-2">
            <Logo altura={26} />
            <button
              type="button"
              ref={fechar}
              aria-label="Fechar menu"
              onClick={() => setGaveta(false)}
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-700 transition-colors",
                "hover:bg-graf-100 hover:text-graf-950",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              )}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <MenuAdmin grupos={grupos} aoNavegar={() => setGaveta(false)} />
          </div>

          <div className="border-t border-graf-200 px-4 py-3">
            <p className="truncate text-sm font-semibold text-graf-900">{usuario.nome}</p>
            <p className="truncate text-xs text-graf-500">{usuario.papel}</p>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- conteúdo */}
      <div
        className={cn(
          "transition-[padding] duration-200 ease-out",
          colapsado ? "lg:pl-[4.5rem]" : "lg:pl-64",
        )}
      >
        <CabecalhoAdmin
          nome={usuario.nome}
          email={usuario.email}
          papel={usuario.papel}
          colapsado={colapsado}
          aoAlternarColapso={alternarColapso}
          aoAbrirGaveta={() => setGaveta(true)}
        />

        <main id="conteudo-admin" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[100rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
