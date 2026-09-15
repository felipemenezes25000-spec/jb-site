import { BadgeCheck, Info } from "lucide-react";

import { PROCEDENCIA, type LinhaDaFicha, type ProcedenciaSpec } from "@/domain/specs/schema";
import { cn } from "@/lib/utils";

/* ============================================================================
   Uma linha de dado, um componente

   A ficha inteira era `<div>` genérico: o leitor de tela lia rótulo e valor
   como dois textos soltos, sem relação. Aqui a linha é `<dt>`/`<dd>` dentro de
   um `<dl>` — lista de definições, que é exatamente o que uma ficha técnica é.

   `tabular-nums` em todo valor: sem isso os números não alinham na vertical e
   comparar duas linhas exige reler cada dígito.

   ---------------------------------------------------------------------------
   POR QUE EXISTEM DOIS DESENHOS DE LINHA
   ---------------------------------------------------------------------------
   A primeira versão usava uma grade só: `grid-cols-[minmax(0,1fr)_auto]`,
   rótulo à esquerda e valor à direita. Funciona para "12 L" e quebra
   catastroficamente para "Tomada exclusiva de 20 A em 220 V, com aterramento ·
   Bancada nivelada com 60 cm livres de profundidade · Água destilada".

   O motivo é a trilha `auto`: ela se dimensiona por `max-content`, então o
   valor longo levava a largura inteira e a trilha `minmax(0,1fr)` do rótulo —
   que pode encolher até zero — ia a **0 px**. Medido nesta página: "Requisitos
   do local" saía com 0 px de largura e 340 px de altura, uma letra por linha,
   na vertical. "Itens inclusos" e "Procedência" também.

   Num bloco de um terço da largura, valor longo simplesmente não cabe ao lado
   do rótulo. Então há dois desenhos, e o texto escolhe:

     curto  →  rótulo à esquerda, valor à direita. É o par que se lê de
               relance e o que alinha os números de linhas vizinhas.
     longo  →  empilhado: rótulo em cima, valor embaixo, alinhado à esquerda.
               Texto corrido alinhado à direita fica com o lado esquerdo
               irregular e é pior de ler do que o mesmo texto empilhado.
   ============================================================================ */

/**
 * Acima disto o valor deixa de caber ao lado do rótulo.
 *
 * A coluna da ficha tem ~340 px no desktop; descontado o rótulo e o respiro,
 * sobram uns 32 caracteres antes de o valor começar a espremer o rótulo.
 */
const LIMITE_PARA_LADO_A_LADO = 32;

export function SpecSourceBadge({ source }: { source: ProcedenciaSpec }) {
  if (source === "fabricante") return null;

  const procedencia = PROCEDENCIA[source];

  return (
    <span
      title={procedencia.descricao}
      className={cn(
        "ml-2 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold",
        source === "inspecao-jb"
          ? "bg-jb-50 text-jb-700 ring-1 ring-jb-500/15"
          : "bg-graf-100 text-graf-600",
      )}
    >
      {source === "inspecao-jb" ? (
        <BadgeCheck className="size-3" aria-hidden />
      ) : null}
      {procedencia.rotulo}
    </span>
  );
}

export function SpecHelp({ text }: { text: string }) {
  return (
    <span className="ml-1 inline-flex align-middle text-graf-400" title={text}>
      <Info className="size-3.5" aria-hidden />
      <span className="sr-only">{text}</span>
    </span>
  );
}

export function SpecRow({ linha }: { linha: LinhaDaFicha }) {
  const { definicao, valor, texto } = linha;
  const empilhado = (texto?.length ?? 0) > LIMITE_PARA_LADO_A_LADO;

  const rotulo = (
    <dt
      className={cn(
        "min-w-0 text-sm leading-5 text-graf-600",
        /* `break-words` no rótulo também: uma palavra longa demais para a
           coluna quebra dentro da palavra em vez de estourar a caixa. */
        "break-words",
      )}
    >
      {definicao.label}
      {definicao.helpText ? <SpecHelp text={definicao.helpText} /> : null}
    </dt>
  );

  const conteudo = texto ?? (
    <span className="font-normal text-graf-400" title="Não informado pelo fabricante">
      —
    </span>
  );

  const selo = valor ? <SpecSourceBadge source={valor.source} /> : null;

  if (empilhado) {
    return (
      <div className="min-w-0 border-b border-hairline py-2.5 last:border-b-0">
        {rotulo}
        <dd className="mt-1 min-w-0 break-words text-sm font-semibold leading-5 text-graf-950">
          {conteudo}
          {selo}
        </dd>
      </div>
    );
  }

  return (
    /* `auto` no rótulo e `minmax(0,1fr)` no valor — o inverso da versão que
       quebrou. Quem pode encolher é o valor, que sabe quebrar em palavras; o
       rótulo fica com a largura do próprio texto. */
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-4 border-b border-hairline py-2.5 last:border-b-0">
      {rotulo}
      <dd className="min-w-0 break-words text-right text-sm font-semibold leading-5 tabular text-graf-950">
        {conteudo}
        {selo}
      </dd>
    </div>
  );
}
