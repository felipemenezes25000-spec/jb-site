import { Esqueleto } from "@/components/ui/data";

/**
 * Esqueletos das telas da Minha JB.
 *
 * Cada `loading.tsx` monta o desenho da própria página com estas peças, para
 * que o salto entre o carregando e o conteúdo seja pequeno. Todos são
 * `aria-hidden` (o `Esqueleto` do kit já cuida disso) e vêm acompanhados de um
 * aviso em região viva — quem usa leitor de tela ouve "carregando" em vez de
 * ficar num silêncio sem explicação.
 */

function Aviso() {
  return (
    <p role="status" className="sr-only">
      Carregando…
    </p>
  );
}

function TopoFalso() {
  return (
    <div className="mb-7 space-y-3">
      <Esqueleto className="h-8 w-56" />
      <Esqueleto className="h-4 w-full max-w-md" />
    </div>
  );
}

/** Listagem: filtros, tabela no desktop, cartões no celular. */
export function EsqueletoLista({ linhas = 5 }: { linhas?: number }) {
  return (
    <div>
      <Aviso />
      <TopoFalso />
      <div className="mb-6 flex flex-wrap gap-2">
        <Esqueleto className="h-11 w-28" />
        <Esqueleto className="h-11 w-32" />
        <Esqueleto className="h-11 w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: linhas }).map((_, indice) => (
          <Esqueleto key={indice} className="h-20 w-full md:h-14" />
        ))}
      </div>
    </div>
  );
}

/** Grade de cartões: equipamentos, favoritos, contratos. */
export function EsqueletoCartoes({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div>
      <Aviso />
      <TopoFalso />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: quantidade }).map((_, indice) => (
          <Esqueleto key={indice} className="h-56 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Detalhe em duas colunas: pedido, chamado, orçamento, prontuário. */
export function EsqueletoDetalhe() {
  return (
    <div>
      <Aviso />
      <TopoFalso />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-4">
          <Esqueleto className="h-64 w-full" />
          <Esqueleto className="h-48 w-full" />
        </div>
        <div className="space-y-4">
          <Esqueleto className="h-40 w-full" />
          <Esqueleto className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Formulário: cadastro de equipamento, endereço, perfil. */
export function EsqueletoFormulario({ campos = 6 }: { campos?: number }) {
  return (
    <div className="max-w-3xl">
      <Aviso />
      <TopoFalso />
      <div className="space-y-5 rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        {Array.from({ length: campos }).map((_, indice) => (
          <div key={indice} className="space-y-1.5">
            <Esqueleto className="h-4 w-28" />
            <Esqueleto className="h-11 w-full" />
          </div>
        ))}
        <Esqueleto className="h-11 w-40" />
      </div>
    </div>
  );
}

/** Visão geral: painel com vários blocos. */
export function EsqueletoPainel() {
  return (
    <div>
      <Aviso />
      <TopoFalso />
      <Esqueleto className="mb-6 h-28 w-full" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Esqueleto className="h-64 w-full" />
        <Esqueleto className="h-64 w-full" />
        <Esqueleto className="h-56 w-full" />
        <Esqueleto className="h-56 w-full" />
      </div>
    </div>
  );
}
