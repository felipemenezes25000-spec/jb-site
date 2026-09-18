import { Secao } from "@/components/ui/secao";
import Link from "next/link";
import { BadgeCheck, GitCompareArrows } from "lucide-react";
import { BancadaProcesso } from "./bancada-processo";

/* ============================================================================
   A bancada e o comparador

   Duas seções que a loja precisava e não tinha:

   · **A bancada** é o argumento central da JB — o que separa "loja que revende
     usado" de "assistência técnica que também vende". Ele aparecia espalhado
     em frase solta na ficha de produto e no rodapé, nunca como bloco.
   · **O comparador** existe, funciona e guarda a escolha entre páginas, mas só
     era descoberto por quem esbarrasse na barra flutuante depois de marcar um
     produto. Um recurso que ninguém acha é um recurso que não existe.

   Cada frase daqui já é dita em outro lugar do site — o laudo por unidade em
   `unidade-fisica.tsx`, a garantia na ficha, a peça de reposição no rodapé.
   Nenhuma promessa nova foi inventada para encher a seção.
   ============================================================================ */

export function BancadaJB() {
  return (
    <Secao largura="loja" espaco="md" separador className="filete mt-8" rotuladoPor="bancada-jb-titulo">
      <div className="grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-16">
        <div>
          <p className="etiqueta">a bancada jb</p>
          <h2 id="bancada-jb-titulo" className="mt-3 max-w-2xl text-section">
            O equipamento é aberto antes de ser vendido.
          </h2>
        </div>
        <p className="max-w-lg text-base leading-7 text-graf-950">
          Cada seminovo passa por teste de ciclo, troca de peça de desgaste e registro
          fotográfico. O laudo que você lê na ficha é da unidade que sai daqui — não é descrição
          de modelo.
        </p>
      </div>
      <BancadaProcesso />
    </Secao>
  );
}

export function ChamadaComparador() {
  return (
    <section className="container-loja pb-16">
      <div className="papel relative overflow-hidden p-8 lg:p-12">
        <div className="malha pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="etiqueta">decisão sem achismo</p>
          <h2 className="fonte-display mt-3 text-[clamp(1.9rem,4vw,3rem)] text-graf-950">
            Compare os detalhes que fazem diferença.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-graf-700">
            O comparador põe especificação, garantia, condição e preço na mesma linha. O que você
            marcar fica guardado enquanto navega pelo catálogo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/comparar"
              className="botao-osso foco-jb inline-flex min-h-12 items-center gap-2 rounded-lg px-6 text-corpo"
            >
              <GitCompareArrows className="size-4" aria-hidden />
              Abrir comparador
            </Link>
            <Link
              href="/minha-jb"
              className="foco-jb inline-flex min-h-12 items-center gap-2 rounded-lg px-3 text-corpo font-semibold text-graf-700 underline decoration-graf-300 underline-offset-4 hover:text-jb-700"
            >
              <BadgeCheck className="size-4" aria-hidden />
              Área da Clínica
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
