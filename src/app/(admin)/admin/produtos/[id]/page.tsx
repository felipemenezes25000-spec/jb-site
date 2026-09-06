import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductStatus } from "@prisma/client";
import {
  Archive,
  ArchiveRestore,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-react";

import {
  alternarArquivoProduto,
  duplicarProduto,
  excluirProduto,
} from "@/app/acoes/admin-catalogo";
import { achatarCategorias, montarArvore } from "@/components/admin/catalogo/arvore-categorias";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { FormularioProdutoBasico } from "@/components/admin/catalogo/formulario-produto-basico";
import { FormularioProdutoEstoque } from "@/components/admin/catalogo/formulario-produto-estoque";
import { FormularioProdutoPrecos } from "@/components/admin/catalogo/formulario-produto-precos";
import { FormularioProdutoSeo } from "@/components/admin/catalogo/formulario-produto-seo";
import {
  FormularioAdicionais,
  FormularioDocumentos,
  FormularioEspecificacoes,
  FormularioRelacionados,
} from "@/components/admin/catalogo/listas-produto";
import { MidiasProduto } from "@/components/admin/catalogo/midias-produto";
import { AbasPorUrl, type Aba } from "@/components/ui/abas";
import { Aviso } from "@/components/ui/aviso";
import { Esqueleto, Etiqueta, Trilha, type Tom } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/**
 * Ficha do produto.
 *
 * Nove abas, nove formulários independentes: cada um tem a sua server action e
 * salva só os campos dele. Assim ninguém perde o que digitou na aba ao lado, e
 * um erro de validação em Preços não obriga a refazer a ficha técnica.
 *
 * A aba fica na query string (`?aba=precos`), então recarregar a página, voltar
 * e compartilhar o link levam ao mesmo lugar.
 */

export const metadata: Metadata = {
  title: "Produto",
};

const ROTULO_STATUS: Record<ProductStatus, string> = {
  draft: "Rascunho",
  active: "Publicado",
  archived: "Arquivado",
};

const TOM_STATUS: Record<ProductStatus, Tom> = {
  draft: "aguardando",
  active: "ok",
  archived: "neutro",
};

export default async function PaginaProduto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; copiado?: string }>;
}) {
  const usuario = await exigirArea("produtos");
  const { id } = await params;
  const { copiado } = await searchParams;
  const somenteLeitura = !podeEditar(usuario, "produtos");

  const [produto, categoriasBrutas, marcas, servicos, catalogo] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        media: { orderBy: { order: "asc" }, include: { media: { select: { id: true, url: true, filename: true } } } },
        specs: { orderBy: { order: "asc" } },
        documents: { orderBy: { createdAt: "asc" } },
        addons: { orderBy: { order: "asc" } },
        relatedFrom: { orderBy: { order: "asc" }, select: { targetId: true } },
        _count: { select: { units: true, orderItems: true, quoteItems: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, icon: true, published: true, featured: true, parentId: true },
    }),
    prisma.brand.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, priceCents: true, kind: true },
    }),
    prisma.product.findMany({
      where: { status: { not: "archived" } },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, sku: true, condition: true },
    }),
  ]);

  if (!produto) notFound();

  const categorias = achatarCategorias(montarArvore(categoriasBrutas));
  const grupos = [...new Set(produto.specs.map((spec) => spec.group))];
  const jaVendido = produto._count.orderItems > 0 || produto._count.quoteItems > 0;

  const abas: Aba[] = [
    {
      chave: "basico",
      rotulo: "Básico",
      conteudo: (
        <FormularioProdutoBasico
          somenteLeitura={somenteLeitura}
          categorias={categorias}
          marcas={marcas.map((marca) => ({ id: marca.id, nome: marca.name }))}
          produto={{
            id: produto.id,
            name: produto.name,
            slug: produto.slug,
            sku: produto.sku,
            model: produto.model,
            shortDescription: produto.shortDescription,
            description: produto.description,
            categoryId: produto.categoryId,
            brandId: produto.brandId,
            condition: produto.condition,
            status: produto.status,
            featured: produto.featured,
          }}
        />
      ),
    },
    {
      chave: "precos",
      rotulo: "Preços",
      conteudo: (
        <FormularioProdutoPrecos
          somenteLeitura={somenteLeitura}
          produto={{
            id: produto.id,
            priceCents: produto.priceCents,
            compareAtCents: produto.compareAtCents,
            /* custo é dado interno de margem: sai do payload de quem só
               consulta o catálogo, porque tudo o que um componente cliente
               recebe viaja para o navegador e é legível no devtools */
            costCents: somenteLeitura ? null : produto.costCents,
            allowDirectPurchase: produto.allowDirectPurchase,
            allowQuoteRequest: produto.allowQuoteRequest,
          }}
        />
      ),
    },
    {
      chave: "estoque",
      rotulo: "Estoque",
      conteudo: (
        <FormularioProdutoEstoque
          somenteLeitura={somenteLeitura}
          produto={{
            id: produto.id,
            trackInventory: produto.trackInventory,
            unique: produto.unique,
            stock: produto.stock,
            lowStockAlert: produto.lowStockAlert,
            unidades: produto._count.units,
          }}
        />
      ),
    },
    {
      chave: "midias",
      rotulo: "Fotos",
      contador: produto.media.length,
      conteudo: (
        <MidiasProduto
          produtoId={produto.id}
          somenteLeitura={somenteLeitura}
          iniciais={produto.media.map((item) => ({
            mediaId: item.mediaId,
            url: item.media.url,
            alt: item.alt,
            nome: item.media.filename,
          }))}
        />
      ),
    },
    {
      chave: "especificacoes",
      rotulo: "Ficha técnica",
      contador: produto.specs.length,
      conteudo: (
        <FormularioEspecificacoes
          produtoId={produto.id}
          somenteLeitura={somenteLeitura}
          gruposSugeridos={grupos.length > 0 ? grupos : ["Ficha técnica"]}
          iniciais={produto.specs.map((spec) => ({
            group: spec.group,
            label: spec.label,
            value: spec.value,
          }))}
        />
      ),
    },
    {
      chave: "documentos",
      rotulo: "Documentos",
      contador: produto.documents.length,
      conteudo: (
        <FormularioDocumentos
          produtoId={produto.id}
          somenteLeitura={somenteLeitura}
          iniciais={produto.documents.map((documento) => ({
            title: documento.title,
            url: documento.url,
            kind: documento.kind,
          }))}
        />
      ),
    },
    {
      chave: "adicionais",
      rotulo: "Adicionais",
      contador: produto.addons.length,
      conteudo: (
        <FormularioAdicionais
          produtoId={produto.id}
          somenteLeitura={somenteLeitura}
          servicos={servicos.map((servico) => ({
            id: servico.id,
            nome: servico.name,
            precoCents: servico.priceCents,
            tipo: servico.kind,
          }))}
          iniciais={produto.addons.map((addon) => ({
            serviceId: addon.serviceId,
            precoCents: addon.priceCents ?? 0,
            usarPadrao: addon.priceCents === null,
            required: addon.required,
          }))}
        />
      ),
    },
    {
      chave: "relacionados",
      rotulo: "Relacionados",
      contador: produto.relatedFrom.length,
      conteudo: (
        <FormularioRelacionados
          produtoId={produto.id}
          somenteLeitura={somenteLeitura}
          iniciais={produto.relatedFrom.map((relacao) => relacao.targetId)}
          catalogo={catalogo.map((item) => ({
            id: item.id,
            nome: item.name,
            sku: item.sku,
            condicao: item.condition,
          }))}
        />
      ),
    },
    {
      chave: "seo",
      rotulo: "Ficha e SEO",
      conteudo: (
        <FormularioProdutoSeo
          somenteLeitura={somenteLeitura}
          produto={{
            id: produto.id,
            name: produto.name,
            shortDescription: produto.shortDescription,
            slug: produto.slug,
            seoTitle: produto.seoTitle,
            seoDescription: produto.seoDescription,
            anvisaCode: produto.anvisaCode,
            manufacturer: produto.manufacturer,
            regulatoryHolder: produto.regulatoryHolder,
            regulatoryNote: produto.regulatoryNote,
            warrantyMonths: produto.warrantyMonths,
            voltage: produto.voltage,
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Produtos", href: "/admin/produtos" },
          { rotulo: produto.name },
        ]}
      />

      {copiado === "1" ? (
        <Aviso tom="sucesso" titulo="Cópia criada">
          Esta é uma cópia em rascunho, com estoque zerado. Ajuste nome, SKU e preço antes de
          publicar.
        </Aviso>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold leading-tight text-graf-950">{produto.name}</h1>
            <Etiqueta tom={TOM_STATUS[produto.status]}>{ROTULO_STATUS[produto.status]}</Etiqueta>
            {produto.featured ? <Etiqueta tom="marca">Destaque</Etiqueta> : null}
          </div>
          <p className="mt-1 text-sm text-graf-500">
            {produto.sku} · atualizado em {formatarDataHora(produto.updatedAt)}
            {produto.status === "active" ? (
              <>
                {" · "}
                <Link
                  href={`/loja/${produto.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
                >
                  Ver na loja
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </>
            ) : null}
          </p>
        </div>

        {!somenteLeitura ? (
          <div className="flex flex-wrap items-center gap-2">
            <BotaoAcao
              acao={duplicarProduto}
              campos={{ id: produto.id }}
              rotulo="Duplicar"
              icone={<Copy className="size-4" aria-hidden />}
              variante="secundario"
              tamanho="md"
              confirmar={{
                pergunta: "Duplicar este produto?",
                detalhe:
                  "A cópia leva ficha, fotos, documentos e adicionais, nasce como rascunho e com estoque zerado.",
                rotuloConfirmar: "Duplicar",
              }}
            />
            <BotaoAcao
              acao={alternarArquivoProduto}
              campos={{ id: produto.id, arquivar: produto.status === "archived" ? "0" : "1" }}
              rotulo={produto.status === "archived" ? "Restaurar" : "Arquivar"}
              icone={
                produto.status === "archived" ? (
                  <ArchiveRestore className="size-4" aria-hidden />
                ) : (
                  <Archive className="size-4" aria-hidden />
                )
              }
              variante="secundario"
              tamanho="md"
              confirmar={{
                pergunta:
                  produto.status === "archived"
                    ? "Restaurar este produto?"
                    : "Arquivar este produto?",
                detalhe:
                  produto.status === "archived"
                    ? "Ele volta como rascunho. Publique de novo pela aba Básico quando estiver pronto."
                    : "Sai da loja e da busca imediatamente. Pedidos antigos continuam intactos.",
                rotuloConfirmar: produto.status === "archived" ? "Restaurar" : "Arquivar",
              }}
            />
            <BotaoAcao
              acao={excluirProduto}
              campos={{ id: produto.id }}
              rotulo="Excluir"
              icone={<Trash2 className="size-4" aria-hidden />}
              variante="perigo"
              tamanho="md"
              desabilitado={jaVendido}
              confirmar={{
                pergunta: "Excluir este produto para sempre?",
                detalhe:
                  "Só é possível apagar produto sem pedido, sem orçamento, sem unidade e sem movimentação. Nos outros casos, use Arquivar.",
                rotuloConfirmar: "Excluir",
              }}
            />
          </div>
        ) : (
          <p className="rounded-lg bg-graf-100 px-3 py-2 text-[0.8125rem] font-semibold text-graf-600">
            Somente consulta
          </p>
        )}
      </header>

      {jaVendido && !somenteLeitura ? (
        <Aviso tom="info" titulo="Produto com histórico">
          Este produto já apareceu em pedido ou orçamento. Ele não pode mais ser apagado — se sair
          de linha, use Arquivar para tirá-lo da loja sem quebrar o histórico.
        </Aviso>
      ) : null}

      {/* AbasPorUrl lê a aba da query string com useSearchParams; a fronteira
          de suspensão é responsabilidade de quem renderiza. */}
      <Suspense fallback={<Esqueleto className="h-[32rem]" />}>
        <AbasPorUrl abas={abas} rotuloDaLista="Seções do produto" />
      </Suspense>
    </div>
  );
}
