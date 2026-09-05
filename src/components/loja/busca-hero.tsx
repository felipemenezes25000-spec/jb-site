"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Botao } from "@/components/ui/button";

/** Busca principal do hero. Envia para /busca, que faz o trabalho no servidor. */
export function BuscaHero() {
  const router = useRouter();

  return (
    <form
      role="search"
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        const termo = String(dados.get("q") ?? "").trim();
        router.push(termo ? `/busca?q=${encodeURIComponent(termo)}` : "/loja");
      }}
      className="flex gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-graf-500"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          placeholder="Busque equipamento, marca, modelo ou peça"
          aria-label="Buscar no catálogo"
          className="h-13 w-full rounded-lg border border-graf-300 bg-white pl-11 pr-4 text-[0.9375rem] shadow-xs transition-colors placeholder:text-graf-500 hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
        />
      </div>
      <Botao type="submit" tamanho="lg" className="shrink-0">
        Buscar
      </Botao>
    </form>
  );
}
