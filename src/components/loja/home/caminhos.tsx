import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShoppingBag, Wrench } from "lucide-react";

import { TituloSecao } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import type { Foto } from "@/components/loja/home/comum";
import { CONDICOES } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

/* ============================================================================
   Três caminhos

   Quem chega na JB quer uma de três coisas: comprar, consertar ou acompanhar
   o que já tem. A faixa resolve a intenção num olhar.

   A composição é assimétrica de propósito. Três cartões iguais lado a lado
   viram tabela de preço: o olho compara colunas em vez de escolher um
   caminho. Aqui a compra ocupa a área maior e mostra equipamento de verdade,
   a assistência leva o vermelho da marca — é o que diferencia a JB — e a
   Área da Clínica fica em grafite, porque é a única das três que é um
   produto de tela, não uma loja.

   Sem bullet: cada painel diz uma frase e oferece uma ação. O detalhe de
   cada frente está na faixa própria dela, mais abaixo na página.
   ============================================================================ */

export function TresCaminhos({ foto }: { foto?: Foto | null }) {
  return (
    <Secao fundo="clara" espaco="lg">
      <TituloSecao
        sobretitulo="Por onde começar"
        titulo="Três caminhos, uma empresa só"
        descricao="Comprar, consertar e acompanhar não são áreas separadas na JB — são etapas do mesmo ciclo."
        className="mb-10"
      />

      <div className="grid gap-5 lg:grid-cols-[1.22fr_1fr] lg:gap-6">
        <CaminhoComprar foto={foto ?? null} />

        <div className="grid gap-5 lg:gap-6">
          <CaminhoAssistencia />
          <CaminhoClinica />
        </div>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------------ compra */

/** O painel grande: a fotografia do equipamento é o argumento. */
function CaminhoComprar({ foto }: { foto: Foto | null }) {
  return (
    <Link
      href="/loja"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-graf-200 bg-white",
        "transition-[border-color,box-shadow] duration-200 hover:border-graf-300 hover:shadow-raised",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
      )}
    >
      {foto ? (
        <div className="relative min-h-56 flex-1 overflow-hidden bg-gradient-to-b from-white to-graf-50">
          <Image
            src={foto.url}
            alt=""
            fill
            sizes="(max-width: 1024px) 92vw, 44vw"
            className="object-contain p-8 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        </div>
      ) : null}

      <div className="border-t border-graf-200 p-7 sm:p-8">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-xl bg-graf-100 text-graf-700"
        >
          <ShoppingBag className="size-5.5" />
        </span>

        <h3 className="mt-5 text-title text-graf-950">Comprar equipamentos</h3>
        <p className="mt-3 max-w-md text-base leading-relaxed text-graf-600">
          O catálogo completo, com foto, ficha técnica, condição declarada e o preço de
          cada equipamento.
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {CONDICOES.map((condicao) => (
            <li
              key={condicao.slug}
              className="rounded-full border border-graf-200 bg-graf-50 px-3 py-1.5 text-xs font-semibold text-graf-600"
            >
              {condicao.rotulo}
            </li>
          ))}
        </ul>

        <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
          Ver o catálogo
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------- assistência */

/** O caminho que diferencia a JB — é o único que leva o vermelho da marca. */
function CaminhoAssistencia() {
  return (
    <Link
      href="/assistencia-tecnica/solicitar"
      className={cn(
        "group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-jb-200 bg-white p-7 sm:p-8",
        "transition-[border-color,box-shadow] duration-200 hover:border-jb-300 hover:shadow-raised",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
      )}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-jb-500" />

      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-xl bg-jb-50 text-jb-600"
      >
        <Wrench className="size-5.5" />
      </span>

      <h3 className="mt-5 text-title text-graf-950">Preciso de assistência</h3>
      <p className="mt-3 text-base leading-relaxed text-graf-600">
        Descreva o defeito e a equipe técnica assume o atendimento do começo ao fim —
        triagem, diagnóstico, orçamento para aprovar e ordem de serviço.
      </p>

      <span className="mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
        Abrir um chamado
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------- área da clínica */

/** Grafite: das três frentes, é a única que é tela e não loja. */
function CaminhoClinica() {
  return (
    <Link
      href="/minha-jb"
      className={cn(
        "on-dark group relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-graf-950 p-7 text-graf-300 sm:p-8",
        "transition-[box-shadow] duration-200 hover:shadow-pop",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
      )}
    >
      <span
        aria-hidden
        className="field-orbit pointer-events-none absolute inset-0 opacity-100 [mask-image:radial-gradient(60%_70%_at_100%_0%,#000,transparent)]"
      />

      <span
        aria-hidden
        className="relative flex size-11 items-center justify-center rounded-xl bg-white/10 text-white"
      >
        <LayoutDashboard className="size-5.5" />
      </span>

      <h3 className="relative mt-5 text-title">Área da Clínica</h3>
      <p className="relative mt-3 text-base leading-relaxed text-graf-300">
        O pós-venda reunido: o que você comprou, o que está em atendimento, as
        manutenções previstas e os documentos de cada equipamento.
      </p>

      <span className="relative mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-bold text-white transition-transform duration-200 group-hover:translate-x-0.5">
        Entrar na Área da Clínica
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </span>
    </Link>
  );
}
