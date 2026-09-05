import { Esqueleto } from "@/components/ui/data";

/**
 * Estado de carregamento das telas da loja.
 *
 * Vale para tudo que está sob o layout de (loja) e ainda não tem loading
 * próprio: institucional, catálogo, busca, carrinho. A forma é genérica de
 * propósito — trilha, título e uma malha de cartões — porque um esqueleto que
 * promete o layout errado incomoda mais do que ajuda.
 *
 * O cabeçalho e o rodapé continuam montados e interativos: quem está
 * navegando pode desistir e ir para outro lugar sem esperar.
 */
export default function CarregandoLoja() {
  return (
    <div className="container-jb py-8 lg:py-12">
      <p role="status" aria-live="polite" className="sr-only">
        Carregando a página.
      </p>

      <div aria-hidden>
        <Esqueleto className="h-4 w-52" />

        <div className="mt-6 max-w-2xl space-y-3">
          <Esqueleto className="h-9 w-3/4" />
          <Esqueleto className="h-5 w-full" />
          <Esqueleto className="h-5 w-2/3" />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <div
              key={indice}
              className="rounded-xl border border-graf-200 bg-white p-5 shadow-card"
            >
              <Esqueleto className="size-9 rounded-lg" />
              <Esqueleto className="mt-4 h-3 w-24" />
              <Esqueleto className="mt-3 h-6 w-32" />
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-4">
            <Esqueleto className="h-6 w-64" />
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-5/6" />
            <Esqueleto className="h-4 w-full" />
            <Esqueleto className="h-4 w-3/4" />
            <div className="pt-6">
              <Esqueleto className="h-48 w-full rounded-xl" />
            </div>
          </div>
          <Esqueleto className="hidden h-64 w-full rounded-xl lg:block" />
        </div>
      </div>
    </div>
  );
}
