"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, X } from "lucide-react";

import { CabecalhoAdmin } from "@/components/admin/cabecalho-admin";
import { MenuAdmin } from "@/components/admin/menu-admin";
import { Logo, Simbolo } from "@/components/ui/logo";
import { useDialogo } from "@/components/ui/use-dialogo";
import { cn } from "@/lib/utils";
import type { GrupoMenu } from "@/lib/permissoes";
import styles from "./casca.module.css";

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

  const fecharGaveta = useCallback(() => setGaveta(false), []);
  const refGaveta = useDialogo(gaveta, fecharGaveta);

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

  useEffect(() => {
    setGaveta(false);
  }, [pathname]);

  return (
    <div className={cn("admin-shell min-h-dvh bg-[#f6f7f9] text-graf-900", styles.shell)}>
      <a
        href="#conteudo-admin"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-jb-700 focus:shadow-raised"
      >
        Ir para o conteúdo
      </a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-graf-200/80 bg-white/95 shadow-[1px_0_0_rgba(20,24,32,0.02)] backdrop-blur-xl lg:flex",
          "transition-[width] duration-200 ease-out",
          colapsado ? "w-[4.75rem]" : "w-[15.5rem]",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-graf-200/70",
            colapsado ? "justify-center px-2" : "px-5",
          )}
        >
          <Link
            href="/admin"
            aria-label="Painel JB Soluções Odontológicas"
            className="flex items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            {colapsado ? <Simbolo tamanho={30} /> : <Logo altura={28} />}
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          <MenuAdmin grupos={grupos} colapsado={colapsado} />
        </div>

        <div className="shrink-0 border-t border-graf-200/70 bg-white/90 p-2.5">
          <LinkVerSite colapsado={colapsado} />
        </div>
      </aside>

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
          onClick={fecharGaveta}
          className={cn(
            "absolute inset-0 bg-graf-950/45 backdrop-blur-[2px] transition-opacity duration-200",
            gaveta ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="sr-only">Fechar menu</span>
        </button>

        <div
          ref={refGaveta}
          role="dialog"
          aria-modal={gaveta || undefined}
          aria-label="Menu do painel"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[18rem] max-w-[88vw] flex-col border-r border-graf-200/70 bg-white shadow-pop",
            "transition-transform duration-200 ease-out",
            gaveta ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-graf-200/70 pl-5 pr-2.5">
            <Logo altura={28} />
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={fecharGaveta}
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-graf-700 transition-colors",
                "hover:bg-graf-100 hover:text-graf-950",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              )}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
            <MenuAdmin grupos={grupos} aoNavegar={fecharGaveta} />
          </div>

          <div className="shrink-0 border-t border-graf-200/70 bg-white p-2.5">
            <LinkVerSite />
            <div className="px-3.5 pb-1 pt-2.5">
              <p className="truncate text-[0.9375rem] font-semibold text-graf-900">
                {usuario.nome}
              </p>
              <p className="truncate text-[0.8125rem] text-graf-500">{usuario.papel}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200 ease-out",
          colapsado ? "lg:pl-[4.75rem]" : "lg:pl-[15.5rem]",
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

        <main
          id="conteudo-admin"
          className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9 xl:px-10"
        >
          <div className="mx-auto min-w-0 max-w-[96rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function LinkVerSite({ colapsado = false }: { colapsado?: boolean }) {
  return (
    <Link
      href="/"
      title={colapsado ? "Ver o site" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl text-[0.9375rem] font-medium text-graf-600 transition-all",
        "hover:bg-graf-100 hover:text-graf-950",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
        colapsado ? "justify-center px-0" : "pl-3 pr-2.5",
      )}
    >
      <ExternalLink className="size-[18px] shrink-0 text-graf-500" aria-hidden />
      {colapsado ? <span className="sr-only">Ver o site</span> : <span>Ver o site</span>}
    </Link>
  );
}
