"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, ShieldAlert, Wrench } from "lucide-react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { Botao } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * Tela de erro do site.
 *
 * Continua autossuficiente o bastante para funcionar mesmo se a leitura do
 * banco falhar: o contato de emergência vem do código, não de configuração
 * remota. O visual segue a mesma linguagem premium do site público.
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
    console.error("Falha ao renderizar a página", error);
  }, [error]);

  const tentarDeNovo = retry ?? reset;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#f7f8f9] text-graf-950">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-44 -top-52 size-[40rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.15),transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-36 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(17_19_21/0.055),transparent)]"
      />

      <header className="container-jb relative z-[1] py-5 sm:py-6">
        <Link
          href="/"
          aria-label="JB Soluções Odontológicas, página inicial"
          className="inline-flex rounded-xl border border-white/80 bg-white/90 p-2 shadow-[0_20px_50px_-38px_rgb(17_19_21/0.55)] backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={36} />
        </Link>
      </header>

      <main className="container-jb relative z-[1] grid flex-1 items-center gap-8 pb-20 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:gap-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-jb-100 bg-white/80 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700 shadow-xs backdrop-blur">
            <ShieldAlert className="size-4" aria-hidden />
            Falha temporária no site
          </div>

          <h1 className="texto-forte mt-5 text-balance font-display text-[clamp(3rem,7vw,5.8rem)] leading-[0.94] tracking-[-0.055em]">
            A página falhou. <span className="text-jb-600">O atendimento continua.</span>
          </h1>
          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            Você pode tentar carregar de novo. Se o seu equipamento precisa de assistência, a
            equipe continua acessível pelo WhatsApp mesmo que esta tela tenha falhado.
          </p>

          <OpcoesWhatsapp
            contatos={[...CONTATO_DE_EMERGENCIA.contatos]}
            mensagem="Olá, JB! Vim pelo site e preciso de assistência técnica para um equipamento odontológico."
            posicao="erro"
            className="mt-8"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
            <p className="label-mono mt-8 text-graf-500">Código do erro: {error.digest}</p>
          ) : null}
        </div>

        <div className="relative hidden min-h-[26rem] overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-[0_44px_110px_-62px_rgb(17_19_21/0.6)] backdrop-blur lg:block">
          <span className="absolute inset-0 bg-[linear-gradient(to_right,rgb(17_19_21/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(17_19_21/0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
          <span className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-jb-100 bg-jb-50 shadow-[0_0_0_3rem_rgb(224_20_27/0.025),0_0_0_6rem_rgb(224_20_27/0.012)]" />
          <span className="absolute left-1/2 top-[43%] flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.8rem] bg-jb-600 text-white shadow-[0_24px_54px_-28px_rgb(224_20_27/0.75)]">
            <Wrench className="size-11" aria-hidden />
          </span>
          <p className="absolute inset-x-8 bottom-12 text-center text-xl font-extrabold tracking-tight text-graf-950">
            Se o equipamento parou, fale direto com a equipe.
          </p>
        </div>
      </main>
    </div>
  );
}
