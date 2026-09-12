import Image from "next/image";
import { Secao } from "@/components/ui/secao";
import Link from "next/link";
import { BadgeCheck, GitCompareArrows } from "lucide-react";

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

const ETAPAS = [
  {
    numero: "01",
    titulo: "A clínica descreve a rotina",
    texto:
      "Quantos consultórios, quantos ciclos por dia, o que já existe na sala. A recomendação nasce daí, não de uma lista de mais vendidos.",
  },
  {
    numero: "02",
    titulo: "O equipamento passa pela bancada",
    texto:
      "Todo seminovo é aberto, testado e fotografado. O que foi trocado aparece no laudo daquela unidade, com nome de peça e resultado item por item.",
  },
  {
    numero: "03",
    titulo: "A JB continua depois da entrega",
    texto:
      "Instalação acompanhada, chamado técnico com a mesma equipe que vendeu, e o equipamento registrado na Área da Clínica com garantia e histórico.",
  },
];

export function BancadaJB() {
  return (
    <Secao largura="loja" espaco="md" separador className="filete mt-8" classNameInterno="grid gap-12 lg:grid-cols-2">
      {/* A coluna da esquerda gruda: as três etapas rolam ao lado dela, e a
          foto continua à vista enquanto se lê o processo que ela mostra. */}
      <div className="min-w-0 lg:sticky lg:top-32 lg:h-fit">
        <p className="etiqueta">a bancada jb</p>
        <h2 className="fonte-display mt-3 text-[clamp(2rem,4.4vw,3.25rem)] text-graf-950">
          O equipamento é aberto antes de ser vendido.
        </h2>
        <p className="mt-5 max-w-lg text-base leading-7 text-graf-700">
          Cada seminovo passa por teste de ciclo, troca de peça de desgaste e registro
          fotográfico. O laudo que você lê na ficha é da unidade que sai daqui — não é descrição
          de modelo.
        </p>
        <div className="mt-8 overflow-hidden rounded-2xl border border-graf-200">
          <Image
            src="/lumina/bancada.jpg"
            alt="Bancada técnica da JB com equipamento odontológico em teste"
            width={1024}
            height={640}
            className="h-72 w-full object-cover"
          />
        </div>
      </div>

      <ol className="min-w-0 space-y-4">
        {ETAPAS.map((etapa) => (
          <li key={etapa.numero} className="papel levanta acorda p-7">
            <span className="fonte-display tabular text-5xl text-graf-200">{etapa.numero}</span>
            <h3 className="fonte-display mt-3 text-2xl text-graf-950">{etapa.titulo}</h3>
            <p className="mt-2 text-corpo leading-6 text-graf-700">{etapa.texto}</p>
          </li>
        ))}
      </ol>
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
            Três equipamentos, uma tela, nenhuma dúvida.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-graf-700">
            O comparador põe especificação, garantia, condição e preço na mesma linha. O que você
            marcar fica guardado enquanto navega pelo catálogo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/comparar"
              className="botao-jb foco-jb inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-corpo"
            >
              <GitCompareArrows className="size-4" aria-hidden />
              Abrir comparador
            </Link>
            <Link
              href="/minha-jb"
              className="botao-osso foco-jb inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-corpo"
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
