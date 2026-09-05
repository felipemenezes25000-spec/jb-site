import { Cartao, Esqueleto } from "@/components/ui/data";

/**
 * Esqueleto do checkout com a mesma malha da tela real — formulário à
 * esquerda, resumo à direita — para o conteúdo não pular quando chegar.
 */
export default function CarregandoCheckout() {
  return (
    <div className="container-jb py-8 lg:py-12" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando o fechamento do pedido…
      </span>

      <Esqueleto className="h-4 w-64" />
      <Esqueleto className="mt-5 h-10 w-72" />
      <Esqueleto className="mt-3 h-4 w-96 max-w-full" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div className="min-w-0">
          <div className="mb-6 flex items-center gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Esqueleto key={i} className="h-8 flex-1 rounded-full" />
            ))}
          </div>

          <Cartao className="p-5 sm:p-6">
            <Esqueleto className="h-6 w-48" />
            <Esqueleto className="mt-2 h-4 w-72 max-w-full" />
            <div className="mt-6 space-y-5">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <Esqueleto className="h-4 w-32" />
                  <Esqueleto className="mt-1.5 h-11 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between border-t border-graf-200 pt-6">
              <Esqueleto className="h-11 w-40" />
              <Esqueleto className="h-11 w-32" />
            </div>
          </Cartao>
        </div>

        <Cartao className="hidden p-5 lg:block">
          <Esqueleto className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Esqueleto className="size-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Esqueleto className="h-4 w-full" />
                  <Esqueleto className="mt-2 h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
          <Esqueleto className="mt-6 h-10 w-full" />
        </Cartao>
      </div>
    </div>
  );
}
