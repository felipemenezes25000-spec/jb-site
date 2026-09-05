import { Esqueleto } from "@/components/ui/data";

/**
 * Carregamento de "Minha conta".
 *
 * Era a única tela do painel sem esqueleto próprio — as outras herdam o do
 * segmento acima. O desenho é o da página pronta: cabeçalho e dois cartões
 * lado a lado a partir de lg, o de dados com seis linhas rótulo/valor e o da
 * troca de senha com três campos e um botão.
 */
export default function CarregandoMinhaConta() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando a sua conta…</span>

      <div aria-hidden className="space-y-2">
        <Esqueleto className="h-8 w-52" />
        <Esqueleto className="h-4 w-80 max-w-full" />
      </div>

      <div aria-hidden className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="rounded-xl border border-graf-200 bg-white shadow-card">
          <div className="space-y-2 border-b border-graf-200 px-5 py-4">
            <Esqueleto className="h-5 w-32" />
            <Esqueleto className="h-3.5 w-64 max-w-full" />
          </div>
          <div className="divide-y divide-graf-100">
            {[0, 1, 2, 3, 4, 5].map((linha) => (
              <div key={linha} className="flex items-center justify-between gap-6 px-5 py-3.5">
                <Esqueleto className="h-4 w-24" />
                <Esqueleto className="h-4 w-36" />
              </div>
            ))}
          </div>
          <div className="border-t border-graf-200 bg-graf-50 px-5 py-3">
            <Esqueleto className="h-3.5 w-full" />
          </div>
        </div>

        <div className="rounded-xl border border-graf-200 bg-white shadow-card">
          <div className="space-y-2 border-b border-graf-200 px-5 py-4">
            <Esqueleto className="h-5 w-36" />
            <Esqueleto className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="space-y-4 px-5 py-4">
            {[0, 1, 2].map((campo) => (
              <div key={campo} className="space-y-1.5">
                <Esqueleto className="h-3.5 w-28" />
                <Esqueleto className="h-11 w-full" />
              </div>
            ))}
            <Esqueleto className="h-11 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
