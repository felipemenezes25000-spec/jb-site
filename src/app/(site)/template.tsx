import { BarraWhatsappMovel } from "@/components/site/barra-whatsapp-movel";
import { RevelarNaRolagem } from "@/components/site/revelar-na-rolagem";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { configuracoesPublicas } from "@/lib/site-publico";

/* ============================================================================
   Por página, e não no layout

   A barra do WhatsApp do celular observa os botões grandes da página (a
   abertura, o fechamento) e copia o equipamento da abertura. No layout ela
   montava uma vez só: da home para /autoclave por um link interno, seguia
   olhando para botões que já tinham saído da tela e mandando a mensagem
   genérica. O `template` remonta a cada navegação, e a barra junto.

   Pelo mesmo motivo mora aqui a revelação de reserva (`RevelarNaRolagem`),
   que precisa achar os blocos da página nova a cada navegação.
   ============================================================================ */

export default async function SiteTemplate({ children }: { children: React.ReactNode }) {
  const s = await configuracoesPublicas();

  return (
    <>
      {children}
      <BarraWhatsappMovel contatos={contatosWhatsapp(s)} />
      <RevelarNaRolagem />
    </>
  );
}
