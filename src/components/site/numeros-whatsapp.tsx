import { LinkWhatsapp, type PosicaoWhatsapp } from "@/components/site/botao-whatsapp";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { formatarTelefone, somenteDigitos, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Os WhatsApps da JB, com o número por escrito

   O botão grande manda a mensagem pronta para o WhatsApp principal, e é ele
   que concentra a conversa e a conta do anúncio. Esta linha fica logo abaixo
   dele e mostra os dois números, cada um um link próprio para o wa.me com a
   mesma mensagem: quem chegou do anúncio vê que há gente de verdade do outro
   lado, pode salvar o contato, e tem para onde ir se o primeiro estiver
   ocupado.

   Número vazio, inválido ou repetido sai da lista; com um só configurado,
   fica um só. Cada link leva `data-whatsapp` e conta como qualquer outro.
   ============================================================================ */

/** Os números que viram link, na ordem dada, sem vazio, inválido ou repetido. */
export function whatsappsDistintos(numeros: string[]): string[] {
  const vistos = new Set<string>();
  return numeros.filter((numero) => {
    const digitos = somenteDigitos(numero);
    if (!whatsappHref(numero) || vistos.has(digitos)) return false;
    vistos.add(digitos);
    return true;
  });
}

export function NumerosWhatsapp({
  numeros,
  mensagem,
  equipamento,
  posicao,
  centralizado,
  className,
  style,
}: {
  numeros: string[];
  mensagem: string;
  equipamento?: string;
  posicao: PosicaoWhatsapp;
  centralizado?: boolean;
  className?: string;
  /** Para o `--i` do `.jb-revela`, que escalona a entrada. */
  style?: React.CSSProperties;
}) {
  const validos = whatsappsDistintos(numeros);
  if (validos.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3",
        centralizado && "items-center sm:justify-center",
        className,
      )}
      style={style}
    >
      <p className="text-sm font-semibold text-graf-500">Ou chame direto:</p>
      <ul
        className={cn(
          "grid gap-2 sm:flex",
          validos.length > 1 ? "grid-cols-2" : "grid-cols-1",
          centralizado && "w-full sm:w-auto",
        )}
      >
        {validos.map((numero) => (
          <li key={numero}>
            <LinkWhatsapp
              numero={numero}
              mensagem={mensagem}
              equipamento={equipamento}
              posicao={posicao}
              rotulo={`Chamar no WhatsApp ${formatarTelefone(numero)}`}
              className="foco-jb flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-graf-200 bg-white px-3 text-sm font-bold text-graf-900 transition-colors hover:border-jb-300 hover:text-jb-700"
            >
              <MarcaWhatsapp className="size-4 shrink-0 text-jb-600" />
              <span className="tabular">{formatarTelefone(numero)}</span>
            </LinkWhatsapp>
          </li>
        ))}
      </ul>
    </div>
  );
}
