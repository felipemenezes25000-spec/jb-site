import { Medicao } from "@/components/analytics/medicao";
import { CabecalhoSite, type AtalhoDoCabecalho } from "@/components/site/cabecalho-site";
import { FaixaTopo } from "@/components/site/faixa-topo";
import { RodapeSite } from "@/components/site/rodape-site";
import { destinosDeMedicao } from "@/lib/analytics/destinos";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { configuracoesPublicas } from "@/lib/site-publico";

import "./site.css";
import "./premium.css";
import "./ultra-premium.css";
import "./sections-premium.css";
import "./conversion-panels.css";
import "./ad-landing.css";
import "./mobile-excellence.css";
import "./desktop-excellence.css";
import "./institutional-premium.css";
import "./content-premium.css";
import "./consent-premium.css";
import "./final-polish.css";

/* ============================================================================
   Casca do site de assistência

   O site público tem a própria coreografia (`jb-revela` + fallback por
   IntersectionObserver), então a raiz entra em `data-motion-ignore` para o
   Motion System do admin não tentar animar as mesmas seções.

   Analytics e consentimento também moram aqui: o painel administrativo não é
   tráfego de campanha e não precisa carregar pixel, GA ou aviso de medição.
   Como este layout já busca as configurações públicas para contato e empresa,
   os destinos são derivados da mesma leitura em vez de consultar tudo de novo.
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
  const destinos = destinosDeMedicao(s);

  return (
    <div data-jb-site="assistencia" data-motion-ignore className="flex min-h-dvh flex-col">
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
      <Medicao destinos={destinos} />
    </div>
  );
}
