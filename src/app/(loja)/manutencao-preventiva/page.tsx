import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, CircleX, Wrench } from "lucide-react";

import { CalculadoraParada } from "@/components/assistencia/calculadora-parada";
import { periodicidade, type PlanoPublico } from "@/components/assistencia/cartao-plano";
import { ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, servicoJsonLd, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

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

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return metadataDePagina({
    titulo: "Manutenção preventiva de equipamentos odontológicos",
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
      select: {
        slug: true,
        name: true,
        description: true,
        benefits: true,
        priceCents: true,
        periodMonths: true,
        visitsIncluded: true,
        partsDiscountPercent: true,
      },
    }),
  ]);

  const ritmos = planos
    .map((plano) => {
      const publico: PlanoPublico = {
        slug: plano.slug,
        nome: plano.name,
        descricao: plano.description,
        beneficios: plano.benefits,
        precoCents: plano.priceCents,
        mesesDeVigencia: plano.periodMonths,
        visitasIncluidas: plano.visitsIncluded,
        descontoEmPecas: plano.partsDiscountPercent,
      };
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
      <section className="border-b border-graf-200 bg-gradient-to-b from-graf-50 to-white">
        <div className="container-jb py-10 lg:py-14">
          <Trilha itens={TRILHA} className="mb-6" />

          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-graf-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-graf-600 shadow-xs">
                <CalendarClock className="size-3.5 text-jb-600" aria-hidden />
                Revisão programada
              </p>

              <h1 className="mt-6 text-hero leading-[1.05]">
                A parada mais cara é a que <span className="text-jb-600">ninguém marcou</span>.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-graf-600">
                Manutenção preventiva é escolher quando o equipamento sai do ar. Uma revisão
                marcada acontece no fim do expediente ou no dia sem agenda; uma quebra
                acontece com o paciente na cadeira.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <LinkBotao href="/planos-de-manutencao" tamanho="lg">
                  Ver planos de manutenção
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
                <LinkBotao href="/orcamento?tipo=servico" variante="secundario" tamanho="lg">
                  Pedir orçamento avulso
                </LinkBotao>
              </div>
            </div>

            {/* Preventiva x corretiva, sem número inventado: o que muda de fato */}
            <Cartao className="p-6 lg:p-7">
              <p className="label-mono uppercase text-graf-500">O que muda na prática</p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-ok-700">
                    <CircleCheck className="size-4" aria-hidden />
                    Preventiva
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-graf-600">
                    <li>Data marcada por você</li>
                    <li>Peça de desgaste trocada antes de falhar</li>
                    <li>Orçamento previsível</li>
                    <li>Agenda da clínica preservada</li>
                  </ul>
                </div>

                <div className="border-t border-graf-200 pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-jb-700">
                    <CircleX className="size-4" aria-hidden />
                    Corretiva
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-graf-600">
                    <li>Data marcada pelo defeito</li>
                    <li>Peça pedida na urgência</li>
                    <li>Custo descoberto depois</li>
                    <li>Paciente remarcado</li>
                  </ul>
                </div>
              </div>
            </Cartao>
          </div>
        </div>
      </section>

      {/* =================================================== O QUE É VERIFICADO */}
      <section className="bg-white">
        <div className="container-jb py-16 lg:py-20">
          <TituloSecao
            sobretitulo="Na visita"
            titulo="O que a preventiva cobre"
            descricao="Os serviços de revisão que a JB tem cadastrados. Cada visita fecha com o registro do que foi verificado no histórico do equipamento — não é uma passada de pano com carimbo."
            className="mb-8"
          />

          {servicos.length === 0 ? (
            <Vazio
              icone={Wrench}
              titulo="Roteiro de revisão sob medida"
              descricao="A JB ainda não publicou os serviços de revisão no site. Enquanto isso, descreva os equipamentos da clínica e a equipe monta o roteiro e o orçamento."
              acao={<LinkBotao href="/orcamento?tipo=servico">Pedir orçamento</LinkBotao>}
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servicos.map((servico) => (
                <li key={servico.id}>
                  <Cartao interativo className="relative flex h-full flex-col p-5">
                    <p className="label-mono uppercase text-graf-500">
                      {ROTULO_SERVICO[servico.kind]}
                    </p>
                    <h3 className="mt-2 text-base font-bold text-graf-950">
                      <Link
                        href={`/servicos/${servico.slug}`}
                        className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        {servico.name}
                      </Link>
                    </h3>
                    {servico.description ? (
                      <p className="line-3 mt-2 text-sm leading-relaxed text-graf-600">
                        {servico.description}
                      </p>
                    ) : null}
                  </Cartao>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ======================================================= PERIODICIDADE */}
      <section className="border-y border-graf-200 bg-graf-50">
        <div className="container-jb py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
            <TituloSecao
              sobretitulo="Ritmo"
              titulo="De quanto em quanto tempo"
              descricao="A JB não trabalha com uma regra única: o intervalo sai do plano contratado ou do próprio equipamento, que pode ter periodicidade recomendada pelo fabricante. O que estiver definido vira agenda automática assim que o contrato começa."
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
                        <Link
                          href={`/planos-de-manutencao#${plano.slug}`}
                          className="text-sm font-bold text-graf-950 underline-offset-2 hover:text-jb-700 hover:underline"
                        >
                          {plano.nome}
                        </Link>
                        <p className="mt-0.5 text-xs text-graf-500">
                          {plural(plano.mesesDeVigencia, "mês de vigência", "meses de vigência")}{" "}
                          · {plural(plano.visitasIncluidas, "visita incluída", "visitas incluídas")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-graf-800">{ritmo}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Cartao className="p-6">
                  <p className="text-sm leading-relaxed text-graf-600">
                    Não há plano publicado com periodicidade definida no momento. Na prática,
                    o intervalo é decidido no diagnóstico: idade do equipamento, horas de
                    uso por dia e recomendação do fabricante entram na conta.
                  </p>
                  <LinkBotao
                    href="/orcamento?tipo=plano"
                    variante="secundario"
                    className="mt-5"
                  >
                    Falar sobre periodicidade
                  </LinkBotao>
                </Cartao>
              )}

              <p className="mt-6 text-sm leading-relaxed text-graf-600">
                Com o contrato ativo, a agenda do período inteiro é gerada de uma vez e a
                equipe avisa antes de cada visita — você não precisa lembrar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= CALCULADORA */}
      <section className="bg-white">
        <div className="container-jb py-16 lg:py-20">
          <TituloSecao
            sobretitulo="Faça a conta"
            titulo="Quanto custa o equipamento parado"
            descricao="Antes de comparar planos, vale saber o tamanho do problema. Esta calculadora usa apenas os números da sua clínica e mostra cada multiplicação — nada de média de mercado."
            className="mb-8"
          />

          <CalculadoraParada />
        </div>
      </section>

      {/* ================================================================ CTA */}
      <section className="border-t border-graf-200 bg-graf-950">
        <div className="container-jb py-14 text-center lg:py-16">
          <h2 className="mx-auto max-w-2xl text-title leading-tight text-white">
            Programe a revisão antes que o defeito programe por você.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkBotao href="/planos-de-manutencao" tamanho="lg">
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
          </div>
        </div>
      </section>
    </>
  );
}
