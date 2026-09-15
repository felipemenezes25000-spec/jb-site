import {
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  PackageOpen,
  Ruler,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { InstallationPolicy } from "@prisma/client";

import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Preparação, conteúdo da caixa, instalação e pós-compra

   Esta área vive dentro do hub progressivo da PDP. Por isso os subblocos são
   deliberadamente densos: uma moldura leve, cabeçalho curto e informação em
   células. O objetivo é consultar em segundos, não criar quatro mini páginas.
   ============================================================================ */

export type DadosDeInfraestrutura = {
  voltagem: string | null;
  pesoGramas: number | null;
  larguraMm: number | null;
  alturaMm: number | null;
  profundidadeMm: number | null;
  requisitos: string[];
};

function medida(mm: number | null) {
  if (!mm || mm <= 0) return null;
  return `${(mm / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

function rotuloDeVoltagem(bruto: string | null) {
  const valor = (bruto ?? "").trim().toLowerCase();
  if (!valor) return null;
  if (valor === "bivolt") return "Bivolt";
  if (valor === "110" || valor === "127") return "110/127 V";
  if (valor === "220") return "220 V";
  return bruto;
}

function Cabecalho({
  icone: Icone,
  sobretitulo,
  titulo,
  descricao,
}: {
  icone: React.ComponentType<{ className?: string }>;
  sobretitulo: string;
  titulo: string;
  descricao?: string;
}) {
  return (
    <header className="flex items-start gap-2.5 border-b border-graf-200 pb-2.5">
      <Icone className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
      <div className="min-w-0">
        <p className="micro text-jb-700">{sobretitulo}</p>
        <h3 className="mt-0.5 text-sm font-extrabold text-graf-950">{titulo}</h3>
        {descricao ? <p className="texto-apoio mt-0.5 text-graf-500">{descricao}</p> : null}
      </div>
    </header>
  );
}

/* Antes: `rounded-xl border border-graf-200 bg-white` em cada peça — quatro
   cartões brancos com borda dentro de uma seção que já tem `border-t`, dentro
   do container branco da página. Em "Antes de comprar" eram quatro de uma vez.
   O que separa uma peça da outra agora é a régua do cabeçalho e o espaço. */
const MOLDURA = "min-w-0";

/* -------------------------------------------------------- antes de comprar */

/**
 * O que precisa estar pronto na sala — e só isso.
 *
 * Este bloco trazia "Alimentação 220 V", "Dimensões" e "Peso" em três células
 * próprias. Os três já estão na ficha técnica, no grupo "Instalação e espaço",
 * a uma rolagem daqui — e com rótulo diferente: "Alimentação" aqui,
 * "Tensão" lá. Era metade da contagem de repetições que a auditoria mediu na
 * página ("220 V" cinco vezes, com três rótulos).
 *
 * Ficou o que este bloco tem de próprio e não está em lugar nenhum: a lista de
 * pré-requisitos da sala. O resto virou um link para a fonte.
 */
export function AntesDeComprar({
  dados,
  className,
}: {
  dados: DadosDeInfraestrutura;
  className?: string;
}) {
  const temDadosNaFicha = Boolean(
    rotuloDeVoltagem(dados.voltagem) ||
      (dados.pesoGramas ?? 0) > 0 ||
      (medida(dados.larguraMm) && medida(dados.alturaMm) && medida(dados.profundidadeMm)),
  );

  if (!temDadosNaFicha && dados.requisitos.length === 0) return null;

  return (
    <section className={cn(MOLDURA, className)} aria-labelledby="antes-de-comprar">
      <div id="antes-de-comprar">
        <Cabecalho
          icone={Ruler}
          sobretitulo="Prepare a clínica"
          titulo="Compatibilidade com o local"
          descricao="Espaço, alimentação e infraestrutura."
        />
      </div>

      {temDadosNaFicha ? (
        <p className="texto-apoio py-3 text-graf-600">
          Tensão, dimensões e peso estão na{" "}
          <a
            href="#ficha-tecnica"
            className="foco-jb font-bold text-jb-700 underline-offset-2 hover:underline"
          >
            ficha técnica
          </a>
          , no grupo &ldquo;Instalação e espaço&rdquo;.
        </p>
      ) : null}

      {dados.requisitos.length > 0 ? (
        <div className="border-t border-hairline py-3.5">
          <p className="micro text-graf-500">Precisa estar pronto no local</p>
          <ul className="mt-2 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
            {dados.requisitos.map((item) => (
              <li key={item} className="texto-apoio flex gap-2 text-graf-700">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-jb-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------- o que vem junto */

export function OQueVemNaCaixa({
  itens,
  className,
}: {
  itens: string[];
  className?: string;
}) {
  if (itens.length === 0) return null;

  return (
    <section className={cn(MOLDURA, className)} aria-labelledby="o-que-vem-na-caixa">
      <div id="o-que-vem-na-caixa">
        <Cabecalho
          icone={PackageOpen}
          sobretitulo="Conteúdo confirmado"
          titulo="O que vem na caixa"
          descricao={`${itens.length} ${itens.length === 1 ? "item incluído" : "itens incluídos"}`}
        />
      </div>

      <ul className="divide-y divide-hairline">
        {itens.map((item, indice) => (
          <li key={item} className="texto-apoio flex gap-2.5 py-2.5 text-graf-700">
            <span className="tabular flex size-5 shrink-0 items-center justify-center rounded-full bg-graf-100 text-xs font-bold leading-none text-graf-500">
              {indice + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- instalação */

const TEXTO_DA_POLITICA: Record<InstallationPolicy, { titulo: string; texto: string } | null> = {
  nao_informada: null,
  nao_oferecida: {
    titulo: "Instalação não oferecida pela JB",
    texto:
      "O equipamento é entregue pronto para uso ou depende da infraestrutura preparada pela clínica.",
  },
  opcional: {
    titulo: "Instalação disponível como serviço",
    texto: "Pode ser contratada junto com a compra e aparece separada no pedido.",
  },
  inclusa: {
    titulo: "Instalação inclusa",
    texto: "Já está no preço deste equipamento e é agendada após a confirmação da compra.",
  },
  sob_consulta: {
    titulo: "Instalação sob consulta",
    texto: "A equipe avalia local, distância e infraestrutura antes de informar a cobrança.",
  },
};

export function Instalacao({
  politica,
  observacao,
  precoCents,
  className,
}: {
  politica: InstallationPolicy;
  observacao: string;
  precoCents: number | null;
  className?: string;
}) {
  const base = TEXTO_DA_POLITICA[politica];
  if (!base) return null;

  return (
    <section className={cn(MOLDURA, className)} aria-labelledby="instalacao">
      <div id="instalacao">
        <Cabecalho
          icone={Wrench}
          sobretitulo="Implantação"
          titulo="Instalação"
          descricao="Como o equipamento entra em operação."
        />
      </div>

      <div className="py-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
            <Wrench className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-graf-950">{base.titulo}</p>
            <p className="texto-apoio mt-1 text-graf-600">{base.texto}</p>

            {politica === "opcional" && precoCents && precoCents > 0 ? (
              <p className="texto-apoio tabular mt-2 inline-flex rounded-full bg-graf-100 px-2.5 py-1 font-bold text-graf-900">
                {formatarPreco(precoCents)}
              </p>
            ) : null}
          </div>
        </div>

        {observacao ? (
          <p className="texto-apoio mt-3 border-t border-hairline pt-3 text-graf-600">
            {observacao}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------- depois da compra */

type Passo = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
};

export function DepoisDaCompraNoProduto({
  garantiaMeses,
  geraEquipamento,
  className,
}: {
  garantiaMeses: number | null;
  geraEquipamento: boolean;
  className?: string;
}) {
  if (!geraEquipamento) return null;

  const meses = garantiaMeses ?? 0;
  const passos: Passo[] = [
    {
      icone: ClipboardList,
      titulo: "Prontuário Técnico",
      detalhe: "Origem e histórico do equipamento.",
    },
    meses > 0
      ? {
          icone: FileText,
          titulo: `${meses} ${meses === 1 ? "mês" : "meses"} de garantia`,
          detalhe: "Prazo cadastrado a partir da compra.",
        }
      : {
          icone: FileText,
          titulo: "Documentos reunidos",
          detalhe: "Nota, manual e certificados na ficha.",
        },
    {
      icone: History,
      titulo: "Histórico técnico",
      detalhe: "Chamados, orçamentos e reparos.",
    },
    {
      icone: CalendarClock,
      titulo: "Preventiva acompanhada",
      detalhe: "Próximas revisões organizadas.",
    },
  ];

  return (
    <section className={cn(MOLDURA, className)} aria-labelledby="depois-da-compra">
      <div id="depois-da-compra">
        <Cabecalho
          icone={ClipboardList}
          sobretitulo="Continuidade"
          titulo="Depois da compra"
          descricao="O básico do ciclo de vida dentro da JB."
        />
      </div>

      <ul className="grid grid-cols-2 lg:grid-cols-4">
        {passos.map((passo, indice) => {
          const Icone = passo.icone;
          return (
            <li
              key={passo.titulo}
              className={`min-w-0 border-hairline py-3 pr-4 ${
                indice % 2 === 1 ? "border-l pl-4" : ""
              } ${indice >= 2 ? "border-t lg:border-t-0" : ""} ${
                indice > 0 ? "lg:border-l lg:pl-4" : ""
              }`}
            >
              <Icone className="size-3.5 text-jb-600" aria-hidden />
              <p className="mt-2 text-sm font-extrabold leading-5 text-graf-950">
                {passo.titulo}
              </p>
              <p className="texto-apoio mt-0.5 text-graf-500">{passo.detalhe}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
