import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { saudarPeloNome, type ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { cn } from "@/lib/utils";

/* ============================================================================
   Com quem falar: Jeferson ou Jackson

   Onde a página pede a decisão (a abertura e a chamada final), a escolha é
   só esta: um botão por pessoa, com o nome de quem atende e nada mais. O
   principal vem primeiro e em vermelho; o segundo, em branco, ao lado.
   Nenhum botão genérico repetindo o principal, nenhum número por extenso.

   Cada botão abre o WhatsApp daquela pessoa com a mensagem pronta e a
   saudação no nome dela. O principal mede como `abertura`/`fechamento`, que
   é o que a barra do celular observa e de onde ela copia a mensagem; o
   segundo mede como `abertura-segundo`/`fechamento-segundo`.
   ============================================================================ */

export function OpcoesWhatsapp({
  contatos,
  mensagem,
  equipamento,
  onde,
  pulso,
  className,
  style,
}: {
  contatos: ContatoWhatsapp[];
  mensagem: string;
  equipamento?: string;
  onde: "abertura" | "fechamento";
  /** Anel que pulsa em volta do principal, para a chamada final. */
  pulso?: boolean;
  className?: string;
  /** Para o `--i` do `.jb-revela`, que escalona a entrada. */
  style?: React.CSSProperties;
}) {
  if (contatos.length === 0) return null;

  return (
    <ul className={cn("flex flex-col gap-3 sm:flex-row", className)} style={style}>
      {contatos.map(({ numero, nome }, i) => (
        <li key={numero} className="relative">
          {pulso && i === 0 ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg bg-jb-500/35 motion-safe:animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
          ) : null}
          <BotaoWhatsapp
            numero={numero}
            mensagem={saudarPeloNome(mensagem, nome)}
            equipamento={equipamento}
            posicao={i === 0 ? onde : (`${onde}-segundo` as const)}
            variante={i === 0 ? "primario" : "secundario"}
            tamanho="lg"
            larguraTotal
            className={cn("relative sm:w-auto sm:min-w-44", pulso && i === 0 && "shadow-raised")}
          >
            {nome ? (
              <>
                <span className="sr-only">WhatsApp: </span>
                {nome}
              </>
            ) : (
              "Chamar no WhatsApp"
            )}
          </BotaoWhatsapp>
        </li>
      ))}
    </ul>
  );
}
