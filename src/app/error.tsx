"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Headset, LayoutGrid, MessageCircle, Phone, RotateCcw } from "lucide-react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { BuscaHero } from "@/components/loja/busca-hero";
import { Botao } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { telHref, whatsappHref } from "@/lib/format";

/**
 * Tela de erro do site.
 *
 * Fronteira de erro do App Router: precisa ser Client Component e recebe a
 * função de nova tentativa. `retry` é a forma estável desta versão do Next
 * (16.3) e `reset` continua chegando por compatibilidade — as duas entram
 * como opcionais para que a tela funcione com qualquer uma, e ainda sobra o
 * recarregamento manual como último recurso.
 *
 * Nada aqui consulta o banco: se a falha for justamente no banco, a tela de
 * erro não pode falhar junto. Os contatos vêm de uma constante local.
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
  const whatsapp = whatsappHref(
    CONTATO_DE_EMERGENCIA.whatsapp,
    "Olá! Tive um erro no site da JB.",
  );

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-graf-50 to-white">
      <header className="container-jb py-6">
        <Link href="/" aria-label="JB Soluções Odontológicas — página inicial" className="inline-flex">
          <Logo altura={40} />
        </Link>
      </header>

      <main className="container-jb flex-1 pb-16 pt-6 lg:pt-10">
        <p className="label-mono text-jb-600">Erro inesperado</p>
        <h1 className="mt-3 max-w-2xl text-display leading-tight">
          Alguma coisa quebrou do nosso lado.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-graf-600">
          A falha foi registrada e a equipe técnica consegue investigar pelo código abaixo.
          Nenhum pedido, chamado ou dado seu foi perdido por causa desta tela.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Botao
            tamanho="lg"
            onClick={() => {
              if (tentarDeNovo) tentarDeNovo();
              else window.location.reload();
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            Tentar de novo
          </Botao>

          <Link
            href="/"
            className="inline-flex h-13 items-center justify-center rounded-lg border border-graf-300 bg-white px-7 text-base font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50"
          >
            Ir para a página inicial
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-6 text-sm text-graf-500">
            Código da ocorrência:{" "}
            <span className="label-mono rounded bg-graf-100 px-2 py-1 text-graf-700">
              {error.digest}
            </span>
          </p>
        ) : null}

        <div className="mt-10 max-w-xl">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-graf-500">
            Ou procure direto no catálogo
          </h2>
          <BuscaHero />
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/loja"
            className="flex flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised"
          >
            <LayoutGrid className="size-5 text-jb-600" aria-hidden />
            <span className="mt-3 text-base font-bold text-graf-950">Ver o catálogo</span>
            <span className="mt-1 text-sm text-graf-600">
              Equipamentos, seminovos, peças e acessórios.
            </span>
          </Link>

          <Link
            href="/assistencia-tecnica/solicitar"
            className="flex flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised"
          >
            <Headset className="size-5 text-jb-600" aria-hidden />
            <span className="mt-3 text-base font-bold text-graf-950">Solicitar assistência</span>
            <span className="mt-1 text-sm text-graf-600">
              Equipamento parado não espera o site voltar.
            </span>
          </Link>

          <div className="flex flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card">
            <Phone className="size-5 text-jb-600" aria-hidden />
            <span className="mt-3 text-base font-bold text-graf-950">Falar agora</span>
            <a
              href={telHref(CONTATO_DE_EMERGENCIA.telefone)}
              className="mt-2 inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-jb-700 underline underline-offset-4 hover:text-jb-500"
            >
              {CONTATO_DE_EMERGENCIA.telefone}
            </a>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-graf-700 hover:text-jb-700"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp {CONTATO_DE_EMERGENCIA.whatsapp}
              </a>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
