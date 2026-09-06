"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Busca grande — hero da home, página 404 e página de erro.
 *
 * Mesma linguagem do campo do cabeçalho, um degrau maior: caixa de 56px no
 * celular e 64px no desktop, botão de enviar dentro dela e foco marcado por
 * borda e anel ao mesmo tempo.
 *
 * O botão é grafite de propósito. Nesta altura da página o vermelho já está
 * reservado para a ação principal (comprar, solicitar assistência) — dois
 * botões vermelhos lado a lado apagariam a hierarquia.
 *
 * O trabalho é do servidor: aqui só se monta a URL de /busca.
 */
export function BuscaHero({
  placeholder = "Busque equipamento, marca ou modelo",
  rotulo = "Buscar no catálogo",
}: {
  placeholder?: string;
  rotulo?: string;
}) {
  const router = useRouter();
  const id = useId();

  return (
    <form
      role="search"
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        const termo = String(dados.get("q") ?? "").trim();
        router.push(termo ? `/busca?q=${encodeURIComponent(termo)}` : "/loja");
      }}
    >
      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>

      <div className="flex h-14 w-full items-center rounded-xl border border-graf-450 bg-white transition-colors hover:border-graf-500 focus-within:border-jb-500 focus-within:ring-4 focus-within:ring-jb-500/15 sm:h-16">
        <Search className="ml-3.5 size-5 shrink-0 text-graf-500 sm:ml-5" aria-hidden />
        <input
          id={id}
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-graf-900 outline-none placeholder:text-graf-500 sm:px-4 sm:text-[1.0625rem]"
        />
        {/* o botão encolhe o padding no celular para sobrar largura de digitação */}
        <button
          type="submit"
          className="mr-1.5 flex h-11 shrink-0 items-center rounded-lg bg-graf-900 px-4 text-[0.9375rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-graf-800 active:translate-y-px active:bg-graf-950 sm:mr-2 sm:h-12 sm:px-6"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
