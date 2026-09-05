import { Esqueleto } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/* ============================================================================
   Esqueletos de carregamento

   A regra é uma só: o esqueleto tem a forma do que vai chegar. Altura de
   imagem, número de linhas, posição do preço, largura das colunas — se o
   bloco cinza não bate com o conteúdo final, a tela "pula" quando os dados
   chegam e a espera parece mais longa do que foi.

   Todos são decorativos para o leitor de tela: a peça em si fica com
   aria-hidden e o container anuncia o carregamento uma vez, por escrito.
   ============================================================================ */

function Regiao({
  rotulo,
  className,
  children,
}: {
  rotulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{rotulo}</span>
      {children}
    </div>
  );
}

/** Linhas de texto com a última mais curta, como um parágrafo de verdade. */
export function EsqueletoTexto({
  linhas = 3,
  className,
}: {
  linhas?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      {Array.from({ length: Math.max(1, linhas) }).map((_, i) => (
        <Esqueleto
          key={i}
          className={cn("h-4", i === linhas - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Cabeçalho de página: trilha, título e linha de apoio. */
export function EsqueletoCabecalho({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-hidden>
      <Esqueleto className="h-3.5 w-48" />
      <Esqueleto className="h-9 w-80 max-w-full" />
      <Esqueleto className="h-4 w-[28rem] max-w-full" />
    </div>
  );
}

/**
 * Cartão de produto: imagem em 4/3, marca, nome em duas linhas, preço e botão.
 * A proporção da imagem é fixa para o cartão não mudar de altura ao carregar.
 */
export function EsqueletoCartaoProduto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card",
        className,
      )}
    >
      <Esqueleto className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Esqueleto className="h-3 w-24" />
        <div className="space-y-2">
          <Esqueleto className="h-4 w-full" />
          <Esqueleto className="h-4 w-3/4" />
        </div>
        <Esqueleto className="h-6 w-32" />
        <Esqueleto className="mt-1 h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function EsqueletoGradeProdutos({
  quantidade = 6,
  className,
}: {
  quantidade?: number;
  className?: string;
}) {
  return (
    <Regiao
      rotulo="Carregando os produtos"
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6",
        className,
      )}
    >
      {Array.from({ length: quantidade }).map((_, i) => (
        <EsqueletoCartaoProduto key={i} />
      ))}
    </Regiao>
  );
}

/**
 * Listagem: tabela no desktop, cartões no celular — o mesmo desenho que a
 * Tabela entrega quando os dados chegam.
 */
export function EsqueletoTabela({
  linhas = 6,
  colunas = 4,
  comCabecalho = true,
  rotulo = "Carregando a lista",
  className,
}: {
  linhas?: number;
  colunas?: number;
  comCabecalho?: boolean;
  rotulo?: string;
  className?: string;
}) {
  const totalColunas = Math.max(1, colunas);

  return (
    <Regiao rotulo={rotulo} className={className}>
      <div className="hidden overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card md:block">
        {comCabecalho ? (
          <div
            aria-hidden
            className="flex items-center gap-4 border-b border-graf-200 bg-graf-50 px-4 py-3.5"
          >
            {Array.from({ length: totalColunas }).map((_, i) => (
              <Esqueleto key={i} className={cn("h-3", i === 0 ? "w-40" : "w-24")} />
            ))}
          </div>
        ) : null}
        {Array.from({ length: linhas }).map((_, linha) => (
          <div
            key={linha}
            aria-hidden
            className="flex items-center gap-4 border-b border-graf-200 px-4 py-4 last:border-b-0"
          >
            {Array.from({ length: totalColunas }).map((_, coluna) => (
              <Esqueleto
                key={coluna}
                className={cn("h-4", coluna === 0 ? "w-56 max-w-full" : "w-20")}
              />
            ))}
          </div>
        ))}
      </div>

      <ul className="space-y-3 md:hidden">
        {Array.from({ length: Math.min(linhas, 4) }).map((_, i) => (
          <li
            key={i}
            aria-hidden
            className="rounded-xl border border-graf-200 bg-white p-4 shadow-card"
          >
            <Esqueleto className="h-4 w-2/3" />
            <div className="mt-3 space-y-2">
              <Esqueleto className="h-3.5 w-full" />
              <Esqueleto className="h-3.5 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    </Regiao>
  );
}

/** Painel: fila de métricas antes dos números chegarem. */
export function EsqueletoMetricas({
  quantidade = 4,
  className,
}: {
  quantidade?: number;
  className?: string;
}) {
  return (
    <Regiao
      rotulo="Carregando os números do painel"
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
    >
      {Array.from({ length: quantidade }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="rounded-xl border border-graf-200 bg-white p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <Esqueleto className="h-3.5 w-28" />
            <Esqueleto className="size-9" circular />
          </div>
          <Esqueleto className="mt-4 h-8 w-24" />
          <Esqueleto className="mt-3 h-3.5 w-36 max-w-full" />
        </div>
      ))}
    </Regiao>
  );
}

/** Formulário: pares de rótulo e campo, com a barra de ações no fim. */
export function EsqueletoFormulario({
  campos = 5,
  className,
}: {
  campos?: number;
  className?: string;
}) {
  return (
    <Regiao
      rotulo="Carregando o formulário"
      className={cn("rounded-xl border border-graf-200 bg-white p-5 shadow-card", className)}
    >
      <div className="space-y-5" aria-hidden>
        {Array.from({ length: Math.max(1, campos) }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Esqueleto className="h-3.5 w-32" />
            <Esqueleto className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <div className="flex justify-end gap-3 border-t border-graf-200 pt-5">
          <Esqueleto className="h-11 w-28 rounded-lg" />
          <Esqueleto className="h-11 w-36 rounded-lg" />
        </div>
      </div>
    </Regiao>
  );
}

/** Página de detalhe: conteúdo à esquerda, resumo à direita. */
export function EsqueletoDetalhe({ className }: { className?: string }) {
  return (
    <Regiao rotulo="Carregando os detalhes" className={cn("space-y-8", className)}>
      <EsqueletoCabecalho />
      <div className="grid gap-8 lg:grid-cols-3 lg:gap-10" aria-hidden>
        <div className="space-y-5 lg:col-span-2">
          <Esqueleto className="h-56 w-full" />
          <EsqueletoTexto linhas={4} />
        </div>
        <div className="space-y-4">
          <Esqueleto className="h-40 w-full" />
          <Esqueleto className="h-24 w-full" />
        </div>
      </div>
    </Regiao>
  );
}
