"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";

import { EditorRico } from "@/components/admin/conteudo/editor-rico";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { SeletorDeMidia, type MidiaResumo } from "@/components/admin/conteudo/seletor-midia";
import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador } from "@/components/ui/form";
import { gerarSlug } from "@/lib/format";

/* ============================================================================
   Formulário de uma página do site

   O slug é o endereço público: `/sobre` sai de `slug: "sobre"`. Ao criar, ele
   acompanha o título automaticamente; ao editar, nunca — mudar o endereço de
   uma página que já está no ar quebra links, então é uma decisão consciente.

   `Page` não tem coluna de publicação no schema. Não existe rascunho: o que
   existe é o cadeado `editable`, que protege páginas de sistema contra edição
   pelo painel. O texto na tela diz isso com todas as letras, em vez de mostrar
   um botão "publicar" que não publicaria nada.
   ============================================================================ */

export type DadosDaPagina = {
  slug: string;
  title: string;
  eyebrow: string;
  lead: string;
  body: string;
  videoId: string;
  seoTitle: string;
  seoDescription: string;
  editable: boolean;
};

const VAZIO: EstadoAcao = {};

export function FormularioPagina({
  acao,
  pagina,
  capa,
  biblioteca,
}: {
  acao: AcaoDeFormulario;
  /** Ausente ao criar uma página nova. */
  pagina?: DadosDaPagina;
  capa: MidiaResumo | null;
  biblioteca: MidiaResumo[];
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !pagina;

  const [titulo, setTitulo] = useState(pagina?.title ?? "");
  const [slug, setSlug] = useState(pagina?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(pagina));
  const [descricaoSeo, setDescricaoSeo] = useState(pagina?.seoDescription ?? "");

  function aoMudarTitulo(valor: string) {
    setTitulo(valor);
    if (!slugManual) setSlug(gerarSlug(valor));
  }

  return (
    <form action={executar} className="space-y-5">
      <input type="hidden" name="slugOriginal" value={pagina?.slug ?? ""} />

      <MensagemDoFormulario estado={estado} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <Bloco titulo="Conteúdo" descricao="O que a pessoa lê ao abrir a página.">
            <Campo
              rotulo="Título"
              name="title"
              required
              maxLength={160}
              value={titulo}
              onChange={(evento) => aoMudarTitulo(evento.target.value)}
              erro={erroDoCampo(estado, "title")}
              autoComplete="off"
            />

            <Campo
              rotulo="Chapéu"
              name="eyebrow"
              maxLength={80}
              defaultValue={pagina?.eyebrow ?? ""}
              erro={erroDoCampo(estado, "eyebrow")}
              ajuda="Texto curto acima do título. Ex.: Institucional."
              autoComplete="off"
            />

            <Area
              rotulo="Chamada"
              name="lead"
              rows={3}
              maxLength={400}
              defaultValue={pagina?.lead ?? ""}
              erro={erroDoCampo(estado, "lead")}
              ajuda="Uma ou duas frases de abertura, em destaque antes do texto."
            />

            <EditorRico
              nome="body"
              rotulo="Texto da página"
              valorInicial={pagina?.body ?? ""}
              erro={erroDoCampo(estado, "body")}
            />
          </Bloco>

          <Bloco
            titulo="Busca e compartilhamento"
            descricao="Como a página aparece no Google e ao ser compartilhada. Vazio usa o título e a chamada."
          >
            <Campo
              rotulo="Título para busca"
              name="seoTitle"
              maxLength={70}
              defaultValue={pagina?.seoTitle ?? ""}
              erro={erroDoCampo(estado, "seoTitle")}
              ajuda="Até 70 caracteres."
              autoComplete="off"
            />
            <Area
              rotulo="Descrição para busca"
              name="seoDescription"
              rows={3}
              maxLength={180}
              value={descricaoSeo}
              onChange={(evento) => setDescricaoSeo(evento.target.value)}
              erro={erroDoCampo(estado, "seoDescription")}
              ajuda={`${descricaoSeo.length} de 180 caracteres.`}
            />
          </Bloco>
        </div>

        <div className="space-y-5">
          <Bloco titulo="Endereço" descricao="Onde a página responde no site.">
            <Campo
              rotulo="Endereço (slug)"
              name="slug"
              required
              maxLength={80}
              prefixo="/"
              value={slug}
              onChange={(evento) => {
                setSlugManual(true);
                setSlug(evento.target.value);
              }}
              onBlur={(evento) => setSlug(gerarSlug(evento.target.value))}
              erro={erroDoCampo(estado, "slug")}
              ajuda={
                criando
                  ? "Preenchido a partir do título. Só letras minúsculas, números e hífen."
                  : "Mudar o endereço quebra links antigos que apontam para esta página."
              }
              autoComplete="off"
            />

            {pagina ? (
              <p className="text-sm">
                <Link
                  href={`/${pagina.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 font-medium text-jb-700 underline underline-offset-2 hover:text-jb-800"
                >
                  Ver a página no site
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </p>
            ) : null}
          </Bloco>

          <Bloco
            titulo="Imagem de capa"
            descricao="Aparece no topo da página e ao compartilhar o link."
          >
            <SeletorDeMidia
              nome="coverId"
              rotulo="Capa"
              biblioteca={biblioteca}
              valorInicial={capa}
              erro={erroDoCampo(estado, "coverId")}
              ajuda="Formato deitado funciona melhor. Ideal a partir de 1200 px de largura."
            />
          </Bloco>

          <Bloco titulo="Vídeo" descricao="Opcional, exibido depois da chamada.">
            <Campo
              rotulo="Código do vídeo no YouTube"
              name="videoId"
              maxLength={40}
              defaultValue={pagina?.videoId ?? ""}
              erro={erroDoCampo(estado, "videoId")}
              ajuda="Só o código: em youtube.com/watch?v=AbC123, informe AbC123."
              autoComplete="off"
            />
          </Bloco>

          <Bloco
            titulo="Proteção"
            descricao="Toda página cadastrada fica no ar — o site não tem rascunho de página."
          >
            <Marcador
              rotulo="Permitir edição por este painel"
              name="editable"
              defaultChecked={pagina ? pagina.editable : true}
              ajuda="Desmarque para travar páginas de sistema. Página travada não pode ser editada nem excluída aqui."
            />
          </Bloco>
        </div>
      </div>

      <BarraDeSalvar
        aviso={
          criando
            ? "A página fica disponível no site assim que for criada."
            : "As alterações valem no site logo depois de salvar."
        }
      >
        <Botao type="submit" carregando={pendente}>
          <Save className="size-4" aria-hidden />
          {criando ? "Criar página" : "Salvar alterações"}
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}
