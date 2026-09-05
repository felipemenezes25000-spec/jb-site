import { Trilha, type Migalha } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Moldura das páginas institucionais

   Todas as telas de /sobre a /termos entram por aqui: mesma trilha, mesma
   hierarquia de título, mesma largura de leitura. A coluna lateral é
   opcional e gruda no topo a partir de `lg` — é onde moram o índice dos
   documentos legais e os atalhos de contato.
   ============================================================================ */

export function MolduraInstitucional({
  trilha,
  sobretitulo,
  titulo,
  resumo,
  atualizadoEm,
  acoes,
  lateral,
  children,
}: {
  trilha: Migalha[];
  sobretitulo?: string | null;
  titulo: string;
  resumo?: string | null;
  /** Data de atualização do registro do CMS. Só aparece quando existe. */
  atualizadoEm?: Date | null;
  acoes?: React.ReactNode;
  lateral?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="container-jb py-8 lg:py-12">
      <Trilha itens={trilha} className="mb-5" />

      <header className="max-w-3xl">
        {sobretitulo ? (
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-jb-600">
            {sobretitulo}
          </p>
        ) : null}
        <h1 className="text-display leading-tight">{titulo}</h1>
        {resumo ? (
          <p className="mt-4 text-lg leading-relaxed text-graf-600">{resumo}</p>
        ) : null}
        {acoes ? <div className="mt-7 flex flex-wrap gap-3">{acoes}</div> : null}
        {atualizadoEm ? (
          <p className="mt-6 text-xs text-graf-500">
            Atualizado em {formatarData(atualizadoEm)}.
          </p>
        ) : null}
      </header>

      {lateral ? (
        <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
          <div className="min-w-0">{children}</div>
          <aside className="lg:sticky lg:top-6 lg:h-max">{lateral}</aside>
        </div>
      ) : (
        <div className="mt-10 lg:mt-12">{children}</div>
      )}
    </div>
  );
}

/** Bloco de texto com título próprio e âncora — a unidade das páginas longas. */
export function SecaoInstitucional({
  id,
  titulo,
  descricao,
  children,
  className,
}: {
  id?: string;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <h2 className="text-xl font-bold text-graf-950">{titulo}</h2>
      {descricao ? (
        <p className="mt-2 text-sm leading-relaxed text-graf-500">{descricao}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Sequência de seções com respiro e divisória entre elas. */
export function PilhaDeSecoes({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10 [&>section+section]:border-t [&>section+section]:border-graf-200 [&>section+section]:pt-10">
      {children}
    </div>
  );
}
