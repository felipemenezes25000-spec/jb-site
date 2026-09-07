import {
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  Package,
  PlugZap,
  Ruler,
  Wrench,
} from "lucide-react";
import type { InstallationPolicy } from "@prisma/client";

import { Cartao } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   O que vem antes e o que vem depois da compra

   Três seções que faltavam na página do produto, e as três respondem a
   perguntas que fazem a pessoa desistir quando ficam sem resposta:

     "Cabe na minha sala?"          → Antes de comprar
     "Preciso comprar mais alguma
      coisa para usar?"             → O que vem na caixa
     "Quem instala?"                → Instalação
     "E se der problema depois?"    → Depois da compra

   Nenhuma delas inventa dado. Cada bloco some inteiro quando o cadastro está
   vazio — o contrário produziria uma ficha cheia de "não informado", que é
   pior do que não ter a seção: ela ocupa espaço para dizer que a JB não sabe.

   O bloco "Depois da compra" é o único que não depende de cadastro, porque
   descreve o que a plataforma faz com TODA compra de equipamento. Ainda assim
   ele fala no futuro e sem ícone de confirmação: nada disso aconteceu ainda
   para esta unidade. Ver docs/evolucao-jb/direcao-visual.md, seção 3.
   ============================================================================ */

/* -------------------------------------------------------- antes de comprar */

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

/**
 * O que a clínica precisa conferir antes de comprar.
 *
 * Dimensões viram uma linha só, no formato largura × altura × profundidade,
 * porque é assim que alguém mede uma sala — três linhas separadas obrigam a
 * pessoa a remontar a caixa de cabeça.
 */
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
    dimensoes ? { icone: Ruler, rotulo: "Largura × altura × profundidade", valor: dimensoes } : null,
    peso ? { icone: Package, rotulo: "Peso", valor: peso } : null,
  ].filter((f) => f !== null);

  // seção inteira some quando não há nada cadastrado
  if (fichas.length === 0 && dados.requisitos.length === 0) return null;

  return (
    <section className={className} aria-labelledby="antes-de-comprar">
      <h2 id="antes-de-comprar" className="text-title texto-forte">
        Antes de comprar
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
        Confira se a sala e a instalação da clínica atendem ao equipamento.
      </p>

      {fichas.length > 0 ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {fichas.map((ficha) => {
            const Icone = ficha.icone;
            return (
              <div
                key={ficha.rotulo}
                className="rounded-xl border border-graf-200 bg-white px-4 py-3.5"
              >
                <dt className="flex items-center gap-2 text-[0.8125rem] text-graf-500">
                  <Icone className="size-4 shrink-0 text-graf-500" aria-hidden />
                  {ficha.rotulo}
                </dt>
                <dd className="tabular mt-1 text-base font-bold text-graf-950">{ficha.valor}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {dados.requisitos.length > 0 ? (
        <>
          <p className="mt-6 text-sm font-bold text-graf-950">
            O que precisa estar pronto no local
          </p>
          <ul className="mt-2.5 space-y-2">
            {dados.requisitos.map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-graf-700">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-graf-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
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
    <section className={className} aria-labelledby="o-que-vem-na-caixa">
      <h2 id="o-que-vem-na-caixa" className="text-title texto-forte">
        O que vem na caixa
      </h2>
      <ul className="mt-4 divide-y divide-graf-100 rounded-xl border border-graf-200">
        {itens.map((item) => (
          <li key={item} className="px-4 py-3 text-[0.9375rem] leading-relaxed text-graf-700">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.8125rem] leading-relaxed text-graf-500">
        O que não estiver nesta lista é vendido à parte. Em dúvida, fale com a equipe antes de
        comprar.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- instalação */

const TEXTO_DA_POLITICA: Record<InstallationPolicy, { titulo: string; texto: string } | null> = {
  nao_informada: null,
  nao_oferecida: {
    titulo: "A JB não instala este equipamento",
    texto:
      "Ele é entregue pronto para uso ou depende de instalação por quem já cuida da " +
      "infraestrutura da clínica.",
  },
  opcional: {
    titulo: "Instalação disponível como serviço",
    texto: "Pode ser contratada junto com a compra. O valor aparece no resumo do pedido.",
  },
  inclusa: {
    titulo: "Instalação inclusa",
    texto: "Já está no preço deste equipamento. A visita é agendada depois da confirmação.",
  },
  sob_consulta: {
    titulo: "Instalação disponível sob consulta",
    texto:
      "Depende do local, da distância e do que precisa ser preparado. A equipe avalia e " +
      "informa antes de qualquer cobrança.",
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
  /** Preço do adicional de instalação, quando existe um cadastrado. */
  precoCents: number | null;
  className?: string;
}) {
  const base = TEXTO_DA_POLITICA[politica];

  // ninguém declarou: a seção não existe, em vez de afirmar por omissão
  if (!base) return null;

  return (
    <section className={className} aria-labelledby="instalacao">
      <h2 id="instalacao" className="text-title texto-forte">
        Instalação
      </h2>

      <Cartao className="mt-4 flex items-start gap-3.5 p-5">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-600"
        >
          <Wrench className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold text-graf-950">{base.titulo}</p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-graf-600">{base.texto}</p>

          {/* O preço só aparece quando é `opcional` E existe adicional
              cadastrado. Em `sob_consulta`, mostrar valor contradiria a
              própria política. */}
          {politica === "opcional" && precoCents && precoCents > 0 ? (
            <p className="tabular mt-3 text-sm font-semibold text-graf-900">
              {formatarPreco(precoCents)}
            </p>
          ) : null}

          {observacao ? (
            <p className="mt-3 border-t border-graf-200 pt-3 text-[0.9375rem] leading-relaxed text-graf-600">
              {observacao}
            </p>
          ) : null}
        </div>
      </Cartao>
    </section>
  );
}

/* ------------------------------------------------------- depois da compra */

type Passo = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
};

/**
 * O que a plataforma faz com este equipamento depois da compra.
 *
 * Não depende de cadastro: descreve o que acontece com toda compra de
 * equipamento. Mas fala no FUTURO e sem ícone de confirmação — nada disso
 * aconteceu ainda para esta unidade, e um check aqui afirmaria instalação ou
 * inspeção que ninguém fez.
 *
 * A garantia é a única linha que varia, e ela só aparece com prazo cadastrado.
 * Prometer "12 meses" por padrão seria inventar cobertura.
 */
export function DepoisDaCompraNoProduto({
  garantiaMeses,
  geraEquipamento,
  className,
}: {
  garantiaMeses: number | null;
  /**
   * Serviço, peça e acessório não viram equipamento no prontuário. Dizer que
   * viram encheria a Área da Clínica de linhas que não são máquina nenhuma.
   */
  geraEquipamento: boolean;
  className?: string;
}) {
  if (!geraEquipamento) return null;

  const meses = garantiaMeses ?? 0;

  const passos: Passo[] = [
    {
      icone: ClipboardList,
      titulo: "Entra no Prontuário Técnico JB",
      detalhe:
        "Assim que o pagamento é confirmado, o equipamento aparece na Área da Clínica com " +
        "origem, data e histórico próprio.",
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
          detalhe: "Nota, manual e certificados ficam disponíveis para download na ficha.",
        },
    {
      icone: History,
      titulo: "Histórico técnico",
      detalhe: "Cada chamado, orçamento e reparo fica registrado na ficha do aparelho.",
    },
    {
      icone: CalendarClock,
      titulo: "Preventiva acompanhada",
      detalhe:
        "A próxima revisão é definida no cadastro do equipamento, conforme a periodicidade.",
    },
  ];

  return (
    <section className={className} aria-labelledby="depois-da-compra">
      <h2 id="depois-da-compra" className="text-title texto-forte">
        Depois da compra
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
        O que a JB registra sobre este equipamento a partir do momento em que ele é seu.
      </p>

      <ul className={cn("mt-5 grid gap-5 sm:grid-cols-2")}>
        {passos.map((passo) => {
          const Icone = passo.icone;
          return (
            <li key={passo.titulo} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-graf-200 bg-white text-graf-600"
              >
                <Icone className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-bold leading-snug text-graf-950">
                  {passo.titulo}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-graf-600">{passo.detalhe}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
