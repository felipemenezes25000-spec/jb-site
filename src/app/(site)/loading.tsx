import { Esqueleto } from "@/components/ui/data";

/**
 * Fallback exclusivo do site público.
 *
 * O backoffice continua usando o fallback raiz. Aqui a geometria lembra a
 * abertura de assistência para reduzir a sensação de troca brusca durante
 * navegações que dependem do servidor.
 */
export default function CarregandoSite() {
  return (
    <main
      className="relative isolate min-h-[68svh] overflow-hidden bg-white py-8 sm:py-12 lg:py-16"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Carregando página…
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-44 -top-52 -z-10 size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.09),transparent)]"
      />

      <div className="container-jb grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-14">
        <div className="min-w-0">
          <Esqueleto className="h-8 w-52 rounded-full" />
          <Esqueleto className="mt-5 h-14 w-full max-w-xl rounded-2xl sm:h-20" />
          <Esqueleto className="mt-3 h-14 w-4/5 max-w-lg rounded-2xl sm:h-20" />
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Esqueleto className="h-12 rounded-xl" />
            <Esqueleto className="h-12 rounded-xl" />
            <Esqueleto className="col-span-2 h-12 rounded-xl sm:col-span-1" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Esqueleto className="h-14 rounded-xl" />
            <Esqueleto className="h-14 rounded-xl" />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-graf-200 bg-graf-50/70 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Esqueleto className="h-4 w-32 rounded-full" />
              <Esqueleto className="mt-2 h-3 w-48 max-w-full rounded-full" />
            </div>
            <Esqueleto className="h-7 w-16 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <Esqueleto key={item} className="h-20 rounded-xl" />
            ))}
          </div>
          <Esqueleto className="mt-5 h-24 rounded-xl" />
        </div>
      </div>
    </main>
  );
}
