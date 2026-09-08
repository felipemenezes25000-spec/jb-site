import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma, ProductCondition } from "@prisma/client";
import { ArrowRight, PackageSearch, SearchX, TriangleAlert } from "lucide-react";

import { GradeProdutos, type Parcelamento } from "@/components/loja/card-produto";
import {
  BarraCatalogo,
  PainelFiltros,
  type GruposFiltro,
  type ParametrosCatalogo,
} from "@/components/loja/filtros-catalogo";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Trilha, Vazio, type Migalha } from "@/components/ui/data";
import { EsqueletoGradeProdutos } from "@/components/ui/esqueletos";
import { Paginacao } from "@/components/ui/paginacao";
import {
  buscarProdutos,
  montarFiltro,
  PUBLICADO,
  type FiltrosCatalogo as Filtros,
  type Ordenacao,
} from "@/lib/catalogo";
import { paraCentavos } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Vitrine

   A moldura de toda coleção da loja: /loja, categoria, marca, busca e as
   páginas de condição. Título, atalhos, barra de busca e ordenação, filtros à
   esquerda no desktop e em gaveta no celular, resultado paginado.

   A lista de produtos vive dentro de um <Suspense> com chave própria: a
   moldura aparece na hora e, a cada mudança de filtro, o esqueleto ocupa
   exatamente o lugar dos cartões enquanto o banco responde.
   ============================================================================ */

const POR_PAGINA = 24;

const CONDICOES_ROTULO: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

/** Cada condição tem a sua própria coleção na loja. */
const CONDICOES_ROTA: Record<ProductCondition, string> = {
  novo: "/novos",
  seminovo: "/seminovos",
  usado: "/usados",
  recondicionado: "/recondicionados",
};

const ORDEM_CONDICAO: ProductCondition[] = ["novo", "seminovo", "recondicionado", "usado"];

/** Só existe uma fileira de atalhos por página — o id fixo dá nome à navegação. */
const ID_ATALHOS = "atalhos-da-colecao";

export type ParametrosVitrine = ParametrosCatalogo;

/** Link de coleção mostrado abaixo do título — só com contagem real. */
export type Atalho = { rotulo: string; href: string; quantidade?: number };

function lista(valor: string | string[] | undefined): string[] {
  if (!valor) return [];
  const texto = Array.isArray(valor) ? valor.join(",") : valor;
  return texto.split(",").filter(Boolean);
}

function texto(valor: string | string[] | undefined): string | undefined {
  if (!valor) return undefined;
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  return bruto?.trim() ? bruto.trim() : undefined;
}

/* ============================================================================
   Atalhos de coleção — nada escrito à mão, tudo vem do catálogo publicado
   ============================================================================ */

/** As outras condições que existem no catálogo, com quantidade real. */
export async function atalhosDeCondicao(atual?: ProductCondition): Promise<Atalho[]> {
  try {
    const linhas = await prisma.product.groupBy({
      by: ["condition"],
      where: PUBLICADO,
      _count: { _all: true },
    });
    const mapa = new Map(linhas.map((linha) => [linha.condition, linha._count._all]));

    return ORDEM_CONDICAO.filter((c) => c !== atual && (mapa.get(c) ?? 0) > 0).map((c) => ({
      rotulo: CONDICOES_ROTULO[c],
      href: CONDICOES_ROTA[c],
      quantidade: mapa.get(c),
    }));
  } catch {
    return [];
  }
}

/** Subcategorias publicadas com produto ativo. Sem filhas, devolve lista vazia. */
export async function atalhosDeSubcategorias(slugPai: string): Promise<Atalho[]> {
  try {
    const filhas = await prisma.category.findMany({
      where: { published: true, parent: { slug: slugPai } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: PUBLICADO } } },
      },
    });

    return filhas
      .filter((filha) => filha._count.products > 0)
      .map((filha) => ({
        rotulo: filha.name,
        href: `/categoria/${filha.slug}`,
        quantidade: filha._count.products,
      }));
  } catch {
    return [];
  }
}

/** Categorias de primeiro nível com produto ativo — a entrada da loja. */
export async function atalhosDeCategorias(limite = 10): Promise<Atalho[]> {
  try {
    const categorias = await prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: PUBLICADO } } },
      },
    });

    return categorias
      .filter((categoria) => categoria._count.products > 0)
      .slice(0, limite)
      .map((categoria) => ({
        rotulo: categoria.name,
        href: `/categoria/${categoria.slug}`,
        quantidade: categoria._count.products,
      }));
  } catch {
    return [];
  }
}

/* ============================================================================
   Grupos de filtro — recortados pela coleção em que a pessoa está

   Em /seminovos, a contagem ao lado de cada marca é a de seminovos daquela
   marca. Número que não corresponde ao clique é pior do que número nenhum.
   ============================================================================ */

const GRUPOS_VAZIOS: GruposFiltro = {
  categorias: [],
  marcas: [],
  condicoes: [],
  voltagens: [],
  faixaPreco: { minCents: 0, maxCents: 0 },
};

/**
 * Um `where` por grupo, cada um sem o filtro do próprio grupo.
 *
 * Contar tudo com o mesmo filtro daria números que se contradizem com a
 * lista: as contagens da barra lateral vinham do escopo inteiro da coleção e
 * seguiam iguais depois de filtrar — a lista mostrava 5 itens e a lateral
 * somava 6, e numa busca sem resultado as facetas ainda ofereciam
 * "Biossegurança 2", prometendo itens que o clique não entregava.
 *
 * Contar com TODOS os filtros ativos também não serve: o grupo que a pessoa
 * acabou de usar zeraria as próprias alternativas, e marcar uma segunda
 * marca deixaria de ser possível. Cada grupo ignora só o que ele mesmo
 * filtra — é o que faz "ALT 2" significar "marcando ALT junto do que já está
 * marcado, sobram 2".
 */
type BasesDeFaceta = {
  semCategoria: Prisma.ProductWhereInput;
  semMarca: Prisma.ProductWhereInput;
  semCondicao: Prisma.ProductWhereInput;
  semVoltagem: Prisma.ProductWhereInput;
  semPreco: Prisma.ProductWhereInput;
};

async function montarGrupos(bases: BasesDeFaceta): Promise<GruposFiltro> {
  const [categorias, marcas, condicoes, voltagens, faixa] = await Promise.all([
    prisma.category.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: bases.semCategoria } } },
      },
    }),
    prisma.brand.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: bases.semMarca } } },
      },
    }),
    prisma.product.groupBy({
      by: ["condition"],
      where: bases.semCondicao,
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { ...bases.semVoltagem, voltage: { not: null } },
      distinct: ["voltage"],
      orderBy: { voltage: "asc" },
      select: { voltage: true },
    }),
    prisma.product.aggregate({
      where: { ...bases.semPreco, priceCents: { gt: 0 } },
      _min: { priceCents: true },
      _max: { priceCents: true },
    }),
  ]);

  return {
    categorias: categorias
      .filter((categoria) => categoria._count.products > 0)
      .map((categoria) => ({
        valor: categoria.slug,
        rotulo: categoria.name,
        quantidade: categoria._count.products,
      })),
    marcas: marcas
      .filter((marca) => marca._count.products > 0)
      .map((marca) => ({
        valor: marca.slug,
        rotulo: marca.name,
        quantidade: marca._count.products,
      })),
    condicoes: ORDEM_CONDICAO.flatMap((condicao) => {
      const linha = condicoes.find((c) => c.condition === condicao);
      if (!linha) return [];
      return [
        { valor: condicao, rotulo: CONDICOES_ROTULO[condicao], quantidade: linha._count._all },
      ];
    }),
    voltagens: voltagens
      .flatMap((linha) => (linha.voltage ? [linha.voltage] : []))
      .map((voltagem) => ({
        valor: voltagem,
        rotulo: voltagem === "bivolt" ? "Bivolt" : `${voltagem} V`,
      })),
    faixaPreco: {
      minCents: faixa._min.priceCents ?? 0,
      maxCents: faixa._max.priceCents ?? 0,
    },
  };
}

/* ============================================================================
   Estados da lista: carregando, erro, vazio
   ============================================================================ */

function EsqueletoResultados() {
  return (
    <div>
      <div className="border-b border-graf-200 pb-3">
        <Esqueleto className="h-4 w-40" />
      </div>
      <EsqueletoGradeProdutos
        quantidade={6}
        className="mt-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      />
    </div>
  );
}

function ErroCatalogo({ caminho }: { caminho: string }) {
  return (
    <div className="rounded-xl border border-jb-200 bg-jb-50/60 px-6 py-14 text-center">
      <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white text-jb-600 shadow-card">
        <TriangleAlert className="size-5" aria-hidden />
      </span>
      <p className="text-base font-semibold text-graf-900">
        Não foi possível carregar o catálogo agora
      </p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-graf-600">
        A falha é nossa, não sua. Tente de novo em instantes — ou fale com a equipe, que
        responde com preço e prazo por escrito.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkBotao href={caminho} variante="secundario">
          Tentar de novo
        </LinkBotao>
        <LinkBotao href="/contato">Falar com a equipe</LinkBotao>
      </div>
    </div>
  );
}

function SemResultado({
  busca,
  temFiltro,
  caminho,
  pagina,
  endereco,
}: {
  busca?: string;
  temFiltro: boolean;
  caminho: string;
  pagina: number;
  /** A mesma lista na primeira página — para quem chegou por um link antigo. */
  endereco: string;
}) {
  // link antigo apontando para uma página que não existe mais
  if (pagina > 1) {
    return (
      <Vazio
        icone={PackageSearch}
        titulo="Esta página não tem mais itens"
        descricao="A lista mudou desde que este endereço foi criado. Volte ao começo para ver o que está disponível agora."
        acao={<LinkBotao href={endereco}>Voltar ao início da lista</LinkBotao>}
      />
    );
  }

  if (busca) {
    return (
      <Vazio
        icone={SearchX}
        titulo={`Nada encontrado para “${busca}”`}
        descricao="Tente o nome do equipamento, a marca ou o modelo. Muita coisa é atendida sob orçamento, mesmo fora do catálogo."
        acao={
          <div className="flex flex-wrap justify-center gap-3">
            <LinkBotao href="/loja" variante="secundario">
              Ver o catálogo inteiro
            </LinkBotao>
            <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
          </div>
        }
      />
    );
  }

  if (temFiltro) {
    return (
      <Vazio
        icone={PackageSearch}
        titulo="Nenhum item com esses filtros"
        descricao="Tire um filtro para ampliar o resultado. Se você já sabe o modelo que precisa, a equipe monta o orçamento."
        acao={
          <div className="flex flex-wrap justify-center gap-3">
            <LinkBotao href={caminho} variante="secundario">
              Limpar filtros
            </LinkBotao>
            <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
          </div>
        }
      />
    );
  }

  return (
    <Vazio
      icone={PackageSearch}
      titulo="Nada publicado aqui ainda"
      descricao="Esta lista é montada a partir do que está cadastrado no catálogo. Enquanto os itens não entram, a equipe atende por orçamento."
      acao={
        <div className="flex flex-wrap justify-center gap-3">
          <LinkBotao href="/loja" variante="secundario">
            Ver o catálogo
          </LinkBotao>
          <LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>
        </div>
      }
    />
  );
}

/** O convite comercial que fecha toda coleção com resultado. */
function ChamadaCatalogo() {
  return (
    <div className="mt-14 rounded-xl border border-graf-200 bg-surface-muted px-6 py-9 sm:mt-16 sm:px-9 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
        <div className="max-w-xl">
          <h2 className="text-title text-graf-950">Não encontrou o que procura?</h2>
          <p className="mt-3 text-base leading-relaxed text-graf-600">
            O catálogo publicado é uma parte do que a JB fornece. Diga o equipamento, a marca e
            o modelo e a equipe responde com preço e prazo.
          </p>
        </div>
        <LinkBotao href="/orcamento" tamanho="lg" className="shrink-0">
          Pedir orçamento
          <ArrowRight className="size-4" aria-hidden />
        </LinkBotao>
      </div>
    </div>
  );
}

/**
 * O mesmo convite, mas como célula da grade.
 *
 * Coleção com um ou dois equipamentos publicados deixava metade da fileira em
 * branco — o vazio ao lado do cartão parecia carregamento que não terminou.
 * Aqui o convite ocupa a coluna que sobrou e vira o próximo passo de quem não
 * encontrou o equipamento na lista curta. A borda tracejada e a ausência de
 * preço deixam claro que não é produto.
 */
function ConviteNaGrade() {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-jb-200 bg-jb-50/40 p-6 text-center sm:p-7">
      <span className="flex size-11 items-center justify-center rounded-full bg-white text-jb-600 shadow-card">
        <PackageSearch className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-bold text-graf-950">Não é o que você procura?</h3>
      <p className="mt-2 max-w-xs text-[0.9375rem] leading-relaxed text-graf-600">
        O catálogo publicado é uma parte do que a JB fornece. Diga o equipamento, a marca e o
        modelo e a equipe responde com preço e prazo.
      </p>
      <LinkBotao href="/orcamento" className="mt-5">
        Pedir orçamento
        <ArrowRight className="size-4" aria-hidden />
      </LinkBotao>
    </div>
  );
}

/* ============================================================================
   Resultados — o bloco que muda a cada filtro
   ============================================================================ */

type Busca = Awaited<ReturnType<typeof buscarProdutos>>;
type Resposta = { ok: true; dados: Busca } | { ok: false };

async function Resultados({
  consulta,
  parcelamento,
  busca,
  temFiltro,
  caminho,
  endereco,
  pagina,
  chamadaDestacada,
}: {
  consulta: Promise<Resposta>;
  parcelamento: Parcelamento;
  busca?: string;
  temFiltro: boolean;
  caminho: string;
  endereco: string;
  pagina: number;
  chamadaDestacada?: boolean;
}) {
  const resposta = await consulta;
  if (!resposta.ok) return <ErroCatalogo caminho={caminho} />;

  const { dados } = resposta;

  if (dados.produtos.length === 0) {
    return (
      <SemResultado
        busca={busca}
        temFiltro={temFiltro}
        caminho={caminho}
        endereco={endereco}
        pagina={pagina}
      />
    );
  }

  const paginas = Math.ceil(dados.total / POR_PAGINA);

  /* Lista curta: o convite entra na grade, no lugar da coluna vazia, e a
     faixa de baixo sai — senão o mesmo pedido apareceria duas vezes. */
  const listaCurta = dados.total > 0 && dados.total < 3;

  return (
    <div>
      {/* cabeçalho da listagem: quantidade à esquerda, posição na lista à
          direita. O filete embaixo separa a contagem dos cartões sem pedir
          mais uma caixa na tela */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-graf-200 pb-3">
        <p className="text-[0.9375rem] text-graf-600" aria-live="polite">
          <span className="tabular text-base font-bold text-graf-950">{dados.total}</span>{" "}
          {busca || temFiltro
            ? dados.total === 1
              ? "item encontrado"
              : "itens encontrados"
            : dados.total === 1
              ? "item nesta lista"
              : "itens nesta lista"}
        </p>

        {paginas > 1 ? (
          <p className="tabular text-[0.8125rem] text-graf-500">
            Página {pagina} de {paginas}
          </p>
        ) : null}
      </div>

      <GradeProdutos
        produtos={dados.produtos}
        parcelamento={parcelamento}
        colunas={{ base: 1, sm: 2, lg: 2, xl: 3, xxl: 4 }}
        chamadaDestacada={chamadaDestacada}
        extra={listaCurta ? <ConviteNaGrade /> : null}
        className="mt-6"
      />

      {dados.total > POR_PAGINA ? (
        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={dados.total}
          rotuloSingular="item"
          rotuloPlural="itens"
          className="mt-10 border-t border-graf-200 pt-6"
        />
      ) : null}

      {listaCurta ? null : <ChamadaCatalogo />}
    </div>
  );
}

/* ============================================================================
   Vitrine
   ============================================================================ */

export async function Vitrine({
  sobretitulo,
  titulo,
  descricao,
  trilha,
  caminho,
  parametros,
  filtrosFixos,
  imagem,
  atalhos,
  rotuloAtalhos = "Coleções relacionadas",
  travarCategoria,
  travarCondicao,
  travarMarca,
  variante = "padrao",
}: {
  /** Degrau acima do título — "Catálogo", "Por condição", "Marca". */
  sobretitulo?: string;
  titulo: string;
  descricao?: string;
  trilha: Migalha[];
  /** Endereço desta coleção, sem query — é o "limpar tudo" da tela. */
  caminho: string;
  parametros: ParametrosVitrine;
  filtrosFixos?: Filtros;
  /** Logo da marca ou foto da categoria — só quando existe no cadastro. */
  imagem?: { url: string; alt: string };
  atalhos?: Atalho[];
  rotuloAtalhos?: string;
  travarCategoria?: boolean;
  travarCondicao?: boolean;
  travarMarca?: boolean;
  /**
   * `"colecao"` para /loja e /seminovos, que abrem com o próprio
   * `CabecalhoColecao`: a vitrine entra só como lista — sem repetir trilha,
   * título e atalhos — e os cartões ganham o botão cheio.
   *
   * Antes esse recorte era feito por CSS, escondendo o cabeçalho já
   * renderizado. Escondido ele continuava no HTML, com dois `h1` na mesma
   * página e um título anunciado a quem navega por leitor de tela.
   */
  variante?: "padrao" | "colecao";
}) {
  const pagina = Math.max(1, Number(texto(parametros.pagina) ?? 1) || 1);
  const ordem = (texto(parametros.ordem) as Ordenacao | undefined) ?? "relevancia";
  const busca = texto(parametros.q);

  const categorias = lista(parametros.categoria);
  const marcas = lista(parametros.marca);
  const condicoes = lista(parametros.condicao);
  const voltagens = lista(parametros.voltagem);
  const precoMin = texto(parametros.preco_min);
  const precoMax = texto(parametros.preco_max);
  const emEstoque = texto(parametros.estoque) === "1";

  const filtros: Filtros = {
    busca,
    // listas inteiras, não só o primeiro item: a barra marca vários valores
    categoria: filtrosFixos?.categoria ?? (categorias.length ? categorias : undefined),
    marca: filtrosFixos?.marca ?? (marcas.length ? marcas : undefined),
    condicao:
      filtrosFixos?.condicao ??
      (condicoes.length ? (condicoes as Filtros["condicao"]) : undefined),
    voltagem: voltagens.length ? voltagens : undefined,
    precoMin: precoMin ? Number(precoMin) : undefined,
    precoMax: precoMax ? Number(precoMax) : undefined,
    emEstoque,
  };

  const temFiltro =
    categorias.length > 0 ||
    marcas.length > 0 ||
    condicoes.length > 0 ||
    voltagens.length > 0 ||
    Boolean(precoMin) ||
    Boolean(precoMax) ||
    emEstoque;

  // a consulta começa antes dos grupos e só é aguardada dentro do Suspense:
  // a moldura da página aparece de imediato e apenas a lista espera o banco
  const consulta: Promise<Resposta> = buscarProdutos({
    filtros,
    ordem,
    pagina,
    porPagina: POR_PAGINA,
  })
    .then((dados) => ({ ok: true as const, dados }))
    .catch(() => ({ ok: false as const }));

  const [grupos, configuracoes] = await Promise.all([
    /* O filtro fixo da coleção continua valendo em todo grupo: em /seminovos a
       condição é o escopo da página, não uma escolha que a pessoa possa
       desmarcar. Só o que veio da barra de filtros sai da conta do seu grupo. */
    montarGrupos({
      semCategoria: montarFiltro({ ...filtros, categoria: filtrosFixos?.categoria }),
      semMarca: montarFiltro({ ...filtros, marca: filtrosFixos?.marca }),
      semCondicao: montarFiltro({ ...filtros, condicao: filtrosFixos?.condicao }),
      semVoltagem: montarFiltro({ ...filtros, voltagem: undefined }),
      semPreco: montarFiltro({ ...filtros, precoMin: undefined, precoMax: undefined }),
    }).catch(() => GRUPOS_VAZIOS),
    getSettings().catch(() => null),
  ]);

  const parcelamento: Parcelamento = {
    max: Math.max(1, Number(configuracoes?.parcelas_max ?? 12) || 12),
    minimoCents: paraCentavos(configuracoes?.parcela_minima ?? "50,00") || 5000,
  };

  const travas = { travarCategoria, travarCondicao, travarMarca };
  const chave = JSON.stringify({ filtros, ordem, pagina });

  // a mesma lista na primeira página, para quem chegou por um link antigo
  const enderecoPrimeiraPagina = (() => {
    const params = new URLSearchParams();
    for (const [chaveParam, valor] of Object.entries(parametros)) {
      if (chaveParam === "pagina" || !valor) continue;
      params.set(chaveParam, Array.isArray(valor) ? valor.join(",") : valor);
    }
    const consultaTexto = params.toString();
    return consultaTexto ? `${caminho}?${consultaTexto}` : caminho;
  })();

  const daColecao = variante === "colecao";

  return (
    <div className={cn("container-jb", daColecao ? "pb-10 lg:pb-14" : "py-8 lg:py-12")}>
      {daColecao ? null : (
        <>
          <Trilha itens={trilha} className="mb-5" />

          <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
            <div className="max-w-2xl">
              {/* `text-section`, não `text-display`: numa listagem o título nomeia
                  a coleção, não abre a marca. O degrau de hero fica reservado para
                  a página principal, e o sobretítulo devolve a hierarquia que o
                  título sozinho perdia. */}
              {sobretitulo ? <p className="sobretitulo mb-3">{sobretitulo}</p> : null}
              <h1 className="text-section text-graf-950">{titulo}</h1>
              {descricao ? <p className="texto-guia mt-4 text-graf-600">{descricao}</p> : null}
            </div>

            {imagem ? (
              <div className="flex h-22 w-44 shrink-0 items-center justify-center rounded-xl border border-graf-200 bg-white p-5">
                <Image
                  src={imagem.url}
                  alt={imagem.alt}
                  width={176}
                  height={72}
                  className="h-full w-auto object-contain"
                />
              </div>
            ) : null}
          </header>

          {atalhos && atalhos.length > 0 ? (
            <nav aria-labelledby={ID_ATALHOS} className="mt-8">
              {/* o rótulo da fileira vira texto na tela: sem ele, uma linha de
                  pastilhas soltas embaixo do título não explica o que é. O mesmo
                  texto serve de nome acessível da navegação, sem repetição */}
              <p
                id={ID_ATALHOS}
                className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500"
              >
                {rotuloAtalhos}
              </p>
              <ul className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {atalhos.map((atalho) => (
                  <li key={atalho.href} className="shrink-0">
                    <Link
                      href={atalho.href}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-graf-200 bg-white px-4 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {atalho.rotulo}
                      {atalho.quantidade !== undefined ? (
                        <span className="tabular text-[0.8125rem] font-medium text-graf-500">
                          {atalho.quantidade}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </>
      )}

      <div
        className={cn(
          "grid gap-x-12 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)]",
          daColecao ? "mt-6 lg:mt-7" : "mt-8 lg:mt-10",
        )}
      >
        <aside className="hidden lg:block" aria-label="Filtros do catálogo">
          <PainelFiltros grupos={grupos} parametros={parametros} {...travas} />
        </aside>

        <div className="min-w-0">
          <BarraCatalogo grupos={grupos} parametros={parametros} className="mb-6" {...travas} />

          <Suspense key={chave} fallback={<EsqueletoResultados />}>
            <Resultados
              consulta={consulta}
              parcelamento={parcelamento}
              busca={busca}
              temFiltro={temFiltro}
              caminho={caminho}
              endereco={enderecoPrimeiraPagina}
              pagina={pagina}
              chamadaDestacada={daColecao}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
