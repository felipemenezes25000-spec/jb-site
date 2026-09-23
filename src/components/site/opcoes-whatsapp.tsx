import { BotaoWhatsapp, type PosicaoBase } from "@/components/site/botao-whatsapp";
import type { Tamanho } from "@/components/ui/button";
import { saudarPeloNome, type ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { cn } from "@/lib/utils";

/* ============================================================================
   Jeferson e Jackson, sempre os dois

   No mobile a escolha padrão fica em duas colunas: reduz altura, deixa claro
   que existem dois atendentes e mantém ambos com o mesmo alcance do polegar.
   Cartões realmente estreitos ainda podem pedir `coluna` explicitamente.
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
  /** Os dois sempre lado a lado, em colunas iguais. */
  lado?: boolean;
  /** Os dois sempre um embaixo do outro, na largura toda: cartões estreitos. */
  coluna?: boolean;
  /** Anel que pulsa em volta do principal; um número limita as repetições. */
  pulso?: boolean | number;
  /** Classe só do botão principal (o pulso da barra do celular, por exemplo). */
  classeDoPrincipal?: string;
  className?: string;
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
            : cn(
                "grid gap-2 sm:flex sm:gap-3",
                contatos.length > 1 ? "grid-cols-2" : "grid-cols-1",
              ),
        className,
      )}
      style={style}
    >
      {contatos.map(({ numero, nome }, i) => (
        <li key={numero} className="relative min-w-0">
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
              "relative min-w-0",
              lado || coluna ? "px-3" : tamanho === "lg" ? "px-3 sm:w-auto sm:min-w-44" : "px-3 sm:w-auto sm:min-w-32",
              i === 0 && classeDoPrincipal,
            )}
          >
            {nome ? (
              <>
                <span className="sr-only">WhatsApp: </span>
                <span className="truncate">{nome}</span>
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
