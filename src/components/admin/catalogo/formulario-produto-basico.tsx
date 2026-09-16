"use client";

import { useActionState } from "react";

import { salvarBasico, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { CampoNomeESlug } from "@/components/admin/catalogo/campo-slug";
import {
  BarraSalvar,
  Bloco,
  Grade,
  RegiaoEstado,
  Secao,
} from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Aba Básico

   Cada aba do produto é um formulário próprio, com a sua própria server
   action. Salvar aqui não encosta em preço, estoque ou ficha técnica — quem
   estiver com a aba Especificações preenchida e clicar em salvar nesta não
   perde nada do outro lado.
   ============================================================================ */

export type OpcaoSimples = { id: string; nome: string; profundidade?: number };

export type ProdutoBasico = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  model: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;
  brandId: string | null;
  condition: string;
  status: string;
  featured: boolean;
};

const CONDICOES: { valor: string; rotulo: string }[] = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "seminovo", rotulo: "Seminovo" },
  { valor: "usado", rotulo: "Usado" },
  { valor: "recondicionado", rotulo: "Recondicionado" },
];

const STATUS: { valor: string; rotulo: string; ajuda: string }[] = [
  { valor: "draft", rotulo: "Rascunho", ajuda: "Só a equipe vê" },
  { valor: "active", rotulo: "Publicado", ajuda: "Aparece na loja" },
  { valor: "archived", rotulo: "Arquivado", ajuda: "Fora da loja, histórico preservado" },
];

export function FormularioProdutoBasico({
  produto,
  categorias,
  marcas,
  somenteLeitura,
}: {
  produto: ProdutoBasico;
  categorias: OpcaoSimples[];
  marcas: OpcaoSimples[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarBasico, {});

  return (
    <Bloco titulo="Identificação" descricao="Como o produto é encontrado, dentro e fora do painel.">
      <form action={enviar} className="space-y-8">
        <input type="hidden" name="id" value={produto.id} />
        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <Secao titulo="Nome e endereço">
            <CampoNomeESlug
              nomeInicial={produto.name}
              slugInicial={produto.slug}
              rotuloNome="Nome do produto"
              prefixoUrl="/loja/"
              erroNome={estado.campo === "name" ? estado.erro : undefined}
              erroSlug={estado.campo === "slug" ? estado.erro : undefined}
            />
          </Secao>

          <Secao titulo="Classificação">
            <Grade>
              <Campo
                rotulo="SKU"
                name="sku"
                defaultValue={produto.sku}
                required
                maxLength={60}
                ajuda="Código interno. Precisa ser único."
                erro={estado.campo === "sku" ? estado.erro : undefined}
              />
              <Campo
                rotulo="Modelo"
                name="model"
                defaultValue={produto.model}
                maxLength={120}
                ajuda="Como o fabricante chama, se houver."
              />
              <Selecao rotulo="Categoria" name="categoryId" defaultValue={produto.categoryId ?? ""}>
                <option value="">Sem categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {"— ".repeat(categoria.profundidade ?? 0)}
                    {categoria.nome}
                  </option>
                ))}
              </Selecao>
              <Selecao rotulo="Marca" name="brandId" defaultValue={produto.brandId ?? ""}>
                <option value="">Sem marca</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nome}
                  </option>
                ))}
              </Selecao>
              <Selecao
                rotulo="Condição"
                name="condition"
                defaultValue={produto.condition}
                ajuda="Seminovo, usado e recondicionado costumam ser peça única."
              >
                {CONDICOES.map((condicao) => (
                  <option key={condicao.valor} value={condicao.valor}>
                    {condicao.rotulo}
                  </option>
                ))}
              </Selecao>
              <Selecao rotulo="Situação" name="status" defaultValue={produto.status}>
                {STATUS.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo} — {item.ajuda}
                  </option>
                ))}
              </Selecao>
            </Grade>

            <Marcador
              name="featured"
              value="on"
              defaultChecked={produto.featured}
              rotulo="Produto em destaque"
              ajuda="Aparece na vitrine da página inicial e sobe no ordenamento padrão."
            />
          </Secao>

          <Secao
            titulo="Textos"
            descricao="O resumo é o que aparece no card da vitrine e nos resultados de busca."
          >
            <Campo
              rotulo="Resumo"
              name="shortDescription"
              defaultValue={produto.shortDescription}
              maxLength={280}
              ajuda="Uma frase. Até 280 caracteres."
            />
            <Area
              rotulo="Descrição completa"
              name="description"
              defaultValue={produto.description}
              rows={10}
              maxLength={20000}
              ajuda="Aceita HTML simples. Quebra de linha vira parágrafo na loja."
            />
          </Secao>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar ajuda="Salva apenas esta aba.">
            <Botao type="submit" carregando={enviando}>
              Salvar dados básicos
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
