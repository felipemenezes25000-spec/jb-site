import Link from "next/link";
import { Phone } from "lucide-react";

import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { Logo } from "@/components/ui/logo";
import { formatarTelefone, telHref } from "@/lib/format";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";

/* ============================================================================
   Cabeçalho do site de assistência

   Uma linha só: marca, atalhos da página e o botão do WhatsApp, que fica
   grudado no topo durante toda a rolagem. No celular sobram a marca e o
   botão; o menu vira desnecessário numa página que é uma coisa só.

   Não há busca, carrinho, conta nem barra de categorias. O site deixou de
   vender, e cada um desses itens era uma porta para fora do caminho que
   importa: chamar a equipe.
   ============================================================================ */

export type AtalhoDoCabecalho = { rotulo: string; href: string };

export function CabecalhoSite({
  whatsapp,
  telefone,
  atalhos,
}: {
  whatsapp: string;
  telefone: string;
  atalhos: AtalhoDoCabecalho[];
}) {
  const ligar = telHref(telefone);

  return (
    <header className="sticky top-0 z-40 border-b border-graf-200/80 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80">
      <div className="container-jb flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Link href="/" className="foco-jb shrink-0 rounded-md" aria-label="JB Soluções Odontológicas, início">
          <Logo altura={34} prioridade />
        </Link>

        {atalhos.length > 0 ? (
          <nav aria-label="Nesta página" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {atalhos.map((atalho) => (
                <li key={atalho.href}>
                  <a
                    href={atalho.href}
                    className="foco-jb rounded-lg px-3 py-2 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-50 hover:text-jb-700"
                  >
                    {atalho.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {ligar ? (
            <a
              href={ligar}
              className="foco-jb hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-graf-800 transition-colors hover:bg-graf-50 hover:text-jb-700 xl:inline-flex"
            >
              <Phone className="size-4 text-jb-600" aria-hidden />
              <span className="tabular">{formatarTelefone(telefone)}</span>
            </a>
          ) : null}
          <BotaoWhatsapp
            numero={whatsapp}
            mensagem={MENSAGEM_PADRAO}
            posicao="cabecalho"
            tamanho="sm"
          >
            <span className="sm:hidden">WhatsApp</span>
            <span className="hidden sm:inline">Chamar no WhatsApp</span>
          </BotaoWhatsapp>
        </div>
      </div>
    </header>
  );
}
