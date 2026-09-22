import { BarraWhatsappMovel } from "@/components/site/barra-whatsapp-movel";
import { configuracoesPublicas } from "@/lib/site-publico";

/* ============================================================================
   Por página, e não no layout

   A barra do WhatsApp do celular observa os botões grandes da página (a
   abertura, o fechamento) e copia a mensagem da abertura. No layout ela
   montava uma vez só: da home para /autoclave por um link interno, seguia
   olhando para botões que já tinham saído da tela e mandando a mensagem
   genérica. O `template` remonta a cada navegação, e a barra junto.
   ============================================================================ */

export default async function SiteTemplate({ children }: { children: React.ReactNode }) {
  const s = await configuracoesPublicas();

  return (
    <>
      {children}
      <BarraWhatsappMovel whatsapp={s.whatsapp} telefone={s.whatsapp} />
    </>
  );
}
