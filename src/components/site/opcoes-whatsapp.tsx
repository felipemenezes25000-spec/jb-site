import { BotaoWhatsapp, type PosicaoBase } from "@/components/site/botao-whatsapp";
import type { Tamanho } from "@/components/ui/button";
import { saudarPeloNome, type ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { cn } from "@/lib/utils";

/* ============================================================================
   Jeferson e Jackson, sempre os dois

   Todo lugar do site que abre o WhatsApp oferece a mesma escolha: um botão
   por pessoa, com o nome de quem atende e nada mais. O principal vem
   primeiro e em vermelho; o segundo, em branco, ao lado. Nenhum botão
   genérico, nenhum número por extenso.

   Cada botão abre o WhatsApp daquela pessoa com a mensagem pronta e a
   saudação no nome dela. O principal mede com a posição dada (`abertura`,
   `diagnostico`…), que é o que a barra do celular observa; o segundo, com a
   mesma posição e `-segundo`.
   ============================================================================ */

export function OpcoesWhatsapp({
  contatos,
  mensagem,
  equipamento,
  posicao,
  tamanho = "lg",
  lado,
  coluna,
  pulso,
  classeDoPrincipal,
  className,
  style,
}: {
  contatos: ContatoWhatsapp[];
  mensagem: string;
  equipamento?: string;
  posicao: PosicaoBase;
  tamanho?: Tamanho;
  /** Os dois sempre lado a lado, em colunas iguais: barra do celular, cabeçalho, cartões estreitos. */
  lado?: boolean;
  /** Os dois sempre um embaixo do outro, na largura toda: cartões estreitos. */
  coluna?: boolean;
  /** Anel que pulsa em volta do principal; um número limita as repetições. */
  pulso?: boolean | number;
  /** Classe só do botão principal (o pulso da barra do celular, por exemplo). */
  classeDoPrincipal?: string;
  className?: string;
  /** Para o `--i` do `.jb-revela`, que escalona a entrada. */
  style?: React.CSSProperties;
}) {
  if (contatos.length === 0) return null;

  return (
    <ul
      className={cn(
        lado
          ? cn("grid gap-2", contatos.length > 1 ? "grid-cols-2" : "grid-cols-1")
          : coluna
            ? "flex flex-col gap-2"
            : "flex flex-col gap-3 sm:flex-row",
        className,
      )}
      style={style}
    >
      {contatos.map(({ numero, nome }, i) => (
        <li key={numero} className="relative">
          {pulso && i === 0 ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg bg-jb-500/35 motion-safe:animate-ping"
              style={{
                animationDuration: "2.4s",
                animationIterationCount: typeof pulso === "number" ? pulso : undefined,
              }}
            />
          ) : null}
          <BotaoWhatsapp
            numero={numero}
            mensagem={saudarPeloNome(mensagem, nome)}
            equipamento={equipamento}
            posicao={i === 0 ? posicao : (`${posicao}-segundo` as const)}
            variante={i === 0 ? "primario" : "secundario"}
            tamanho={tamanho}
            larguraTotal
            className={cn(
              "relative",
              lado || coluna ? "px-3" : tamanho === "lg" ? "sm:w-auto sm:min-w-44" : "sm:w-auto sm:min-w-32",
              i === 0 && classeDoPrincipal,
            )}
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
