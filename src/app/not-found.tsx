import type { Metadata } from "next";
import Link from "next/link";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { Logo } from "@/components/ui/logo";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { configuracoesPublicas } from "@/lib/site-publico";

/**
 * Página não encontrada.
 *
 * Quem cai aqui quase sempre veio de um link antigo, e a saída que interessa é
 * a mesma de todo o site: falar com a equipe. As URLs da loja nem chegam a
 * esta página; elas respondem 410 no `src/proxy.ts`.
 *
 * `configuracoesPublicas` já é cacheada e volta aos padrões da JB quando o
 * banco não responde: a página de erro não pode cair junto com ele.
 */

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default async function NaoEncontrado() {
  const s = await configuracoesPublicas();

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-graf-50 to-white">
      <header className="container-jb py-6">
        <Link
          href="/"
          aria-label={`${s.empresa_nome}, página inicial`}
          className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={40} prioridade />
        </Link>
      </header>

      <main className="container-estreito flex flex-1 flex-col justify-center pb-20 pt-6">
        <p className="label-mono font-bold text-jb-600">Erro 404</p>
        <h1 className="text-display texto-forte mt-3 max-w-2xl text-balance">
          Essa página não existe mais.
        </h1>
        <p className="texto-guia mt-5 max-w-xl text-graf-600">
          O link pode estar antigo ou ter sido digitado errado. Se o seu equipamento precisa de
          assistência, a equipe técnica responde pelo WhatsApp.
        </p>
        <OpcoesWhatsapp
          contatos={contatosWhatsapp(s)}
          mensagem={MENSAGEM_PADRAO}
          posicao="secao"
          className="mt-8"
        />
        <Link
          href="/"
          className="foco-jb mt-5 inline-flex min-h-11 items-center self-start rounded-md text-base font-semibold text-graf-700 underline-offset-4 hover:text-jb-700 hover:underline"
        >
          Ir para a página inicial
        </Link>
      </main>
    </div>
  );
}
