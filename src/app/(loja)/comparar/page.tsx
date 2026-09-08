import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, Info, Scale } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Secao } from "@/components/ui/secao";
import { CONDICAO } from "@/components/loja/card-produto";
import {
  AUSENTE,
  PERGUNTAS,
  TEXTO_AUSENTE,
  dimensoesLegiveis,
  garantiaLegivel,
  pesoLegivel,
  recomendar,
  textoDoValor,
  type LinhaDaComparacao,
  type RespostasDaClinica,
  type ValorDoAtributo,
} from "@/lib/comparador";
import { PUBLICADO, UNIDADE_VENDIDA } from "@/lib/catalogo";
import { chaveDeNome } from "@/lib/homonimos";
import { formatarPreco } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { metadataDePagina } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

/*
 * A página vazia é conteúdo; a comparação montada não é.
 *
 * `/comparar` sem parâmetro explica o que a ferramenta faz e merece ser
 * encontrada. Já `/comparar?p=a&p=b` é uma combinação — com algumas dezenas de
 * equipamentos publicados são milhares de endereços diferentes, todos com o
 * mesmo texto de apoio e conteúdo montado a partir de fichas que já estão
 * indexadas por conta própria. Indexar isso não traz ninguém: divide a força
 * das fichas entre páginas quase iguais.
 *
 * `follow: true` mantém a passagem — o robô continua seguindo daqui para as
 * fichas comparadas, que são o destino que interessa. Mesmo tratamento que
 * `/busca` já recebe.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const parametros = await searchParams;
  const comparando = [parametros.p ?? []].flat().filter(Boolean).length > 0;

  return {
    ...metadataDePagina({
      titulo: "Comparar equipamentos",
      descricao:
        "Capacidade, dimensões, voltagem, infraestrutura, instalação, garantia e preço — lado a lado, com os dados reais do catálogo.",
      caminho: "/comparar",
    }),
    ...(comparando ? { robots: { index: false, follow: true } } : null),
  };
}

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Comparar" }];

/** No máximo três: acima disso a tabela deixa de caber na tela do celular. */
const MAXIMO = 3;

const ROTULO_INSTALACAO: Record<string, string> = {
  nao_informada: TEXTO_AUSENTE,
  nao_oferecida: "A JB não instala",
  opcional: "Opcional, à parte",
  inclusa: "Inclusa no preço",
  sob_consulta: "Sob consulta",
};

/** Uma opção da fileira de escolha — o suficiente para reconhecer o aparelho. */
type OpcaoDeComparacao = {
  slug: string;
  nome: string;
  marca: string | null;
  preco: string;
  foto: string | null;
};

type Props = {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
};

function primeiro(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

/**
 * Lê o parâmetro `p` nos dois formatos possíveis.
 *
 * O formulário desta página tem uma caixa por equipamento, todas com
 * `name="p"`, então o navegador envia um par por marcação: `?p=a&p=b&p=c`.
 * A leitura anterior usava `primeiro()`, que devolve só `valor[0]` de um
 * array — marcar três equipamentos chegava aqui como um só, e a página
 * respondia "falta o segundo equipamento" em cima de uma seleção válida.
 *
 * A forma com vírgula (`?p=a,b`) continua aceita: nenhum link do site a
 * gera hoje, mas endereços montados à mão ou compartilhados usam ela.
 */
function slugsDe(valor: string | string[] | undefined) {
  const bruto = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const slugs = bruto
    .flatMap((item) => item.split(","))
    .map((slug) => slug.trim())
    .filter(Boolean);

  // Dedupe: `?p=a&p=a` não deve gastar duas das três vagas.
  return [...new Set(slugs)];
}

export default async function CompararPage({ searchParams }: Props) {
  const params = await searchParams;

  const escolhidos = slugsDe(params.p).slice(0, MAXIMO);

  const respostas: RespostasDaClinica = {
    volume: (primeiro(params.volume) || "nao_sei") as RespostasDaClinica["volume"],
    infraestrutura: (primeiro(params.infra) ||
      "nao_sei") as RespostasDaClinica["infraestrutura"],
    prioridade: (primeiro(params.prioridade) ||
      "nao_sei") as RespostasDaClinica["prioridade"],
  };

  const [catalogo, produtos] = await Promise.all([
    /* A lista de escolha deixou de ser só `slug` e `name`: comparar
       equipamento de dez mil reais escolhendo numa lista de caixas de texto
       era pedir que a pessoa reconhecesse o aparelho pelo nome de cadastro.
       Agora cada opção mostra foto, marca, nome e preço — e a fileira é
       agrupada por categoria, para o comparador oferecer o que de fato se
       compara entre si. */
    prisma.product.findMany({
      where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA },
      orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
      take: 60,
      select: {
        slug: true,
        name: true,
        priceCents: true,
        allowDirectPurchase: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
        media: {
          orderBy: { order: "asc" },
          take: 1,
          select: { alt: true, media: { select: { url: true, alt: true } } },
        },
      },
    }),
    escolhidos.length > 0
      ? prisma.product.findMany({
          where: { ...PUBLICADO, slug: { in: escolhidos } },
          select: {
            slug: true,
            name: true,
            priceCents: true,
            condition: true,
            voltage: true,
            warrantyMonths: true,
            weightGrams: true,
            widthMm: true,
            heightMm: true,
            depthMm: true,
            infrastructureNotes: true,
            boxContents: true,
            installationPolicy: true,
            brand: { select: { name: true } },
            /* A foto entra porque comparar equipamento sem ver o equipamento é
               comparar nome. Uma só: a comparação é tabela, não galeria. */
            media: {
              orderBy: { order: "asc" },
              take: 1,
              select: { alt: true, media: { select: { url: true, alt: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  /* Respeita a ordem em que a pessoa escolheu, e não a do banco. */
  const ordenados = escolhidos
    .map((slug) => produtos.find((produto) => produto.slug === slug))
    .filter((produto): produto is (typeof produtos)[number] => Boolean(produto));

  const linhas: LinhaDaComparacao[] =
    ordenados.length === 0
      ? []
      : [
          {
            chave: "preco",
            rotulo: "Preço",
            valores: ordenados.map((produto): ValorDoAtributo =>
              produto.priceCents > 0
                ? { tipo: "texto", valor: formatarPreco(produto.priceCents) }
                : { tipo: "texto", valor: "Sob orçamento" },
            ),
          },
          {
            chave: "condicao",
            rotulo: "Condição",
            valores: ordenados.map((produto): ValorDoAtributo => ({
              tipo: "texto",
              valor:
                CONDICAO[produto.condition as keyof typeof CONDICAO]?.rotulo ?? produto.condition,
            })),
          },
          {
            chave: "marca",
            rotulo: "Marca",
            valores: ordenados.map((produto): ValorDoAtributo =>
              produto.brand ? { tipo: "texto", valor: produto.brand.name } : AUSENTE,
            ),
          },
          {
            chave: "voltagem",
            rotulo: "Voltagem",
            valores: ordenados.map((produto): ValorDoAtributo =>
              produto.voltage ? { tipo: "texto", valor: produto.voltage } : AUSENTE,
            ),
          },
          {
            chave: "dimensoes",
            rotulo: "Dimensões",
            ajuda: "Confira contra o espaço da bancada antes de comprar.",
            valores: ordenados.map((produto) =>
              dimensoesLegiveis(produto.widthMm, produto.heightMm, produto.depthMm),
            ),
          },
          {
            chave: "peso",
            rotulo: "Peso",
            valores: ordenados.map((produto) => pesoLegivel(produto.weightGrams)),
          },
          {
            chave: "garantia",
            rotulo: "Garantia",
            valores: ordenados.map((produto) => garantiaLegivel(produto.warrantyMonths)),
          },
          {
            chave: "instalacao",
            rotulo: "Instalação",
            valores: ordenados.map((produto): ValorDoAtributo => {
              const rotulo = ROTULO_INSTALACAO[produto.installationPolicy];
              return rotulo && rotulo !== TEXTO_AUSENTE
                ? { tipo: "texto", valor: rotulo }
                : AUSENTE;
            }),
          },
          {
            chave: "infraestrutura",
            rotulo: "O local precisa ter",
            ajuda: "Requisitos cadastrados. Célula vazia quer dizer que ninguém preencheu — não que não há requisito.",
            valores: ordenados.map((produto): ValorDoAtributo =>
              produto.infrastructureNotes.length > 0
                ? { tipo: "lista", valores: produto.infrastructureNotes }
                : AUSENTE,
            ),
          },
          {
            chave: "caixa",
            rotulo: "Vem na caixa",
            valores: ordenados.map((produto): ValorDoAtributo =>
              produto.boxContents.length > 0
                ? { tipo: "lista", valores: produto.boxContents }
                : AUSENTE,
            ),
          },
        ];

  /* Agrupamento da escolha, por categoria e na ordem editorial do painel.
     Categorias homônimas — o catálogo tem duas chamadas "Biossegurança" —
     entram no mesmo grupo, senão a fileira ofereceria duas prateleiras com o
     mesmo nome, que é o defeito que a auditoria apontou nos filtros. */
  const grupos = (() => {
    const ordem: string[] = [];
    const porChave = new Map<string, { nome: string; produtos: OpcaoDeComparacao[] }>();

    for (const produto of catalogo) {
      const nome = produto.category?.name ?? "Outros equipamentos";
      const chave = chaveDeNome(nome);
      if (!porChave.has(chave)) {
        porChave.set(chave, { nome, produtos: [] });
        ordem.push(chave);
      }
      porChave.get(chave)!.produtos.push({
        slug: produto.slug,
        nome: produto.name,
        marca: produto.brand?.name ?? null,
        preco:
          produto.allowDirectPurchase && produto.priceCents > 0
            ? formatarPreco(produto.priceCents)
            : "Sob orçamento",
        foto: produto.media[0]?.media.url ?? null,
      });
    }

    return ordem.map((chave) => porChave.get(chave)!);
  })();

  const recomendacao = recomendar(
    ordenados.map((produto) => ({
      slug: produto.slug,
      nome: produto.name,
      precoCents: produto.priceCents,
      condicao: produto.condition,
      garantiaMeses: produto.warrantyMonths,
      infraestrutura: produto.infrastructureNotes,
      instalacao: produto.installationPolicy,
    })),
    respostas,
  );

  const eleito = ordenados.find((produto) => produto.slug === recomendacao.slug);

  return (
    <>
      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Comparar"
          titulo="Lado a lado, com o que o catálogo realmente tem"
          descricao="Célula vazia quer dizer que o dado não foi cadastrado — nunca que o valor é zero, e nunca que o equipamento leva vantagem por isso."
        />

        {/* Seleção e as três perguntas num formulário GET só: o estado vive na
            URL, o que torna a comparação compartilhável e o botão voltar
            previsível. */}
        <form method="get" className="mt-8 rounded-xl border border-graf-200 bg-graf-50 p-5">
          {/* `min-w-0` no fieldset e em cada rótulo. Sem ele, o item de grade
              assume largura mínima igual ao conteúdo, e um nome comprido de
              equipamento empurra a coluna inteira para fora da tela em 320px —
              que foi exatamente o que a auditoria de responsividade mediu. */}
          <fieldset className="min-w-0">
            <legend className="text-sm font-bold text-graf-950">
              Escolha até {MAXIMO} equipamentos
            </legend>
            {grupos.map((grupo) => (
              <div key={grupo.nome} className="mt-4 min-w-0">
                <p className="micro text-graf-500">{grupo.nome}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {grupo.produtos.map((produto) => (
                    <label
                      key={produto.slug}
                      className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg border border-graf-200 bg-white p-2 text-[0.875rem] text-graf-800 transition-colors hover:border-graf-400 has-[:checked]:border-jb-500 has-[:checked]:bg-jb-50"
                    >
                      <input
                        type="checkbox"
                        name="p"
                        value={produto.slug}
                        defaultChecked={escolhidos.includes(produto.slug)}
                        className="size-4 shrink-0 accent-jb-600"
                      />
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-white">
                        {produto.foto ? (
                          <Image
                            src={produto.foto}
                            alt=""
                            fill
                            unoptimized={produto.foto.startsWith("/")}
                            sizes="48px"
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-graf-300">
                            <ImageOff className="size-4" aria-hidden />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        {produto.marca ? (
                          <span className="block truncate text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
                            {produto.marca}
                          </span>
                        ) : null}
                        <span className="block truncate font-semibold text-graf-950">
                          {produto.nome}
                        </span>
                        <span className="tabular block truncate text-[0.8125rem] text-graf-600">
                          {produto.preco}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="mt-6 min-w-0">
            <legend className="text-sm font-bold text-graf-950">
              Qual faz sentido para a minha clínica?
            </legend>
            <p className="mt-1 text-[0.875rem] text-graf-600">
              Três perguntas. Elas mudam o que a comparação destaca — e a resposta diz quais
              critérios puderam ser aplicados e quais não.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {PERGUNTAS.map((pergunta) => (
                <div key={pergunta.chave}>
                  <label
                    htmlFor={`p-${pergunta.chave}`}
                    className="block text-[0.875rem] font-semibold text-graf-900"
                  >
                    {pergunta.titulo}
                  </label>
                  <p className="mt-0.5 text-[0.75rem] leading-relaxed text-graf-500">
                    {pergunta.ajuda}
                  </p>
                  <select
                    id={`p-${pergunta.chave}`}
                    name={
                      pergunta.chave === "infraestrutura" ? "infra" : pergunta.chave
                    }
                    defaultValue={
                      pergunta.chave === "volume"
                        ? respostas.volume
                        : pergunta.chave === "infraestrutura"
                          ? respostas.infraestrutura
                          : respostas.prioridade
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-graf-300 bg-white px-3 text-base sm:text-[0.875rem] text-graf-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    {pergunta.opcoes.map((opcao) => (
                      <option key={opcao.valor} value={opcao.valor}>
                        {opcao.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-jb-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <Scale className="size-4" aria-hidden />
            Comparar
          </button>
        </form>
      </Secao>

      {ordenados.length < 2 ? (
        <Secao espaco="sm">
          <Vazio
            icone={Scale}
            titulo={
              ordenados.length === 0
                ? "Escolha os equipamentos acima"
                : "Falta o segundo equipamento"
            }
            descricao="A comparação precisa de pelo menos dois. Marque as caixas e clique em comparar."
          />
        </Secao>
      ) : (
        <>
          {/* ------------------------------------------ a orientação --- */}
          <Secao fundo="clara" espaco="sm">
            <Cartao className="p-5 sm:p-6">
              <h2 className="text-title texto-forte">
                {eleito ? `Pelos critérios aplicáveis: ${eleito.name}` : "Sem um vencedor claro"}
              </h2>

              {recomendacao.criterios.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {recomendacao.criterios.map((criterio) => (
                    <li
                      key={criterio}
                      className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-graf-700"
                    >
                      <span
                        aria-hidden
                        className="mt-2 size-1 shrink-0 rounded-full bg-jb-500"
                      />
                      <span>{criterio}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* O que NÃO pôde entrar. É a parte mais importante da caixa:
                  ela impede que a ausência de dado pareça um empate técnico. */}
              {recomendacao.lacunas.length > 0 ? (
                <div className="mt-4 border-t border-graf-200 pt-4">
                  <p className="text-[0.8125rem] font-semibold text-graf-700">
                    O que não entrou na conta
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {recomendacao.lacunas.map((lacuna) => (
                      <li
                        key={lacuna}
                        className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-graf-600"
                      >
                        <Info className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
                        <span>{lacuna}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-4 border-t border-graf-200 pt-4 text-[0.8125rem] leading-relaxed text-graf-500">
                Esta orientação usa preço, garantia e requisitos de instalação cadastrados. Ela
                não afirma que um equipamento atende a um procedimento clínico — isso depende de
                informação que o catálogo não tem, e quem responde é a equipe técnica.
              </p>

              <LinkBotao href="/orcamento" variante="secundario" tamanho="sm" className="mt-4">
                Falar com a equipe técnica
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
            </Cartao>
          </Secao>

          {/* ------------------------------------------- a comparação --- */}
          <Secao espaco="sm">
            <h2 className="text-title texto-forte">Atributo por atributo</h2>

            {/* Em telas estreitas, uma coluna por equipamento — e não uma
                tabela de três colunas que estoura a largura. O atributo é
                repetido em cada bloco, porque cabeçalho fora da tela é
                cabeçalho que não existe. */}
            <div className="mt-4 space-y-4 lg:hidden">
              {ordenados.map((produto, indice) => (
                <Cartao key={produto.slug} className="p-5">
                  <div className="flex items-center gap-4">
                    <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-graf-200 bg-white p-1.5">
                      {produto.media[0] ? (
                        <Image
                          src={produto.media[0].media.url}
                          alt={produto.media[0].alt || produto.media[0].media.alt || produto.name}
                          width={160}
                          height={160}
                          unoptimized={produto.media[0].media.url.startsWith("/")}
                          className="h-full w-auto object-contain"
                        />
                      ) : (
                        <ImageOff className="size-5 text-graf-400" aria-hidden />
                      )}
                    </span>
                    <h3 className="min-w-0 text-[1.0625rem] font-bold text-graf-950">{produto.name}</h3>
                  </div>
                  <dl className="mt-3 space-y-2 text-[0.875rem]">
                    {linhas.map((linha) => (
                      <div
                        key={linha.chave}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-graf-100 pb-2 last:border-0"
                      >
                        <dt className="text-graf-500">{linha.rotulo}</dt>
                        <dd
                          className={
                            linha.valores[indice].tipo === "ausente"
                              ? "italic text-graf-500"
                              : "font-semibold text-graf-900"
                          }
                        >
                          {textoDoValor(linha.valores[indice])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href={`/loja/${produto.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700"
                  >
                    Ver a página do equipamento
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Cartao>
              ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[48rem] border-collapse text-left text-[0.9375rem]">
                <caption className="sr-only">
                  Comparação de atributos entre os equipamentos escolhidos
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-52 py-3 pr-4 align-bottom text-graf-500">
                      Atributo
                    </th>
                    {ordenados.map((produto) => (
                      <th
                        key={produto.slug}
                        scope="col"
                        className="py-3 pr-4 align-bottom text-graf-950"
                      >
                        {/* A foto abre a coluna. Comparar equipamento sem ver
                            o equipamento é comparar nome — e é justamente a
                            foto que faz a pessoa reconhecer o que já viu. */}
                        <Link
                          href={`/loja/${produto.slug}`}
                          className="group block hover:text-jb-700"
                        >
                          <span className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg border border-graf-200 bg-white p-2">
                            {produto.media[0] ? (
                              <Image
                                src={produto.media[0].media.url}
                                alt={
                                  produto.media[0].alt ||
                                  produto.media[0].media.alt ||
                                  produto.name
                                }
                                width={220}
                                height={220}
                                unoptimized={produto.media[0].media.url.startsWith("/")}
                                className="h-full w-auto object-contain transition-transform duration-300 ease-out-quint group-hover:scale-105"
                              />
                            ) : (
                              <ImageOff className="size-6 text-graf-400" aria-hidden />
                            )}
                          </span>
                          {produto.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <tr key={linha.chave} className="border-t border-graf-200">
                      <th scope="row" className="py-3 pr-4 align-top font-normal text-graf-600">
                        {linha.rotulo}
                        {linha.ajuda ? (
                          <span className="mt-0.5 block text-[0.75rem] text-graf-500">
                            {linha.ajuda}
                          </span>
                        ) : null}
                      </th>
                      {linha.valores.map((valor, indice) => (
                        <td
                          key={`${linha.chave}-${ordenados[indice].slug}`}
                          className={
                            valor.tipo === "ausente"
                              ? "py-3 pr-4 align-top italic text-graf-500"
                              : "py-3 pr-4 align-top font-medium text-graf-900"
                          }
                        >
                          {textoDoValor(valor)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        </>
      )}
    </>
  );
}
