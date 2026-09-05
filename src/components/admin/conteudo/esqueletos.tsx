import { Esqueleto } from "@/components/ui/data";

/* ============================================================================
   Estados de carregamento

   Formas do mesmo tamanho do conteúdo que vai chegar — o objetivo é a tela não
   pular quando os dados aparecem. Tudo marcado como `aria-busy` e anunciado
   uma vez por região viva, para quem usa leitor de tela saber que algo está
   vindo em vez de ouvir silêncio.
   ============================================================================ */

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" className="space-y-5">
      <p role="status" aria-live="polite" className="sr-only">
        Carregando…
      </p>
      {children}
    </div>
  );
}

function Cabecalho() {
  return (
    <div className="space-y-2">
      <Esqueleto className="h-7 w-64" />
      <Esqueleto className="h-4 w-full max-w-xl" />
    </div>
  );
}

export function EsqueletoDeLista({ linhas = 6 }: { linhas?: number }) {
  return (
    <Moldura>
      <Cabecalho />
      <Esqueleto className="h-[4.25rem]" />
      <div className="space-y-3">
        {Array.from({ length: linhas }, (_, indice) => (
          <Esqueleto key={indice} className="h-20" />
        ))}
      </div>
    </Moldura>
  );
}

export function EsqueletoDeGrade({ itens = 10 }: { itens?: number }) {
  return (
    <Moldura>
      <Cabecalho />
      <Esqueleto className="h-32" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: itens }, (_, indice) => (
          <Esqueleto key={indice} className="h-44" />
        ))}
      </div>
    </Moldura>
  );
}

export function EsqueletoDeFormulario() {
  return (
    <Moldura>
      <Cabecalho />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <Esqueleto className="h-72" />
          <Esqueleto className="h-56" />
        </div>
        <div className="space-y-5">
          <Esqueleto className="h-40" />
          <Esqueleto className="h-64" />
        </div>
      </div>
    </Moldura>
  );
}
