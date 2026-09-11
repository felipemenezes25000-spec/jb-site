import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, CircleX, Wrench } from "lucide-react";

import { CalculadoraParada } from "@/components/assistencia/calculadora-parada";
import { periodicidade } from "@/components/assistencia/cartao-plano";
import {
  paraPlanoPublico,
  SELECAO_PLANO_PUBLICO,
  type PlanoPublico,
} from "@/lib/plano";
import { ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Grade, colunasParaTotal } from "@/components/ui/grade";
import { FaixaChamada, Secao } from "@/components/ui/secao";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, servicoJsonLd, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

/**
 * Manutenção preventiva: por que fazer, o que é verificado e com que ritmo.
 *
 * O que é verificado sai dos `Service` cadastrados (tipo preventiva e visita
 * técnica) — não de uma lista escrita no código. A periodicidade sugerida sai
 * dos `MaintenancePlan` publicados, pela mesma conta que
 * `gerarVisitasDoContrato` usa: vigência dividida pelas visitas incluídas.
 * Sem plano cadastrado, a página diz que a periodicidade é definida no
 * diagnóstico, em vez de sugerir um intervalo que ninguém definiu.
 */

const CAMINHO = "/manutencao-preventiva";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Manutenção preventiva" },
];

/**
 * O comparativo, linha a linha. Nenhum número: só o que muda na rotina da
 * clínica. Os dois lados vêm emparelhados de propósito — é a mesma decisão
 * vista de dois jeitos, e lida em par ela se explica sozinha.
 */
const CONFRONTO = [
  { preventiva: "Data marcada por você", corretiva: "Data marcada pelo defeito" },
  {
    preventiva: "Peça de desgaste trocada antes de falhar",
    corretiva: "Peça pedida na urgência",
  },
  { preventiva: "Orçamento previsível", corretiva: "Custo descoberto depois" },
  { preventiva: "Agenda da clínica preservada", corretiva: "Paciente remarcado" },
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return metadataDePagina({
    titulo: "Manutenção preventiva de equipamentos",
    descricao: `Revisão programada de cadeiras, autoclaves, compressores e demais equipamentos da clínica em ${s.endereco_cidade} e região, com registro no histórico de cada aparelho.`,
    caminho: CAMINHO,
  });
}

export default async function ManutencaoPreventivaPage() {
  const [s, servicos, planos] = await Promise.all([
    getSettings(),
    prisma.service.findMany({
      where: {
        published: true,
        kind: { in: ["manutencao_preventiva", "visita_tecnica", "instalacao"] },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, kind: true, description: true },
    }),
    prisma.maintenancePlan.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: SELECAO_PLANO_PUBLICO,
    }),
  ]);

  const ritmos = planos
    .map((plano) => {
      const publico: PlanoPublico = paraPlanoPublico(plano);
      return { plano: publico, ritmo: periodicidade(publico) };
    })
    .filter((linha) => linha.ritmo !== null);

  return (
    <>
      <JsonLd
        dados={[
          servicoJsonLd({
            nome: "Manutenção preventiva de equipamentos odontológicos",
            caminho: CAMINHO,
            descricao:
              "Revisão programada de equipamentos odontológicos, com visita agendada, registro do que foi verificado e histórico por aparelho.",
            prestador: s.empresa_nome,
            area: s.endereco_cidade,
            tipo: "Manutenção preventiva",
          }),
          trilhaJsonLd(TRILHA),
        ]}
      />

      {/* ================================================================ HERO */}
      <Secao
        fundo="clara"
        espaco="nenhum"
        padraoDeFundo
        como="header"
        className="border-b border-graf-200"
        classNameInterno="py-10 lg:py-16"
      >
        <Trilha itens={TRILHA} className="mb-7" />

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 py-1.5 text-apoio font-semibold text-graf-600 shadow-xs">
              <CalendarClock className="size-3.5 text-jb-600" aria-hidden />
              Revisão programada
            </p>

            <h1 className="text-hero texto-forte mt-6">
              A parada mais cara é a que <span className="text-jb-600">ninguém marcou</span>.
            </h1>

            <p className="texto-guia mt-6 max-w-xl text-graf-600">
              Manutenção preventiva é escolher quando o equipamento sai do ar. Uma revisão
              marcada acontece no fim do expediente ou no dia sem agenda; uma quebra
              acontece com o paciente na cadeira.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <LinkBotao href="/planos-de-manutencao" tamanho="lg">
                Ver planos de manutenção
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/orcamento?tipo=servico" variante="secundario" tamanho="lg">
                Pedir orçamento avulso
              </LinkBotao>
            </div>
          </div>

          {/* Preventiva x corretiva, sem número inventado: as duas colunas
              emparelhadas linha a linha, para o olho comparar de lado. */}
          <Cartao className="p-6 lg:p-8">
            <p className="label-mono uppercase text-graf-500">O que muda na prática</p>

            {/* Tabela de verdade: são duas colunas comparáveis, e o leitor de
                tela precisa ouvir "Preventiva"/"Corretiva" em cada célula. */}
            <table className="mt-6 w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-graf-200">
                  <th scope="col" className="pb-3 pr-5 sm:pr-8">
                    <span className="flex items-center gap-2 text-corpo font-bold text-ok-700">
                      <CircleCheck className="size-4.5 shrink-0" aria-hidden />
                      Preventiva
                    </span>
                  </th>
                  <th scope="col" className="pb-3">
                    <span className="flex items-center gap-2 text-corpo font-bold text-graf-700">
                      <CircleX className="size-4.5 shrink-0 text-jb-600" aria-hidden />
                      Corretiva
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {CONFRONTO.map((linha) => (
                  <tr key={linha.preventiva} className="border-b border-graf-100 last:border-b-0">
                    <td className="py-3.5 pr-5 align-top text-apoio font-semibold leading-relaxed text-graf-800 sm:pr-8 sm:text-sm">
                      {linha.preventiva}
                    </td>
                    <td className="py-3.5 align-top text-apoio leading-relaxed text-graf-500 sm:text-sm">
                      {linha.corretiva}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Cartao>
        </div>
      </Secao>

      {/* =================================================== O QUE É VERIFICADO */}
      <Secao espaco="lg">
        <TituloSecao
          sobretitulo="Na visita"
          titulo="O que a preventiva cobre"
          descricao="Os serviços de revisão que a JB tem cadastrados. Cada visita fecha com o registro do que foi verificado no histórico do equipamento — não é uma passada de pano com carimbo."
          className="mb-10"
        />

        {servicos.length === 0 ? (
          <Vazio
            icone={Wrench}
            titulo="Roteiro de revisão sob medida"
            descricao="A JB ainda não publicou os serviços de revisão no site. Enquanto isso, descreva os equipamentos da clínica e a equipe monta o roteiro e o orçamento."
            acao={<LinkBotao href="/orcamento?tipo=servico">Pedir orçamento</LinkBotao>}
          />
        ) : (
          <Grade como="ul" colunas={colunasParaTotal(servicos.length)} espaco="md">
            {servicos.map((servico) => (
              <li key={servico.id}>
                <Cartao interativo className="relative flex h-full flex-col p-6">
                  <p className="label-mono uppercase text-graf-500">
                    {ROTULO_SERVICO[servico.kind]}
                  </p>
                  <h3 className="mt-2.5 text-lg font-bold leading-snug text-graf-950">
                    <Link
                      href={`/servicos/${servico.slug}`}
                      className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {servico.name}
                    </Link>
                  </h3>
                  {servico.description ? (
                    <p className="line-3 mt-2.5 text-sm leading-relaxed text-graf-600">
                      {servico.description}
                    </p>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-jb-700">
                    Ver serviço
                    <ArrowRight className="size-4 shrink-0" aria-hidden />
                  </span>
                </Cartao>
              </li>
            ))}
          </Grade>
        )}
      </Secao>

      {/* ======================================================= PERIODICIDADE */}
      <Secao fundo="clara" espaco="lg" separador>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <TituloSecao
            sobretitulo="Ritmo"
            titulo="De quanto em quanto tempo"
            descricao="A JB não trabalha com uma regra única: o intervalo sai do plano contratado ou do próprio equipamento, que pode ter periodicidade recomendada pelo fabricante. O que estiver definido vira agenda automática assim que o contrato começa."
            className="lg:sticky lg:top-24 lg:h-max"
          />

          <div>
            {ritmos.length > 0 ? (
              <ul className="divide-y divide-graf-200 border-y border-graf-200">
                {ritmos.map(({ plano, ritmo }) => (
                  <li
                    key={plano.slug}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4"
                  >
                    <div className="min-w-0">
                      {/* `inline-flex` com altura mínima, e não só texto: o
                          nome do plano é curto ("Total" mede 37px) e no dedo
                          virava um alvo de 37×21, abaixo dos 44 exigidos.
                          Encontrado pelo `scripts/responsivo.mjs` quando esta
                          rota entrou na lista auditada. */}
                      <Link
                        href={`/planos-de-manutencao#${plano.slug}`}
                        className="inline-flex min-h-11 min-w-11 items-center text-corpo font-bold text-graf-950 underline-offset-2 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        {plano.nome}
                      </Link>
                      <p className="mt-1 text-apoio text-graf-500">
                        {plural(plano.mesesDeVigencia, "mês de vigência", "meses de vigência")}{" "}
                        · {plural(plano.visitasIncluidas, "visita incluída", "visitas incluídas")}
                      </p>
                    </div>
                    <p className="text-corpo font-semibold text-graf-800">{ritmo}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Cartao className="p-6">
                <p className="text-corpo leading-relaxed text-graf-600">
                  Não há plano publicado com periodicidade definida no momento. Na prática,
                  o intervalo é decidido no diagnóstico: idade do equipamento, horas de uso
                  por dia e recomendação do fabricante entram na conta.
                </p>
                <LinkBotao href="/orcamento?tipo=plano" variante="secundario" className="mt-5">
                  Falar sobre periodicidade
                </LinkBotao>
              </Cartao>
            )}

            <p className="mt-6 text-corpo leading-relaxed text-graf-600">
              Com o contrato ativo, a agenda do período inteiro é gerada de uma vez e a
              equipe avisa antes de cada visita — você não precisa lembrar.
            </p>
          </div>
        </div>
      </Secao>

      {/* ========================================================= CALCULADORA */}
      <Secao espaco="lg">
        <TituloSecao
          sobretitulo="Faça a conta"
          titulo="Quanto custa o equipamento parado"
          descricao="Antes de comparar planos, vale saber o tamanho do problema. Esta calculadora usa apenas os números da sua clínica e mostra cada multiplicação — nada de média de mercado."
          className="mb-10"
        />

        <CalculadoraParada />
      </Secao>

      {/* ================================================================ CTA */}
      <FaixaChamada
        fundo="clara"
        titulo="Programe a revisão antes que o defeito programe por você."
        descricao="Comparar planos leva um minuto. Se já existe algo com defeito, o caminho é outro: abra o chamado e a triagem responde com o próximo passo."
        acoes={
          <>
            <LinkBotao href="/planos-de-manutencao" variante="primario" tamanho="lg">
              Comparar planos
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="secundario"
              tamanho="lg"
            >
              Já tem algo com defeito?
            </LinkBotao>
          </>
        }
      />
    </>
  );
}
