"use server";

import { revalidatePath, updateTag } from "next/cache";

import {
  conferirGtin,
  conferirMpn,
  EXPLICACAO_DO_GTIN,
  EXPLICACAO_DO_MPN,
  normalizarGtin,
} from "@/lib/identificadores";
import { ETIQUETA_CATALOGO, ETIQUETA_CATEGORIAS } from "@/lib/loja-publica";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { gerarSlug } from "@/lib/format";
import { exigirEdicao } from "@/lib/permissoes";
import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import { prisma } from "@/lib/prisma";

/**
 * Escrita do catálogo e do estoque.
 *
 * Um arquivo, uma regra em cada função. Três coisas valem para todas elas:
 *
 *  1. Autorização é do servidor. Toda função começa com `exigirEdicao`, que
 *     redireciona quem abriu a tela sem o papel necessário — esconder o botão
 *     no formulário nunca foi controle de acesso.
 *  2. Preço nunca chega pronto do formulário em reais: o campo de moeda envia
 *     centavos inteiros e o servidor confere o intervalo. Total de estoque
 *     também é recalculado aqui, nunca aceito como número solto.
 *  3. Formulário longo salva por aba. Cada aba do produto tem a sua própria
 *     função e mexe só nos campos dela, então salvar Preços não pode apagar o
 *     que estava sendo escrito em Especificações.
 *
 * Nada aqui apaga histórico: produto que já entrou em pedido é arquivado, não
 * excluído, senão o pedido antigo perde a referência.
 */

/* ========================================================================== */
/* Tipos e utilitários comuns                                                  */
/* ========================================================================== */

export type EstadoAcao = {
  erro?: string;
  /** Nome do campo com problema, para o formulário destacar o certo. */
  campo?: string;
  ok?: boolean;
  mensagem?: string;
};

function falha(erro: string, campo?: string): EstadoAcao {
  return { erro, campo };
}

function feito(mensagem: string): EstadoAcao {
  return { ok: true, mensagem };
}

/** Primeira mensagem do zod já apontando o campo que falhou. */
function doZod(erro: z.ZodError): EstadoAcao {
  const problema = erro.issues[0];
  return falha(
    problema?.message ?? "Confira os dados informados.",
    problema?.path.length ? String(problema.path[0]) : undefined,
  );
}

/**
 * Índice único estourado. Devolve o campo real quando dá para saber qual foi —
 * "slug" e "sku" são os dois que a pessoa consegue corrigir sozinha.
 */
function duplicado(erro: unknown): EstadoAcao | null {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError) || erro.code !== "P2002") {
    return null;
  }
  const alvo = Array.isArray(erro.meta?.target) ? erro.meta.target.join(",") : String(erro.meta?.target ?? "");

  if (alvo.includes("slug")) return falha("Já existe um registro com este endereço (slug).", "slug");
  if (alvo.includes("sku")) return falha("Já existe um produto com este SKU.", "sku");
  if (alvo.includes("serialNumber")) return falha("Já existe uma unidade com este número de série.", "serialNumber");
  return falha("Já existe um registro com estes dados.");
}

function erroInesperado(contexto: string, erro: unknown): EstadoAcao {
  const conhecido = duplicado(erro);
  if (conhecido) return conhecido;
  console.error(`Falha em ${contexto}`, erro);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
}

/** Telas do painel e da loja que dependem do catálogo. */
/**
 * Derruba o que ficou velho depois de mexer no catálogo.
 *
 * `updateTag` além do caminho: desde a migração para Cache Components, a
 * vitrine da home e a contagem de produtos por categoria no menu vivem em
 * escopos `use cache` com etiqueta (`@/lib/loja-publica`). Sem derrubar a
 * etiqueta, publicar um produto no painel só apareceria no site quando a
 * validade de uma hora expirasse — e a equipe concluiria que "o site não
 * atualiza".
 *
 * O caminho continua sendo invalidado porque as duas coisas cobrem alvos
 * diferentes: a etiqueta pega os escopos cacheados, o caminho pega o
 * roteamento.
 */
function revalidarCatalogo(slug?: string | null) {
  updateTag(ETIQUETA_CATALOGO);
  updateTag(ETIQUETA_CATEGORIAS);
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/estoque");
  revalidatePath("/loja");
  revalidatePath("/");
  if (slug) revalidatePath(`/loja/${slug}`);
}

const texto = (max: number) => z.string().trim().max(max);
const opcional = (max: number) => z.string().trim().max(max).optional().default("");

/** Id de relação vindo de `<select>`: string vazia vira ausência de vínculo. */
const idOpcional = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((valor) => (valor ? valor : null));

const centavos = z.coerce
  .number()
  .int("Use apenas números inteiros de centavos.")
  .min(0, "O valor não pode ser negativo.")
  .max(99_999_999_00, "Valor acima do limite aceito.");

const centavosOpcional = z
  .union([z.literal(""), centavos])
  .transform((valor) => (valor === "" ? null : valor));

const marcado = z
  .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal(""), z.undefined(), z.null()])
  .transform((valor) => valor === "on" || valor === "true" || valor === "1");

const CONDICOES = ["novo", "seminovo", "usado", "recondicionado"] as const;
const STATUS_PRODUTO = ["draft", "active", "archived"] as const;
const TIPOS_SERVICO = [
  "instalacao",
  "visita_tecnica",
  "manutencao_preventiva",
  "manutencao_corretiva",
  "treinamento",
  "retirada_equipamento",
  "outro",
] as const;
const STATUS_UNIDADE = ["disponivel", "reservado", "vendido", "indisponivel"] as const;

/**
 * `formData.get` que nunca devolve `null`: campo ausente vira string vazia.
 * Sem isto, um formulário adulterado (campo removido) faria o zod reclamar de
 * tipo em vez de mostrar a mensagem escrita para a pessoa.
 */
function campo(formData: FormData, nome: string): string {
  const bruto = formData.get(nome);
  return typeof bruto === "string" ? bruto : "";
}

/** Lê um campo escondido que carrega JSON montado por componente cliente. */
function lerLista<T>(valor: FormDataEntryValue | null, esquema: z.ZodType<T[]>): T[] | "invalido" {
  if (typeof valor !== "string" || valor.trim() === "") return [];
  let bruto: unknown;
  try {
    bruto = JSON.parse(valor);
  } catch {
    return "invalido";
  }
  const analisado = esquema.safeParse(bruto);
  return analisado.success ? analisado.data : "invalido";
}

/** Slug pedido pela pessoa, ou derivado do nome quando o campo veio vazio. */
function slugFinal(informado: string, base: string) {
  const limpo = gerarSlug(informado || base);
  return limpo || gerarSlug(base) || "";
}

/* ========================================================================== */
/* PRODUTOS — criação                                                          */
/* ========================================================================== */

const esquemaNovoProduto = z.object({
  name: texto(160).min(2, "Informe o nome do produto."),
  slug: opcional(160),
  sku: texto(60).min(1, "Informe o SKU."),
  condition: z.enum(CONDICOES),
  status: z.enum(STATUS_PRODUTO),
  categoryId: idOpcional,
  brandId: idOpcional,
  priceCents: centavos,
});

export async function criarProduto(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaNovoProduto.safeParse({
    name: campo(formData, "name"),
    slug: campo(formData, "slug"),
    sku: campo(formData, "sku"),
    condition: campo(formData, "condition"),
    status: campo(formData, "status"),
    categoryId: campo(formData, "categoryId"),
    brandId: campo(formData, "brandId"),
    priceCents: campo(formData, "priceCents") || 0,
  });
  if (!dados.success) return doZod(dados.error);

  const slug = slugFinal(dados.data.slug, dados.data.name);
  if (!slug) return falha("Não foi possível gerar o endereço a partir do nome.", "slug");

  // seminovo, usado e recondicionado são peça única: o estoque vem das unidades
  const unico = dados.data.condition !== "novo";

  let id: string;
  try {
    const criado = await prisma.product.create({
      data: {
        name: dados.data.name,
        slug,
        sku: dados.data.sku.toUpperCase(),
        condition: dados.data.condition,
        status: dados.data.status,
        categoryId: dados.data.categoryId,
        brandId: dados.data.brandId,
        priceCents: dados.data.priceCents,
        unique: unico,
        stock: 0,
        publishedAt: dados.data.status === "active" ? new Date() : null,
      },
      select: { id: true, name: true, slug: true, sku: true, status: true, priceCents: true },
    });
    id = criado.id;

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "produto",
      entidadeId: criado.id,
      depois: criado,
      resumo: `Criou o produto ${criado.name}`,
    });
  } catch (erro) {
    return erroInesperado("criarProduto", erro);
  }

  revalidarCatalogo(slug);
  // fora do try: redirect() sinaliza a navegação lançando
  redirect(`/admin/produtos/${id}?aba=basico&salvo=1`);
}

/* ========================================================================== */
/* PRODUTOS — abas                                                             */
/* ========================================================================== */

const esquemaBasico = z.object({
  id: texto(40).min(1),
  name: texto(160).min(2, "Informe o nome do produto."),
  slug: opcional(160),
  sku: texto(60).min(1, "Informe o SKU."),
  model: opcional(120),
  shortDescription: opcional(280),
  description: opcional(20_000),
  categoryId: idOpcional,
  brandId: idOpcional,
  condition: z.enum(CONDICOES),
  status: z.enum(STATUS_PRODUTO),
  featured: marcado,
});

export async function salvarBasico(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaBasico.safeParse({
    id: campo(formData, "id"),
    name: campo(formData, "name"),
    slug: campo(formData, "slug"),
    sku: campo(formData, "sku"),
    model: campo(formData, "model"),
    shortDescription: campo(formData, "shortDescription"),
    description: campo(formData, "description"),
    categoryId: campo(formData, "categoryId"),
    brandId: campo(formData, "brandId"),
    condition: campo(formData, "condition"),
    status: campo(formData, "status"),
    featured: campo(formData, "featured"),
  });
  if (!dados.success) return doZod(dados.error);

  const slug = slugFinal(dados.data.slug, dados.data.name);
  if (!slug) return falha("Não foi possível gerar o endereço a partir do nome.", "slug");

  const antes = await prisma.product.findUnique({
    where: { id: dados.data.id },
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      model: true,
      shortDescription: true,
      categoryId: true,
      brandId: true,
      condition: true,
      status: true,
      featured: true,
      publishedAt: true,
    },
  });
  if (!antes) return falha("Produto não encontrado.");

  try {
    const depois = await prisma.product.update({
      where: { id: dados.data.id },
      data: {
        name: dados.data.name,
        slug,
        sku: dados.data.sku.toUpperCase(),
        model: dados.data.model,
        shortDescription: dados.data.shortDescription,
        // descrição é HTML de editor: entra pela lista branca antes de encostar
        // no banco, igual ao conteúdo do CMS
        description: sanitizarHtml(dados.data.description),
        categoryId: dados.data.categoryId,
        brandId: dados.data.brandId,
        condition: dados.data.condition,
        status: dados.data.status,
        featured: dados.data.featured,
        // a data de publicação é carimbada uma vez, na primeira ativação
        publishedAt:
          dados.data.status === "active" && !antes.publishedAt ? new Date() : antes.publishedAt,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        sku: true,
        model: true,
        shortDescription: true,
        categoryId: true,
        brandId: true,
        condition: true,
        status: true,
        featured: true,
        publishedAt: true,
      },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: depois.id,
      antes: { ...antes },
      depois: { ...depois },
    });

    revalidarCatalogo(depois.slug);
    if (antes.slug !== depois.slug) revalidarCatalogo(antes.slug);
    revalidatePath(`/admin/produtos/${depois.id}`);
    return feito("Dados básicos salvos.");
  } catch (erro) {
    return erroInesperado("salvarBasico", erro);
  }
}

const esquemaPrecos = z.object({
  id: texto(40).min(1),
  priceCents: centavos,
  compareAtCents: centavosOpcional,
  costCents: centavosOpcional,
  allowDirectPurchase: marcado,
  allowQuoteRequest: marcado,
});

export async function salvarPrecos(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaPrecos.safeParse({
    id: campo(formData, "id"),
    priceCents: campo(formData, "priceCents") || 0,
    compareAtCents: campo(formData, "compareAtCents"),
    costCents: campo(formData, "costCents"),
    allowDirectPurchase: campo(formData, "allowDirectPurchase"),
    allowQuoteRequest: campo(formData, "allowQuoteRequest"),
  });
  if (!dados.success) return doZod(dados.error);

  if (dados.data.compareAtCents !== null && dados.data.compareAtCents <= dados.data.priceCents) {
    return falha(
      "O preço anterior precisa ser maior que o preço de venda — é ele que mostra o desconto.",
      "compareAtCents",
    );
  }
  if (!dados.data.allowDirectPurchase && !dados.data.allowQuoteRequest) {
    return falha(
      "Deixe pelo menos um caminho aberto: compra direta ou pedido de orçamento.",
      "allowQuoteRequest",
    );
  }
  if (dados.data.allowDirectPurchase && dados.data.priceCents === 0) {
    return falha("Produto com compra direta precisa de preço.", "priceCents");
  }

  const antes = await prisma.product.findUnique({
    where: { id: dados.data.id },
    select: {
      id: true,
      slug: true,
      priceCents: true,
      compareAtCents: true,
      costCents: true,
      allowDirectPurchase: true,
      allowQuoteRequest: true,
    },
  });
  if (!antes) return falha("Produto não encontrado.");

  try {
    const depois = await prisma.product.update({
      where: { id: dados.data.id },
      data: {
        priceCents: dados.data.priceCents,
        compareAtCents: dados.data.compareAtCents,
        costCents: dados.data.costCents,
        allowDirectPurchase: dados.data.allowDirectPurchase,
        allowQuoteRequest: dados.data.allowQuoteRequest,
      },
      select: {
        id: true,
        slug: true,
        priceCents: true,
        compareAtCents: true,
        costCents: true,
        allowDirectPurchase: true,
        allowQuoteRequest: true,
      },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: depois.id,
      antes: { ...antes },
      depois: { ...depois },
    });

    revalidarCatalogo(depois.slug);
    revalidatePath(`/admin/produtos/${depois.id}`);
    return feito("Preços salvos.");
  } catch (erro) {
    return erroInesperado("salvarPrecos", erro);
  }
}

const esquemaEstoqueProduto = z.object({
  id: texto(40).min(1),
  trackInventory: marcado,
  unique: marcado,
  stock: z.coerce.number().int("Use um número inteiro.").min(0, "O estoque não pode ser negativo.").max(1_000_000),
  lowStockAlert: z.coerce.number().int("Use um número inteiro.").min(0).max(1_000_000),
  motivo: opcional(160),
});

/**
 * Aba Estoque do produto.
 *
 * Mexer no número aqui não é um `update` solto: a diferença vira um movimento
 * de ajuste com motivo e autor, senão o saldo do sistema muda sem ninguém
 * conseguir explicar por quê depois.
 */
export async function salvarEstoqueProduto(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaEstoqueProduto.safeParse({
    id: campo(formData, "id"),
    trackInventory: campo(formData, "trackInventory"),
    unique: campo(formData, "unique"),
    stock: campo(formData, "stock") || 0,
    lowStockAlert: campo(formData, "lowStockAlert") || 0,
    motivo: campo(formData, "motivo"),
  });
  if (!dados.success) return doZod(dados.error);

  const antes = await prisma.product.findUnique({
    where: { id: dados.data.id },
    select: {
      id: true,
      slug: true,
      trackInventory: true,
      unique: true,
      stock: true,
      lowStockAlert: true,
    },
  });
  if (!antes) return falha("Produto não encontrado.");

  const diferenca = dados.data.stock - (antes.stock ?? 0);
  if (diferenca !== 0 && !dados.data.motivo) {
    return falha("Explique o motivo do ajuste de estoque.", "motivo");
  }

  try {
    const depois = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.product.update({
        where: { id: dados.data.id },
        data: {
          trackInventory: dados.data.trackInventory,
          unique: dados.data.unique,
          stock: dados.data.stock,
          lowStockAlert: dados.data.lowStockAlert,
        },
        select: {
          id: true,
          slug: true,
          trackInventory: true,
          unique: true,
          stock: true,
          lowStockAlert: true,
        },
      });

      if (diferenca !== 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: atualizado.id,
            kind: "ajuste",
            quantity: diferenca,
            reason: dados.data.motivo,
            userId: usuario.id,
          },
        });
      }

      return atualizado;
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: depois.id,
      antes: { ...antes },
      depois: { ...depois },
      resumo: diferenca !== 0 ? `Ajuste de estoque (${diferenca > 0 ? "+" : ""}${diferenca}): ${dados.data.motivo}` : undefined,
    });

    revalidarCatalogo(depois.slug);
    revalidatePath(`/admin/produtos/${depois.id}`);
    revalidatePath(`/admin/estoque/produto/${depois.id}`);
    return feito(diferenca === 0 ? "Estoque salvo." : "Estoque salvo e ajuste registrado.");
  } catch (erro) {
    return erroInesperado("salvarEstoqueProduto", erro);
  }
}

/**
 * Texto de várias linhas vira lista.
 *
 * Linha vazia some: no meio da lista ela produziria um marcador solto na
 * página do produto, e no fim produziria um item invisível que ninguém
 * entende por que existe.
 */
function linhasDaLista(texto: string) {
  return texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, 20);
}

const esquemaSeo = z.object({
  id: texto(40).min(1),
  seoTitle: opcional(70),
  seoDescription: opcional(180),
  gtin: opcional(20),
  mpn: opcional(70),
  anvisaCode: opcional(60),
  manufacturer: opcional(120),
  regulatoryHolder: opcional(160),
  regulatoryNote: opcional(400),
  warrantyMonths: z.union([z.literal(""), z.coerce.number().int().min(0).max(600)]).transform((v) => (v === "" ? null : v)),
  voltage: opcional(20),
  installationPolicy: z
    .enum(["nao_informada", "nao_oferecida", "opcional", "inclusa", "sob_consulta"])
    .default("nao_informada"),
  installationNote: opcional(400),
  infrastructureNotes: z.string().max(2000).optional().default(""),
  boxContents: z.string().max(2000).optional().default(""),
});

export async function salvarSeo(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaSeo.safeParse({
    id: campo(formData, "id"),
    seoTitle: campo(formData, "seoTitle"),
    seoDescription: campo(formData, "seoDescription"),
    gtin: campo(formData, "gtin"),
    mpn: campo(formData, "mpn"),
    anvisaCode: campo(formData, "anvisaCode"),
    manufacturer: campo(formData, "manufacturer"),
    regulatoryHolder: campo(formData, "regulatoryHolder"),
    regulatoryNote: campo(formData, "regulatoryNote"),
    warrantyMonths: campo(formData, "warrantyMonths"),
    voltage: campo(formData, "voltage"),
    installationPolicy: campo(formData, "installationPolicy") || "nao_informada",
    installationNote: campo(formData, "installationNote"),
    infrastructureNotes: campo(formData, "infrastructureNotes"),
    boxContents: campo(formData, "boxContents"),
  });
  if (!dados.success) return doZod(dados.error);

  const antes = await prisma.product.findUnique({
    where: { id: dados.data.id },
    select: {
      id: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      sku: true,
      gtin: true,
      mpn: true,
      anvisaCode: true,
      manufacturer: true,
      regulatoryHolder: true,
      regulatoryNote: true,
      warrantyMonths: true,
      voltage: true,
      installationPolicy: true,
      installationNote: true,
      infrastructureNotes: true,
      boxContents: true,
    },
  });
  if (!antes) return falha("Produto não encontrado.");

  /* Os identificadores são conferidos aqui, contra o SKU deste produto, e não
     no formulário: quem escreve no banco é quem tem de garantir. A mesma
     função vale para o JSON-LD e para o feed, então as três leituras do
     número não podem divergir. */
  const gtinLimpo = normalizarGtin(dados.data.gtin);
  const problemaDoGtin = conferirGtin(gtinLimpo, { sku: antes.sku });
  if (problemaDoGtin) {
    return { erro: EXPLICACAO_DO_GTIN[problemaDoGtin], campo: "gtin" };
  }

  const problemaDoMpn = conferirMpn(dados.data.mpn, { sku: antes.sku });
  if (problemaDoMpn) {
    return { erro: EXPLICACAO_DO_MPN[problemaDoMpn], campo: "mpn" };
  }

  try {
    const depois = await prisma.product.update({
      where: { id: dados.data.id },
      data: {
        // campo vazio vira nulo: título de SEO em branco significa "use o nome"
        seoTitle: dados.data.seoTitle || null,
        seoDescription: dados.data.seoDescription || null,
        gtin: gtinLimpo || null,
        mpn: dados.data.mpn || null,
        anvisaCode: dados.data.anvisaCode || null,
        manufacturer: dados.data.manufacturer || null,
        regulatoryHolder: dados.data.regulatoryHolder || null,
        regulatoryNote: dados.data.regulatoryNote || null,
        warrantyMonths: dados.data.warrantyMonths,
        voltage: dados.data.voltage || null,
        installationPolicy: dados.data.installationPolicy,
        installationNote: dados.data.installationNote,
        /* Uma linha por item, e nada de item vazio: linha em branco no meio
           da lista viraria um marcador solto na página do produto. */
        infrastructureNotes: linhasDaLista(dados.data.infrastructureNotes),
        boxContents: linhasDaLista(dados.data.boxContents),
      },
      select: {
        id: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        sku: true,
        gtin: true,
        mpn: true,
        anvisaCode: true,
        manufacturer: true,
        regulatoryHolder: true,
        regulatoryNote: true,
        warrantyMonths: true,
        voltage: true,
        installationPolicy: true,
        installationNote: true,
        infrastructureNotes: true,
        boxContents: true,
      },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: depois.id,
      antes: { ...antes },
      depois: { ...depois },
    });

    revalidarCatalogo(depois.slug);
    revalidatePath(`/admin/produtos/${depois.id}`);
    return feito("Ficha e SEO salvos.");
  } catch (erro) {
    return erroInesperado("salvarSeo", erro);
  }
}

/* ------------------------------------------------------------------ mídias */

const listaMidias = z.array(
  z.object({
    mediaId: z.string().trim().min(1).max(40),
    alt: z.string().trim().min(1, "Cada foto precisa de texto alternativo.").max(180),
  }),
);

export async function salvarMidias(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const itens = lerLista(formData.get("itens"), listaMidias);
  if (itens === "invalido") {
    return falha("Confira as fotos: cada uma precisa de texto alternativo.", "itens");
  }

  // mediaId repetido estoura o índice único de ProductMedia — avisa antes
  const unicos = new Set(itens.map((item) => item.mediaId));
  if (unicos.size !== itens.length) return falha("A mesma foto foi adicionada duas vezes.", "itens");

  const produto = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!produto) return falha("Produto não encontrado.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productMedia.deleteMany({ where: { productId: id } });
      if (itens.length > 0) {
        await tx.productMedia.createMany({
          data: itens.map((item, indice) => ({
            productId: id,
            mediaId: item.mediaId,
            alt: item.alt,
            order: indice,
          })),
        });
      }
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: id,
      resumo: `Galeria com ${itens.length} foto(s)`,
    });

    revalidarCatalogo(produto.slug);
    revalidatePath(`/admin/produtos/${id}`);
    return feito(itens.length === 0 ? "Galeria esvaziada." : "Galeria salva.");
  } catch (erro) {
    return erroInesperado("salvarMidias", erro);
  }
}

/* ---------------------------------------------------------- especificações */

const listaSpecs = z.array(
  z.object({
    group: z.string().trim().max(80),
    label: z.string().trim().min(1, "Toda especificação precisa de um rótulo.").max(120),
    value: z.string().trim().min(1, "Toda especificação precisa de um valor.").max(400),
  }),
);

export async function salvarEspecificacoes(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const itens = lerLista(formData.get("itens"), listaSpecs);
  if (itens === "invalido") return falha("Preencha rótulo e valor de todas as linhas.", "itens");

  const produto = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!produto) return falha("Produto não encontrado.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productSpec.deleteMany({ where: { productId: id } });
      if (itens.length > 0) {
        await tx.productSpec.createMany({
          data: itens.map((item, indice) => ({
            productId: id,
            group: item.group || "Ficha técnica",
            label: item.label,
            value: item.value,
            order: indice,
          })),
        });
      }
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: id,
      resumo: `Ficha técnica com ${itens.length} linha(s)`,
    });

    revalidarCatalogo(produto.slug);
    revalidatePath(`/admin/produtos/${id}`);
    return feito("Especificações salvas.");
  } catch (erro) {
    return erroInesperado("salvarEspecificacoes", erro);
  }
}

/* -------------------------------------------------------------- documentos */

const listaDocumentos = z.array(
  z.object({
    title: z.string().trim().min(1, "Todo documento precisa de título.").max(160),
    url: z.string().trim().min(1, "Todo documento precisa de endereço.").max(600),
    kind: z.string().trim().max(40),
  }),
);

export async function salvarDocumentos(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const itens = lerLista(formData.get("itens"), listaDocumentos);
  if (itens === "invalido") return falha("Preencha título e arquivo de todos os documentos.", "itens");

  const produto = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!produto) return falha("Produto não encontrado.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productDocument.deleteMany({ where: { productId: id } });
      if (itens.length > 0) {
        await tx.productDocument.createMany({
          data: itens.map((item) => ({
            productId: id,
            title: item.title,
            url: item.url,
            kind: item.kind || "manual",
          })),
        });
      }
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: id,
      resumo: `${itens.length} documento(s) no produto`,
    });

    revalidarCatalogo(produto.slug);
    revalidatePath(`/admin/produtos/${id}`);
    return feito("Documentos salvos.");
  } catch (erro) {
    return erroInesperado("salvarDocumentos", erro);
  }
}

/* --------------------------------------------------------------- adicionais */

const listaAdicionais = z.array(
  z.object({
    serviceId: z.string().trim().min(1).max(40),
    priceCents: z.number().int().min(0).max(99_999_999_00).nullable(),
    required: z.boolean(),
  }),
);

export async function salvarAdicionais(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const itens = lerLista(formData.get("itens"), listaAdicionais);
  if (itens === "invalido") return falha("Confira os serviços adicionais.", "itens");

  const unicos = new Set(itens.map((item) => item.serviceId));
  if (unicos.size !== itens.length) return falha("O mesmo serviço foi adicionado duas vezes.", "itens");

  const produto = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!produto) return falha("Produto não encontrado.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productAddon.deleteMany({ where: { productId: id } });
      if (itens.length > 0) {
        await tx.productAddon.createMany({
          data: itens.map((item, indice) => ({
            productId: id,
            serviceId: item.serviceId,
            priceCents: item.priceCents,
            required: item.required,
            order: indice,
          })),
        });
      }
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: id,
      resumo: `${itens.length} serviço(s) adicional(is)`,
    });

    revalidarCatalogo(produto.slug);
    revalidatePath(`/admin/produtos/${id}`);
    return feito("Serviços adicionais salvos.");
  } catch (erro) {
    return erroInesperado("salvarAdicionais", erro);
  }
}

/* ------------------------------------------------------------- relacionados */

const listaRelacionados = z.array(z.string().trim().min(1).max(40));

export async function salvarRelacionados(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const itens = lerLista(formData.get("itens"), listaRelacionados);
  if (itens === "invalido") return falha("Confira os produtos relacionados.", "itens");
  if (itens.includes(id)) return falha("Um produto não pode se relacionar com ele mesmo.", "itens");

  const unicos = [...new Set(itens)];
  const produto = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!produto) return falha("Produto não encontrado.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.productRelation.deleteMany({ where: { sourceId: id } });
      if (unicos.length > 0) {
        await tx.productRelation.createMany({
          data: unicos.map((targetId, indice) => ({ sourceId: id, targetId, order: indice })),
        });
      }
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "produto",
      entidadeId: id,
      resumo: `${unicos.length} produto(s) relacionado(s)`,
    });

    revalidarCatalogo(produto.slug);
    revalidatePath(`/admin/produtos/${id}`);
    return feito("Relacionados salvos.");
  } catch (erro) {
    return erroInesperado("salvarRelacionados", erro);
  }
}

/* ========================================================================== */
/* PRODUTOS — duplicar, arquivar, excluir                                      */
/* ========================================================================== */

/** Sufixo livre para slug e SKU da cópia, sem estourar o índice único. */
async function sufixoLivre(slugBase: string, skuBase: string) {
  for (let tentativa = 2; tentativa <= 50; tentativa++) {
    const slug = `${slugBase}-copia-${tentativa}`.slice(0, 160);
    const sku = `${skuBase}-C${tentativa}`.slice(0, 60);
    const [porSlug, porSku] = await Promise.all([
      prisma.product.count({ where: { slug } }),
      prisma.product.count({ where: { sku } }),
    ]);
    if (porSlug === 0 && porSku === 0) return { slug, sku };
  }
  return null;
}

/**
 * Duplica o produto inteiro: ficha, fotos, documentos, adicionais e
 * relacionados. A cópia nasce como rascunho e com estoque zerado — copiar
 * saldo de estoque criaria unidade que não existe na prateleira.
 */
export async function duplicarProduto(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const origem = await prisma.product.findUnique({
    where: { id },
    include: {
      media: { orderBy: { order: "asc" } },
      specs: { orderBy: { order: "asc" } },
      documents: true,
      addons: { orderBy: { order: "asc" } },
      relatedFrom: { orderBy: { order: "asc" } },
    },
  });
  if (!origem) return falha("Produto não encontrado.");

  const nomes = await sufixoLivre(origem.slug, origem.sku);
  if (!nomes) return falha("Já existem cópias demais deste produto. Renomeie as antigas primeiro.");

  let novoId: string;
  try {
    novoId = await prisma.$transaction(async (tx) => {
      const copia = await tx.product.create({
        data: {
          slug: nomes.slug,
          sku: nomes.sku,
          name: `${origem.name} (cópia)`.slice(0, 160),
          model: origem.model,
          shortDescription: origem.shortDescription,
          description: origem.description,
          status: "draft",
          condition: origem.condition,
          featured: false,
          publishedAt: null,
          brandId: origem.brandId,
          categoryId: origem.categoryId,
          priceCents: origem.priceCents,
          compareAtCents: origem.compareAtCents,
          costCents: origem.costCents,
          allowDirectPurchase: origem.allowDirectPurchase,
          allowQuoteRequest: origem.allowQuoteRequest,
          trackInventory: origem.trackInventory,
          unique: origem.unique,
          stock: 0,
          lowStockAlert: origem.lowStockAlert,
          warrantyMonths: origem.warrantyMonths,
          voltage: origem.voltage,
          weightGrams: origem.weightGrams,
          widthMm: origem.widthMm,
          heightMm: origem.heightMm,
          depthMm: origem.depthMm,
          shippingProfileId: origem.shippingProfileId,
          anvisaCode: origem.anvisaCode,
          manufacturer: origem.manufacturer,
          regulatoryHolder: origem.regulatoryHolder,
          regulatoryNote: origem.regulatoryNote,
          seoTitle: origem.seoTitle,
          seoDescription: origem.seoDescription,
        },
        select: { id: true },
      });

      if (origem.media.length > 0) {
        await tx.productMedia.createMany({
          data: origem.media.map((item) => ({
            productId: copia.id,
            mediaId: item.mediaId,
            alt: item.alt,
            order: item.order,
          })),
        });
      }
      if (origem.specs.length > 0) {
        await tx.productSpec.createMany({
          data: origem.specs.map((item) => ({
            productId: copia.id,
            group: item.group,
            label: item.label,
            value: item.value,
            order: item.order,
          })),
        });
      }
      if (origem.documents.length > 0) {
        await tx.productDocument.createMany({
          data: origem.documents.map((item) => ({
            productId: copia.id,
            title: item.title,
            url: item.url,
            kind: item.kind,
          })),
        });
      }
      if (origem.addons.length > 0) {
        await tx.productAddon.createMany({
          data: origem.addons.map((item) => ({
            productId: copia.id,
            serviceId: item.serviceId,
            priceCents: item.priceCents,
            required: item.required,
            order: item.order,
          })),
        });
      }
      if (origem.relatedFrom.length > 0) {
        await tx.productRelation.createMany({
          data: origem.relatedFrom.map((item) => ({
            sourceId: copia.id,
            targetId: item.targetId,
            order: item.order,
          })),
        });
      }

      return copia.id;
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "produto",
      entidadeId: novoId,
      resumo: `Duplicou ${origem.name} (${origem.sku})`,
    });
  } catch (erro) {
    return erroInesperado("duplicarProduto", erro);
  }

  revalidarCatalogo();
  redirect(`/admin/produtos/${novoId}?aba=basico&copiado=1`);
}

/**
 * Arquiva ou restaura. Arquivado sai da loja e das buscas, mas continua
 * existindo para os pedidos que já o citam.
 */
export async function alternarArquivoProduto(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  const arquivar = campo(formData, "arquivar") === "1";
  if (!id) return falha("Produto não informado.");

  const antes = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, status: true },
  });
  if (!antes) return falha("Produto não encontrado.");

  try {
    const depois = await prisma.product.update({
      where: { id },
      data: { status: arquivar ? "archived" : "draft", featured: arquivar ? false : undefined },
      select: { id: true, slug: true, status: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: arquivar ? "arquivar" : "restaurar",
      entidade: "produto",
      entidadeId: id,
      antes: { ...antes },
      depois: { ...depois },
      resumo: `${arquivar ? "Arquivou" : "Restaurou"} ${antes.name}`,
    });

    revalidarCatalogo(depois.slug);
    revalidatePath(`/admin/produtos/${id}`);
    return feito(arquivar ? "Produto arquivado." : "Produto restaurado como rascunho.");
  } catch (erro) {
    return erroInesperado("alternarArquivoProduto", erro);
  }
}

/**
 * Exclusão definitiva — só para produto que nunca foi vendido nem reservado.
 * Com pedido, unidade ou movimento no histórico, a resposta é arquivar.
 */
export async function excluirProduto(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Produto não informado.");

  const produto = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sku: true,
      slug: true,
      _count: { select: { orderItems: true, units: true, movements: true, quoteItems: true } },
    },
  });
  if (!produto) return falha("Produto não encontrado.");

  const impedimentos: string[] = [];
  if (produto._count.orderItems > 0) impedimentos.push("já apareceu em pedido");
  if (produto._count.quoteItems > 0) impedimentos.push("está em orçamento");
  if (produto._count.units > 0) impedimentos.push("tem unidade cadastrada");
  if (produto._count.movements > 0) impedimentos.push("tem movimentação de estoque");

  if (impedimentos.length > 0) {
    return falha(
      `Este produto ${impedimentos.join(", ")} — apagar quebraria o histórico. Use "Arquivar".`,
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "produto",
      entidadeId: id,
      resumo: `Excluiu ${produto.name} (${produto.sku})`,
    });
  } catch (erro) {
    return erroInesperado("excluirProduto", erro);
  }

  revalidarCatalogo(produto.slug);
  redirect("/admin/produtos?excluido=1");
}

/* ========================================================================== */
/* CATEGORIAS                                                                  */
/* ========================================================================== */

const esquemaCategoria = z.object({
  id: opcional(40),
  name: texto(120).min(2, "Informe o nome da categoria."),
  slug: opcional(120),
  description: opcional(600),
  parentId: idOpcional,
  icon: opcional(40),
  order: z.coerce.number().int().min(0).max(9999),
  published: marcado,
  featured: marcado,
  seoTitle: opcional(70),
  seoDescription: opcional(180),
});

/**
 * Uma categoria não pode virar filha de si mesma nem de uma descendente sua —
 * a árvore viraria um anel e a navegação entraria em laço infinito. Sobe pela
 * cadeia de pais do destino procurando o próprio id.
 */
async function criaCiclo(id: string, paiDesejado: string | null) {
  let atual = paiDesejado;
  for (let salto = 0; salto < 50 && atual; salto++) {
    if (atual === id) return true;
    const pai: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: atual },
      select: { parentId: true },
    });
    atual = pai?.parentId ?? null;
  }
  return false;
}

export async function salvarCategoria(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaCategoria.safeParse({
    id: campo(formData, "id"),
    name: campo(formData, "name"),
    slug: campo(formData, "slug"),
    description: campo(formData, "description"),
    parentId: campo(formData, "parentId"),
    icon: campo(formData, "icon"),
    order: campo(formData, "order") || 0,
    published: campo(formData, "published"),
    featured: campo(formData, "featured"),
    seoTitle: campo(formData, "seoTitle"),
    seoDescription: campo(formData, "seoDescription"),
  });
  if (!dados.success) return doZod(dados.error);

  const slug = slugFinal(dados.data.slug, dados.data.name);
  if (!slug) return falha("Não foi possível gerar o endereço a partir do nome.", "slug");

  const id = dados.data.id;
  if (id && dados.data.parentId && (await criaCiclo(id, dados.data.parentId))) {
    return falha("Esta categoria não pode ficar dentro dela mesma nem de uma subcategoria dela.", "parentId");
  }

  const comum = {
    name: dados.data.name,
    slug,
    description: dados.data.description,
    parentId: dados.data.parentId,
    icon: dados.data.icon || null,
    order: dados.data.order,
    published: dados.data.published,
    featured: dados.data.featured,
    seoTitle: dados.data.seoTitle || null,
    seoDescription: dados.data.seoDescription || null,
  };


  // preenchido dentro do try e usado no redirect, que precisa ficar fora dele
  let novoId = "";
  try {
    if (id) {
      const antes = await prisma.category.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true, parentId: true, order: true, published: true, featured: true },
      });
      if (!antes) return falha("Categoria não encontrada.");

      const depois = await prisma.category.update({
        where: { id },
        data: comum,
        select: { id: true, name: true, slug: true, parentId: true, order: true, published: true, featured: true },
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "categoria",
        entidadeId: id,
        antes: { ...antes },
        depois: { ...depois },
      });

      revalidatePath("/admin/categorias");
      revalidatePath(`/categoria/${depois.slug}`);
      if (antes.slug !== depois.slug) revalidatePath(`/categoria/${antes.slug}`);
      revalidarCatalogo();
      return feito("Categoria salva.");
    }

    const criada = await prisma.category.create({ data: comum, select: { id: true, name: true, slug: true } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "categoria",
      entidadeId: criada.id,
      resumo: `Criou a categoria ${criada.name}`,
    });

    revalidatePath("/admin/categorias");
    revalidarCatalogo();
    novoId = criada.id;
  } catch (erro) {
    return erroInesperado("salvarCategoria", erro);
  }

  // fora do try: redirect() sinaliza a navegação lançando
  redirect(`/admin/categorias/${novoId}?salvo=1`);
}

/** Sobe ou desce a categoria entre as irmãs, trocando a ordem com a vizinha. */
export async function moverCategoria(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  const direcao = campo(formData, "direcao") === "cima" ? "cima" : "baixo";
  if (!id) return falha("Categoria não informada.");

  const atual = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, order: true, parentId: true },
  });
  if (!atual) return falha("Categoria não encontrada.");

  const irmas = await prisma.category.findMany({
    where: { parentId: atual.parentId },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true },
  });

  const posicao = irmas.findIndex((irma) => irma.id === id);
  const destino = direcao === "cima" ? posicao - 1 : posicao + 1;
  if (posicao < 0 || destino < 0 || destino >= irmas.length) {
    return falha(direcao === "cima" ? "Já é a primeira do nível." : "Já é a última do nível.");
  }

  const reordenada = [...irmas];
  const [movida] = reordenada.splice(posicao, 1);
  reordenada.splice(destino, 0, movida);

  try {
    await prisma.$transaction(
      reordenada.map((irma, indice) =>
        prisma.category.update({ where: { id: irma.id }, data: { order: indice } }),
      ),
    );

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "categoria",
      entidadeId: id,
      resumo: `Moveu ${atual.name} para ${direcao}`,
    });

    revalidatePath("/admin/categorias");
    revalidarCatalogo();
    return feito("Ordem atualizada.");
  } catch (erro) {
    return erroInesperado("moverCategoria", erro);
  }
}

export async function alternarPublicacaoCategoria(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Categoria não informada.");

  const atual = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, published: true, slug: true },
  });
  if (!atual) return falha("Categoria não encontrada.");

  try {
    await prisma.category.update({ where: { id }, data: { published: !atual.published } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: atual.published ? "arquivar" : "publicar",
      entidade: "categoria",
      entidadeId: id,
      resumo: `${atual.published ? "Despublicou" : "Publicou"} ${atual.name}`,
    });

    revalidatePath("/admin/categorias");
    revalidatePath(`/categoria/${atual.slug}`);
    revalidarCatalogo();
    return feito(atual.published ? "Categoria despublicada." : "Categoria publicada.");
  } catch (erro) {
    return erroInesperado("alternarPublicacaoCategoria", erro);
  }
}

export async function excluirCategoria(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Categoria não informada.");

  const categoria = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true, children: true, equipments: true, serviceRequests: true } },
    },
  });
  if (!categoria) return falha("Categoria não encontrada.");

  if (categoria._count.products > 0) {
    return falha(
      `Esta categoria ainda tem ${categoria._count.products} produto(s). Mova-os para outra categoria antes de apagar.`,
    );
  }
  if (categoria._count.children > 0) {
    return falha(
      `Esta categoria tem ${categoria._count.children} subcategoria(s). Apague ou mova as subcategorias primeiro.`,
    );
  }

  try {
    await prisma.category.delete({ where: { id } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "categoria",
      entidadeId: id,
      resumo: `Excluiu a categoria ${categoria.name}`,
    });

    revalidatePath("/admin/categorias");
    revalidatePath(`/categoria/${categoria.slug}`);
    revalidarCatalogo();
    return feito("Categoria excluída.");
  } catch (erro) {
    return erroInesperado("excluirCategoria", erro);
  }
}

/* ========================================================================== */
/* MARCAS                                                                      */
/* ========================================================================== */

const esquemaMarca = z.object({
  id: opcional(40),
  name: texto(120).min(2, "Informe o nome da marca."),
  slug: opcional(120),
  description: opcional(1200),
  logoId: idOpcional,
  order: z.coerce.number().int().min(0).max(9999),
  published: marcado,
});

export async function salvarMarca(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaMarca.safeParse({
    id: campo(formData, "id"),
    name: campo(formData, "name"),
    slug: campo(formData, "slug"),
    description: campo(formData, "description"),
    logoId: campo(formData, "logoId"),
    order: campo(formData, "order") || 0,
    published: campo(formData, "published"),
  });
  if (!dados.success) return doZod(dados.error);

  const slug = slugFinal(dados.data.slug, dados.data.name);
  if (!slug) return falha("Não foi possível gerar o endereço a partir do nome.", "slug");

  const comum = {
    name: dados.data.name,
    slug,
    description: dados.data.description,
    logoId: dados.data.logoId,
    order: dados.data.order,
    published: dados.data.published,
  };

  const id = dados.data.id;

  // preenchido dentro do try e usado no redirect, que precisa ficar fora dele
  let novoId = "";
  try {
    if (id) {
      const antes = await prisma.brand.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true, order: true, published: true, logoId: true },
      });
      if (!antes) return falha("Marca não encontrada.");

      const depois = await prisma.brand.update({
        where: { id },
        data: comum,
        select: { id: true, name: true, slug: true, order: true, published: true, logoId: true },
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "marca",
        entidadeId: id,
        antes: { ...antes },
        depois: { ...depois },
      });

      revalidatePath("/admin/marcas");
      revalidatePath("/marcas");
      revalidatePath(`/marcas/${depois.slug}`);
      if (antes.slug !== depois.slug) revalidatePath(`/marcas/${antes.slug}`);
      revalidarCatalogo();
      return feito("Marca salva.");
    }

    const criada = await prisma.brand.create({ data: comum, select: { id: true, name: true } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "marca",
      entidadeId: criada.id,
      resumo: `Criou a marca ${criada.name}`,
    });

    revalidatePath("/admin/marcas");
    revalidatePath("/marcas");
    revalidarCatalogo();
    novoId = criada.id;
  } catch (erro) {
    return erroInesperado("salvarMarca", erro);
  }

  // fora do try: redirect() sinaliza a navegação lançando
  redirect(`/admin/marcas/${novoId}?salvo=1`);
}

export async function excluirMarca(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Marca não informada.");

  const marca = await prisma.brand.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
  });
  if (!marca) return falha("Marca não encontrada.");

  if (marca._count.products > 0) {
    return falha(
      `Esta marca tem ${marca._count.products} produto(s). Troque a marca deles antes de apagar, ou apenas despublique.`,
    );
  }

  try {
    await prisma.brand.delete({ where: { id } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "marca",
      entidadeId: id,
      resumo: `Excluiu a marca ${marca.name}`,
    });

    revalidatePath("/admin/marcas");
    revalidatePath("/marcas");
    revalidatePath(`/marcas/${marca.slug}`);
    revalidarCatalogo();
    return feito("Marca excluída.");
  } catch (erro) {
    return erroInesperado("excluirMarca", erro);
  }
}

/* ========================================================================== */
/* SERVIÇOS                                                                    */
/* ========================================================================== */

const esquemaServico = z.object({
  id: opcional(40),
  name: texto(140).min(2, "Informe o nome do serviço."),
  slug: opcional(140),
  kind: z.enum(TIPOS_SERVICO),
  description: opcional(1200),
  /** Vazio significa "sob orçamento", que é diferente de zero. */
  priceCents: centavosOpcional,
  durationMinutes: opcional(10),
  published: marcado,
  order: z.coerce.number().int().min(0).max(9999),
});

/**
 * A duração combinada com o cliente é informação operacional e `Service` não
 * tem coluna para ela no schema — então ela entra como primeira linha da
 * descrição, em texto, em vez de virar dado inventado em algum campo.
 */
function descricaoComDuracao(descricao: string, minutos: string) {
  const numero = Number(minutos);
  if (!minutos || !Number.isFinite(numero) || numero <= 0) return descricao;
  const rotulo =
    numero >= 60
      ? `Duração estimada: ${Math.floor(numero / 60)}h${numero % 60 ? ` ${numero % 60}min` : ""}`
      : `Duração estimada: ${numero}min`;
  const limpa = descricao.replace(/^Duração estimada:[^\n]*\n?/i, "").trim();
  return limpa ? `${rotulo}\n${limpa}` : rotulo;
}

export async function salvarServico(_anterior: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const dados = esquemaServico.safeParse({
    id: campo(formData, "id"),
    name: campo(formData, "name"),
    slug: campo(formData, "slug"),
    kind: campo(formData, "kind"),
    description: campo(formData, "description"),
    priceCents: campo(formData, "priceCents"),
    durationMinutes: campo(formData, "durationMinutes"),
    published: campo(formData, "published"),
    order: campo(formData, "order") || 0,
  });
  if (!dados.success) return doZod(dados.error);

  const slug = slugFinal(dados.data.slug, dados.data.name);
  if (!slug) return falha("Não foi possível gerar o endereço a partir do nome.", "slug");

  const comum = {
    name: dados.data.name,
    slug,
    kind: dados.data.kind,
    description: descricaoComDuracao(dados.data.description, dados.data.durationMinutes),
    priceCents: dados.data.priceCents,
    published: dados.data.published,
    order: dados.data.order,
  };

  const id = dados.data.id;

  // preenchido dentro do try e usado no redirect, que precisa ficar fora dele
  let novoId = "";
  try {
    if (id) {
      const antes = await prisma.service.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true, kind: true, priceCents: true, published: true, order: true },
      });
      if (!antes) return falha("Serviço não encontrado.");

      const depois = await prisma.service.update({
        where: { id },
        data: comum,
        select: { id: true, name: true, slug: true, kind: true, priceCents: true, published: true, order: true },
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "servico",
        entidadeId: id,
        antes: { ...antes },
        depois: { ...depois },
      });

      revalidatePath("/admin/servicos");
      revalidarCatalogo();
      return feito("Serviço salvo.");
    }

    const criado = await prisma.service.create({ data: comum, select: { id: true, name: true } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "servico",
      entidadeId: criado.id,
      resumo: `Criou o serviço ${criado.name}`,
    });

    revalidatePath("/admin/servicos");
    revalidarCatalogo();
    novoId = criado.id;
  } catch (erro) {
    return erroInesperado("salvarServico", erro);
  }

  // fora do try: redirect() sinaliza a navegação lançando
  redirect(`/admin/servicos/${novoId}?salvo=1`);
}

export async function excluirServico(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("produtos");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Serviço não informado.");

  const servico = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { orderItems: true, cartItems: true, quoteItems: true, addons: true } },
    },
  });
  if (!servico) return falha("Serviço não encontrado.");

  if (servico._count.orderItems > 0 || servico._count.quoteItems > 0) {
    return falha("Este serviço já foi vendido ou orçado. Despublique em vez de apagar.");
  }

  try {
    await prisma.service.delete({ where: { id } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "servico",
      entidadeId: id,
      resumo: `Excluiu o serviço ${servico.name}`,
    });

    revalidatePath("/admin/servicos");
    revalidarCatalogo();
    return feito("Serviço excluído.");
  } catch (erro) {
    return erroInesperado("excluirServico", erro);
  }
}

/* ========================================================================== */
/* ESTOQUE — movimentações                                                     */
/* ========================================================================== */

const esquemaMovimento = z.object({
  productId: texto(40).min(1),
  kind: z.enum(["entrada", "saida", "ajuste", "devolucao"]),
  quantity: z.coerce.number().int("Use um número inteiro.").min(0).max(1_000_000),
  reason: texto(200).min(3, "Explique o motivo — é o que a auditoria vai ler depois."),
});

/**
 * Entrada, saída, devolução e ajuste.
 *
 * `entrada`, `saida` e `devolucao` recebem a quantidade movimentada; `ajuste`
 * recebe o total contado na prateleira e grava a diferença. Em todos os casos
 * o saldo novo é calculado aqui a partir do saldo do banco, dentro da mesma
 * transação que grava o movimento — nunca a partir de um número do formulário.
 *
 * `reserva` e `liberacao_reserva` não aparecem nesta tela: quem as escreve é o
 * fluxo de pedido, em `@/lib/pedido`.
 */
export async function registrarMovimento(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("estoque");

  const dados = esquemaMovimento.safeParse({
    productId: campo(formData, "productId"),
    kind: campo(formData, "kind"),
    quantity: campo(formData, "quantity") || 0,
    reason: campo(formData, "reason"),
  });
  if (!dados.success) return doZod(dados.error);

  const produto = await prisma.product.findUnique({
    where: { id: dados.data.productId },
    select: { id: true, name: true, slug: true, stock: true, trackInventory: true },
  });
  if (!produto) return falha("Produto não encontrado.");

  if (dados.data.kind !== "ajuste" && dados.data.quantity < 1) {
    return falha("Informe uma quantidade maior que zero.", "quantity");
  }

  const delta =
    dados.data.kind === "entrada" || dados.data.kind === "devolucao"
      ? dados.data.quantity
      : dados.data.kind === "saida"
        ? -dados.data.quantity
        : dados.data.quantity - produto.stock;

  if (delta === 0) return falha("O total informado é igual ao saldo atual — nada a registrar.", "quantity");

  const novoSaldo = produto.stock + delta;
  if (novoSaldo < 0) {
    return falha(
      `Saída maior que o saldo: hoje há ${produto.stock} em estoque.`,
      "quantity",
    );
  }

  try {
    await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          productId: produto.id,
          kind: dados.data.kind,
          quantity: delta,
          reason: dados.data.reason,
          userId: usuario.id,
        },
      }),
      prisma.product.update({ where: { id: produto.id }, data: { stock: novoSaldo } }),
    ]);

    await registrarAuditoria({
      userId: usuario.id,
      acao: "editar",
      entidade: "estoque",
      entidadeId: produto.id,
      resumo: `${produto.name}: ${produto.stock} → ${novoSaldo} (${dados.data.kind}) — ${dados.data.reason}`,
    });

    revalidatePath("/admin/estoque");
    revalidatePath(`/admin/estoque/produto/${produto.id}`);
    revalidatePath(`/admin/produtos/${produto.id}`);
    revalidarCatalogo(produto.slug);
    return feito(`Saldo atualizado para ${novoSaldo}.`);
  } catch (erro) {
    return erroInesperado("registrarMovimento", erro);
  }
}

/* ========================================================================== */
/* ESTOQUE — unidades                                                          */
/* ========================================================================== */

const numeroOpcional = (max: number) =>
  z.union([z.literal(""), z.coerce.number().int().min(0).max(max)]).transform((v) => (v === "" ? null : v));

const esquemaUnidade = z.object({
  id: opcional(40),
  productId: texto(40).min(1, "Escolha o produto desta unidade."),
  serialNumber: opcional(80),
  status: z.enum(STATUS_UNIDADE),
  manufactureYear: numeroOpcional(2200),
  usageHours: numeroOpcional(1_000_000),
  usageCycles: numeroOpcional(100_000_000),
  warrantyMonths: numeroOpcional(600),
  acquiredFrom: opcional(160),
  conditionNotes: opcional(2000),
  inspectionNotes: opcional(2000),
});

const listaChecklist = z.array(
  z.object({
    label: z.string().trim().min(1, "Todo item do checklist precisa de descrição.").max(160),
    result: z.enum(["verificado", "substituido", "reparado", "nao_aplicavel"]),
    note: z.string().trim().max(400),
  }),
);

const listaMidiasUnidade = z.array(z.string().trim().min(1).max(40));

/**
 * Cria ou atualiza a unidade física — número de série, estado, checklist de
 * revisão e fotos, tudo na mesma transação para a ficha nunca ficar meio
 * salva.
 *
 * O saldo do produto não é mexido aqui: unidade e saldo são contagens
 * diferentes (uma é a peça identificada, a outra é o número que a vitrine lê),
 * e misturar as duas faria o mesmo item ser contado duas vezes. Quem quiser
 * refletir a unidade no saldo usa a tela de movimentação, que deixa rastro.
 */
export async function salvarUnidade(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("estoque");

  const dados = esquemaUnidade.safeParse({
    id: campo(formData, "id"),
    productId: campo(formData, "productId"),
    serialNumber: campo(formData, "serialNumber"),
    status: campo(formData, "status"),
    manufactureYear: campo(formData, "manufactureYear"),
    usageHours: campo(formData, "usageHours"),
    usageCycles: campo(formData, "usageCycles"),
    warrantyMonths: campo(formData, "warrantyMonths"),
    acquiredFrom: campo(formData, "acquiredFrom"),
    conditionNotes: campo(formData, "conditionNotes"),
    inspectionNotes: campo(formData, "inspectionNotes"),
  });
  if (!dados.success) return doZod(dados.error);

  const checklist = lerLista(formData.get("checklist"), listaChecklist);
  if (checklist === "invalido") return falha("Confira o checklist de revisão.", "checklist");

  const midias = lerLista(formData.get("midias"), listaMidiasUnidade);
  if (midias === "invalido") return falha("Confira as fotos da unidade.", "midias");
  const midiasUnicas = [...new Set(midias)];

  const produto = await prisma.product.findUnique({
    where: { id: dados.data.productId },
    select: { id: true, name: true, slug: true },
  });
  if (!produto) return falha("Produto não encontrado.", "productId");

  const comum = {
    productId: produto.id,
    serialNumber: dados.data.serialNumber || null,
    status: dados.data.status,
    manufactureYear: dados.data.manufactureYear,
    usageHours: dados.data.usageHours,
    usageCycles: dados.data.usageCycles,
    warrantyMonths: dados.data.warrantyMonths,
    acquiredFrom: dados.data.acquiredFrom,
    conditionNotes: dados.data.conditionNotes,
    inspectionNotes: dados.data.inspectionNotes,
  };

  const id = dados.data.id;
  let unidadeId = id;

  try {
    if (id) {
      const antes = await prisma.inventoryUnit.findUnique({
        where: { id },
        select: { id: true, productId: true, serialNumber: true, status: true, usageHours: true },
      });
      if (!antes) return falha("Unidade não encontrada.");

      await prisma.$transaction(async (tx) => {
        await tx.inventoryUnit.update({ where: { id }, data: comum });
        await tx.inventoryCheckItem.deleteMany({ where: { unitId: id } });
        if (checklist.length > 0) {
          await tx.inventoryCheckItem.createMany({
            data: checklist.map((item, indice) => ({
              unitId: id,
              label: item.label,
              result: item.result,
              note: item.note,
              order: indice,
            })),
          });
        }
        await tx.inventoryUnitMedia.deleteMany({ where: { unitId: id } });
        if (midiasUnicas.length > 0) {
          await tx.inventoryUnitMedia.createMany({
            data: midiasUnicas.map((mediaId, indice) => ({ unitId: id, mediaId, order: indice })),
          });
        }
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "editar",
        entidade: "unidade",
        entidadeId: id,
        antes: { ...antes },
        depois: { ...antes, ...comum },
      });
    } else {
      unidadeId = await prisma.$transaction(async (tx) => {
        const criada = await tx.inventoryUnit.create({ data: comum, select: { id: true } });
        if (checklist.length > 0) {
          await tx.inventoryCheckItem.createMany({
            data: checklist.map((item, indice) => ({
              unitId: criada.id,
              label: item.label,
              result: item.result,
              note: item.note,
              order: indice,
            })),
          });
        }
        if (midiasUnicas.length > 0) {
          await tx.inventoryUnitMedia.createMany({
            data: midiasUnicas.map((mediaId, indice) => ({
              unitId: criada.id,
              mediaId,
              order: indice,
            })),
          });
        }
        return criada.id;
      });

      await registrarAuditoria({
        userId: usuario.id,
        acao: "criar",
        entidade: "unidade",
        entidadeId: unidadeId,
        resumo: `Cadastrou unidade de ${produto.name}${comum.serialNumber ? ` (série ${comum.serialNumber})` : ""}`,
      });
    }
  } catch (erro) {
    return erroInesperado("salvarUnidade", erro);
  }

  revalidatePath("/admin/estoque/unidades");
  revalidatePath(`/admin/estoque/produto/${produto.id}`);
  revalidarCatalogo(produto.slug);

  if (!id && unidadeId) redirect(`/admin/estoque/unidades/${unidadeId}?salvo=1`);
  revalidatePath(`/admin/estoque/unidades/${unidadeId}`);
  return feito("Unidade salva.");
}

export async function mudarStatusUnidade(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("estoque");

  const id = campo(formData, "id").trim();
  const status = z.enum(STATUS_UNIDADE).safeParse(campo(formData, "status"));
  if (!id) return falha("Unidade não informada.");
  if (!status.success) return falha("Situação inválida.", "status");

  const unidade = await prisma.inventoryUnit.findUnique({
    where: { id },
    select: { id: true, status: true, serialNumber: true, orderItemId: true, product: { select: { id: true, name: true } } },
  });
  if (!unidade) return falha("Unidade não encontrada.");

  if (unidade.orderItemId && status.data !== "vendido") {
    return falha("Esta unidade está vinculada a um pedido. Cancele o pedido antes de liberá-la.");
  }

  try {
    await prisma.inventoryUnit.update({ where: { id }, data: { status: status.data } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "status",
      entidade: "unidade",
      entidadeId: id,
      antes: { status: unidade.status },
      depois: { status: status.data },
      resumo: `${unidade.product.name}${unidade.serialNumber ? ` · série ${unidade.serialNumber}` : ""}`,
    });

    revalidatePath("/admin/estoque/unidades");
    revalidatePath(`/admin/estoque/unidades/${id}`);
    revalidatePath(`/admin/estoque/produto/${unidade.product.id}`);
    return feito("Situação atualizada.");
  } catch (erro) {
    return erroInesperado("mudarStatusUnidade", erro);
  }
}

export async function excluirUnidade(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("estoque");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Unidade não informada.");

  const unidade = await prisma.inventoryUnit.findUnique({
    where: { id },
    select: { id: true, serialNumber: true, orderItemId: true, product: { select: { id: true, name: true } } },
  });
  if (!unidade) return falha("Unidade não encontrada.");

  if (unidade.orderItemId) {
    return falha("Esta unidade já foi vendida e está ligada a um pedido. Marque como indisponível em vez de apagar.");
  }

  try {
    await prisma.inventoryUnit.delete({ where: { id } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "unidade",
      entidadeId: id,
      resumo: `Excluiu unidade de ${unidade.product.name}${unidade.serialNumber ? ` (série ${unidade.serialNumber})` : ""}`,
    });
  } catch (erro) {
    return erroInesperado("excluirUnidade", erro);
  }

  revalidatePath("/admin/estoque/unidades");
  revalidatePath(`/admin/estoque/produto/${unidade.product.id}`);
  redirect("/admin/estoque/unidades?excluido=1");
}
