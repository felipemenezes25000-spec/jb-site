"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ConteudoErro } from "@/components/loja/pagina-erro";
import { Logo } from "@/components/ui/logo";

/**
 * Tela de erro de fora dos grupos de rota.
 *
 * A loja tem a própria fronteira em `(loja)/error.tsx`, que entra dentro do
 * cabeçalho e do rodapé já montados; o painel tem a dele em `(admin)`. Esta
 * aqui é a rede que sobra, e por isso traz a própria marca.
 *
 * Fronteira de erro do App Router: precisa ser Client Component e recebe a
 * função de nova tentativa. `retry` é a forma estável desta versão do Next
 * (16.3) e `reset` continua chegando por compatibilidade — as duas entram
 * como opcionais para que a tela funcione com qualquer uma, e ainda sobra o
 * recarregamento manual como último recurso.
 */
export default function ErroDoSite({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    // O digest é o que liga esta tela ao registro do servidor.
    console.error("Falha ao renderizar a página", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-graf-50 to-white">
      <header className="container-jb py-6">
        <Link
          href="/"
          aria-label="JB Soluções Odontológicas — página inicial"
          className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={40} />
        </Link>
      </header>

      <main className="container-jb flex-1 pb-16 pt-6 lg:pt-10">
        <ConteudoErro digest={error.digest} tentarDeNovo={retry ?? reset} />
      </main>
    </div>
  );
}
