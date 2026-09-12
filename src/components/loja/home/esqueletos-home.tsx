import { Esqueleto } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";

function Aviso({ texto }: { texto: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {texto}
    </p>
  );
}

function CabecalhoFalso() {
  return (
    <div className="max-w-2xl border-b border-graf-200 pb-5">
      <Esqueleto className="h-3 w-24" />
      <Esqueleto className="mt-4 h-8 w-full max-w-lg sm:h-10" />
      <Esqueleto className="mt-3 h-4 w-full max-w-xl" />
    </div>
  );
}

export function EsqueletoCategoriasHome() {
  return (
    <Secao fundo="branco" largura="loja" espaco="sm" separador>
      <Aviso texto="Carregando as categorias do catálogo." />
      <div aria-hidden>
        <CabecalhoFalso />
        <div className="mt-6 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, indice) => (
            <div key={indice} className="min-w-0 rounded-xl border border-graf-200 bg-white p-4 sm:p-5">
              <Esqueleto className="aspect-[4/3] w-full rounded-lg" />
              <Esqueleto className="mt-4 h-4 w-2/3" />
              <Esqueleto className="mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </Secao>
  );
}

export function EsqueletoMarcasHome() {
  return (
    <Secao fundo="branco" largura="loja" espaco="sm" separador>
      <Aviso texto="Carregando as marcas do catálogo." />
      <div aria-hidden>
        <CabecalhoFalso />
        <div className="mt-6 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, indice) => (
            <div key={indice} className="flex min-h-36 min-w-0 items-center justify-center rounded-xl border border-graf-200 bg-white p-4">
              <Esqueleto className="h-10 w-24 max-w-full" />
            </div>
          ))}
        </div>
      </div>
    </Secao>
  );
}
