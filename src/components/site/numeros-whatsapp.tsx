import { LinkWhatsapp, type PosicaoWhatsapp } from "@/components/site/botao-whatsapp";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { saudarPeloNome, type ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { formatarTelefone } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Os WhatsApps da JB, com nome e número

   O botão grande manda a mensagem pronta para o WhatsApp principal, e é ele
   que concentra a conversa e a conta do anúncio. Esta linha fica logo abaixo
   dele e mostra quem atende em cada número: quem chegou do anúncio vê que há
   uma pessoa de verdade do outro lado, escolhe com quem falar, e tem para
   onde ir se o primeiro estiver ocupado.

   Cada contato é um link próprio para o wa.me, com a mesma mensagem do botão
   e a saudação trocada para o nome de quem atende. Número vazio, inválido ou
   repetido sai da lista; sem nome, fica só o número. Cada link leva
   `data-whatsapp` e conta como qualquer outro.
   ============================================================================ */

export function NumerosWhatsapp({
  contatos,
  mensagem,
  equipamento,
  posicao,
  centralizado,
  className,
  style,
}: {
  contatos: ContatoWhatsapp[];
  mensagem: string;
  equipamento?: string;
  posicao: PosicaoWhatsapp;
  centralizado?: boolean;
  className?: string;
  /** Para o `--i` do `.jb-revela`, que escalona a entrada. */
  style?: React.CSSProperties;
}) {
  if (contatos.length === 0) return null;
  const comNome = contatos.some((contato) => contato.nome);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3",
        centralizado && "items-center sm:justify-center",
        className,
      )}
      style={style}
    >
      <p className="text-sm font-semibold text-graf-500">
        {comNome ? "Ou fale direto com:" : "Ou chame direto:"}
      </p>
      <ul
        className={cn(
          "grid gap-2 sm:flex",
          contatos.length > 1 ? "grid-cols-2" : "grid-cols-1",
          centralizado && "w-full sm:w-auto",
        )}
      >
        {contatos.map(({ numero, nome }) => (
          <li key={numero}>
            <LinkWhatsapp
              numero={numero}
              mensagem={saudarPeloNome(mensagem, nome)}
              equipamento={equipamento}
              posicao={posicao}
              className="foco-jb group flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-graf-200 bg-white px-3 py-2 text-left transition-colors hover:border-jb-300 sm:pr-4"
            >
              <MarcaWhatsapp className="size-5 shrink-0 text-jb-600" />
              <span className="min-w-0 leading-tight">
                <span className="sr-only">WhatsApp: </span>
                {nome ? (
                  <span className="block text-sm font-bold text-graf-900 transition-colors group-hover:text-jb-700">
                    {nome}
                  </span>
                ) : null}{" "}
                <span
                  className={cn(
                    "tabular block whitespace-nowrap",
                    nome
                      ? "mt-0.5 text-xs font-semibold text-graf-600"
                      : "text-sm font-bold text-graf-900 transition-colors group-hover:text-jb-700",
                  )}
                >
                  {formatarTelefone(numero)}
                </span>
              </span>
            </LinkWhatsapp>
          </li>
        ))}
      </ul>
    </div>
  );
}
