import type { Metadata } from "next";
import { AlertTriangle, Calculator, Info } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import { formatarPreco } from "@/lib/format";
import {
  EXPLICACAO_DA_ORIGEM,
  ROTULO_DA_ORIGEM,
  ROTULO_DO_CENARIO,
  compararCenarios,
  custoDeParada,
  linhaDoReparo,
  totalDoCenario,
  type Cenario,
  type LinhaDeCusto,
} from "@/lib/tco";
import { metadataDePagina } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

export const metadata: Metadata = metadataDePagina({
  titulo: "Reparar, seminovo ou novo",
  descricao:
    "Simulação de custo total num horizonte declarado, separando o que é valor real do que é premissa sua.",
  caminho: "/simulador-de-custo",
});

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Reparar, seminovo ou novo" }];

type Props = {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
};

function primeiro(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/** Reais informados no formulário → centavos. Vazio vira `null`, não zero. */
function paraCentavos(bruto: string): number | null {
  const limpo = bruto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) : null;
}

function CampoDinheiro({
  nome,
  rotulo,
  ajuda,
  valor,
}: {
  nome: string;
  rotulo: string;
  ajuda?: string;
  valor: string;
}) {
  return (
    <div>
      <label htmlFor={nome} className="block text-[0.875rem] font-semibold text-graf-900">
        {rotulo}
      </label>
      {ajuda ? (
        <p className="mt-0.5 text-[0.75rem] leading-relaxed text-graf-500">{ajuda}</p>
      ) : null}
      <input
        id={nome}
        name={nome}
        type="text"
        inputMode="decimal"
        defaultValue={valor}
        placeholder="deixe vazio se não souber"
        className="mt-2 min-h-11 w-full rounded-lg border border-graf-300 bg-white px-3 text-[0.875rem] text-graf-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
      />
    </div>
  );
}

function Memoria({ cenario }: { cenario: Cenario }) {
  const total = totalDoCenario(cenario);

  return (
    <Cartao className="p-5">
      <h3 className="text-[1.0625rem] font-bold text-graf-950">
        {ROTULO_DO_CENARIO[cenario.chave]}
      </h3>

      {/* A memória de cálculo, linha por linha, com a origem de cada valor.
          É o que separa uma simulação conferível de um número mágico. */}
      <dl className="mt-3 space-y-2 text-[0.875rem]">
        {cenario.linhas.map((linha) => (
          <div
            key={linha.rotulo}
            className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-graf-100 pb-2 last:border-0"
          >
            <dt className="text-graf-600">
              {linha.rotulo}
              <span className="ml-2 rounded bg-graf-100 px-1.5 py-0.5 text-[0.6875rem] text-graf-600">
                {ROTULO_DA_ORIGEM[linha.origem]}
              </span>
              {linha.procedencia ? (
                <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-graf-500">
                  {linha.procedencia}
                </span>
              ) : null}
            </dt>
            <dd
              className={
                linha.valorCents === null
                  ? "italic text-graf-400"
                  : "tabular font-semibold text-graf-900"
              }
            >
              {linha.valorCents === null ? "sem dado" : formatarPreco(linha.valorCents)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 border-t border-graf-300 pt-3">
        <span className="text-[0.875rem] font-bold text-graf-950">
          {total.incompleto ? "Total parcial" : "Total no período"}
        </span>
        <span className="tabular text-lg font-extrabold text-graf-950">
          {formatarPreco(total.totalCents)}
        </span>
      </div>

      {total.incompleto ? (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-jb-700">
          {total.linhasSemDado === 1
            ? "Um custo deste cenário não foi informado, e ele não vale zero."
            : `${total.linhasSemDado} custos deste cenário não foram informados, e eles não valem zero.`}{" "}
          O total acima é parcial.
        </p>
      ) : null}

      {total.dePremissaCents > 0 ? (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-graf-500">
          {formatarPreco(total.dePremissaCents)} deste total veio de premissa sua, não de valor
          praticado.
        </p>
      ) : null}

      {cenario.observacoes.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-graf-200 pt-3">
          {cenario.observacoes.map((observacao) => (
            <li key={observacao} className="text-[0.8125rem] leading-relaxed text-graf-600">
              {observacao}
            </li>
          ))}
        </ul>
      ) : null}
    </Cartao>
  );
}

export default async function SimuladorPage({ searchParams }: Props) {
  const params = await searchParams;

  const anos = Math.min(10, Math.max(1, Number(primeiro(params.anos)) || 5));

  const reparo = paraCentavos(primeiro(params.reparo));
  const manutencaoReparo = paraCentavos(primeiro(params.manutencaoReparo));
  const seminovo = paraCentavos(primeiro(params.seminovo));
  const manutencaoSeminovo = paraCentavos(primeiro(params.manutencaoSeminovo));
  const novo = paraCentavos(primeiro(params.novo));
  const manutencaoNovo = paraCentavos(primeiro(params.manutencaoNovo));
  const instalacao = paraCentavos(primeiro(params.instalacao));
  const parada = paraCentavos(primeiro(params.parada));
  const paradaJaIncluida = primeiro(params.paradaIncluida) === "sim";

  const simulou = [reparo, seminovo, novo].some((valor) => valor !== null);

  const decisaoDaParada = custoDeParada({
    cents: parada,
    jaIncluidoEmOutraPremissa: paradaJaIncluida,
  });

  /** A linha de parada, quando ela entra. Ela entra uma vez, e só num lugar. */
  const linhaDaParada: LinhaDeCusto[] = decisaoDaParada.incluir
    ? [
        {
          rotulo: "Custo dos dias parados",
          valorCents: decisaoDaParada.cents,
          origem: "premissa",
          procedencia: decisaoDaParada.ondeEntrou,
        },
      ]
    : [];

  const anual = (valor: number | null) => (valor === null ? null : valor * anos);

  const cenarios: Cenario[] = [
    {
      chave: "reparar",
      titulo: ROTULO_DO_CENARIO.reparar,
      linhas: [
        linhaDoReparo(reparo),
        {
          rotulo: `Manutenção em ${anos} ${anos === 1 ? "ano" : "anos"}`,
          valorCents: anual(manutencaoReparo),
          origem: manutencaoReparo === null ? "ausente" : "premissa",
          procedencia:
            manutencaoReparo === null
              ? "Você não informou o custo anual de manutenção."
              : `${formatarPreco(manutencaoReparo)} por ano, informado por você.`,
        },
        ...linhaDaParada,
      ],
      observacoes: [
        "O equipamento continua sendo o mesmo: idade, histórico e garantia não mudam.",
      ],
    },
    {
      chave: "seminovo",
      titulo: ROTULO_DO_CENARIO.seminovo,
      linhas: [
        {
          rotulo: "Aquisição",
          valorCents: seminovo,
          origem: seminovo === null ? "ausente" : "conhecido",
          procedencia: seminovo === null ? "Preço não informado." : "Preço do equipamento.",
        },
        {
          rotulo: "Instalação",
          valorCents: instalacao,
          origem: instalacao === null ? "ausente" : "premissa",
        },
        {
          rotulo: `Manutenção em ${anos} ${anos === 1 ? "ano" : "anos"}`,
          valorCents: anual(manutencaoSeminovo),
          origem: manutencaoSeminovo === null ? "ausente" : "premissa",
        },
      ],
      observacoes: [
        "Um seminovo do programa da JB sai com checklist de inspeção e código de verificação.",
      ],
    },
    {
      chave: "novo",
      titulo: ROTULO_DO_CENARIO.novo,
      linhas: [
        {
          rotulo: "Aquisição",
          valorCents: novo,
          origem: novo === null ? "ausente" : "conhecido",
          procedencia: novo === null ? "Preço não informado." : "Preço do equipamento.",
        },
        {
          rotulo: "Instalação",
          valorCents: instalacao,
          origem: instalacao === null ? "ausente" : "premissa",
        },
        {
          rotulo: `Manutenção em ${anos} ${anos === 1 ? "ano" : "anos"}`,
          valorCents: anual(manutencaoNovo),
          origem: manutencaoNovo === null ? "ausente" : "premissa",
        },
      ],
      observacoes: ["Garantia de fábrica cobre parte do período simulado."],
    },
  ];

  const comparacao = compararCenarios(cenarios, anos);

  return (
    <>
      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Simulação"
          titulo="Reparar, trocar por um seminovo ou comprar um novo"
          descricao="Os três cenários no mesmo período, com a memória de cálculo à vista. O que você informar aparece marcado como premissa sua — e o que ninguém informou não vira zero."
        />

        <form method="get" className="mt-8 rounded-xl border border-graf-200 bg-graf-50 p-5">
          <div>
            <label htmlFor="anos" className="block text-[0.875rem] font-semibold text-graf-900">
              Horizonte da simulação
            </label>
            <p className="mt-0.5 text-[0.75rem] text-graf-500">
              O mesmo período vale para os três cenários. Misturar horizontes é o erro que faz
              o mais barato mudar de lugar.
            </p>
            <select
              id="anos"
              name="anos"
              defaultValue={String(anos)}
              className="mt-2 min-h-11 rounded-lg border border-graf-300 bg-white px-3 text-[0.875rem] text-graf-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              {[3, 5, 7, 10].map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao} anos
                </option>
              ))}
            </select>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold text-graf-950">Reparar o que está aí</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CampoDinheiro
                nome="reparo"
                rotulo="Valor do orçamento do reparo"
                ajuda="Do orçamento da JB ou de outra assistência. Vazio não significa gratuito."
                valor={primeiro(params.reparo)}
              />
              <CampoDinheiro
                nome="manutencaoReparo"
                rotulo="Manutenção por ano, depois do reparo"
                valor={primeiro(params.manutencaoReparo)}
              />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold text-graf-950">Seminovo</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CampoDinheiro
                nome="seminovo"
                rotulo="Preço do seminovo"
                valor={primeiro(params.seminovo)}
              />
              <CampoDinheiro
                nome="manutencaoSeminovo"
                rotulo="Manutenção por ano"
                valor={primeiro(params.manutencaoSeminovo)}
              />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold text-graf-950">Novo</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CampoDinheiro
                nome="novo"
                rotulo="Preço do equipamento novo"
                valor={primeiro(params.novo)}
              />
              <CampoDinheiro
                nome="manutencaoNovo"
                rotulo="Manutenção por ano"
                valor={primeiro(params.manutencaoNovo)}
              />
            </div>
          </fieldset>

          <fieldset className="mt-6">
            <legend className="text-sm font-bold text-graf-950">Comuns aos dois</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <CampoDinheiro
                nome="instalacao"
                rotulo="Instalação e adequação do local"
                valor={primeiro(params.instalacao)}
              />
              <CampoDinheiro
                nome="parada"
                rotulo="Custo dos dias parados"
                ajuda="Se você já estimou isso na calculadora de parada, use aquele número."
                valor={primeiro(params.parada)}
              />
            </div>

            {/* A guarda contra somar duas vezes o mesmo prejuízo. */}
            {/* `min-h-11`: a caixa é um alvo de toque, e 42px ficava abaixo do
                mínimo de 44 que a WCAG 2.2 pede — a auditoria mediu em 768px. */}
            <label className="mt-3 flex min-h-11 items-start gap-2.5 py-1 text-[0.8125rem] leading-relaxed text-graf-700">
              <input
                type="checkbox"
                name="paradaIncluida"
                value="sim"
                defaultChecked={paradaJaIncluida}
                className="mt-0.5 size-4 accent-jb-600"
              />
              <span>
                O custo dos dias parados já está embutido em outra premissa que informei acima.
                Marcando isto, ele não é somado de novo.
              </span>
            </label>
          </fieldset>

          <button
            type="submit"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-jb-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <Calculator className="size-4" aria-hidden />
            Simular
          </button>
        </form>
      </Secao>

      {simulou ? (
        <>
          <Secao fundo="clara" espaco="sm">
            <Cartao className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2.5 text-title texto-forte">
                {comparacao.comparavel ? (
                  <Calculator className="size-5 shrink-0 text-graf-400" aria-hidden />
                ) : (
                  <AlertTriangle className="size-5 shrink-0 text-amber-500" aria-hidden />
                )}
                {comparacao.comparavel
                  ? `Do menor para o maior, em ${anos} anos`
                  : "Ainda não dá para comparar"}
              </h2>

              {comparacao.comparavel ? (
                <>
                  <ol className="mt-4 space-y-2">
                    {comparacao.ordem.map((total, indice) => (
                      <li
                        key={total.chave}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 rounded-lg border border-graf-200 bg-white px-4 py-3"
                      >
                        <span className="text-[0.9375rem] font-semibold text-graf-950">
                          {indice + 1}. {ROTULO_DO_CENARIO[total.chave]}
                        </span>
                        <span className="tabular font-extrabold text-graf-950">
                          {formatarPreco(total.totalCents)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 flex gap-2.5 border-t border-graf-200 pt-4 text-[0.8125rem] leading-relaxed text-graf-500">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-graf-400" aria-hidden />
                    <span>{comparacao.ressalva}</span>
                  </p>
                </>
              ) : (
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-700">
                  {comparacao.motivo}
                </p>
              )}

              {!decisaoDaParada.incluir && parada !== null ? (
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-graf-600">
                  {decisaoDaParada.motivo}
                </p>
              ) : null}

              <LinkBotao href="/orcamento" tamanho="sm" className="mt-5">
                Pedir um orçamento de reparo
              </LinkBotao>
            </Cartao>
          </Secao>

          <Secao espaco="sm">
            <h2 className="text-title texto-forte">Memória de cálculo</h2>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-graf-600">
              Cada linha diz de onde veio o número: {ROTULO_DA_ORIGEM.conhecido} —{" "}
              {EXPLICACAO_DA_ORIGEM.conhecido.toLowerCase()} {ROTULO_DA_ORIGEM.premissa} —{" "}
              {EXPLICACAO_DA_ORIGEM.premissa.toLowerCase()} {ROTULO_DA_ORIGEM.ausente} —{" "}
              {EXPLICACAO_DA_ORIGEM.ausente.toLowerCase()}
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {cenarios.map((cenario) => (
                <Memoria key={cenario.chave} cenario={cenario} />
              ))}
            </div>
          </Secao>
        </>
      ) : null}
    </>
  );
}
