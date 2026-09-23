import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { Logo } from "@/components/ui/logo";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { configuracoesPublicas } from "@/lib/site-publico";

/** Página não encontrada: continua orientada à assistência, não a um beco sem saída. */
export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default async function NaoEncontrado() {
  const s = await configuracoesPublicas();

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#f7f8f9] text-graf-950">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-48 size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.16),transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(17_19_21/0.06),transparent)]"
      />

      <header className="container-jb relative z-[1] py-5 sm:py-6">
        <Link
          href="/"
          aria-label={`${s.empresa_nome}, página inicial`}
          className="inline-flex rounded-xl border border-white/80 bg-white/90 p-2 shadow-[0_20px_50px_-38px_rgb(17_19_21/0.55)] backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={36} prioridade />
        </Link>
      </header>

      <main className="container-jb relative z-[1] grid flex-1 items-center gap-8 pb-20 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:gap-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-jb-100 bg-white/80 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700 shadow-xs backdrop-blur">
            <Wrench className="size-4" aria-hidden />
            Assistência técnica continua aqui
          </div>
          <h1 className="texto-forte mt-5 text-balance font-display text-[clamp(3rem,8vw,6.4rem)] leading-[0.93] tracking-[-0.06em]">
            O link parou. <span className="text-jb-600">A JB não.</span>
          </h1>
          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            Essa página não existe mais ou o endereço foi digitado errado. Se o que parou foi um
            equipamento, você ainda pode falar direto com a equipe técnica no WhatsApp.
          </p>

          <OpcoesWhatsapp
            contatos={contatosWhatsapp(s)}
            mensagem={MENSAGEM_PADRAO}
            posicao="secao"
            className="mt-8"
          />

          <Link
            href="/"
            className="foco-jb mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-base font-bold text-graf-700 underline-offset-4 hover:text-jb-700 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para a página inicial
          </Link>
        </div>

        <div className="relative hidden min-h-[26rem] overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-[0_44px_110px_-62px_rgb(17_19_21/0.6)] backdrop-blur lg:block">
          <span className="absolute inset-0 bg-[linear-gradient(to_right,rgb(17_19_21/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(17_19_21/0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
          <span className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-jb-100 bg-jb-50 shadow-[0_0_0_3rem_rgb(224_20_27/0.025),0_0_0_6rem_rgb(224_20_27/0.012)]" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[8rem] font-extrabold tracking-[-0.08em] text-jb-600">
            404
          </span>
          <p className="absolute inset-x-6 bottom-7 text-center text-sm font-bold text-graf-600">
            Página não encontrada · atendimento disponível pelos canais da JB
          </p>
        </div>
      </main>
    </div>
  );
}
