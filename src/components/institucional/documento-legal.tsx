import { ChevronDown } from "lucide-react";

import { Cartao } from "@/components/ui/data";

/* ============================================================================
   Documento legal

   Mantém documento como documento: leitura longa, índice, âncoras e numeração.
   A camada visual premium entra só em superfície, espaçamento e hierarquia.
   ============================================================================ */

export type SecaoLegal = {
  id: string;
  titulo: string;
  conteudo: React.ReactNode;
};

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
    <Cartao className="jb-indice-legal hidden p-5 lg:block">
      <h2 className="text-apoio font-bold text-graf-950">{titulo}</h2>
      <nav aria-label={titulo}>
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

function IndiceRecolhido({ secoes }: { secoes: ItemIndice[] }) {
  if (secoes.length < 4) return null;

  return (
    <details className="jb-indice-mobile group mb-10 rounded-xl border border-graf-200 bg-white lg:hidden">
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
  indice?: ItemIndice[];
}) {
  return (
    <div className="jb-corpo-legal max-w-3xl">
      <IndiceRecolhido secoes={indice ?? secoes} />

      <div className="divide-y divide-graf-200">
        {secoes.map((secao, posicao) => (
          <section
            key={secao.id}
            id={secao.id}
            className="jb-secao-legal scroll-mt-28 py-11 first:pt-0 last:pb-0"
          >
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

export function NotaDeRevisao({ children }: { children: React.ReactNode }) {
  return (
    <p className="jb-nota-revisao mt-12 max-w-3xl border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-500">
      {children}
    </p>
  );
}
