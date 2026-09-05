"use client";

import { useActionState, useState } from "react";

import { salvarCategoria, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { CampoNomeESlug } from "@/components/admin/catalogo/campo-slug";
import { BarraSalvar, Bloco, Grade, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";
import { ICONES_DISPONIVEIS, IconeCategoria } from "@/components/ui/icone";
import { cn } from "@/lib/utils";

/* ============================================================================
   Categoria

   O mesmo formulário cria e edita: com `categoria`, é edição; sem, é criação.
   A lista de pais já chega filtrada pelo servidor, sem a própria categoria nem
   as descendentes dela — e o servidor confere de novo antes de gravar, porque
   um `<select>` alterado no navegador não é obstáculo nenhum.
   ============================================================================ */

export type CategoriaEditavel = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  icon: string | null;
  order: number;
  published: boolean;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type PaiPossivel = { id: string; nome: string; profundidade: number };

export function FormularioCategoria({
  categoria,
  paisPossiveis,
  ordemSugerida,
  somenteLeitura,
}: {
  categoria?: CategoriaEditavel;
  paisPossiveis: PaiPossivel[];
  ordemSugerida?: number;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarCategoria, {});
  const [icone, setIcone] = useState(categoria?.icon ?? "");

  return (
    <Bloco
      titulo={categoria ? "Editar categoria" : "Nova categoria"}
      descricao="Categoria organiza a loja e a busca. Subcategoria é filha de outra."
    >
      <form action={enviar} className="space-y-8">
        {categoria ? <input type="hidden" name="id" value={categoria.id} /> : null}
        <input type="hidden" name="icon" value={icone} />
        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <CampoNomeESlug
            nomeInicial={categoria?.name}
            slugInicial={categoria?.slug}
            rotuloNome="Nome da categoria"
            prefixoUrl="/categoria/"
            autoFocus={!categoria}
            erroNome={estado.campo === "name" ? estado.erro : undefined}
            erroSlug={estado.campo === "slug" ? estado.erro : undefined}
          />

          <Grade>
            <Selecao
              rotulo="Categoria mãe"
              name="parentId"
              defaultValue={categoria?.parentId ?? ""}
              erro={estado.campo === "parentId" ? estado.erro : undefined}
              ajuda="Vazio deixa a categoria no primeiro nível."
            >
              <option value="">Nenhuma — categoria principal</option>
              {paisPossiveis.map((pai) => (
                <option key={pai.id} value={pai.id}>
                  {"— ".repeat(pai.profundidade)}
                  {pai.nome}
                </option>
              ))}
            </Selecao>
            <Campo
              rotulo="Ordem"
              name="order"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              defaultValue={categoria?.order ?? ordemSugerida ?? 0}
              ajuda="Menor aparece antes. Também dá para mover pelas setas na lista."
            />
          </Grade>

          <Area
            rotulo="Descrição"
            name="description"
            defaultValue={categoria?.description ?? ""}
            rows={3}
            maxLength={600}
            ajuda="Texto de apoio no topo da página da categoria."
          />

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-graf-800">Ícone</legend>
            <div className="flex flex-wrap gap-2">
              <BotaoIcone nome="" atual={icone} aoEscolher={setIcone} rotulo="Sem ícone" />
              {ICONES_DISPONIVEIS.map((nome) => (
                <BotaoIcone key={nome} nome={nome} atual={icone} aoEscolher={setIcone} rotulo={nome} />
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <Marcador
              name="published"
              value="on"
              defaultChecked={categoria?.published ?? true}
              rotulo="Publicada"
              ajuda="Despublicada, some do menu e da loja — os produtos dela continuam existindo."
            />
            <Marcador
              name="featured"
              value="on"
              defaultChecked={categoria?.featured ?? false}
              rotulo="Em destaque"
              ajuda="Aparece no bloco de categorias da página inicial."
            />
          </div>

          <Grade>
            <Campo
              rotulo="Título para busca"
              name="seoTitle"
              defaultValue={categoria?.seoTitle ?? ""}
              maxLength={70}
              ajuda="Em branco, usa o nome da categoria."
            />
            <Campo
              rotulo="Descrição para busca"
              name="seoDescription"
              defaultValue={categoria?.seoDescription ?? ""}
              maxLength={180}
              ajuda="Em branco, usa a descrição acima."
            />
          </Grade>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar>
            <LinkBotao href="/admin/categorias" variante="secundario">
              Voltar para a lista
            </LinkBotao>
            <Botao type="submit" carregando={enviando}>
              {categoria ? "Salvar categoria" : "Criar categoria"}
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}

function BotaoIcone({
  nome,
  atual,
  rotulo,
  aoEscolher,
}: {
  nome: string;
  atual: string;
  rotulo: string;
  aoEscolher: (nome: string) => void;
}) {
  const ativo = nome === atual;
  return (
    <button
      type="button"
      onClick={() => aoEscolher(nome)}
      aria-pressed={ativo}
      title={rotulo}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-lg border transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        ativo
          ? "border-jb-500 bg-jb-50 text-jb-700 ring-2 ring-inset ring-jb-500/30"
          : "border-graf-300 bg-white text-graf-500 hover:border-graf-400 hover:text-graf-700",
      )}
    >
      {nome ? (
        <IconeCategoria nome={nome} className="size-5" />
      ) : (
        <span className="text-xs font-semibold">sem</span>
      )}
      <span className="sr-only">{rotulo}</span>
    </button>
  );
}
