import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, History, Lock, Trash2 } from "lucide-react";

import {
  adicionarImagemDaPagina,
  excluirPagina,
  moverImagemDaPagina,
  removerImagemDaPagina,
  restaurarRevisaoDaPagina,
  salvarPagina,
} from "@/app/acoes/admin-conteudo";
import { BotaoAcaoConfirmar } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { SELECAO_MIDIA, bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioPagina } from "@/components/admin/conteudo/formulario-pagina";
import { GaleriaDaPagina } from "@/components/admin/conteudo/galeria-pagina";
import { HtmlSeguro } from "@/components/admin/conteudo/html-seguro";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await prisma.page.findUnique({ where: { slug }, select: { title: true } });
  return { title: pagina ? `${pagina.title} · Páginas` : "Página" };
}

const AVISOS: Record<string, string> = {
  criada: "Página criada. Agora dá para montar a galeria.",
  salva: "Endereço alterado. Confira os links que apontavam para o antigo.",
};

export default async function PaginaEditarPagina({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const { slug } = await params;
  const { ok } = await searchParams;

  const pagina = await prisma.page.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      eyebrow: true,
      lead: true,
      body: true,
      videoId: true,
      seoTitle: true,
      seoDescription: true,
      editable: true,
      updatedAt: true,
      cover: { select: SELECAO_MIDIA },
      gallery: {
        orderBy: { order: "asc" },
        select: { id: true, caption: true, media: { select: SELECAO_MIDIA } },
      },
    },
  });

  if (!pagina) notFound();

  const podeEscrever = podeEditar(usuario, "conteudo") && pagina.editable;
  const [biblioteca, revisoes] = await Promise.all([
    bibliotecaDeImagens(),
    /* As dez últimas bastam para a tela: quem precisa de mais fundo está
       fazendo perícia, e para isso existe a trilha de auditoria. */
    prisma.pageRevision.findMany({
      where: { pageSlug: pagina.slug },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, body: true, origin: true, note: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Páginas", href: "/admin/conteudo/paginas" },
          { rotulo: pagina.title },
        ]}
        titulo={pagina.title}
        descricao={
          <>
            Endereço <span className="label-mono">/{pagina.slug}</span> · última alteração em{" "}
            {formatarDataHora(pagina.updatedAt)}
          </>
        }
        etiqueta={
          pagina.editable ? undefined : (
            <Etiqueta tom="neutro">
              <Lock className="size-3" aria-hidden />
              Travada para edição
            </Etiqueta>
          )
        }
        acoes={
          <>
            <Link
              href={`/${pagina.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              Ver no site
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            {podeEscrever ? (
              <BotaoAcaoConfirmar
                acao={excluirPagina}
                valores={{ slug: pagina.slug }}
                rotulo="Excluir"
                pergunta={`Excluir a página "${pagina.title}"?`}
                detalhe={`O endereço /${pagina.slug} deixa de responder e o texto é perdido. Não dá para desfazer.`}
                rotuloConfirmar="Excluir página"
                icone={<Trash2 className="size-4" aria-hidden />}
                tamanho="sm"
              />
            ) : null}
          </>
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {!pagina.editable ? (
        <Aviso tom="atencao" titulo="Página travada">
          Esta página está marcada como não editável pelo painel. Para liberar, desmarque a
          proteção — é a última opção do formulário — usando um acesso de administrador.
        </Aviso>
      ) : null}

      {podeEditar(usuario, "conteudo") ? (
        <FormularioPagina
          acao={salvarPagina}
          pagina={{
            slug: pagina.slug,
            title: pagina.title,
            eyebrow: pagina.eyebrow ?? "",
            lead: pagina.lead ?? "",
            body: pagina.body,
            videoId: pagina.videoId ?? "",
            seoTitle: pagina.seoTitle ?? "",
            seoDescription: pagina.seoDescription ?? "",
            editable: pagina.editable,
          }}
          capa={pagina.cover}
          biblioteca={biblioteca}
        />
      ) : (
        <section className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
          <h2 className="text-base font-bold text-graf-950">Texto da página</h2>
          <p className="mt-0.5 text-sm text-graf-500">
            Seu acesso ao conteúdo é apenas de consulta.
          </p>
          <HtmlSeguro html={pagina.body} className="mt-4" />
        </section>
      )}

      <section aria-labelledby="galeria-da-pagina">
        <h2 id="galeria-da-pagina" className="text-lg font-bold text-graf-950">
          Galeria
        </h2>
        <p className="mb-4 mt-0.5 text-sm text-graf-500">
          Imagens exibidas no fim da página, na ordem definida aqui.
        </p>

        {podeEscrever ? (
          <GaleriaDaPagina
            slug={pagina.slug}
            imagens={pagina.gallery.map((item) => ({
              id: item.id,
              caption: item.caption ?? "",
              media: item.media,
            }))}
            biblioteca={biblioteca}
            acaoAdicionar={adicionarImagemDaPagina}
            acaoRemover={removerImagemDaPagina}
            acaoMover={moverImagemDaPagina}
          />
        ) : pagina.gallery.length === 0 ? (
          <p className="rounded-xl border border-dashed border-graf-300 bg-graf-50/60 px-4 py-6 text-center text-sm text-graf-500">
            Nenhuma imagem na galeria.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pagina.gallery.map((item) => (
              <li key={item.id} className="rounded-xl border border-graf-200 bg-white p-2">
                {/* miniatura interna, sem otimizador: mistura arquivo local e remoto */}
                <img
                  src={item.media.url}
                  alt={item.media.alt || item.caption || item.media.filename}
                  loading="lazy"
                  className="h-28 w-full rounded-lg object-contain"
                />
                <p className="mt-2 truncate text-[0.8125rem] text-graf-600">
                  {item.caption || item.media.filename}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="versoes-da-pagina">
        <h2 id="versoes-da-pagina" className="text-lg font-bold text-graf-950">
          Histórico de versões
        </h2>
        <p className="mb-4 mt-0.5 text-sm text-graf-500">
          Cada vez que o texto desta página é substituído — por alguém do painel ou por uma
          migração de conteúdo — a versão anterior fica guardada aqui. Restaurar troca só o
          texto: capa, galeria e endereço não mudam.
        </p>

        {revisoes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-graf-300 bg-graf-50/60 px-4 py-6 text-center text-sm text-graf-500">
            Nenhuma versão anterior guardada. A primeira aparece quando o texto for alterado.
          </p>
        ) : (
          <ul className="space-y-3">
            {revisoes.map((revisao) => (
              <li
                key={revisao.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-graf-200 bg-white p-4 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-graf-950">
                    <History className="size-4 shrink-0 text-graf-400" aria-hidden />
                    {formatarDataHora(revisao.createdAt)}
                    <Etiqueta tom={revisao.origin === "manual" ? "neutro" : "marca"}>
                      {revisao.origin === "manual" ? "Painel" : "Migração"}
                    </Etiqueta>
                  </p>
                  <p className="mt-1.5 text-sm text-graf-600">
                    {revisao.note || `Título na época: ${revisao.title}`}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-graf-500">
                    {revisao.body.length.toLocaleString("pt-BR")} caracteres de texto.
                  </p>
                </div>

                {podeEscrever ? (
                  <BotaoAcaoConfirmar
                    acao={restaurarRevisaoDaPagina}
                    valores={{ id: revisao.id }}
                    rotulo="Restaurar"
                    variante="secundario"
                    pergunta="Restaurar esta versão do texto?"
                    detalhe="O texto que está no ar agora vira mais uma versão do histórico, então dá para voltar atrás. Capa, galeria e endereço não mudam."
                    rotuloConfirmar="Restaurar versão"
                    tamanho="sm"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="previa-da-pagina">
        <h2 id="previa-da-pagina" className="text-lg font-bold text-graf-950">
          Prévia do texto salvo
        </h2>
        <p className="mb-4 mt-0.5 text-sm text-graf-500">
          Exatamente o que está gravado agora, depois da limpeza de HTML. Salve para atualizar.
        </p>
        <div className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
          {pagina.body.trim() ? (
            <HtmlSeguro html={pagina.body} />
          ) : (
            <p className="text-sm text-graf-500">
              Esta página ainda não tem texto. Escreva no editor acima e salve.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
