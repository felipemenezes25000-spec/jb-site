import Link from "next/link";

import { cn } from "@/lib/utils";

/* ============================================================================
   Atalhos do catálogo

   Produtos, Categorias, Marcas, Serviços e Estoque são cinco telas do mesmo
   assunto, mas só duas delas cabem no menu lateral. Esta faixa é o que liga as
   cinco — sem ela, Categorias e Marcas só existiriam para quem souber o
   endereço de cor.

   É `<nav>` de verdade, com `aria-current` na tela aberta: quem navega por
   teclado ou leitor de tela sabe onde está sem depender do contraste do fundo.
   ============================================================================ */

export type TelaDoCatalogo = "produtos" | "categorias" | "marcas" | "servicos" | "estoque";

const TELAS: { chave: TelaDoCatalogo; rotulo: string; href: string }[] = [
  { chave: "produtos", rotulo: "Produtos", href: "/admin/produtos" },
  { chave: "categorias", rotulo: "Categorias", href: "/admin/categorias" },
  { chave: "marcas", rotulo: "Marcas", href: "/admin/marcas" },
  { chave: "servicos", rotulo: "Serviços", href: "/admin/servicos" },
  { chave: "estoque", rotulo: "Estoque", href: "/admin/estoque" },
];

export function AtalhosCatalogo({
  atual,
  /** Some com "Estoque" para quem não abre a área. */
  mostrarEstoque = true,
  className,
}: {
  atual: TelaDoCatalogo;
  mostrarEstoque?: boolean;
  className?: string;
}) {
  const telas = mostrarEstoque ? TELAS : TELAS.filter((tela) => tela.chave !== "estoque");

  return (
    <nav aria-label="Seções do catálogo" className={className}>
      <ul className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1">
        {telas.map((tela) => {
          const ativa = tela.chave === atual;
          return (
            <li key={tela.chave}>
              <Link
                href={tela.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-lg px-4 text-sm font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  ativa
                    ? "bg-graf-900 text-white"
                    : "bg-graf-100 text-graf-700 hover:bg-graf-200",
                )}
              >
                {tela.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
