"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { Botao } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * Tela de erro do site.
 *
 * Fronteira de erro do App Router: precisa ser Client Component e recebe a
 * função de nova tentativa. `retry` é a forma estável desta versão do Next
 * (16.3) e `reset` continua chegando por compatibilidade; as duas entram como
 * opcionais, e ainda sobra o recarregamento manual como último recurso.
 *
 * O contato vem de `CONTATO_DE_EMERGENCIA`, repetido no código de propósito:
 * esta tela aparece justamente quando algo quebrou, talvez o banco, e não pode
 * depender dele para mostrar o WhatsApp.
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

  const tentarDeNovo = retry ?? reset;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-graf-50 to-white">
      <header className="container-jb py-6">
        <Link
          href="/"
          aria-label="JB Soluções Odontológicas, página inicial"
          className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={40} />
        </Link>
      </header>

      <main className="container-estreito flex flex-1 flex-col justify-center pb-20 pt-6">
        <p className="label-mono font-bold text-jb-600">Erro inesperado</p>
        <h1 className="text-display texto-forte mt-3 max-w-2xl text-balance">
          Não conseguimos abrir esta página agora.
        </h1>
        <p className="texto-guia mt-5 max-w-xl text-graf-600">
          Tente de novo. Se o seu equipamento precisa de assistência, a equipe responde pelo
          WhatsApp mesmo com o site fora do ar.
        </p>

        <OpcoesWhatsapp
          contatos={[...CONTATO_DE_EMERGENCIA.contatos]}
          mensagem="Olá, JB! Vim pelo site e preciso de assistência técnica para um equipamento odontológico."
          posicao="erro"
          className="mt-8"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Botao
            variante="secundario"
            tamanho="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              if (tentarDeNovo) tentarDeNovo();
              else window.location.reload();
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            Tentar de novo
          </Botao>
        </div>

        {error.digest ? (
          <p className="label-mono mt-10 text-graf-500">Código do erro: {error.digest}</p>
        ) : null}
      </main>
    </div>
  );
}
