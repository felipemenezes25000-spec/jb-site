import { Trilha, type Migalha } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Moldura das páginas institucionais

   Todas as páginas institucionais compartilham a mesma casca. A estrutura
   continua voltada à leitura longa, mas agora recebe pontos de extensão
   visuais para combinar com o site premium sem transformar documento em
   landing page.
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
  atualizadoEm?: Date | null;
  acoes?: React.ReactNode;
  lateral?: React.ReactNode;
  children: React.ReactNode;
}) {
  const comLateral = Boolean(lateral);

  return (
    <div className="jb-institucional pb-16 lg:pb-24">
      <header className="jb-institucional-hero relative isolate overflow-hidden border-b border-graf-200 bg-surface-muted">
        <span
          aria-hidden
          className="field-orbit pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(65%_70%_at_80%_0%,#000,transparent)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-40 -z-10 size-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.1),transparent)]"
        />

        <div className="container-jb py-10 lg:py-16">
          <div className={cn("jb-institucional-header-content", comLateral && "mx-auto max-w-6xl")}>
            <Trilha itens={trilha} className="mb-6" />

            <div className="max-w-3xl">
              {sobretitulo ? <p className="sobretitulo mb-3">{sobretitulo}</p> : null}
              <h1 className="text-display texto-forte">{titulo}</h1>
              {resumo ? <p className="texto-guia texto-suave mt-5">{resumo}</p> : null}
              {acoes ? <div className="mt-8 flex flex-wrap gap-3">{acoes}</div> : null}
              {atualizadoEm ? (
                <p className="mt-7 inline-flex rounded-full border border-graf-200 bg-white/75 px-3 py-1.5 text-xs font-semibold text-graf-600 shadow-xs backdrop-blur">
                  Atualizado em {formatarData(atualizadoEm)}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="jb-institucional-content container-jb pt-10 lg:pt-14">
        {lateral ? (
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
            <div className="min-w-0">{children}</div>
            <aside className="jb-institucional-aside lg:sticky lg:top-24 lg:h-max">{lateral}</aside>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">{children}</div>
        )}
      </div>
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
    <section id={id} className={cn("jb-institucional-secao scroll-mt-28", className)}>
      <h2 className="text-title texto-forte">{titulo}</h2>
      {descricao ? (
        <p className="texto-suave mt-3 max-w-2xl text-base leading-relaxed">{descricao}</p>
      ) : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

/** Sequência de seções com respiro e divisória entre elas. */
export function PilhaDeSecoes({ children }: { children: React.ReactNode }) {
  return (
    <div className="jb-pilha-institucional space-y-12 lg:space-y-16 [&>section+section]:border-t [&>section+section]:border-graf-200 [&>section+section]:pt-12 lg:[&>section+section]:pt-16">
      {children}
    </div>
  );
}
