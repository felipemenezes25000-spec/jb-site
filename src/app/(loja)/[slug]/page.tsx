import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileQuestion } from "lucide-react";

import { FaixaDeContato } from "@/components/institucional/canais";
import { MolduraInstitucional } from "@/components/institucional/moldura";
import {
  CapaCms,
  CorpoCms,
  GaleriaCms,
  VideoCms,
  carregarPaginaCms,
  temTexto,
} from "@/components/institucional/pagina-cms";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/* ============================================================================
   Páginas do CMS (modelo Page)

   Esta é a última rota a casar em toda a raiz do site, e é assim de
   propósito. No App Router, segmento estático sempre vence segmento
   dinâmico: /sobre, /contato, /faq, /entrega, /carrinho, /entrar e tudo o
   mais que tiver pasta própria continua sendo servido pela rota fixa, mesmo
   existindo registro em `Page` com o mesmo slug. O que chega aqui é o que
   ninguém mais atende — uma página criada pela JB no painel — e, não
   existindo registro, vira 404 de verdade via `notFound()`.

   Só um segmento: /alguma-coisa. Caminhos com barra (/loja/x) nunca caem
   aqui.
   ============================================================================ */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await carregarPaginaCms(slug);

  if (!pagina) return metadataDePagina({ titulo: "Página não encontrada", noIndex: true });

  return metadataDePagina({
    titulo: pagina.seoTitle || pagina.title,
    descricao: pagina.seoDescription || pagina.lead,
    caminho: `/${pagina.slug}`,
    imagem: pagina.cover?.url ?? null,
    tipo: "article",
  });
}

export default async function PaginaDoCms({ params }: Props) {
  const { slug } = await params;
  const [pagina, s] = await Promise.all([carregarPaginaCms(slug), getSettings()]);

  if (!pagina) notFound();

  const caminho = `/${pagina.slug}`;
  const temCorpo = temTexto(pagina.body);
  const temGaleria = pagina.gallery.length > 0;

  return (
    <>
      <JsonLd
        dados={trilhaJsonLd([
          { rotulo: "Início", href: "/" },
          { rotulo: pagina.title, href: caminho },
        ])}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: pagina.title }]}
        sobretitulo={pagina.eyebrow}
        titulo={pagina.title}
        resumo={pagina.lead}
        atualizadoEm={pagina.updatedAt}
      >
        <div className="space-y-12">
          <CapaCms imagem={pagina.cover} />

          {temCorpo ? (
            <div className="max-w-3xl">
              <CorpoCms html={pagina.body} />
            </div>
          ) : null}

          <VideoCms videoId={pagina.videoId} titulo={pagina.title} />

          {temGaleria ? <GaleriaCms imagens={pagina.gallery} /> : null}

          {!temCorpo && !temGaleria && !pagina.cover && !pagina.lead ? (
            <Vazio
              icone={FileQuestion}
              titulo="Esta página ainda não tem conteúdo"
              descricao="O texto está sendo preparado pela equipe da JB. Enquanto isso, veja o catálogo ou fale direto com a gente."
              acao={
                <div className="flex flex-wrap justify-center gap-3">
                  <LinkBotao href="/loja">Ver catálogo</LinkBotao>
                  <LinkBotao href="/contato" variante="secundario">
                    Falar com a JB
                  </LinkBotao>
                </div>
              }
            />
          ) : null}

          <FaixaDeContato s={s} />
        </div>
      </MolduraInstitucional>
    </>
  );
}
