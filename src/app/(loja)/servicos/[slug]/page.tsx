import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ClipboardCheck, FileCheck2, Wrench } from "lucide-react";

import { CanaisDiretos, CartaoApoio } from "@/components/assistencia/apoio";
import { ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Trilha } from "@/components/ui/data";
import { PassosNumerados } from "@/components/ui/passos";
import { formatarPreco } from "@/lib/format";
import { nl2br } from "@/lib/html";
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
 * Página de um serviço cadastrado.
 *
 * O `Service` guarda nome, tipo, descrição e um preço opcional — e é só isso
 * que aparece como dado. Prazo de execução e escopo detalhado não existem como
 * campo no banco, então não são inventados aqui: o que a página diz sobre
 * prazo é o processo real (o prazo fecha no orçamento, depois da avaliação).
 */

type Parametros = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const servicos = await prisma.service.findMany({
    where: { published: true },
    select: { slug: true },
    orderBy: { order: "asc" },
  });
  return servicos.map((servico) => ({ slug: servico.slug }));
}

async function buscarServico(slug: string) {
  return prisma.service.findFirst({
    where: { slug, published: true },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      description: true,
      priceCents: true,
    },
  });
}

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { slug } = await params;
  const servico = await buscarServico(slug);

  if (!servico) {
    return metadataDePagina({
      titulo: "Serviço não encontrado",
      caminho: `/servicos/${slug}`,
      noIndex: true,
    });
  }

  return metadataDePagina({
    titulo: servico.name,
    descricao:
      servico.description ||
      `${ROTULO_SERVICO[servico.kind]} executada pela equipe técnica da JB.`,
    caminho: `/servicos/${servico.slug}`,
  });
}

export default async function ServicoPage({ params }: Parametros) {
  const { slug } = await params;
  const servico = await buscarServico(slug);
  if (!servico) notFound();

  const [s, outros] = await Promise.all([
    getSettings(),
    prisma.service.findMany({
      where: { published: true, NOT: { id: servico.id } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 4,
      select: { id: true, slug: true, name: true, kind: true, priceCents: true },
    }),
  ]);

  const trilha = [
    { rotulo: "Início", href: "/" },
    { rotulo: "Serviços", href: "/servicos" },
    { rotulo: servico.name },
  ];

  const temPreco = servico.priceCents !== null && servico.priceCents > 0;
  const linkOrcamento = `/orcamento?tipo=servico&item=${encodeURIComponent(servico.name)}`;

  return (
    <div className="container-jb py-10 lg:py-14">
      <JsonLd
        dados={[
          servicoJsonLd({
            nome: servico.name,
            caminho: `/servicos/${servico.slug}`,
            descricao: servico.description,
            precoCents: servico.priceCents,
            prestador: s.empresa_nome,
            area: s.endereco_cidade,
            tipo: ROTULO_SERVICO[servico.kind],
          }),
          trilhaJsonLd(trilha),
        ]}
      />

      <Trilha itens={trilha} className="mb-6" />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div>
          {/* Sobretítulo, não etiqueta: o tipo é o degrau acima do nome do
              serviço, e não um estado a ser sinalizado. */}
          <p className="sobretitulo mb-3">{ROTULO_SERVICO[servico.kind]}</p>
          <h1 className="text-display texto-forte">{servico.name}</h1>

          {servico.description ? (
            <div className="texto-guia mt-6 max-w-2xl text-graf-700">
              {nl2br(servico.description)}
            </div>
          ) : (
            <p className="texto-guia mt-6 max-w-2xl text-graf-600">
              O escopo deste serviço é definido com você antes da execução. Descreva a
              situação da clínica no pedido de orçamento e a equipe responde com o que está
              incluso.
            </p>
          )}

          {/* --------------------------------------------- como é contratado */}
          <section className="mt-14" aria-labelledby="como-contratar">
            <h2 id="como-contratar" className="text-title texto-forte">
              Como este serviço é contratado
            </h2>

            <PassosNumerados
              className="mt-8"
              rotulo="Etapas da contratação"
              passos={[
                {
                  icone: ClipboardCheck,
                  titulo: "Você descreve a situação",
                  descricao:
                    "Equipamento, quantidade e onde fica. Quanto mais concreto, menos idas e vindas depois.",
                },
                {
                  icone: FileCheck2,
                  titulo: "A equipe monta o orçamento",
                  descricao: temPreco
                    ? `O preço base publicado (${formatarPreco(
                        servico.priceCents ?? 0,
                      )}) cobre o serviço padrão. O que fugir disso entra no orçamento, item a item.`
                    : "Sem valor fechado publicado: o orçamento sai com serviço, peças e deslocamento separados, para você ver de onde vem cada número.",
                },
                {
                  icone: Wrench,
                  titulo: "Execução com registro",
                  descricao:
                    "O serviço vira uma ordem de serviço numerada, e o que foi feito fica no histórico do equipamento.",
                },
              ]}
            />

            {/* Fio à esquerda em vez de caixa: é uma ressalva de leitura, não
                um aviso de sistema. */}
            <p className="mt-8 border-l-2 border-jb-200 pl-5 text-[0.9375rem] leading-relaxed text-graf-600">
              <strong className="font-semibold text-graf-900">Sobre prazo: </strong>
              a data de execução é combinada no orçamento, depois de a equipe saber o que o
              serviço envolve. Prometer prazo antes de olhar o equipamento é chute, e chute
              vira remarcação.
            </p>
          </section>

          {/* ------------------------------------------------ outros serviços */}
          {outros.length > 0 ? (
            <section className="mt-14" aria-labelledby="outros-servicos">
              <h2 id="outros-servicos" className="text-title texto-forte">
                Outros serviços da JB
              </h2>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {outros.map((outro) => (
                  <li key={outro.id}>
                    <Link
                      href={`/servicos/${outro.slug}`}
                      className="flex h-full items-center justify-between gap-4 rounded-xl border border-graf-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-graf-950">
                          {outro.name}
                        </span>
                        <span className="mt-1 block text-[0.8125rem] text-graf-500">
                          {ROTULO_SERVICO[outro.kind]}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-graf-700">
                        {outro.priceCents !== null && outro.priceCents > 0
                          ? formatarPreco(outro.priceCents)
                          : "Sob orçamento"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* --------------------------------------------------------- lateral */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Cartao className="p-6">
            {temPreco ? (
              <>
                <p className="label-mono uppercase text-graf-500">Preço base</p>
                <p className="tabular mt-1.5 text-3xl font-extrabold tracking-tight text-graf-950">
                  {formatarPreco(servico.priceCents ?? 0)}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-graf-500">
                  Valor do serviço padrão. Peças e deslocamento fora da região entram no
                  orçamento.
                </p>
              </>
            ) : (
              <>
                <p className="label-mono uppercase text-graf-500">Preço</p>
                <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-graf-950">
                  Sob orçamento
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-graf-500">
                  O valor depende do equipamento e da quantidade. A equipe responde com a
                  proposta detalhada.
                </p>
              </>
            )}

            <LinkBotao href={linkOrcamento} larguraTotal tamanho="lg" className="mt-6">
              Pedir orçamento
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>

            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="secundario"
              larguraTotal
              className="mt-3"
            >
              Abrir chamado técnico
            </LinkBotao>
          </Cartao>

          <CartaoApoio titulo="Falar com a equipe" descricao={s.horario}>
            <CanaisDiretos
              telefone={s.telefone}
              whatsapp={s.whatsapp}
              mensagem={`Olá! Quero saber mais sobre o serviço "${servico.name}".`}
            />
          </CartaoApoio>
        </aside>
      </div>
    </div>
  );
}
