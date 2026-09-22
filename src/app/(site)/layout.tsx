import { BarraWhatsappMovel } from "@/components/site/barra-whatsapp-movel";
import { CabecalhoSite, type AtalhoDoCabecalho } from "@/components/site/cabecalho-site";
import { RodapeSite } from "@/components/site/rodape-site";
import { configuracoesPublicas } from "@/lib/site-publico";

import "./site.css";

/* ============================================================================
   Casca do site de assistência

   Cabeçalho de uma linha com o WhatsApp sempre à mão, conteúdo e rodapé com
   todos os canais. Substitui a casca da loja (busca, carrinho, categorias,
   comparador) nas páginas que sobrevivem à saída do comércio.
   ============================================================================ */

const ATALHOS: AtalhoDoCabecalho[] = [
  { rotulo: "Equipamentos", href: "/#equipamentos" },
  { rotulo: "Como funciona", href: "/#como-funciona" },
  { rotulo: "Autorizada EVOXX", href: "/#autorizada" },
  { rotulo: "Dúvidas", href: "/#duvidas" },
  { rotulo: "Contato", href: "/#contato" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await configuracoesPublicas();

  return (
    <div data-jb-site="assistencia" className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-graf-900 focus:shadow-pop"
      >
        Pular para o conteúdo
      </a>
      <CabecalhoSite whatsapp={s.whatsapp} telefone={s.telefone} atalhos={ATALHOS} />
      <main id="conteudo" className="flex-1 scroll-mt-20">
        {children}
      </main>
      <RodapeSite s={s} />
      <BarraWhatsappMovel whatsapp={s.whatsapp} telefone={s.telefone} />
    </div>
  );
}
