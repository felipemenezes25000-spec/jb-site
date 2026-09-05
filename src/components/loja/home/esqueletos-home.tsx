import { Esqueleto } from "@/components/ui/data";
import { Grade, GradeConteudoApoio } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";

/* ============================================================================
   Esqueletos das faixas que carregam do banco

   Cada um espelha a faixa que vai ocupar o lugar dele: mesmo fundo, mesmo
   respiro vertical, mesma grade e a mesma proporção de imagem. Assim a página
   não pula quando o conteúdo chega — e quem está em conexão ruim vê a forma
   do que está vindo, não um retângulo branco.
   ============================================================================ */

function Aviso({ texto }: { texto: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {texto}
    </p>
  );
}

function CabecalhoFalso() {
  return (
    <div className="mb-10 max-w-2xl">
      <Esqueleto className="h-3.5 w-24 rounded-full" />
      <Esqueleto className="mt-4 h-9 w-4/5 rounded-lg" />
      <Esqueleto className="mt-4 h-5 w-full rounded-md" />
      <Esqueleto className="mt-2 h-5 w-3/5 rounded-md" />
    </div>
  );
}

/** Espelha o cartão de categoria e o cartão de destaque, que têm a mesma caixa. */
function CartaoFalso() {
  return (
    <div className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
      <Esqueleto className="aspect-4/3 w-full rounded-none" />
      <div className="p-5 sm:p-6">
        <Esqueleto className="h-3 w-20 rounded-full" />
        <Esqueleto className="mt-3 h-6 w-4/5 rounded-md" />
        <Esqueleto className="mt-2 h-4 w-2/5 rounded-md" />
        <Esqueleto className="mt-6 h-8 w-1/2 rounded-md" />
        <Esqueleto className="mt-4 h-4 w-full rounded-md" />
      </div>
    </div>
  );
}

export function EsqueletoCategoriasHome() {
  return (
    <Secao fundo="branco" espaco="lg">
      <Aviso texto="Carregando as categorias do catálogo." />
      <div aria-hidden>
        <CabecalhoFalso />
        <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="md">
          {Array.from({ length: 3 }, (_, i) => (
            <CartaoFalso key={i} />
          ))}
        </Grade>
      </div>
    </Secao>
  );
}

export function EsqueletoDestaquesHome() {
  return (
    <Secao fundo="clara" espaco="lg" separador>
      <Aviso texto="Carregando os equipamentos em destaque." />
      <div aria-hidden>
        <CabecalhoFalso />
        <Grade colunas={{ base: 1, sm: 2, lg: 3 }} espaco="md">
          {Array.from({ length: 3 }, (_, i) => (
            <CartaoFalso key={i} />
          ))}
        </Grade>
      </div>
    </Secao>
  );
}

export function EsqueletoSeminovosHome() {
  return (
    <Secao fundo="branco" espaco="lg">
      <Aviso texto="Carregando os seminovos revisados." />
      <div aria-hidden>
        <CabecalhoFalso />
        <GradeConteudoApoio
          apoioGrudado={false}
          conteudo={
            <div className="grid gap-5">
              {Array.from({ length: 2 }, (_, i) => (
                <div
                  key={i}
                  className="grid gap-5 rounded-2xl border border-graf-200 bg-white p-4 shadow-card sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:p-5"
                >
                  <Esqueleto className="aspect-4/3 w-full rounded-xl sm:aspect-square" />
                  <div>
                    <Esqueleto className="h-6 w-32 rounded-full" />
                    <Esqueleto className="mt-4 h-6 w-3/4 rounded-md" />
                    <Esqueleto className="mt-2 h-4 w-1/3 rounded-md" />
                    <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
                      {Array.from({ length: 4 }, (_, j) => (
                        <Esqueleto key={j} className="h-9 w-full rounded-md" />
                      ))}
                    </div>
                    <Esqueleto className="mt-6 h-8 w-2/5 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          }
          apoio={
            <div className="rounded-2xl border border-graf-200 bg-surface-muted p-6 shadow-card">
              <Esqueleto className="h-7 w-3/5 rounded-md" />
              <Esqueleto className="mt-4 h-4 w-full rounded-md" />
              <Esqueleto className="mt-2 h-4 w-4/5 rounded-md" />
              <div className="mt-6 space-y-3.5 border-t border-graf-200 pt-6">
                {Array.from({ length: 4 }, (_, i) => (
                  <Esqueleto key={i} className="h-4 w-full rounded-md" />
                ))}
              </div>
            </div>
          }
        />
      </div>
    </Secao>
  );
}

export function EsqueletoMarcasHome() {
  return (
    <Secao fundo="branco" espaco="md" separador>
      <Aviso texto="Carregando as marcas do catálogo." />
      <div aria-hidden>
        <div className="mb-8 max-w-2xl">
          <Esqueleto className="h-3.5 w-20 rounded-full" />
          <Esqueleto className="mt-4 h-9 w-3/5 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-graf-200 bg-graf-200 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex min-h-24 items-center justify-center bg-white px-4 py-6">
              <Esqueleto className="h-9 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </Secao>
  );
}
