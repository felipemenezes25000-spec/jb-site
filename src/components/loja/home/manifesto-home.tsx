import Image from "next/image";
import { ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react";

/* ============================================================================
   Faixa correndo e manifesto

   As duas seções que davam ao protótipo o fôlego entre a abertura e o
   catálogo: uma tira de texto gigante andando devagar, e um bloco editorial
   com foto de clínica e dois cartões flutuantes.

   O que mudou em relação ao protótipo, e por quê:

   · **Os números vêm do banco.** O protótipo cravava "24m garantia máxima",
     "100% com laudo", "15 anos", "1200+ consultórios" e "94% em até 48h".
     Os dois primeiros conferem com este catálogo e por isso entram — mas
     calculados, não escritos. Os três últimos são invenção de protótipo:
     número de clínica atendida e prazo de chamado não estão em lugar nenhum
     do sistema, e publicá-los seria a mesma classe de erro do "MARKETPLACE"
     que saiu do cabeçalho. Ficaram de fora até a JB informar os reais.
   · **"100% com laudo" virou "todo seminovo".** Laudo é documento de unidade
     que passou pela bancada; equipamento novo de caixa não tem. A frase
     original dizia do catálogo inteiro o que vale para uma parte dele.
   ============================================================================ */

const RECADOS = [
  "laudo por unidade",
  "garantia por escrito",
  "assistência própria",
  "instalação acompanhada",
  "peça em estoque",
  "comparação lado a lado",
];

export function FaixaCorrendo() {
  return (
    <section
      className="overflow-hidden border-b border-graf-200 py-4"
      aria-label="O que a JB entrega junto"
    >
      {/* A lista vai duplicada de propósito: a animação anda exatamente 50%,
          e é a segunda cópia que faz a emenda ser invisível. A duplicata é
          decorativa — quem ouve a página lê a lista uma vez só. */}
      <ul className="marquise flex w-max items-center gap-10 whitespace-nowrap">
        {RECADOS.map((recado) => (
          <li
            key={recado}
            className="fonte-display flex items-center gap-10 text-[clamp(1.4rem,3vw,2.2rem)] text-graf-950/80"
          >
            {recado}
            <span className="size-2 rounded-full bg-jb-500" aria-hidden />
          </li>
        ))}
        {RECADOS.map((recado) => (
          <li
            key={`eco-${recado}`}
            aria-hidden
            className="fonte-display flex items-center gap-10 text-[clamp(1.4rem,3vw,2.2rem)] text-graf-950/80"
          >
            {recado}
            <span className="size-2 rounded-full bg-jb-500" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}

const PILARES = [
  { titulo: "Bancada própria", texto: "Conserto em São Paulo, sem terceirizar." },
  { titulo: "Peça em estoque", texto: "Reposição sem espera de importação." },
  { titulo: "Instalação acompanhada", texto: "A mesma equipe vende e instala." },
  { titulo: "Comparação antes", texto: "Modelos lado a lado, com a ficha de cada um." },
];

export function ManifestoJB({
  garantiaMaximaMeses,
  temSeminovo,
}: {
  garantiaMaximaMeses: number | null;
  temSeminovo: boolean;
}) {
  return (
    <section className="container-jb py-16">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative min-w-0">
          <div className="relative overflow-hidden rounded-[2rem] border border-graf-200 shadow-raised">
            <Image
              src="/lumina/clinica-hero.jpg"
              alt="Clínica odontológica equipada pela JB Soluções"
              width={1920}
              height={1088}
              className="h-[28rem] w-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-graf-950/30 via-transparent to-transparent"
              aria-hidden
            />
          </div>

          {garantiaMaximaMeses ? (
            <div className="absolute -top-5 -right-3 hidden rounded-2xl border border-graf-200 bg-surface px-5 py-4 shadow-pop sm:block">
              <ShieldCheck className="size-5 text-jb-500" aria-hidden />
              <p className="fonte-display tabular mt-2 text-2xl text-graf-950">
                {garantiaMaximaMeses}m
              </p>
              <p className="micro text-graf-500">garantia máxima</p>
            </div>
          ) : null}

          {temSeminovo ? (
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-graf-200 bg-surface px-5 py-4 shadow-pop sm:block">
              <ClipboardCheck className="size-5 text-jb-500" aria-hidden />
              <p className="fonte-display mt-2 text-2xl text-graf-950">Todo</p>
              <p className="micro text-graf-500">seminovo com laudo</p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="etiqueta flex items-center gap-2 text-jb-600">
            <Sparkles className="size-3.5" aria-hidden />
            por que a jb é diferente
          </p>
          <h2 className="fonte-display mt-4 text-[clamp(2rem,4.6vw,3.5rem)] leading-[1.02] text-graf-950">
            Não vendemos caixa fechada.
            <span className="block text-graf-500">Vendemos certeza.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-graf-700">
            Cada equipamento — novo ou seminovo — passa pela bancada antes de chegar na sua
            clínica. O seminovo é aberto, testado, fotografado e sai com laudo da própria unidade.
            Não é descrição de catálogo, é o histórico da máquina que você comprou.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {PILARES.map((pilar) => (
              <div key={pilar.titulo} className="rounded-xl border border-graf-200 p-4">
                <p className="text-apoio font-extrabold text-graf-950">{pilar.titulo}</p>
                <p className="micro mt-1 text-graf-500">{pilar.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
