import { Cartao, Esqueleto } from "@/components/ui/data";

/** Mesma malha da página do pedido, para não haver salto ao carregar. */
export default function CarregandoPedido() {
  return (
    <div className="container-jb py-8 lg:py-12" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando o pedido…
      </span>

      <Esqueleto className="h-4 w-56" />
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Esqueleto className="h-3 w-16" />
          <Esqueleto className="mt-2 h-10 w-52" />
          <Esqueleto className="mt-2 h-4 w-44" />
        </div>
        <Esqueleto className="h-7 w-36 rounded-full" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
          <Cartao className="p-5 sm:p-6">
            <Esqueleto className="h-5 w-32" />
            <Esqueleto className="mt-4 h-24 w-full" />
            <Esqueleto className="mt-5 h-4 w-2/3" />
          </Cartao>

          <Cartao className="p-5 sm:p-6">
            <Esqueleto className="h-5 w-32" />
            <div className="mt-5 space-y-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Esqueleto className="size-6 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Esqueleto className="h-4 w-40" />
                    <Esqueleto className="mt-2 h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </Cartao>

          <Cartao className="p-5 sm:p-6">
            <Esqueleto className="h-5 w-36" />
            <div className="mt-4 space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4">
                  <Esqueleto className="size-16 shrink-0 sm:size-20" />
                  <div className="min-w-0 flex-1">
                    <Esqueleto className="h-4 w-3/4" />
                    <Esqueleto className="mt-2 h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <Cartao key={i} className="p-5">
              <Esqueleto className="h-5 w-28" />
              <Esqueleto className="mt-3 h-4 w-full" />
              <Esqueleto className="mt-2 h-4 w-2/3" />
            </Cartao>
          ))}
        </div>
      </div>
    </div>
  );
}
