"use server";

import { randomInt } from "node:crypto";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type TicketStatus } from "@prisma/client";
import { z } from "zod";

import { sanitizarHtml } from "@/components/admin/conteudo/html-seguro";
import { STATUS_LEAD, TIPOS_SECAO } from "@/components/admin/conteudo/rotulos";
import { registrarAuditoria } from "@/lib/auditoria";
import { hashDeCorpo, MARCA_MANUAL } from "@/lib/conteudo/migracao";
import { hashSenha } from "@/lib/auth";
import { formatarDataHora, gerarSlug, somenteDigitos } from "@/lib/format";
import { notificar } from "@/lib/notificacoes";
import { exigirEdicao } from "@/lib/permissoes";
import { ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { prisma } from "@/lib/prisma";
import { SETTING_FIELDS, getSettings } from "@/lib/settings";
import { removerArquivo } from "@/lib/upload";

/**
 * Escritas do backoffice de conteúdo, relacionamento e sistema.
 *
 * Todas as ações seguem o mesmo contrato:
 *   1. autorização primeiro, no servidor, por área (`exigirEdicao`) — esconder
 *      o botão não é controle de acesso;
 *   2. validação com zod, devolvendo `{ erro, campo }` para o formulário
 *      destacar o campo certo;
 *   3. gravação, registro em `AuditLog` com o diff dos campos que mudaram e
 *      `revalidatePath` de tudo que muda de aparência por causa disso.
 *
 * HTML vindo do editor passa por `sanitizarHtml` antes de encostar no banco.
 * A função mora em `@/components/admin/conteudo/html-seguro` porque num módulo
 * "use server" todo export vira ação chamável pelo cliente — uma função pura
 * de saneamento não pode ser exportada daqui.
 */

export type EstadoConteudo = {
  erro?: string;
  campo?: string;
  ok?: string;
  /** Senha temporária de usuário — exibida uma única vez, nunca guardada. */
  senha?: string;
  /** Identificador do registro criado, para a tela oferecer o link. */
  id?: string;
};

/* ============================================================================
   Utilidades internas
   ============================================================================ */

function problema(erro: z.ZodError): EstadoConteudo {
  const primeiro = erro.issues[0];
  return {
    erro: primeiro?.message ?? "Confira os dados informados.",
    campo: primeiro?.path[0] !== undefined ? String(primeiro.path[0]) : undefined,
  };
}

function texto(form: FormData, nome: string) {
  const valor = form.get(nome);
  return typeof valor === "string" ? valor : "";
}

function marcado(form: FormData, nome: string) {
  const valor = form.get(nome);
  return valor === "on" || valor === "true" || valor === "1" || valor === "sim";
}

/** Data de um `<input type="date">` no fuso de São Paulo, ou nulo. */
function dataDoFormulario(valor: string, fimDoDia = false): Date | null {
  const limpo = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return null;
  const data = new Date(`${limpo}T${fimDoDia ? "23:59:59" : "00:00:00"}-03:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Nova ordem de uma lista depois de mover um item uma posição.
 * Renumera todo mundo de 1 em diante — assim empates de `order` vindos de
 * importação se resolvem sozinhos na primeira movimentação.
 */
function reordenar(
  itens: { id: string; order: number }[],
  id: string,
  direcao: "cima" | "baixo",
) {
  const atual = itens.findIndex((item) => item.id === id);
  if (atual === -1) return null;
  const destino = direcao === "cima" ? atual - 1 : atual + 1;
  if (destino < 0 || destino >= itens.length) return null;

  const copia = [...itens];
  const [movido] = copia.splice(atual, 1);
  copia.splice(destino, 0, movido);

  return copia
    .map((item, indice) => ({ id: item.id, order: indice + 1 }))
    .filter((novo) => itens.find((item) => item.id === novo.id)?.order !== novo.order);
}

function ehDuplicidade(erro: unknown): erro is Prisma.PrismaClientKnownRequestError {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";
}

/* ============================================================================
   Páginas do site (Page)

   O slug de uma página é o endereço público: `sobre` responde em `/sobre`. Por
   isso a lista de reservados — um slug igual ao de uma rota de arquivo nunca
   apareceria, e o editor ficaria procurando o erro no lugar errado.

   `Page` não tem coluna de publicação no schema (congelado nesta rodada), só
   `editable`. Então não existe rascunho: página cadastrada é página no ar. O
   que `editable` faz é proteger contra edição pelo painel.
   ============================================================================ */

/**
 * Endereços que já pertencem a uma rota do site.
 *
 * Segmento estático sempre vence segmento dinâmico no App Router, então uma
 * página do CMS com um destes slugs nunca apareceria — e a pessoa procuraria
 * o erro no lugar errado. Não estão na lista, de propósito, as rotas fixas que
 * LEEM o CMS (/sobre, /estrutura, /contato, /faq, /entrega, /privacidade,
 * /termos, /trocas-e-devolucoes): lá a página existe e é editável por aqui.
 */
const SLUGS_RESERVADOS = new Set([
  // sistema
  "admin",
  "api",
  "sitemap.xml",
  "robots.txt",
  // loja e conta
  "loja",
  "busca",
  "carrinho",
  "checkout",
  "entrar",
  "cadastro",
  "minha-jb",
  "recuperar-senha",
  "redefinir-senha",
  "categoria",
  "marcas",
  "novos",
  "seminovos",
  "usados",
  "recondicionados",
  "pecas-e-acessorios",
  // telas próprias de serviço, que não leem o CMS
  "assistencia-tecnica",
  "chamado",
  "orcamento",
  "pedido",
  "servicos",
  "manutencao-preventiva",
  "planos-de-manutencao",
]);

const esquemaPagina = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "O endereço da página precisa de pelo menos 2 caracteres.")
    .max(80, "O endereço da página ficou longo demais."),
  title: z
    .string()
    .trim()
    .min(2, "Informe o título da página.")
    .max(160, "O título ficou longo demais."),
  eyebrow: z.string().trim().max(80, "O chapéu ficou longo demais."),
  lead: z.string().trim().max(400, "A chamada ficou longa demais."),
  body: z.string(),
  videoId: z
    .string()
    .trim()
    .max(40)
    .refine((valor) => valor === "" || /^[A-Za-z0-9_-]{6,40}$/.test(valor), {
      message: "Informe apenas o código do vídeo no YouTube, sem o endereço completo.",
    }),
  coverId: z.string().trim(),
  seoTitle: z.string().trim().max(70, "O título de busca cabe em até 70 caracteres."),
  seoDescription: z
    .string()
    .trim()
    .max(180, "A descrição de busca cabe em até 180 caracteres."),
  editable: z.boolean(),
});

export async function salvarPagina(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");

  const original = texto(form, "slugOriginal").trim();
  const dados = esquemaPagina.safeParse({
    slug: gerarSlug(texto(form, "slug") || texto(form, "title")),
    title: texto(form, "title"),
    eyebrow: texto(form, "eyebrow"),
    lead: texto(form, "lead"),
    body: texto(form, "body"),
    videoId: texto(form, "videoId"),
    coverId: texto(form, "coverId"),
    seoTitle: texto(form, "seoTitle"),
    seoDescription: texto(form, "seoDescription"),
    editable: marcado(form, "editable"),
  });

  if (!dados.success) return problema(dados.error);

  const { slug } = dados.data;
  if (SLUGS_RESERVADOS.has(slug)) {
    return {
      erro: `"${slug}" é um endereço usado pelo próprio site. Escolha outro.`,
      campo: "slug",
    };
  }

  const corpo = sanitizarHtml(dados.data.body);
  const comum = {
    title: dados.data.title,
    eyebrow: dados.data.eyebrow || null,
    lead: dados.data.lead || null,
    body: corpo,
    videoId: dados.data.videoId || null,
    coverId: dados.data.coverId || null,
    seoTitle: dados.data.seoTitle || null,
    seoDescription: dados.data.seoDescription || null,
    editable: dados.data.editable,
  };

  if (!original) {
    try {
      await prisma.page.create({ data: { slug, ...comum, systemHash: MARCA_MANUAL } });
    } catch (erro) {
      if (ehDuplicidade(erro)) {
        return { erro: "Já existe uma página com este endereço.", campo: "slug" };
      }
      console.error("Falha ao criar página", erro);
      return { erro: "Não foi possível criar a página. Tente de novo." };
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "pagina",
      entidadeId: slug,
      depois: { slug, ...comum },
    });

    revalidatePath("/admin/conteudo/paginas");
    revalidatePath(`/${slug}`);
    revalidatePath("/sitemap.xml");
    redirect(`/admin/conteudo/paginas/${slug}?ok=criada`);
  }

  const antes = await prisma.page.findUnique({ where: { slug: original } });
  if (!antes) return { erro: "Página não encontrada. Ela pode ter sido excluída." };
  if (!antes.editable) {
    return { erro: "Esta página está bloqueada para edição pelo painel." };
  }

  try {
    /*
     * Guardar antes de sobrescrever.
     *
     * O `AuditLog` diz que o corpo mudou e mostra um resumo, mas não guarda o
     * texto — não dá para voltar atrás por ele. A revisão guarda o corpo
     * inteiro, e é dela que sai o botão "Restaurar" do histórico.
     *
     * Só quando o corpo realmente muda: salvar apenas o título não deve
     * empilhar revisão idêntica.
     *
     * `systemHash: MARCA_MANUAL` declara que, a partir daqui, o conteúdo é
     * decisão da equipe. Nenhuma migração de conteúdo sobrescreve página com
     * essa marca — ver src/lib/conteudo/migracao.ts.
     */
    await prisma.$transaction(async (tx) => {
      if (antes.body.trim() && hashDeCorpo(antes.body) !== hashDeCorpo(corpo)) {
        await tx.pageRevision.create({
          data: {
            pageSlug: antes.slug,
            title: antes.title,
            eyebrow: antes.eyebrow,
            lead: antes.lead,
            body: antes.body,
            seoTitle: antes.seoTitle,
            seoDescription: antes.seoDescription,
            bodyHash: hashDeCorpo(antes.body),
            origin: "manual",
            note: `Versão anterior, guardada quando ${usuario.name} salvou a página.`,
          },
        });
      }

      await tx.page.update({
        where: { slug: original },
        data: { slug, ...comum, systemHash: MARCA_MANUAL },
      });
    });
  } catch (erro) {
    if (ehDuplicidade(erro)) {
      return { erro: "Já existe uma página com este endereço.", campo: "slug" };
    }
    console.error("Falha ao salvar página", erro);
    return { erro: "Não foi possível salvar a página. Tente de novo." };
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "pagina",
    entidadeId: slug,
    antes,
    depois: { slug, ...comum },
  });

  revalidatePath("/admin/conteudo/paginas");
  revalidatePath(`/admin/conteudo/paginas/${slug}`);
  revalidatePath(`/${original}`);
  revalidatePath("/sitemap.xml");
  if (slug !== original) {
    revalidatePath(`/${slug}`);
    redirect(`/admin/conteudo/paginas/${slug}?ok=salva`);
  }

  return { ok: "Página salva." };
}

/**
 * Restaura uma versão anterior do texto de uma página.
 *
 * A versão que está no ar vira revisão antes de sair — restaurar por engano
 * precisa ser tão reversível quanto a edição que motivou a restauração. Sem
 * isso, o histórico seria uma armadilha de mão única.
 *
 * Só o texto volta: capa, galeria, vídeo e o endereço da página ficam como
 * estão. Uma revisão não carrega o estado das imagens, e fingir que carrega
 * produziria uma restauração parcial silenciosa.
 */
export async function restaurarRevisaoDaPagina(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  if (!id) return { erro: "Versão não informada." };

  const revisao = await prisma.pageRevision.findUnique({ where: { id } });
  if (!revisao) return { erro: "Versão não encontrada." };

  const pagina = await prisma.page.findUnique({ where: { slug: revisao.pageSlug } });
  if (!pagina) return { erro: "Página não encontrada." };
  if (!pagina.editable) {
    return { erro: "Esta página está bloqueada para edição pelo painel." };
  }

  if (hashDeCorpo(pagina.body) === hashDeCorpo(revisao.body)) {
    return { erro: "O texto no ar já é o desta versão." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.pageRevision.create({
      data: {
        pageSlug: pagina.slug,
        title: pagina.title,
        eyebrow: pagina.eyebrow,
        lead: pagina.lead,
        body: pagina.body,
        seoTitle: pagina.seoTitle,
        seoDescription: pagina.seoDescription,
        bodyHash: hashDeCorpo(pagina.body),
        origin: "manual",
        note: `Versão que estava no ar quando ${usuario.name} restaurou outra.`,
      },
    });

    await tx.page.update({
      where: { slug: pagina.slug },
      data: {
        title: revisao.title,
        eyebrow: revisao.eyebrow,
        lead: revisao.lead,
        body: revisao.body,
        seoTitle: revisao.seoTitle,
        seoDescription: revisao.seoDescription,
        systemHash: MARCA_MANUAL,
      },
    });
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "restaurar",
    entidade: "pagina",
    entidadeId: pagina.slug,
    resumo: `Restaurou uma versão de ${formatarDataHora(revisao.createdAt)} da página "${pagina.title}"`,
  });

  revalidatePath(`/admin/conteudo/paginas/${pagina.slug}`);
  revalidatePath(`/${pagina.slug}`);
  revalidatePath("/sitemap.xml");

  return { ok: "Versão restaurada." };
}

export async function excluirPagina(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const slug = texto(form, "slug").trim();
  if (!slug) return { erro: "Página não informada." };

  const pagina = await prisma.page.findUnique({ where: { slug } });
  if (!pagina) return { erro: "Página não encontrada." };
  if (!pagina.editable) {
    return { erro: "Esta página está bloqueada e não pode ser excluída pelo painel." };
  }

  await prisma.page.delete({ where: { slug } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "pagina",
    entidadeId: slug,
    resumo: `Excluiu a página "${pagina.title}" (/${slug})`,
  });

  revalidatePath("/admin/conteudo/paginas");
  revalidatePath(`/${slug}`);
  revalidatePath("/sitemap.xml");
  redirect("/admin/conteudo/paginas?ok=excluida");
}

/* --------------------------------------------------- galeria de uma página */

export async function adicionarImagemDaPagina(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const slug = texto(form, "slug").trim();
  const mediaId = texto(form, "mediaId").trim();
  const caption = texto(form, "caption").trim().slice(0, 180);

  if (!slug) return { erro: "Página não informada." };
  if (!mediaId) return { erro: "Escolha uma imagem para adicionar.", campo: "mediaId" };

  const [pagina, midia, ultima] = await Promise.all([
    prisma.page.findUnique({ where: { slug }, select: { slug: true, editable: true } }),
    prisma.media.findUnique({ where: { id: mediaId }, select: { id: true, filename: true } }),
    prisma.pageImage.findFirst({
      where: { pageSlug: slug },
      orderBy: { order: "desc" },
      select: { order: true },
    }),
  ]);

  if (!pagina) return { erro: "Página não encontrada." };
  if (!pagina.editable) return { erro: "Esta página está bloqueada para edição." };
  if (!midia) return { erro: "Imagem não encontrada na biblioteca.", campo: "mediaId" };

  const criada = await prisma.pageImage.create({
    data: { pageSlug: slug, mediaId, caption: caption || null, order: (ultima?.order ?? 0) + 1 },
    select: { id: true },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "pagina",
    entidadeId: slug,
    resumo: `Adicionou a imagem ${midia.filename} à galeria`,
  });

  revalidatePath(`/admin/conteudo/paginas/${slug}`);
  revalidatePath(`/${slug}`);
  return { ok: "Imagem adicionada à galeria.", id: criada.id };
}

export async function removerImagemDaPagina(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  if (!id) return { erro: "Imagem não informada." };

  const imagem = await prisma.pageImage.findUnique({
    where: { id },
    select: { id: true, pageSlug: true, media: { select: { filename: true } } },
  });
  if (!imagem) return { erro: "Imagem não encontrada." };

  await prisma.pageImage.delete({ where: { id } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "pagina",
    entidadeId: imagem.pageSlug,
    resumo: `Removeu a imagem ${imagem.media.filename} da galeria`,
  });

  revalidatePath(`/admin/conteudo/paginas/${imagem.pageSlug}`);
  revalidatePath(`/${imagem.pageSlug}`);
  return { ok: "Imagem removida da galeria." };
}

export async function moverImagemDaPagina(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const direcao = texto(form, "direcao") === "cima" ? "cima" : "baixo";

  const imagem = await prisma.pageImage.findUnique({
    where: { id },
    select: { pageSlug: true },
  });
  if (!imagem) return { erro: "Imagem não encontrada." };

  const lista = await prisma.pageImage.findMany({
    where: { pageSlug: imagem.pageSlug },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const novas = reordenar(lista, id, direcao);
  if (!novas) return { ok: "A imagem já está nesta posição." };

  await prisma.$transaction(
    novas.map((item) =>
      prisma.pageImage.update({ where: { id: item.id }, data: { order: item.order } }),
    ),
  );

  revalidatePath(`/admin/conteudo/paginas/${imagem.pageSlug}`);
  revalidatePath(`/${imagem.pageSlug}`);
  return { ok: "Ordem da galeria atualizada." };
}

/* ============================================================================
   Seções da home (HomeSection)
   ============================================================================ */

const esquemaSecao = z.object({
  kind: z.enum(TIPOS_SECAO, { message: "Escolha um tipo de seção." }),
  title: z.string().trim().max(160, "O título ficou longo demais."),
  subtitle: z.string().trim().max(240, "O subtítulo ficou longo demais."),
  body: z.string().trim().max(2000, "O texto da seção ficou longo demais."),
  ctaLabel: z.string().trim().max(48, "O texto do botão cabe em até 48 caracteres."),
  ctaHref: z
    .string()
    .trim()
    .max(240)
    .refine((valor) => valor === "" || valor.startsWith("/") || /^https?:\/\//i.test(valor), {
      message: "O link do botão precisa começar com / ou com https://.",
    }),
  mediaId: z.string().trim(),
  published: z.boolean(),
});

export async function salvarSecaoHome(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();

  const dados = esquemaSecao.safeParse({
    kind: texto(form, "kind"),
    title: texto(form, "title"),
    subtitle: texto(form, "subtitle"),
    body: texto(form, "body"),
    ctaLabel: texto(form, "ctaLabel"),
    ctaHref: texto(form, "ctaHref"),
    mediaId: texto(form, "mediaId"),
    published: marcado(form, "published"),
  });

  if (!dados.success) return problema(dados.error);
  if (dados.data.ctaLabel && !dados.data.ctaHref) {
    return { erro: "Botão com texto precisa de um link.", campo: "ctaHref" };
  }
  if (dados.data.ctaHref && !dados.data.ctaLabel) {
    return { erro: "Informe o texto do botão.", campo: "ctaLabel" };
  }

  const comum = {
    kind: dados.data.kind,
    title: dados.data.title,
    subtitle: dados.data.subtitle,
    body: dados.data.body,
    ctaLabel: dados.data.ctaLabel,
    ctaHref: dados.data.ctaHref,
    mediaId: dados.data.mediaId || null,
    published: dados.data.published,
  };

  if (!id) {
    const ultima = await prisma.homeSection.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const criada = await prisma.homeSection.create({
      data: { ...comum, order: (ultima?.order ?? 0) + 1 },
      select: { id: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "secao_home",
      entidadeId: criada.id,
      depois: comum,
    });

    revalidatePath("/admin/conteudo/home");
    revalidatePath("/");
    redirect(`/admin/conteudo/home/${criada.id}?ok=criada`);
  }

  const antes = await prisma.homeSection.findUnique({ where: { id } });
  if (!antes) return { erro: "Seção não encontrada." };

  await prisma.homeSection.update({ where: { id }, data: comum });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "secao_home",
    entidadeId: id,
    antes,
    depois: comum,
  });

  revalidatePath("/admin/conteudo/home");
  revalidatePath(`/admin/conteudo/home/${id}`);
  revalidatePath("/");
  return { ok: "Seção salva." };
}

export async function publicarSecaoHome(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const publicar = marcado(form, "publicar");

  const antes = await prisma.homeSection.findUnique({
    where: { id },
    select: { id: true, kind: true, published: true },
  });
  if (!antes) return { erro: "Seção não encontrada." };

  await prisma.homeSection.update({ where: { id }, data: { published: publicar } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: publicar ? "publicar" : "arquivar",
    entidade: "secao_home",
    entidadeId: id,
    resumo: `Seção "${antes.kind}" ${publicar ? "publicada" : "escondida"} da home`,
  });

  revalidatePath("/admin/conteudo/home");
  revalidatePath(`/admin/conteudo/home/${id}`);
  revalidatePath("/");
  return { ok: publicar ? "Seção publicada." : "Seção escondida da home." };
}

export async function moverSecaoHome(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const direcao = texto(form, "direcao") === "cima" ? "cima" : "baixo";

  const lista = await prisma.homeSection.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const novas = reordenar(lista, id, direcao);
  if (!novas) return { ok: "A seção já está nesta posição." };

  await prisma.$transaction(
    novas.map((item) =>
      prisma.homeSection.update({ where: { id: item.id }, data: { order: item.order } }),
    ),
  );

  revalidatePath("/admin/conteudo/home");
  revalidatePath("/");
  return { ok: "Ordem da home atualizada." };
}

export async function excluirSecaoHome(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();

  const secao = await prisma.homeSection.findUnique({
    where: { id },
    select: { id: true, kind: true, title: true },
  });
  if (!secao) return { erro: "Seção não encontrada." };

  await prisma.homeSection.delete({ where: { id } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "secao_home",
    entidadeId: id,
    resumo: `Excluiu a seção "${secao.title || secao.kind}" da home`,
  });

  revalidatePath("/admin/conteudo/home");
  revalidatePath("/");
  redirect("/admin/conteudo/home?ok=excluida");
}

/* ============================================================================
   Slides do carrossel (Slide)
   ============================================================================ */

const esquemaSlide = z.object({
  title: z.string().trim().min(2, "Informe o título do slide.").max(120),
  subtitle: z.string().trim().max(200, "O subtítulo ficou longo demais."),
  href: z
    .string()
    .trim()
    .max(240)
    .refine((valor) => valor === "" || valor.startsWith("/") || /^https?:\/\//i.test(valor), {
      message: "O link precisa começar com / ou com https://.",
    }),
  imageId: z.string().trim(),
  published: z.boolean(),
});

export async function salvarSlide(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();

  const dados = esquemaSlide.safeParse({
    title: texto(form, "title"),
    subtitle: texto(form, "subtitle"),
    href: texto(form, "href"),
    imageId: texto(form, "imageId"),
    published: marcado(form, "published"),
  });
  if (!dados.success) return problema(dados.error);

  const inicio = dataDoFormulario(texto(form, "startsAt"));
  const fim = dataDoFormulario(texto(form, "endsAt"), true);
  if (inicio && fim && fim < inicio) {
    return { erro: "A data final não pode ser anterior à inicial.", campo: "endsAt" };
  }
  if (!dados.data.imageId) {
    return { erro: "Escolha a imagem do slide.", campo: "imageId" };
  }

  const comum = {
    title: dados.data.title,
    subtitle: dados.data.subtitle || null,
    href: dados.data.href || null,
    imageId: dados.data.imageId,
    published: dados.data.published,
    startsAt: inicio,
    endsAt: fim,
  };

  if (!id) {
    const ultimo = await prisma.slide.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const criado = await prisma.slide.create({
      data: { ...comum, order: (ultimo?.order ?? 0) + 1 },
      select: { id: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "slide",
      entidadeId: criado.id,
      depois: comum,
    });

    revalidatePath("/admin/conteudo/slides");
    revalidatePath("/");
    redirect(`/admin/conteudo/slides/${criado.id}?ok=criado`);
  }

  const antes = await prisma.slide.findUnique({ where: { id } });
  if (!antes) return { erro: "Slide não encontrado." };

  await prisma.slide.update({ where: { id }, data: comum });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "slide",
    entidadeId: id,
    antes,
    depois: comum,
  });

  revalidatePath("/admin/conteudo/slides");
  revalidatePath(`/admin/conteudo/slides/${id}`);
  revalidatePath("/");
  return { ok: "Slide salvo." };
}

export async function publicarSlide(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const publicar = marcado(form, "publicar");

  const antes = await prisma.slide.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!antes) return { erro: "Slide não encontrado." };

  await prisma.slide.update({ where: { id }, data: { published: publicar } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: publicar ? "publicar" : "arquivar",
    entidade: "slide",
    entidadeId: id,
    resumo: `Slide "${antes.title}" ${publicar ? "publicado" : "despublicado"}`,
  });

  revalidatePath("/admin/conteudo/slides");
  revalidatePath(`/admin/conteudo/slides/${id}`);
  revalidatePath("/");
  return { ok: publicar ? "Slide publicado." : "Slide despublicado." };
}

export async function moverSlide(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const direcao = texto(form, "direcao") === "cima" ? "cima" : "baixo";

  const lista = await prisma.slide.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const novas = reordenar(lista, id, direcao);
  if (!novas) return { ok: "O slide já está nesta posição." };

  await prisma.$transaction(
    novas.map((item) =>
      prisma.slide.update({ where: { id: item.id }, data: { order: item.order } }),
    ),
  );

  revalidatePath("/admin/conteudo/slides");
  revalidatePath("/");
  return { ok: "Ordem dos slides atualizada." };
}

export async function excluirSlide(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();

  const slide = await prisma.slide.findUnique({ where: { id }, select: { title: true } });
  if (!slide) return { erro: "Slide não encontrado." };

  await prisma.slide.delete({ where: { id } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "slide",
    entidadeId: id,
    resumo: `Excluiu o slide "${slide.title}"`,
  });

  revalidatePath("/admin/conteudo/slides");
  revalidatePath("/");
  redirect("/admin/conteudo/slides?ok=excluido");
}

/* ============================================================================
   Perguntas frequentes (Faq)
   ============================================================================ */

const esquemaFaq = z.object({
  question: z.string().trim().min(5, "Escreva a pergunta.").max(240),
  answer: z.string().trim().min(5, "Escreva a resposta.").max(4000),
  group: z.enum(["geral", "compra", "entrega", "assistencia", "produto"], {
    message: "Escolha um grupo.",
  }),
  productId: z.string().trim(),
  published: z.boolean(),
});

export async function salvarFaq(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();

  const dados = esquemaFaq.safeParse({
    question: texto(form, "question"),
    answer: texto(form, "answer"),
    group: texto(form, "group"),
    productId: texto(form, "productId"),
    published: marcado(form, "published"),
  });
  if (!dados.success) return problema(dados.error);

  if (dados.data.group === "produto" && !dados.data.productId) {
    return { erro: "Escolha o produto a que a pergunta se refere.", campo: "productId" };
  }

  const comum = {
    question: dados.data.question,
    answer: dados.data.answer,
    group: dados.data.group,
    productId: dados.data.group === "produto" ? dados.data.productId : null,
    published: dados.data.published,
  };

  if (!id) {
    const ultima = await prisma.faq.findFirst({
      where: { group: comum.group },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const criada = await prisma.faq.create({
      data: { ...comum, order: (ultima?.order ?? 0) + 1 },
      select: { id: true },
    });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "faq",
      entidadeId: criada.id,
      depois: comum,
    });

    revalidatePath("/admin/conteudo/faq");
    revalidatePath("/faq");
    revalidatePath("/");
    redirect(`/admin/conteudo/faq/${criada.id}?ok=criada`);
  }

  const antes = await prisma.faq.findUnique({ where: { id } });
  if (!antes) return { erro: "Pergunta não encontrada." };

  await prisma.faq.update({ where: { id }, data: comum });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "faq",
    entidadeId: id,
    antes,
    depois: comum,
  });

  revalidatePath("/admin/conteudo/faq");
  revalidatePath(`/admin/conteudo/faq/${id}`);
  revalidatePath("/faq");
  revalidatePath("/");
  return { ok: "Pergunta salva." };
}

export async function publicarFaq(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const publicar = marcado(form, "publicar");

  const antes = await prisma.faq.findUnique({ where: { id }, select: { question: true } });
  if (!antes) return { erro: "Pergunta não encontrada." };

  await prisma.faq.update({ where: { id }, data: { published: publicar } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: publicar ? "publicar" : "arquivar",
    entidade: "faq",
    entidadeId: id,
    resumo: `${publicar ? "Publicou" : "Despublicou"}: ${antes.question}`,
  });

  revalidatePath("/admin/conteudo/faq");
  revalidatePath(`/admin/conteudo/faq/${id}`);
  revalidatePath("/faq");
  return { ok: publicar ? "Pergunta publicada." : "Pergunta despublicada." };
}

export async function moverFaq(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const direcao = texto(form, "direcao") === "cima" ? "cima" : "baixo";

  const atual = await prisma.faq.findUnique({ where: { id }, select: { group: true } });
  if (!atual) return { erro: "Pergunta não encontrada." };

  const lista = await prisma.faq.findMany({
    where: { group: atual.group },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const novas = reordenar(lista, id, direcao);
  if (!novas) return { ok: "A pergunta já está nesta posição." };

  await prisma.$transaction(
    novas.map((item) => prisma.faq.update({ where: { id: item.id }, data: { order: item.order } })),
  );

  revalidatePath("/admin/conteudo/faq");
  revalidatePath("/faq");
  return { ok: "Ordem das perguntas atualizada." };
}

export async function excluirFaq(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();

  const faq = await prisma.faq.findUnique({ where: { id }, select: { question: true } });
  if (!faq) return { erro: "Pergunta não encontrada." };

  await prisma.faq.delete({ where: { id } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "faq",
    entidadeId: id,
    resumo: `Excluiu a pergunta "${faq.question}"`,
  });

  revalidatePath("/admin/conteudo/faq");
  revalidatePath("/faq");
  redirect("/admin/conteudo/faq?ok=excluida");
}

/* ============================================================================
   Biblioteca de mídia (Media)

   Excluir mídia é a única operação do CMS que pode quebrar outra tela. Antes de
   apagar, contamos todos os vínculos: página, galeria, slide, seção da home,
   marca, categoria, produto, unidade de estoque, equipamento, chamado e OS. Com
   qualquer vínculo, a exclusão é recusada e a mensagem diz onde o arquivo está
   sendo usado — nada de apagar e deixar buraco na vitrine.
   ============================================================================ */

const VINCULOS_DA_MIDIA = {
  pageCovers: "capa de página",
  pageImages: "galeria de página",
  slides: "slide do carrossel",
  homeSections: "seção da home",
  brandLogos: "logo de marca",
  categoryImages: "imagem de categoria",
  productMedia: "foto de produto",
  unitMedia: "foto de unidade em estoque",
  equipmentMedia: "foto de equipamento",
  requestMedia: "anexo de chamado",
  workOrderMedia: "anexo de ordem de serviço",
} as const;

export async function salvarMidia(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  const alt = texto(form, "alt").trim().slice(0, 180);
  const credit = texto(form, "credit").trim().slice(0, 120);
  const usageNote = texto(form, "usageNote").trim().slice(0, 300);
  const hasPeople = marcado(form, "hasPeople");
  const autorizar = marcado(form, "autorizar");

  const antes = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      alt: true,
      filename: true,
      credit: true,
      hasPeople: true,
      authorizedAt: true,
      authorizedBy: true,
      usageNote: true,
    },
  });
  if (!antes) return { erro: "Arquivo não encontrado." };

  /* A autorização é um ato com data e com quem a obteve, e não um booleano
     que se marca e desmarca. Uma vez registrada, ela permanece — desmarcar
     "há pessoa identificável" não apaga o fato de alguém ter autorizado. */
  const jaAutorizada = Boolean(antes.authorizedAt);
  const authorizedAt = jaAutorizada ? antes.authorizedAt : autorizar ? new Date() : null;
  const authorizedBy = jaAutorizada ? antes.authorizedBy : autorizar ? usuario.name : "";

  await prisma.media.update({
    where: { id },
    data: { alt, credit, usageNote, hasPeople, authorizedAt, authorizedBy },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "midia",
    entidadeId: id,
    antes: { ...antes },
    depois: { alt, credit, usageNote, hasPeople, authorizedAt, authorizedBy },
  });

  revalidatePath("/admin/conteudo/midia");

  /* Marcar "tem pessoa" sem autorização NÃO impede salvar: o cadastro precisa
     poder registrar o fato antes de a autorização existir. O bloqueio fica no
     uso, em `impedimentoDeUsoPublico` — e a mensagem diz isso, para ninguém
     sair da tela achando que a foto está liberada. */
  return {
    ok:
      hasPeople && !authorizedAt
        ? "Salvo. A imagem tem pessoa identificável e ainda não pode ser publicada: falta registrar a autorização."
        : "Cadastro da imagem salvo.",
  };
}

export async function excluirMidia(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("conteudo");
  const id = texto(form, "id").trim();
  if (!id) return { erro: "Arquivo não informado." };

  const midia = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      url: true,
      _count: {
        select: {
          pageCovers: true,
          pageImages: true,
          slides: true,
          homeSections: true,
          brandLogos: true,
          categoryImages: true,
          productMedia: true,
          unitMedia: true,
          equipmentMedia: true,
          requestMedia: true,
          workOrderMedia: true,
        },
      },
    },
  });
  if (!midia) return { erro: "Arquivo não encontrado." };

  const contagem = midia._count;
  const usos = (Object.keys(VINCULOS_DA_MIDIA) as (keyof typeof VINCULOS_DA_MIDIA)[])
    .filter((chave) => contagem[chave] > 0)
    .map((chave) => `${contagem[chave]} ${VINCULOS_DA_MIDIA[chave]}`);

  if (usos.length > 0) {
    return {
      erro: `Este arquivo está em uso (${usos.join(", ")}). Troque a imagem nesses lugares antes de excluir.`,
    };
  }

  await prisma.media.delete({ where: { id } });
  // O registro é a fonte da verdade: se o arquivo físico não sair, sobra lixo
  // no disco, mas nenhuma tela quebra. Por isso a falha aqui não derruba a ação.
  try {
    await removerArquivo(midia.url);
  } catch (erro) {
    console.error("Falha ao remover arquivo do armazenamento", erro);
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "excluir",
    entidade: "midia",
    entidadeId: id,
    resumo: `Excluiu o arquivo ${midia.filename}`,
  });

  revalidatePath("/admin/conteudo/midia");
  return { ok: "Arquivo excluído." };
}

/* ============================================================================
   Leads
   ============================================================================ */

const esquemaLead = z.object({
  status: z.enum(STATUS_LEAD, { message: "Escolha uma situação." }),
  notas: z.string().trim().max(4000, "A anotação ficou longa demais."),
});

export async function atualizarLead(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("leads");
  const id = texto(form, "id").trim();

  const dados = esquemaLead.safeParse({
    status: texto(form, "status"),
    notas: texto(form, "notas"),
  });
  if (!dados.success) return problema(dados.error);

  const antes = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, nome: true, status: true, notas: true },
  });
  if (!antes) return { erro: "Lead não encontrado." };

  await prisma.lead.update({
    where: { id },
    data: { status: dados.data.status, notas: dados.data.notas },
  });

  await registrarAuditoria({
    userId: usuario.id,
    acao: antes.status === dados.data.status ? "editar" : "status",
    entidade: "lead",
    entidadeId: id,
    antes: { status: antes.status, notas: antes.notas },
    depois: { status: dados.data.status, notas: dados.data.notas },
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  return { ok: "Lead atualizado." };
}

/**
 * Cria o cliente a partir do contato recebido pelo site.
 *
 * A conta nasce sem senha: `Customer.passwordHash` nulo é exatamente o estado
 * de quem ainda não se cadastrou, e a pessoa define a senha pela recuperação.
 * O endereço só é criado quando o formulário trouxe CEP, cidade e UF — meio
 * endereço no cadastro é pior do que endereço nenhum.
 */
export async function converterLeadEmCliente(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("leads");
  const id = texto(form, "id").trim();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return { erro: "Lead não encontrado." };

  const email = lead.email.trim().toLowerCase();
  if (!email) {
    return { erro: "Este lead não deixou e-mail, e o cadastro de cliente exige um." };
  }

  const existente = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (existente) {
    if (lead.status !== "convertido") {
      await prisma.lead.update({ where: { id }, data: { status: "convertido" } });
      revalidatePath("/admin/leads");
      revalidatePath(`/admin/leads/${id}`);
    }
    return {
      erro: `Já existe um cliente com o e-mail ${email} (${existente.name}). O lead foi marcado como cliente.`,
      id: existente.id,
    };
  }

  const temEndereco = Boolean(
    somenteDigitos(lead.cep).length === 8 && lead.endereco.trim() && lead.cidade.trim() && lead.estado.trim(),
  );

  let clienteId = "";
  try {
    clienteId = await prisma.$transaction(async (tx) => {
      const cliente = await tx.customer.create({
        data: {
          name: lead.nome.trim() || email,
          email,
          phone: lead.telefone.trim(),
          notes: lead.obs.trim() ? `Veio do formulário do site: ${lead.obs.trim()}` : "",
          marketingOptInAt: lead.news ? new Date() : null,
        },
        select: { id: true },
      });

      if (temEndereco) {
        await tx.customerAddress.create({
          data: {
            customerId: cliente.id,
            label: "Principal",
            recipient: lead.nome.trim(),
            zip: somenteDigitos(lead.cep),
            street: lead.endereco.trim(),
            number: "",
            district: lead.bairro.trim(),
            city: lead.cidade.trim(),
            state: lead.estado.trim().toUpperCase().slice(0, 2),
            isDefault: true,
          },
        });
      }

      await tx.lead.update({ where: { id }, data: { status: "convertido" } });
      return cliente.id;
    });
  } catch (erro) {
    if (ehDuplicidade(erro)) {
      return { erro: "Já existe um cliente com este e-mail." };
    }
    console.error("Falha ao converter lead", erro);
    return { erro: "Não foi possível criar o cliente. Tente de novo." };
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "criar",
    entidade: "cliente",
    entidadeId: clienteId,
    resumo: `Cliente criado a partir do lead ${lead.nome} (${email})${temEndereco ? " com endereço" : ""}`,
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/clientes");

  return {
    ok: temEndereco
      ? "Cliente criado com o endereço informado no formulário."
      : "Cliente criado. O formulário não trouxe endereço completo, então nenhum foi cadastrado.",
    id: clienteId,
  };
}

/* ============================================================================
   Suporte (SupportTicket / SupportMessage)

   Não existe área "suporte" em @/lib/permissoes (arquivo congelado nesta
   rodada), e ticket é conversa com cliente — por isso a área usada é
   "clientes": admin, gestor e comercial.
   ============================================================================ */

const STATUS_TICKET: TicketStatus[] = ["aberto", "respondido", "aguardando_cliente", "fechado"];

const esquemaResposta = z.object({
  body: z.string().trim().min(2, "Escreva a resposta.").max(6000, "A resposta ficou longa demais."),
  visivel: z.boolean(),
  status: z.enum(["aberto", "respondido", "aguardando_cliente", "fechado"], {
    message: "Escolha a situação do ticket.",
  }),
});

export async function responderTicket(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("suporte");
  const id = texto(form, "id").trim();

  const dados = esquemaResposta.safeParse({
    body: texto(form, "body"),
    visivel: marcado(form, "visivel"),
    status: texto(form, "status") || "respondido",
  });
  if (!dados.success) return problema(dados.error);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, number: true, subject: true, status: true, customerId: true },
  });
  if (!ticket) return { erro: "Ticket não encontrado." };

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: id,
        body: dados.data.body,
        fromStaff: true,
        userId: usuario.id,
        visibleToCustomer: dados.data.visivel,
      },
    }),
    prisma.supportTicket.update({ where: { id }, data: { status: dados.data.status } }),
  ]);

  if (dados.data.visivel && ticket.customerId) {
    await notificar({
      customerId: ticket.customerId,
      tipo: "suporte",
      titulo: `Resposta no ticket ${ticket.number}`,
      corpo: dados.data.body,
      href: `/minha-jb/suporte/${ticket.id}`,
    });
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "enviar",
    entidade: "ticket",
    entidadeId: id,
    resumo: dados.data.visivel
      ? `Respondeu o ticket ${ticket.number}`
      : `Anotou uma nota interna no ticket ${ticket.number}`,
  });

  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${id}`);
  return {
    ok: dados.data.visivel ? "Resposta enviada ao cliente." : "Nota interna registrada.",
  };
}

export async function mudarStatusTicket(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("suporte");
  const id = texto(form, "id").trim();
  const bruto = texto(form, "status");

  if (!STATUS_TICKET.includes(bruto as TicketStatus)) {
    return { erro: "Situação inválida.", campo: "status" };
  }
  const status = bruto as TicketStatus;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, number: true, status: true },
  });
  if (!ticket) return { erro: "Ticket não encontrado." };
  if (ticket.status === status) return { ok: "O ticket já estava nesta situação." };

  await prisma.supportTicket.update({ where: { id }, data: { status } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: "status",
    entidade: "ticket",
    entidadeId: id,
    antes: { status: ticket.status },
    depois: { status },
    resumo: `Ticket ${ticket.number}: ${ticket.status} → ${status}`,
  });

  revalidatePath("/admin/suporte");
  revalidatePath(`/admin/suporte/${id}`);
  return { ok: status === "fechado" ? "Ticket fechado." : "Situação atualizada." };
}

/* ============================================================================
   Equipe interna (User)

   Só admin chega aqui — é a área "usuarios". A senha nunca volta para a tela
   depois de criada: o painel mostra a temporária uma única vez, na resposta da
   própria ação, e o que fica no banco é o hash do bcrypt.
   ============================================================================ */

const ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Senha temporária legível: sem 0/O e 1/l, que se confundem ao ditar. */
function senhaTemporaria(tamanho = 12) {
  let saida = "";
  for (let i = 0; i < tamanho; i += 1) {
    saida += ALFABETO_SENHA[randomInt(ALFABETO_SENHA.length)];
  }
  return saida;
}

const esquemaUsuario = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(120),
  email: z.email("Informe um e-mail válido."),
  role: z.enum(["admin", "gestor", "comercial", "tecnico", "editor"], {
    message: "Escolha um papel.",
  }),
  phone: z.string().trim().max(20),
  active: z.boolean(),
});

/** Quantos administradores ativos existem além deste. */
async function outrosAdminsAtivos(exceto: string) {
  return prisma.user.count({ where: { role: "admin", active: true, id: { not: exceto } } });
}

export async function salvarUsuario(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("usuarios");
  const id = texto(form, "id").trim();

  const dados = esquemaUsuario.safeParse({
    name: texto(form, "name"),
    email: texto(form, "email"),
    role: texto(form, "role"),
    phone: texto(form, "phone"),
    active: marcado(form, "active"),
  });
  if (!dados.success) return problema(dados.error);

  const email = dados.data.email.toLowerCase().trim();
  const comum = {
    name: dados.data.name,
    email,
    role: dados.data.role,
    phone: dados.data.phone || null,
    active: dados.data.active,
  };

  if (!id) {
    const senha = senhaTemporaria();
    let criadoId = "";
    try {
      const criado = await prisma.user.create({
        data: { ...comum, passwordHash: await hashSenha(senha) },
        select: { id: true },
      });
      criadoId = criado.id;
    } catch (erro) {
      if (ehDuplicidade(erro)) {
        return { erro: "Já existe um usuário com este e-mail.", campo: "email" };
      }
      console.error("Falha ao criar usuário", erro);
      return { erro: "Não foi possível criar o usuário. Tente de novo." };
    }

    await registrarAuditoria({
      userId: usuario.id,
      acao: "criar",
      entidade: "usuario",
      entidadeId: criadoId,
      resumo: `Criou o acesso de ${comum.name} (${email}) como ${comum.role}`,
    });

    revalidatePath("/admin/usuarios");
    return {
      ok: `Acesso criado para ${comum.name}. Entregue a senha abaixo e peça a troca no primeiro acesso.`,
      senha,
      id: criadoId,
    };
  }

  const antes = await prisma.user.findUnique({ where: { id } });
  if (!antes) return { erro: "Usuário não encontrado." };

  const perdeAdmin = antes.role === "admin" && comum.role !== "admin";
  const perdeAcesso = antes.active && !comum.active;

  if (antes.role === "admin" && (perdeAdmin || perdeAcesso)) {
    const sobram = await outrosAdminsAtivos(id);
    if (sobram === 0) {
      return {
        erro: perdeAdmin
          ? "Este é o único administrador ativo. Promova outra pessoa antes de mudar o papel."
          : "Este é o único administrador ativo. Promova outra pessoa antes de desativar o acesso.",
        campo: perdeAdmin ? "role" : "active",
      };
    }
  }

  if (id === usuario.id && perdeAcesso) {
    return { erro: "Você não pode desativar o seu próprio acesso.", campo: "active" };
  }

  try {
    await prisma.user.update({ where: { id }, data: comum });
  } catch (erro) {
    if (ehDuplicidade(erro)) {
      return { erro: "Já existe um usuário com este e-mail.", campo: "email" };
    }
    console.error("Falha ao salvar usuário", erro);
    return { erro: "Não foi possível salvar o usuário. Tente de novo." };
  }

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "usuario",
    entidadeId: id,
    antes: {
      name: antes.name,
      email: antes.email,
      role: antes.role,
      phone: antes.phone,
      active: antes.active,
    },
    depois: comum,
  });

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: "Usuário salvo." };
}

export async function alternarUsuarioAtivo(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("usuarios");
  const id = texto(form, "id").trim();
  const ativar = marcado(form, "ativar");

  const alvo = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!alvo) return { erro: "Usuário não encontrado." };
  if (alvo.active === ativar) return { ok: "O acesso já estava assim." };

  if (!ativar) {
    if (id === usuario.id) {
      return { erro: "Você não pode desativar o seu próprio acesso." };
    }
    if (alvo.role === "admin" && (await outrosAdminsAtivos(id)) === 0) {
      return { erro: "Este é o único administrador ativo. Promova outra pessoa antes." };
    }
  }

  await prisma.user.update({ where: { id }, data: { active: ativar } });
  await registrarAuditoria({
    userId: usuario.id,
    acao: ativar ? "restaurar" : "arquivar",
    entidade: "usuario",
    entidadeId: id,
    resumo: `${ativar ? "Ativou" : "Desativou"} o acesso de ${alvo.name}`,
  });

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: ativar ? "Acesso ativado." : "Acesso desativado." };
}

export async function gerarSenhaTemporaria(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("usuarios");
  const id = texto(form, "id").trim();

  const alvo = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!alvo) return { erro: "Usuário não encontrado." };

  const senha = senhaTemporaria();
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashSenha(senha) } });

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "usuario",
    entidadeId: id,
    resumo: `Gerou nova senha temporária para ${alvo.name}`,
  });

  revalidatePath(`/admin/usuarios/${id}`);
  return {
    ok: `Nova senha temporária de ${alvo.name}. Ela aparece só agora — copie antes de sair da tela.`,
    senha,
  };
}

/* ============================================================================
   Configurações (Setting)

   O formulário é gerado a partir de SETTING_FIELDS: nenhuma chave nova nasce
   aqui, e chave que chegar de fora da lista é ignorada.
   ============================================================================ */

function validarConfiguracao(
  campo: (typeof SETTING_FIELDS)[number],
  valor: string,
): string | null {
  if (valor === "") return null;

  if (campo.type === "url" && !/^https?:\/\/\S+$/i.test(valor)) {
    return `${campo.label}: informe o endereço completo, começando com https://.`;
  }
  if (campo.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
    return `${campo.label}: informe um e-mail válido.`;
  }
  if (campo.key === "parcelas_max") {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 1 || numero > 24) {
      return "Máximo de parcelas: informe um número inteiro de 1 a 24.";
    }
  }
  if (campo.key === "parcela_minima" && !/^\d{1,3}(\.\d{3})*(,\d{2})?$|^\d+(,\d{2})?$/.test(valor)) {
    return "Valor mínimo da parcela: use o formato 50,00.";
  }
  if (campo.key === "codigo_analytics" && !/^G-[A-Z0-9]{6,14}$/i.test(valor)) {
    return "Google Analytics: o identificador tem o formato G-XXXXXXXXXX.";
  }
  if (campo.key === "empresa_desde" && !/^(19|20)\d{2}$/.test(valor)) {
    return "Em atividade desde: informe o ano com quatro dígitos.";
  }
  if (campo.key === "endereco_uf" && !/^[A-Za-z]{2}$/.test(valor)) {
    return "UF: use a sigla de duas letras.";
  }
  if (campo.key === "devolucao_prazo_dias") {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 1 || numero > 365) {
      return "Prazo de devolução: informe um número inteiro de dias, de 1 a 365.";
    }
  }
  /* Opção fora da lista não é erro de digitação do usuário: é formulário
     adulterado. Recusar aqui evita gravar valor que depois viraria atributo
     desconhecido no dado estruturado. */
  if (campo.type === "select" && campo.options) {
    const admitidos = campo.options.map((opcao) => opcao.value);
    if (!admitidos.includes(valor)) return `${campo.label}: escolha uma das opções da lista.`;
  }
  return null;
}

export async function salvarConfiguracoes(
  _anterior: EstadoConteudo,
  form: FormData,
): Promise<EstadoConteudo> {
  const usuario = await exigirEdicao("configuracoes");
  const antes = await getSettings();

  const valores: Record<string, string> = {};

  for (const campo of SETTING_FIELDS) {
    const bruto =
      campo.type === "boolean"
        ? marcado(form, campo.key)
          ? "sim"
          : "nao"
        : texto(form, campo.key).trim().slice(0, 2000);

    const erro = validarConfiguracao(campo, bruto);
    if (erro) return { erro, campo: campo.key };
    valores[campo.key] = bruto;
  }

  /* A política de devolução vale inteira ou não vale. Meia política gravada
     não é publicada em lugar nenhum — e quem salvou sairia da tela achando
     que publicou. Recusar aqui é a única forma de a pessoa saber. */
  const partesDaDevolucao = [
    { chave: "devolucao_prazo_dias", rotulo: "o prazo" },
    { chave: "devolucao_metodo", rotulo: "como o cliente devolve" },
    { chave: "devolucao_frete", rotulo: "quem paga o retorno" },
  ];
  const preenchidas = partesDaDevolucao.filter((parte) => valores[parte.chave] !== "");
  if (preenchidas.length > 0 && preenchidas.length < partesDaDevolucao.length) {
    const faltando = partesDaDevolucao
      .filter((parte) => valores[parte.chave] === "")
      .map((parte) => parte.rotulo);
    return {
      erro:
        `Devolução: falta ${faltando.join(" e ")}. ` +
        "Enquanto os três campos não estiverem preenchidos, nenhuma política de " +
        "devolução é publicada no site nem enviada ao Google.",
      campo: partesDaDevolucao.find((parte) => valores[parte.chave] === "")?.chave,
    };
  }

  await prisma.$transaction(
    SETTING_FIELDS.map((campo) =>
      prisma.setting.upsert({
        where: { key: campo.key },
        update: {
          value: valores[campo.key],
          label: campo.label,
          group: campo.group,
          type: campo.type,
          hint: campo.hint ?? null,
        },
        create: {
          key: campo.key,
          value: valores[campo.key],
          label: campo.label,
          group: campo.group,
          type: campo.type,
          hint: campo.hint ?? null,
          order: SETTING_FIELDS.findIndex((outro) => outro.key === campo.key),
        },
      }),
    ),
  );

  await registrarAuditoria({
    userId: usuario.id,
    acao: "editar",
    entidade: "configuracoes",
    entidadeId: "site",
    antes: Object.fromEntries(SETTING_FIELDS.map((campo) => [campo.key, antes[campo.key]])),
    depois: valores,
  });

  /* Contato, endereço e redes aparecem no cabeçalho e no rodapé de todo o
     site — e os dois vivem em escopos `use cache` desde a migração para Cache
     Components. Só `revalidatePath` não os alcança: sem derrubar a etiqueta, o
     telefone novo levaria até uma hora para aparecer, e quem salvou concluiria
     que o painel não funciona. */
  updateTag(ETIQUETA_CONFIGURACOES);
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}
