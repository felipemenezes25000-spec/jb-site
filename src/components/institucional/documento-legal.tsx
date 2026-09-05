import { Cartao } from "@/components/ui/data";

/* ============================================================================
   Documento legal

   Política de privacidade, termos, entrega e trocas têm a mesma anatomia:
   seções numeradas, âncora por seção e um índice que acompanha a rolagem.
   As duas metades ficam separadas de propósito — o índice mora na coluna
   lateral da moldura e o corpo na coluna principal, mas ambos leem a mesma
   lista, então nunca saem de sincronia.

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

export function IndiceLegal({
  secoes,
  titulo = "Nesta página",
}: {
  secoes: SecaoLegal[];
  titulo?: string;
}) {
  if (secoes.length === 0) return null;

  return (
    <Cartao className="p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-graf-500">{titulo}</h2>
      <nav aria-label={titulo}>
        <ol className="mt-3 space-y-0.5">
          {secoes.map((secao, indice) => (
            <li key={secao.id}>
              <a
                href={`#${secao.id}`}
                className="-mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-graf-600 transition-colors hover:bg-graf-50 hover:text-jb-700"
              >
                <span className="label-mono w-5 shrink-0 text-graf-500" aria-hidden>
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{secao.titulo}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </Cartao>
  );
}

export function CorpoLegal({ secoes }: { secoes: SecaoLegal[] }) {
  return (
    /* Documento é texto corrido: a coluna para em ~48rem para a linha não
       passar de 75 caracteres, mesmo quando o container tem 1440px. */
    <div className="max-w-3xl space-y-12">
      {secoes.map((secao, indice) => (
        <section key={secao.id} id={secao.id} className="scroll-mt-28">
          <p className="label-mono text-jb-600" aria-hidden>
            {String(indice + 1).padStart(2, "0")}
          </p>
          <h2 className="text-title texto-forte mt-1.5">{secao.titulo}</h2>
          <div className="prose-jb mt-4 max-w-none">{secao.conteudo}</div>
        </section>
      ))}
    </div>
  );
}

/**
 * Nota de rodapé do documento. Aparece depois das seções, com a data de
 * atualização real do registro — nunca uma data escrita à mão.
 */
export function NotaDeRevisao({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-12 border-t border-graf-200 pt-6 text-sm leading-relaxed text-graf-500">
      {children}
    </p>
  );
}
