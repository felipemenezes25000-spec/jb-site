import { ChevronDown } from "lucide-react";

import { Cartao } from "@/components/ui/data";

/* ============================================================================
   Documento legal

   Política de privacidade, termos, entrega e trocas têm a mesma anatomia:
   seções numeradas, âncora por seção e um índice que acompanha a rolagem.
   As duas metades ficam separadas de propósito — o índice mora na coluna
   lateral da moldura e o corpo na coluna principal, mas ambos leem a mesma
   lista, então nunca saem de sincronia.

   No celular a coluna lateral cai para depois do texto, e um índice no pé de
   um documento de dez seções não serve para nada. Por isso `IndiceLegal` só
   aparece a partir de `lg` e o corpo traz, no topo, o mesmo índice em forma
   de bloco recolhido — `<details>` nativo, sem JavaScript e sem transformar a
   página em componente de cliente.

   Documento é para ser lido, não folheado: a numeração fica discreta na
   lateral do título e o texto corre em `.prose-jb`, que já resolve a medida
   de linha e o respiro entre parágrafos.
   ============================================================================ */

export type SecaoLegal = {
  /** Vira a âncora (#id) e o alvo do índice. */
  id: string;
  titulo: string;
  conteudo: React.ReactNode;
};

/** O índice só precisa do destino e do rótulo — o corpo fica de fora. */
export type ItemIndice = Pick<SecaoLegal, "id" | "titulo">;

function numero(indice: number) {
  return String(indice + 1).padStart(2, "0");
}

export function IndiceLegal({
  secoes,
  titulo = "Nesta página",
}: {
  secoes: ItemIndice[];
  titulo?: string;
}) {
  if (secoes.length === 0) return null;

  return (
    /* Escondido no celular de propósito: lá o índice é o de `CorpoLegal`. */
    <Cartao className="hidden p-5 lg:block">
      <h2 className="text-apoio font-bold text-graf-950">{titulo}</h2>
      <nav aria-label={titulo}>
        {/* Sem numeração: o índice de /entrega também aponta para blocos que
            ficam fora do texto corrido, e dois sistemas de número na mesma
            página só confundem. O número grande continua no corpo. */}
        <ol className="mt-3 space-y-0.5">
          {secoes.map((secao) => (
            <li key={secao.id}>
              <a
                href={`#${secao.id}`}
                className="foco-jb -mx-2 flex min-h-9 items-center rounded-lg px-2 py-1.5 text-sm text-graf-600 transition-colors hover:bg-graf-50 hover:text-jb-700 pointer-coarse:min-h-11"
              >
                {secao.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </Cartao>
  );
}

/** Índice recolhido do celular. Nasce fechado — é um atalho, não o conteúdo. */
function IndiceRecolhido({ secoes }: { secoes: ItemIndice[] }) {
  if (secoes.length < 4) return null;

  return (
    <details className="group mb-10 rounded-xl border border-graf-200 bg-white lg:hidden">
      <summary className="foco-jb flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-corpo font-semibold text-graf-950 [&::-webkit-details-marker]:hidden">
        Nesta página
        <ChevronDown
          className="size-5 shrink-0 text-graf-500 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <nav aria-label="Nesta página" className="border-t border-graf-200 px-2 py-2">
        <ol>
          {secoes.map((secao) => (
            <li key={secao.id}>
              <a
                href={`#${secao.id}`}
                className="foco-jb flex min-h-11 items-center rounded-lg px-2 text-sm text-graf-600"
              >
                {secao.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

export function CorpoLegal({
  secoes,
  indice,
}: {
  secoes: SecaoLegal[];
  /** Quando a página tem blocos fora do texto corrido — a tabela de fretes de
      /entrega, por exemplo — ela manda a lista completa para o índice. */
  indice?: ItemIndice[];
}) {
  return (
    /* Documento é texto corrido: a coluna para em ~48rem para a linha não
       passar de 75 caracteres, mesmo quando o container tem 1440px. */
    <div className="max-w-3xl">
      <IndiceRecolhido secoes={indice ?? secoes} />

      <div className="divide-y divide-graf-200">
        {secoes.map((secao, posicao) => (
          <section key={secao.id} id={secao.id} className="scroll-mt-28 py-11 first:pt-0 last:pb-0">
            <p className="label-mono text-jb-600" aria-hidden>
              {numero(posicao)}
            </p>
            <h2 className="text-title texto-forte mt-2">{secao.titulo}</h2>
            <div className="prose-jb mt-5 max-w-none">{secao.conteudo}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Nota de rodapé do documento. Aparece depois das seções, com a data de
 * atualização real do registro — nunca uma data escrita à mão.
 */
export function NotaDeRevisao({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-12 max-w-3xl border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-500">
      {children}
    </p>
  );
}
