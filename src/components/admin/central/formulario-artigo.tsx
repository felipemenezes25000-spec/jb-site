"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import { EditorRico } from "@/components/admin/conteudo/editor-rico";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { SeletorDeMidia, type MidiaResumo } from "@/components/admin/conteudo/seletor-midia";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Selecao } from "@/components/ui/form";
import { ROTULO_TEMA, type TemaDoArtigo } from "@/lib/central-tecnica";
import { gerarSlug } from "@/lib/format";

/* ============================================================================
   Formulário de um artigo da Central Técnica

   Dois campos deste formulário não são campos comuns: autor e revisor. Eles
   são listas fechadas de gente que existe no sistema, e não texto livre —
   porque texto livre num campo de assinatura técnica é o caminho mais curto
   para "revisado pelo Dr. Fulano", que ninguém precisa ser.

   A data da revisão NÃO está aqui. Ela é registrada por uma ação própria,
   que só o revisor indicado pode executar. Um campo de data neste formulário
   permitiria a qualquer editor carimbar a conferência de outra pessoa.
   ============================================================================ */

export type PessoaDaEquipe = { id: string; name: string; role: string };

export type DadosDoArtigo = {
  id: string;
  title: string;
  slug: string;
  lead: string;
  body: string;
  topic: TemaDoArtigo;
  appliesTo: string[];
  pendingNote: string;
  seoTitle: string;
  seoDescription: string;
  authorId: string;
  reviewerId: string;
};

const TEMAS: TemaDoArtigo[] = ["autoclave", "compressor", "vacuo", "compra", "operacao"];

const VAZIO: EstadoAcao = {};

export function FormularioArtigo({
  acao,
  artigo,
  equipe,
  capa,
  biblioteca,
  somenteLeitura,
}: {
  acao: AcaoDeFormulario;
  /** Ausente ao criar. */
  artigo?: DadosDoArtigo;
  equipe: PessoaDaEquipe[];
  capa: MidiaResumo | null;
  biblioteca: MidiaResumo[];
  somenteLeitura?: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !artigo;

  const [titulo, setTitulo] = useState(artigo?.title ?? "");
  const [slug, setSlug] = useState(artigo?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(artigo));
  /* Controlado pelo mesmo motivo do formulário de página: o editor rico
     re-renderiza o formulário ao montar, e campo não-controlado volta ao
     padrão levando junto o que a pessoa já tinha digitado. */
  const [chamada, setChamada] = useState(artigo?.lead ?? "");

  const [autor, setAutor] = useState(artigo?.authorId ?? "");
  const [revisor, setRevisor] = useState(artigo?.reviewerId ?? "");
  const mesmaPessoa = Boolean(autor) && autor === revisor;

  function aoMudarTitulo(valor: string) {
    setTitulo(valor);
    if (!slugManual) setSlug(gerarSlug(valor));
  }

  return (
    <form action={executar} className="space-y-5">
      <MensagemDoFormulario estado={estado} />
      {artigo ? <input type="hidden" name="id" value={artigo.id} /> : null}

      <fieldset disabled={somenteLeitura} className="space-y-5">
        <Bloco titulo="O texto">
          <Campo
            rotulo="Título"
            name="title"
            value={titulo}
            onChange={(evento) => aoMudarTitulo(evento.target.value)}
            maxLength={160}
            required
            erro={erroDoCampo(estado, "title")}
          />

          <Campo
            rotulo="Endereço"
            name="slug"
            value={slug}
            onChange={(evento) => {
              setSlugManual(true);
              setSlug(evento.target.value);
            }}
            maxLength={80}
            erro={erroDoCampo(estado, "slug")}
            ajuda={
              criando
                ? "Acompanha o título até você mexer. Fica /central-tecnica/<endereço>."
                : "Mudar o endereço de um texto que já circulou quebra os links dele."
            }
          />

          <Area
            rotulo="Chamada"
            name="lead"
            rows={2}
            maxLength={300}
            value={chamada}
            onChange={(evento) => setChamada(evento.target.value)}
            ajuda="Uma ou duas frases. Aparece na listagem e no compartilhamento."
          />

          <Selecao
            rotulo="Tema"
            name="topic"
            defaultValue={artigo?.topic ?? "operacao"}
            ajuda="Organiza o filtro da Central e sugere os textos relacionados."
          >
            {TEMAS.map((chave) => (
              <option key={chave} value={chave}>
                {ROTULO_TEMA[chave]}
              </option>
            ))}
          </Selecao>

          <EditorRico
            nome="body"
            rotulo="Corpo do artigo"
            valorInicial={artigo?.body ?? ""}
            ajuda="O que observar, quando parar de usar e o que depende de diagnóstico técnico."
            className="sm:col-span-2"
          />
        </Bloco>

        <Bloco
          titulo="Assinatura técnica"
          descricao="Sem autor e sem revisor o artigo não é publicado. Os dois saem da equipe cadastrada — não há campo de texto livre aqui, de propósito."
        >
          <Selecao
            rotulo="Autor"
            name="authorId"
            value={autor}
            onChange={(evento) => setAutor(evento.target.value)}
            ajuda="Quem escreveu e assina o conteúdo."
          >
            <option value="">Ainda não definido</option>
            {equipe.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.name}
              </option>
            ))}
          </Selecao>

          <Selecao
            rotulo="Revisor técnico"
            name="reviewerId"
            value={revisor}
            onChange={(evento) => setRevisor(evento.target.value)}
            erro={
              mesmaPessoa
                ? "Autor e revisor precisam ser pessoas diferentes."
                : undefined
            }
            ajuda="Quem confere antes de ir ao ar. A data da revisão é registrada por esta pessoa, na tela do artigo."
          >
            <option value="">Ainda não definido</option>
            {equipe.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.name}
              </option>
            ))}
          </Selecao>

          <Area
            rotulo="A que marcas e modelos se aplica"
            name="appliesTo"
            rows={3}
            defaultValue={(artigo?.appliesTo ?? []).join("\n")}
            className="sm:col-span-2"
            ajuda="Um por linha. Vazio faz a página avisar que a aplicabilidade não foi declarada — nunca que vale para todos."
            placeholder={"Cristófoli Vitale Class 21\nStermax Box 12"}
          />

          <Area
            rotulo="O que falta para publicar"
            name="pendingNote"
            rows={2}
            maxLength={600}
            defaultValue={artigo?.pendingNote ?? ""}
            className="sm:col-span-2"
            ajuda="Nota interna da redação. Nunca aparece no site."
          />
        </Bloco>

        <Bloco titulo="Imagem e busca">
          <SeletorDeMidia
            nome="coverId"
            rotulo="Imagem de capa"
            valorInicial={capa}
            biblioteca={biblioteca}
            ajuda="Foto real da bancada ou do equipamento. Sem imagem, o cartão aparece só com texto."
          />

          <Campo
            rotulo="Título para busca"
            name="seoTitle"
            defaultValue={artigo?.seoTitle ?? ""}
            maxLength={70}
            ajuda="Vazio usa o título do artigo."
          />

          <Area
            rotulo="Descrição para busca"
            name="seoDescription"
            rows={2}
            maxLength={180}
            defaultValue={artigo?.seoDescription ?? ""}
            ajuda="Vazio usa a chamada."
          />
        </Bloco>
      </fieldset>

      {!somenteLeitura ? (
        <BarraDeSalvar aviso="Salvar não publica. A publicação tem botão próprio e confere a assinatura.">
          <Botao type="submit" carregando={pendente}>
            <Save className="size-4" aria-hidden />
            {criando ? "Criar rascunho" : "Salvar"}
          </Botao>
        </BarraDeSalvar>
      ) : null}
    </form>
  );
}
