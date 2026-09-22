"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { gerarSlug } from "@/lib/format";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Escrita dos cadastros da assistência: categorias de equipamento e serviços.
 *
 * Saíram de `admin-catalogo.ts` quando a loja foi retirada. A categoria
 * classifica o equipamento do cliente e o chamado; o serviço entra como linha
 * do orçamento de reparo. Produto, marca, estoque e unidade física foram
 * embora com o comércio.
 *
 * Toda função começa com `exigirEdicao("cadastros")`: autorização é do
 * servidor, esconder o botão nunca foi controle de acesso.
 */

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

function erroInesperado(contexto: string, erro: unknown): EstadoAcao {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    const alvo = Array.isArray(erro.meta?.target)
      ? erro.meta.target.join(",")
      : String(erro.meta?.target ?? "");
    if (alvo.includes("slug")) return falha("Já existe um registro com este endereço (slug).", "slug");
    return falha("Já existe um registro com estes dados.");
  }
  console.error(`Falha em ${contexto}`, erro);
  return falha("Não foi possível salvar. Tente de novo em instantes.");
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

const TIPOS_SERVICO = [
  "instalacao",
  "visita_tecnica",
  "manutencao_preventiva",
  "manutencao_corretiva",
  "treinamento",
  "retirada_equipamento",
  "outro",
] as const;

/**
 * `formData.get` que nunca devolve `null`: campo ausente vira string vazia.
 * Sem isto, um formulário adulterado (campo removido) faria o zod reclamar de
 * tipo em vez de mostrar a mensagem escrita para a pessoa.
 */
function campo(formData: FormData, nome: string): string {
  const bruto = formData.get(nome);
  return typeof bruto === "string" ? bruto : "";
}

/** Slug pedido pela pessoa, ou derivado do nome quando o campo veio vazio. */
function slugFinal(informado: string, base: string) {
  const limpo = gerarSlug(informado || base);
  return limpo || gerarSlug(base) || "";
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
 * Uma categoria não pode virar filha de si mesma nem de uma descendente sua:
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
  const usuario = await exigirEdicao("cadastros");

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
      return feito("Categoria salva.");
    }

    const criada = await prisma.category.create({ data: comum, select: { id: true, name: true } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "categoria",
      entidadeId: criada.id,
      resumo: `Criou a categoria ${criada.name}`,
    });

    revalidatePath("/admin/categorias");
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
  const usuario = await exigirEdicao("cadastros");

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
    return feito("Ordem atualizada.");
  } catch (erro) {
    return erroInesperado("moverCategoria", erro);
  }
}

export async function alternarPublicacaoCategoria(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("cadastros");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Categoria não informada.");

  const atual = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, published: true },
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
    return feito(atual.published ? "Categoria despublicada." : "Categoria publicada.");
  } catch (erro) {
    return erroInesperado("alternarPublicacaoCategoria", erro);
  }
}

export async function excluirCategoria(
  _anterior: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirEdicao("cadastros");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Categoria não informada.");

  const categoria = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { children: true } } },
  });
  if (!categoria) return falha("Categoria não encontrada.");

  if (categoria._count.children > 0) {
    return falha(
      `Esta categoria tem ${categoria._count.children} subcategoria(s). Apague ou mova as subcategorias primeiro.`,
    );
  }

  try {
    /* Equipamento e chamado apontam para a categoria com `SetNull`: apagar
       não leva o histórico junto, só tira a classificação. */
    await prisma.category.delete({ where: { id } });
    await registrarAuditoria({
      userId: usuario.id,
      acao: "excluir",
      entidade: "categoria",
      entidadeId: id,
      resumo: `Excluiu a categoria ${categoria.name}`,
    });

    revalidatePath("/admin/categorias");
    return feito("Categoria excluída.");
  } catch (erro) {
    return erroInesperado("excluirCategoria", erro);
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
 * tem coluna para ela no schema, então ela entra como primeira linha da
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
  const usuario = await exigirEdicao("cadastros");

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
  const usuario = await exigirEdicao("cadastros");

  const id = campo(formData, "id").trim();
  if (!id) return falha("Serviço não informado.");

  const servico = await prisma.service.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { quoteItems: true } } },
  });
  if (!servico) return falha("Serviço não encontrado.");

  if (servico._count.quoteItems > 0) {
    return falha("Este serviço já entrou em orçamento. Despublique em vez de apagar.");
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
    return feito("Serviço excluído.");
  } catch (erro) {
    return erroInesperado("excluirServico", erro);
  }
}
