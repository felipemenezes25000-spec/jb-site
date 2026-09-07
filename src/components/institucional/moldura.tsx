import { Trilha, type Migalha } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Moldura das páginas institucionais

   Todas as telas de /sobre a /termos entram por aqui: mesma trilha, mesma
   hierarquia de título, mesma largura de leitura. A coluna lateral é
   opcional e gruda no topo a partir de `lg` — é onde moram o índice dos
   documentos legais e os atalhos de contato.

   Quando existe coluna lateral, o miolo inteiro (cabeçalho incluído) fecha em
   72rem e centraliza. Sem isso, num monitor de 1440px o título ficava colado
   na borda esquerda e o texto corria a quase um metro do índice: parecia
   painel administrativo, não documento. Com a trava, /sobre, /contato, /faq e
   as políticas ganham a mesma caixa de leitura — e o cabeçalho continua
   alinhado com o corpo, que é o que faz a página parecer desenhada.

   O cabeçalho usa a escala do design system: `sobretitulo` no degrau em caixa
   alta, `text-display` no título e `texto-guia` no resumo. Nada de tamanho
   escrito à mão aqui — é o que mantém /sobre, /faq e /termos com o mesmo
   ritmo das páginas da loja e da assistência.
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
  const comLateral = Boolean(lateral);

  return (
    <div className="pb-16 lg:pb-24">
      {/* -------------------------------------------------------- cabeçalho */}
      <header className="relative isolate overflow-hidden border-b border-graf-200 bg-surface-muted">
        <span
          aria-hidden
          className="field-orbit pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(65%_70%_at_80%_0%,#000,transparent)]"
        />
        <div className="container-jb py-10 lg:py-16">
          <div className={cn(comLateral && "mx-auto max-w-6xl")}>
            <Trilha itens={trilha} className="mb-6" />

            <div className="max-w-3xl">
              {sobretitulo ? <p className="sobretitulo mb-3">{sobretitulo}</p> : null}
              <h1 className="text-display texto-forte">{titulo}</h1>
              {resumo ? <p className="texto-guia texto-suave mt-5">{resumo}</p> : null}
              {acoes ? <div className="mt-8 flex flex-wrap gap-3">{acoes}</div> : null}
              {atualizadoEm ? (
                <p className="mt-7 text-sm text-graf-500">
                  Atualizado em {formatarData(atualizadoEm)}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- conteúdo */}
      <div className="container-jb pt-12 lg:pt-16">
        {lateral ? (
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
            <div className="min-w-0">{children}</div>
            <aside className="lg:sticky lg:top-24 lg:h-max">{lateral}</aside>
          </div>
        ) : (
          /* `mx-auto`: sem ele a coluna de leitura encostava à esquerda e o
             vazio ia todo para um lado — em 1440px eram 40px de margem à
             esquerda contra 489px à direita, e a página parecia ter perdido
             metade do conteúdo. A medida de leitura continua a mesma; o que
             muda é ela ficar centrada, como já acontece quando há barra
             lateral. */
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
    <section id={id} className={cn("scroll-mt-28", className)}>
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
    <div className="space-y-12 lg:space-y-16 [&>section+section]:border-t [&>section+section]:border-graf-200 [&>section+section]:pt-12 lg:[&>section+section]:pt-16">
      {children}
    </div>
  );
}
