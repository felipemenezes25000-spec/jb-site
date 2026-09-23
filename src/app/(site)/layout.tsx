import { CabecalhoSite, type AtalhoDoCabecalho } from "@/components/site/cabecalho-site";
import { FaixaTopo } from "@/components/site/faixa-topo";
import { RodapeSite } from "@/components/site/rodape-site";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { configuracoesPublicas } from "@/lib/site-publico";

import "./site.css";
import "./premium.css";
import "./ultra-premium.css";
import "./sections-premium.css";
import "./conversion-panels.css";

/* ============================================================================
   Casca do site de assistência

   Cabeçalho de uma linha com Jeferson e Jackson sempre à mão, conteúdo e rodapé com
   todos os canais. Substitui a casca da loja (busca, carrinho, categorias,
   comparador) nas páginas que sobrevivem à saída do comércio.
   ============================================================================ */

const ATALHOS: AtalhoDoCabecalho[] = [
  { rotulo: "Equipamentos", href: "/#equipamentos" },
  { rotulo: "Como funciona", href: "/#como-funciona" },
  { rotulo: "Todas as marcas", href: "/#autorizada" },
  { rotulo: "Dúvidas", href: "/#duvidas" },
  { rotulo: "Contato", href: "/#contato" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await configuracoesPublicas();
  const contatos = contatosWhatsapp(s);

  return (
    <div data-jb-site="assistencia" className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-graf-900 focus:shadow-pop"
      >
        Pular para o conteúdo
      </a>
      <FaixaTopo contatos={contatos} desde={s.empresa_desde} cidade={s.endereco_cidade} />
      <CabecalhoSite contatos={contatos} atalhos={ATALHOS} />
      <main id="conteudo" className="flex-1 scroll-mt-20">
        {children}
      </main>
      <RodapeSite s={s} />
    </div>
  );
}
