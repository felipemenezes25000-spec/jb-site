import { ChevronDown } from "lucide-react";

import { SpecRow } from "@/components/specs/spec-row";
import type {
  FichaDeEspecificacoes,
  GrupoDaFicha,
  LinhaDaFicha,
} from "@/domain/specs/schema";
import { cn } from "@/lib/utils";

/* ============================================================================
   A ficha completa — cinco grupos, sempre na mesma ordem, aberta

   Aberta por padrão em qualquer largura: num equipamento de clínica a
   especificação é o conteúdo mais consultado da página, e esconder
   especificação de seminovo atrás de uma gaveta é esconder defeito. Cada grupo
   é um `<details open>` — quem está no celular pode fechar o que já leu, sem
   JavaScript e sem estado.

   O contador de cada cabeçalho é derivado de `linhas.length`. Nunca literal:
   foi um "6 especificações" escrito à mão numa página com 9 atributos que
   começou esta refatoração.
   ============================================================================ */

function Linhas({ linhas }: { linhas: LinhaDaFicha[] }) {
  return (
    <dl className="mt-2">
      {linhas.map((linha) => (
        <SpecRow key={linha.definicao.key} linha={linha} />
      ))}
    </dl>
  );
}

/**
 * Um grupo da ficha.
 *
 * `<details open>` em toda largura, e não "grade no desktop, sanfona no
 * celular". A versão com dois blocos responsivos renderizava a ficha inteira
 * duas vezes no DOM: o leitor de tela lia cada especificação em dobro, e a
 * árvore de acessibilidade passava a ter duas linhas "Tensão 220 V". Esconder
 * uma delas com `sm:hidden` resolve o pixel e não resolve a leitura.
 *
 * Aberto por padrão porque a ficha é o conteúdo mais consultado da página —
 * num seminovo, esconder especificação é esconder defeito. Continuar sendo
 * `<details>` dá a quem está no celular a opção de fechar o que já leu, sem
 * JavaScript e sem estado.
 */
export function SpecGroup({ grupo }: { grupo: GrupoDaFicha }) {
  return (
    <details
      open
      className="group min-w-0 break-inside-avoid"
      aria-labelledby={`ficha-${grupo.id}`}
    >
      <summary className="foco-jb flex cursor-pointer list-none items-start justify-between gap-3 border-b border-graf-200 pb-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <h3
            id={`ficha-${grupo.id}`}
            className="text-sm font-extrabold leading-5 text-graf-950"
          >
            {grupo.titulo}
          </h3>
          <span className="texto-apoio mt-0.5 block text-graf-500">
            {grupo.resumo}{" "}
            <span className="tabular whitespace-nowrap text-graf-500">
              ({grupo.linhas.length})
            </span>
          </span>
        </span>
        <ChevronDown
          className="mt-0.5 size-4 shrink-0 text-graf-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <Linhas linhas={grupo.linhas} />
    </details>
  );
}

export function SpecSheet({
  ficha,
  fonte,
}: {
  ficha: FichaDeEspecificacoes;
  /** Ex.: "fabricante + inspeção JB de 08/09/2026". */
  fonte?: string | null;
}) {
  if (ficha.grupos.length === 0) return null;

  return (
    <div className="min-w-0">
      {fonte ? (
        <p className="texto-apoio mb-5 text-graf-500">
          Fonte dos dados: {fonte}.
        </p>
      ) : null}

      {/* Uma árvore só, em qualquer largura: uma coluna no celular, duas no
          tablet, três no desktop. Nada é renderizado duas vezes. */}
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {ficha.grupos.map((grupo) => (
          <SpecGroup key={grupo.id} grupo={grupo} />
        ))}
      </div>
    </div>
  );
}

/**
 * Os três atributos decisivos, no topo da página.
 *
 * Três, não seis: o topo responde "é este o equipamento?", e a ficha responde
 * "serve na minha sala?". O teaser de seis linhas que existia aqui repetia a
 * ficha inteira 600 px acima dela.
 */
export function SpecHighlights({
  ficha,
  hrefDaFicha = "#ficha-tecnica",
}: {
  ficha: FichaDeEspecificacoes;
  hrefDaFicha?: string;
}) {
  if (ficha.decisivas.length === 0) return null;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <p className="micro text-graf-500">O que decide esta compra</p>
        <a
          href={hrefDaFicha}
          className="foco-jb texto-apoio inline-flex min-h-8 items-center font-bold text-jb-700 hover:text-jb-800"
        >
          Ver as {ficha.total} especificações →
        </a>
      </div>

      <dl className="mt-2.5 grid overflow-hidden rounded-xl border border-graf-200 bg-graf-50/45">
        {ficha.decisivas.map((linha, indice) => (
          <div
            key={linha.definicao.key}
            className={cn(
              "flex min-w-0 items-baseline justify-between gap-5 px-3.5 py-2.5",
              indice > 0 && "border-t border-graf-200",
            )}
          >
            <dt className="micro shrink-0 text-graf-500">{linha.definicao.label}</dt>
            <dd className="min-w-0 break-words text-right text-sm font-extrabold leading-5 tabular text-graf-950">
              {linha.texto}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
