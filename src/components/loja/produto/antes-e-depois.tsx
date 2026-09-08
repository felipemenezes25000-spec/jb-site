import {
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  Package,
  PackageOpen,
  PlugZap,
  Ruler,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { InstallationPolicy } from "@prisma/client";

import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Preparação, conteúdo da caixa, instalação e pós-compra

   Os quatro blocos usam a mesma linguagem visual da ficha técnica: título
   forte, explicação curta, dados escaneáveis e uma única moldura. Isso elimina
   a sensação de vários widgets independentes e transforma a área em uma
   sequência lógica de decisão.
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
    <header className="flex items-start gap-3 border-b border-graf-200 bg-graf-50/70 px-5 py-4 sm:px-6">
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-graf-200 bg-white text-jb-700 shadow-sm">
        <Icone className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-jb-700">
          {sobretitulo}
        </p>
        <h2 className="mt-1 text-base font-bold tracking-[-0.01em] text-graf-950">{titulo}</h2>
        {descricao ? <p className="mt-1 text-sm leading-5 text-graf-500">{descricao}</p> : null}
      </div>
    </header>
  );
}

const MOLDURA =
  "overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]";

/* -------------------------------------------------------- antes de comprar */

export function AntesDeComprar({
  dados,
  className,
}: {
  dados: DadosDeInfraestrutura;
  className?: string;
}) {
  const voltagem = rotuloDeVoltagem(dados.voltagem);
  const l = medida(dados.larguraMm);
  const a = medida(dados.alturaMm);
  const p = medida(dados.profundidadeMm);
  const dimensoes = l && a && p ? `${l} × ${a} × ${p}` : null;
  const peso =
    dados.pesoGramas && dados.pesoGramas > 0
      ? `${(dados.pesoGramas / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`
      : null;

  const fichas = [
    voltagem ? { icone: PlugZap, rotulo: "Alimentação", valor: voltagem } : null,
    dimensoes ? { icone: Ruler, rotulo: "Dimensões (L × A × P)", valor: dimensoes } : null,
    peso ? { icone: Package, rotulo: "Peso", valor: peso } : null,
  ].filter((f) => f !== null);

  if (fichas.length === 0 && dados.requisitos.length === 0) return null;

  return (
    <section className={cn(MOLDURA, className)} aria-labelledby="antes-de-comprar">
      <div id="antes-de-comprar">
        <Cabecalho
          icone={Ruler}
          sobretitulo="Prepare a clínica"
          titulo="Antes de comprar"
          descricao="O essencial para saber se o equipamento cabe e pode ser instalado no local."
        />
      </div>

      {fichas.length > 0 ? (
        <dl className="grid sm:grid-cols-3">
          {fichas.map((ficha, indice) => {
            const Icone = ficha.icone;
            return (
              <div
                key={ficha.rotulo}
                className={`min-w-0 border-graf-200 px-5 py-4 sm:px-6 ${
                  indice > 0 ? "border-t sm:border-l sm:border-t-0" : ""
                }`}
              >
                <dt className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.075em] text-graf-500">
                  <Icone className="size-3.5 shrink-0" aria-hidden />
                  {ficha.rotulo}
                </dt>
                <dd className="tabular mt-1.5 break-words text-[0.9375rem] font-bold text-graf-950">
                  {ficha.valor}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {dados.requisitos.length > 0 ? (
        <div className="border-t border-graf-200 px-5 py-5 sm:px-6">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-graf-500">
            O que precisa estar pronto no local
          </p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {dados.requisitos.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-6 text-graf-700">
                <ShieldCheck className="mt-1 size-4 shrink-0 text-jb-600" aria-hidden />
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
          descricao="Itens incluídos no fornecimento deste equipamento."
        />
      </div>

      <ul className="divide-y divide-graf-100 px-5 sm:px-6">
        {itens.map((item, indice) => (
          <li key={item} className="flex gap-3 py-3.5 text-[0.9375rem] leading-6 text-graf-700">
            <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-graf-100 text-[0.6875rem] font-bold text-graf-500">
              {String(indice + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="border-t border-graf-100 bg-graf-50/55 px-5 py-3.5 text-[0.75rem] leading-5 text-graf-500 sm:px-6">
        O que não estiver nesta lista é vendido à parte. Em dúvida, confirme com a equipe antes da compra.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- instalação */

const TEXTO_DA_POLITICA: Record<InstallationPolicy, { titulo: string; texto: string } | null> = {
  nao_informada: null,
  nao_oferecida: {
    titulo: "Instalação não oferecida pela JB",
    texto:
      "O equipamento é entregue pronto para uso ou depende de instalação por quem cuida da infraestrutura da clínica.",
  },
  opcional: {
    titulo: "Instalação disponível como serviço",
    texto: "Pode ser contratada junto com a compra e aparece separada no resumo do pedido.",
  },
  inclusa: {
    titulo: "Instalação inclusa",
    texto: "Já está no preço deste equipamento. A visita é agendada depois da confirmação da compra.",
  },
  sob_consulta: {
    titulo: "Instalação disponível sob consulta",
    texto: "A equipe avalia local, distância e infraestrutura antes de informar qualquer cobrança.",
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
          descricao="Como este equipamento entra em operação na clínica."
        />
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
            <Wrench className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-graf-950">{base.titulo}</p>
            <p className="mt-1.5 text-[0.9375rem] leading-6 text-graf-600">{base.texto}</p>

            {politica === "opcional" && precoCents && precoCents > 0 ? (
              <p className="tabular mt-3 inline-flex rounded-full bg-graf-100 px-3 py-1.5 text-sm font-bold text-graf-900">
                {formatarPreco(precoCents)}
              </p>
            ) : null}
          </div>
        </div>

        {observacao ? (
          <p className="mt-5 border-t border-graf-200 pt-4 text-[0.875rem] leading-6 text-graf-600">
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
      titulo: "Prontuário Técnico JB",
      detalhe: "Depois da confirmação, o equipamento passa a ter origem, data e histórico próprios.",
    },
    meses > 0
      ? {
          icone: FileText,
          titulo: `Garantia de ${meses} ${meses === 1 ? "mês" : "meses"}`,
          detalhe: "Prazo cadastrado para este equipamento, contado a partir da compra.",
        }
      : {
          icone: FileText,
          titulo: "Documentos reunidos",
          detalhe: "Nota, manual e certificados ficam concentrados na ficha do equipamento.",
        },
    {
      icone: History,
      titulo: "Histórico técnico",
      detalhe: "Chamados, orçamentos e reparos ficam registrados na mesma linha do tempo.",
    },
    {
      icone: CalendarClock,
      titulo: "Preventiva acompanhada",
      detalhe: "A próxima revisão pode ser acompanhada conforme a periodicidade cadastrada.",
    },
  ];

  return (
    <section className={cn(MOLDURA, className)} aria-labelledby="depois-da-compra">
      <div id="depois-da-compra">
        <Cabecalho
          icone={ClipboardList}
          sobretitulo="Continuidade"
          titulo="Depois da compra"
          descricao="A relação com o equipamento continua organizada depois da entrega."
        />
      </div>

      <ul className="grid sm:grid-cols-2">
        {passos.map((passo, indice) => {
          const Icone = passo.icone;
          return (
            <li
              key={passo.titulo}
              className={`flex min-w-0 gap-3.5 border-graf-200 px-5 py-4 sm:px-6 ${
                indice >= 2 ? "border-t" : ""
              } ${indice % 2 === 1 ? "sm:border-l" : ""} ${
                indice === 1 ? "border-t sm:border-t-0" : ""
              }`}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-graf-100 text-graf-600">
                <Icone className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-bold leading-5 text-graf-950">{passo.titulo}</p>
                <p className="mt-1 text-[0.8125rem] leading-5 text-graf-500">{passo.detalhe}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
