import { Esqueleto } from "@/components/ui/data";

/**
 * Estado global de carregamento da vitrine.
 * Mantém a mesma largura da loja e evita saltos de layout enquanto uma rota
 * ainda está preparando conteúdo no servidor.
 */
export default function CarregandoPagina() {
  return (
    <main className="container-jb max-w-[100rem] py-7 sm:py-9 lg:py-12" aria-busy="true">
      <span className="sr-only" role="status">
        Carregando página…
      </span>

      <div className="max-w-3xl">
        <Esqueleto className="h-3 w-24" />
        <Esqueleto className="mt-4 h-10 w-full max-w-xl sm:h-12" />
        <Esqueleto className="mt-3 h-5 w-full max-w-2xl" />
        <Esqueleto className="mt-2 h-5 w-4/5 max-w-xl" />
      </div>

      <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {[0, 1, 2].map((item) => (
          <div key={item} className="min-w-0 rounded-2xl border border-graf-200 bg-white p-4 sm:p-5">
            <Esqueleto className="aspect-[4/3] w-full rounded-xl" />
            <Esqueleto className="mt-4 h-4 w-2/3" />
            <Esqueleto className="mt-2 h-5 w-full" />
            <Esqueleto className="mt-4 h-9 w-1/2" />
          </div>
        ))}
      </div>
    </main>
  );
}
