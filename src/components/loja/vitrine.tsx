import { Suspense } from "react";
import type { Prisma, ProductCondition } from "@prisma/client";
import { ArrowRight, PackageSearch, SearchX, TriangleAlert } from "lucide-react";

import {
  PainelFiltros,
  type GruposFiltro,
  type ParametrosCatalogo,
} from "@/components/loja/filtros-catalogo";
import { ControlesColecao } from "@/components/loja/marketplace/controles-colecao";
import { CabecalhoColecao } from "@/components/loja/marketplace/cabecalho-colecao";
import {
  EsqueletoGradeMarketplace,
  GradeMarketplace,
} from "@/components/loja/marketplace/grade-marketplace";
import type { ParcelamentoMarketplace } from "@/components/loja/marketplace/tipos";
import { LinkBotao } from "@/components/ui/button";
import { Esqueleto, Vazio, type Migalha } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import {
  buscarProdutosMarketplace,
  expandirCategorias,
  expandirMarcas,
  montarFiltro,
  PUBLICADO,
  UNIDADE_VENDIDA,
  type FiltrosCatalogo as Filtros,
  type Ordenacao,
} from "@/lib/catalogo";
import { sessaoCliente } from "@/lib/auth-cliente";
import { paraCentavos } from "@/lib/format";
import { unificarPorNome } from "@/lib/homonimos";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

import marketplaceStyles from "./marketplace/marketplace.module.css";

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
      /* A contagem do atalho tem que ser a da lista que ele abre — e a lista
         não mostra unidade já vendida. */
      where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA },
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
        _count: { select: { products: { where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA } } } },
      },
    });

    return paraAtalhos(filhas);
  } catch {
    return [];
  }
}

/**
 * Categorias viram atalhos, com os cadastros de mesmo nome já juntos.
 *
 * Duas pastilhas escritas "Biossegurança", uma ao lado da outra, levando a
 * listas diferentes, é a mesma pergunta sem resposta que a barra de filtros
 * fazia. Aqui vira uma pastilha com a soma; a lista do outro lado abre os
 * dois cadastros (ver `expandirCategorias`).
 */
function paraAtalhos(
  linhas: { slug: string; name: string; _count: { products: number } }[],
): Atalho[] {
  return unificarPorNome(
    linhas
      .filter((linha) => linha._count.products > 0)
      .map((linha) => ({
        slug: linha.slug,
        nome: linha.name,
        quantidade: linha._count.products,
      })),
  ).map((item) => ({
    rotulo: item.nome,
    href: `/categoria/${item.slug}`,
    quantidade: item.quantidade,
  }));
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
        _count: { select: { products: { where: { ...PUBLICADO, NOT: UNIDADE_VENDIDA } } } },
      },
    });

    return paraAtalhos(categorias).slice(0, limite);
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

  /* Duas linhas "Biossegurança" com 1 ao lado de cada uma não são duas
     escolhas: são a mesma escolha partida em duas por um acidente de carga de
     dados. Viram uma opção, com a soma — e o filtro abre os dois cadastros
     (ver `expandirCategorias` em `src/lib/catalogo.ts`). */
  const opcoes = (linhas: { slug: string; name: string; _count: { products: number } }[]) =>
    unificarPorNome(
      linhas
        .filter((linha) => linha._count.products > 0)
        .map((linha) => ({
          slug: linha.slug,
          nome: linha.name,
          quantidade: linha._count.products,
        })),
    ).map((item) => ({ valor: item.slug, rotulo: item.nome, quantidade: item.quantidade }));

  return {
    categorias: opcoes(categorias),
    marcas: opcoes(marcas),
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
      <div className="mt-6">
        <EsqueletoGradeMarketplace />
      </div>
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
    <aside
      data-convite-orcamento
      className="mt-8 flex flex-col justify-between gap-4 border-y border-graf-200 bg-graf-50 px-5 py-5 sm:flex-row sm:items-center"
    >
      <div className="max-w-3xl">
        <p className="font-bold text-graf-950">Não encontrou a configuração certa?</p>
        <p className="mt-1 text-sm leading-6 text-graf-600">
          Informe equipamento, voltagem e necessidade da clínica. A equipe responde com
          disponibilidade e prazo.
        </p>
      </div>
      <LinkBotao href="/orcamento" tamanho="sm" className="shrink-0">
          Pedir orçamento
          <ArrowRight className="size-4" aria-hidden />
      </LinkBotao>
    </aside>
  );
}

/* ============================================================================
   Resultados — o bloco que muda a cada filtro
   ============================================================================ */

type Busca = Awaited<ReturnType<typeof buscarProdutosMarketplace>>;
type Resposta = { ok: true; dados: Busca } | { ok: false };

async function Resultados({
  consulta,
  parcelamento,
  busca,
  temFiltro,
  caminho,
  endereco,
  pagina,
}: {
  consulta: Promise<Resposta>;
  parcelamento: ParcelamentoMarketplace;
  busca?: string;
  temFiltro: boolean;
  caminho: string;
  endereco: string;
  pagina: number;
}) {
  const resposta = await consulta;
  if (!resposta.ok) return <ErroCatalogo caminho={caminho} />;

  const { dados } = resposta;

  /* ==========================================================================
     Favoritos: uma consulta por página, não uma por cartão

     A ficha de produto já guardava equipamento (`AcoesDoProduto`), e a Área da
     Clínica já lista o que foi guardado — o que faltava era o gesto onde ele
     mais serve: comparando opções na grade. O briefing pede
     "favoritar/comparar" no cartão; comparar já estava lá, favoritar não.

     O estado é do cliente e mora no banco, então precisa de sessão. Buscar por
     cartão seriam 24 consultas numa página de catálogo: em vez disso vem o
     conjunto dos ids favoritados desta página, de uma vez. Sem sessão o botão
     continua aparecendo e leva ao login com a volta apontando para cá —
     esconder a função de quem não entrou é como esconder o preço.
     ========================================================================== */
  const cliente = await sessaoCliente().catch(() => null);
  const favoritados = cliente
    ? new Set(
        (
          await prisma.favorite
            .findMany({
              where: {
                customerId: cliente.id,
                productId: { in: dados.produtos.map((produto) => produto.id) },
              },
              select: { productId: true },
            })
            .catch(() => [])
        ).map((favorito) => favorito.productId),
      )
    : new Set<string>();

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

  return (
    <div>
      {/* cabeçalho da listagem: quantidade à esquerda, posição na lista à
          direita. O filete embaixo separa a contagem dos cartões sem pedir
          mais uma caixa na tela */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-graf-200 pb-3">
        <p className="text-corpo text-graf-600" aria-live="polite">
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
          <p className="tabular text-apoio text-graf-500">
            Página {pagina} de {paginas}
          </p>
        ) : null}
      </div>

      <GradeMarketplace
        favoritados={favoritados}
        voltar={endereco}
        produtos={dados.produtos}
        parcelamento={parcelamento}
        className="mt-5"
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

      <ChamadaCatalogo />
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
  faixaDeConfianca,
  travarCategoria,
  travarCondicao,
  travarMarca,
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
  /** Faixa entre o cabeçalho e os controles — sinais que precisam vir antes da grade. */
  faixaDeConfianca?: React.ReactNode;
  travarCategoria?: boolean;
  travarCondicao?: boolean;
  travarMarca?: boolean;
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
  const incluirVendidos = texto(parametros.vendidos) === "1";

  /* Cadastros de mesmo nome viram um filtro só, e um filtro só precisa
     alcançar todos eles. O endereço continua com um slug — `/categoria/
     biosseguranca` — e a consulta é que abre o slug nos irmãos homônimos.
     Sem isto, a pastilha "Biossegurança 2" abriria uma lista de 1. */
  const emLista = (valor: string | string[] | undefined) =>
    valor === undefined ? [] : Array.isArray(valor) ? valor : [valor];

  const [categoriaAberta, marcaAberta] = await Promise.all([
    expandirCategorias(emLista(filtrosFixos?.categoria ?? categorias)),
    expandirMarcas(emLista(filtrosFixos?.marca ?? marcas)),
  ]);

  /* Quando a coleção fixa a categoria — `/categoria/[slug]` — a lista aberta
     JÁ é a dela, porque o `??` acima escolheu a fixa. É o que as facetas
     precisam para tirar da conta só o que veio da barra. */
  const categoriaFixaAberta = filtrosFixos?.categoria ? categoriaAberta : undefined;
  const marcaFixaAberta = filtrosFixos?.marca ? marcaAberta : undefined;

  const filtros: Filtros = {
    busca,
    // listas inteiras, não só o primeiro item: a barra marca vários valores
    categoria: categoriaAberta.length ? categoriaAberta : undefined,
    marca: marcaAberta.length ? marcaAberta : undefined,
    incluirVendidos,
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
  const consulta: Promise<Resposta> = buscarProdutosMarketplace({
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
      semCategoria: montarFiltro({ ...filtros, categoria: categoriaFixaAberta }),
      semMarca: montarFiltro({ ...filtros, marca: marcaFixaAberta }),
      semCondicao: montarFiltro({ ...filtros, condicao: filtrosFixos?.condicao }),
      semVoltagem: montarFiltro({ ...filtros, voltagem: undefined }),
      semPreco: montarFiltro({ ...filtros, precoMin: undefined, precoMax: undefined }),
    }).catch(() => GRUPOS_VAZIOS),
    getSettings().catch(() => null),
  ]);

  const parcelamento: ParcelamentoMarketplace = {
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

  return (
    <div
      data-marketplace-shell
      /* `container-jb` sozinho para em 90rem, e a home, a ficha de produto e o
         resto da vitrine alinham por 100rem. A 1920 o catálogo saía 160px mais
         estreito que a página de onde a pessoa acabou de vir — o mesmo degrau
         que a ficha já tinha corrigido. */
      className={cn(marketplaceStyles.shell, "container-loja py-8 lg:py-12")}
    >
      <CabecalhoColecao
        sobretitulo={sobretitulo}
        titulo={titulo}
        descricao={descricao}
        trilha={trilha}
        imagem={imagem}
        atalhos={atalhos}
        rotuloAtalhos={rotuloAtalhos}
      />

      {/* Faixa opcional entre o cabeçalho e os controles.

          Existe por causa dos seminovos: a página tinha sete sinais de
          procedência — unidade por anúncio, número de série, ano de fabricação,
          uso acumulado, checklist da revisão, condição descrita e garantia —
          gerados a partir do que está mesmo cadastrado, e todos **no rodapé da
          página**, a 2.100px de rolagem. Quem chega via "Seminovos" vê uma
          grade de catálogo primeiro e o motivo de confiar por último. */}
      {faixaDeConfianca ? <div className="mt-6">{faixaDeConfianca}</div> : null}

      <div className="mt-7 lg:mt-8">
        <ControlesColecao grupos={grupos} parametros={parametros} {...travas} />

        {/* Duas colunas a partir de 1024px.

            `PainelFiltros` já existia, com `lg:sticky lg:top-24` pronto, e
            estava órfão: nenhuma tela do projeto o usava. O catálogo escondia
            categoria, marca, preço, condição, voltagem e disponibilidade
            atrás de um botão — inclusive a 1920px, onde sobram 1.600px de
            largura e a coluna de filtros custa 17rem.

            É o padrão de todo marketplace medido como referência, e é o que a
            barra de controles não consegue dar: ver o que existe para filtrar
            sem abrir nada. No celular continua sendo gaveta, que é onde
            gaveta faz sentido. */}
        <div className="mt-6 min-w-0 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[18.5rem_minmax(0,1fr)] xl:gap-10">
          <PainelFiltros
            grupos={grupos}
            parametros={parametros}
            className="hidden lg:block"
            {...travas}
          />

          <div className="min-w-0">
            <Suspense key={chave} fallback={<EsqueletoResultados />}>
              <Resultados
                consulta={consulta}
                parcelamento={parcelamento}
                busca={busca}
                temFiltro={temFiltro}
                caminho={caminho}
                endereco={enderecoPrimeiraPagina}
                pagina={pagina}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
