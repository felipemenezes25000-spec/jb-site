import Link from "next/link";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { Logo } from "@/components/ui/logo";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";

/* ============================================================================
   Cabeçalho do site de assistência

   Uma linha só: marca, atalhos da página e o WhatsApp do Jeferson e do
   Jackson, que ficam grudados no topo durante toda a rolagem. No celular
   sobram a marca e os dois botões; o menu vira desnecessário numa página que
   é uma coisa só.

   Não há busca, carrinho, conta nem barra de categorias. O site deixou de
   vender, e cada um desses itens era uma porta para fora do caminho que
   importa: chamar a equipe.
   ============================================================================ */

export type AtalhoDoCabecalho = { rotulo: string; href: string };

export function CabecalhoSite({
  contatos,
  atalhos,
}: {
  contatos: ContatoWhatsapp[];
  atalhos: AtalhoDoCabecalho[];
}) {
  return (
    <header className="jb-cabecalho sticky top-0 z-40 border-b border-graf-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="container-jb flex h-16 items-center justify-between gap-3 lg:h-[4.5rem] lg:gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="jb-logo-stage foco-jb shrink-0 rounded-lg"
            aria-label="JB Soluções Odontológicas, início"
          >
            <Logo altura={34} prioridade />
          </Link>
          <span className="hidden items-center gap-2 rounded-full border border-graf-200 bg-white/75 px-3 py-1.5 text-xs font-bold text-graf-700 shadow-card xl:inline-flex">
            <span className="size-2 rounded-full bg-ok-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]" aria-hidden />
            Assistência técnica odontológica
          </span>
        </div>

        {atalhos.length > 0 ? (
          <nav aria-label="Nesta página" className="hidden lg:block">
            <ul className="flex items-center gap-0.5">
              {atalhos.map((atalho) => (
                <li key={atalho.href}>
                  <a
                    href={atalho.href}
                    className="foco-jb rounded-lg px-3 py-2 text-sm font-semibold text-graf-700 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-graf-50 hover:text-jb-700"
                  >
                    {atalho.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={MENSAGEM_PADRAO}
          posicao="cabecalho"
          tamanho="sm"
          lado
          className="jb-cabecalho-whatsapp shrink-0"
        />
      </div>
      <span className="jb-leitura" aria-hidden />
    </header>
  );
}
