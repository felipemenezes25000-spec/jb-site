import type { PosicaoBase } from "@/components/site/botao-whatsapp";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { Tamanho } from "@/components/ui/button";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { configuracoesPublicas } from "@/lib/site-publico";

/**
 * Jeferson e Jackson para páginas de servidor.
 *
 * Lê os dois WhatsApps das configurações públicas (cacheadas, com volta aos
 * padrões da JB sem banco), para cada página não precisar repetir a busca só
 * para desenhar os botões.
 */
export async function ChamarWhatsapp({
  posicao = "secao",
  mensagem = MENSAGEM_PADRAO,
  tamanho = "md",
  className,
}: {
  posicao?: PosicaoBase;
  mensagem?: string;
  tamanho?: Tamanho;
  className?: string;
}) {
  const s = await configuracoesPublicas();
  return (
    <OpcoesWhatsapp
      contatos={contatosWhatsapp(s)}
      mensagem={mensagem}
      posicao={posicao}
      tamanho={tamanho}
      className={className}
    />
  );
}
