"use client";

import { medir } from "@/lib/analytics/cliente";
import { whatsappHref } from "@/lib/format";
import { classesBotao, type Tamanho, type Variante } from "@/components/ui/button";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { cn } from "@/lib/utils";

/* ============================================================================
   O botão que abre o WhatsApp

   É um link comum para `wa.me`, com a mensagem pronta na URL. O clique mede
   `whatsapp_click` com a posição do botão, e a medição nunca é condição: sem
   consentimento, com bloqueador ou com o analytics fora do ar, o link abre do
   mesmo jeito. `medir` não lança e não espera nada.

   Clique não é conversa: a pessoa ainda pode desistir dentro do WhatsApp. O
   evento conta intenção, e só isso.

   Número inválido nas configurações não vira link quebrado: o botão some, e o
   telefone continua na página.
   ============================================================================ */

export type PosicaoWhatsapp =
  | "cabecalho"
  | "abertura"
  | "diagnostico"
  | "secao"
  | "fechamento"
  | "rodape"
  | "barra-movel"
  | "faixa-topo";

type Props = {
  numero: string;
  mensagem: string;
  posicao: PosicaoWhatsapp;
  /** Equipamento escolhido no diagnóstico, quando houver. Nunca texto livre. */
  equipamento?: string;
  variante?: Variante;
  tamanho?: Tamanho;
  larguraTotal?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** Rótulo acessível quando o conteúdo visível for só o ícone. */
  rotulo?: string;
};

/**
 * Qualquer superfície que abre o WhatsApp: um bloco de equipamento, um cartão.
 * Mesmas regras do botão (link comum, medição que nunca bloqueia, some com
 * número inválido); só o desenho é de quem chama.
 */
export function LinkWhatsapp({
  numero,
  mensagem,
  posicao,
  equipamento,
  className,
  children,
  rotulo,
}: Omit<Props, "variante" | "tamanho" | "larguraTotal">) {
  const href = whatsappHref(numero, mensagem);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={rotulo}
      data-whatsapp={posicao}
      onClick={() =>
        medir("whatsapp_click", {
          etapa: posicao,
          ...(equipamento ? { categoria: equipamento } : {}),
        })
      }
      className={className}
    >
      {children}
    </a>
  );
}

export function BotaoWhatsapp({
  variante = "primario",
  tamanho = "md",
  larguraTotal,
  className,
  children = "Chamar no WhatsApp",
  ...resto
}: Props) {
  return (
    <LinkWhatsapp
      {...resto}
      className={classesBotao(
        variante,
        tamanho,
        cn("whitespace-nowrap", larguraTotal && "w-full", className),
      )}
    >
      <MarcaWhatsapp className={tamanho === "lg" ? "size-5" : "size-4"} />
      {children}
    </LinkWhatsapp>
  );
}
