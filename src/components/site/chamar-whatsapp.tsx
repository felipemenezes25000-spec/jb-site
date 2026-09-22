import { BotaoWhatsapp, type PosicaoWhatsapp } from "@/components/site/botao-whatsapp";
import type { Tamanho, Variante } from "@/components/ui/button";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { configuracoesPublicas } from "@/lib/site-publico";

/**
 * Botão de WhatsApp para páginas de servidor.
 *
 * Lê o número das configurações públicas (cacheadas, com volta aos padrões
 * da JB sem banco), para cada página não precisar repetir a busca só para
 * desenhar um botão.
 */
export async function ChamarWhatsapp({
  posicao = "secao",
  mensagem = MENSAGEM_PADRAO,
  tamanho = "md",
  variante = "primario",
  className,
  children,
}: {
  posicao?: PosicaoWhatsapp;
  mensagem?: string;
  tamanho?: Tamanho;
  variante?: Variante;
  className?: string;
  children?: React.ReactNode;
}) {
  const s = await configuracoesPublicas();
  return (
    <BotaoWhatsapp
      numero={s.whatsapp}
      mensagem={mensagem}
      posicao={posicao}
      tamanho={tamanho}
      variante={variante}
      className={className}
    >
      {children}
    </BotaoWhatsapp>
  );
}
