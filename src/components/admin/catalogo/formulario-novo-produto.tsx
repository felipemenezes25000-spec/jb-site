"use client";

import { useActionState, useState } from "react";

import { criarProduto, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { CampoNomeESlug } from "@/components/admin/catalogo/campo-slug";
import type { OpcaoSimples } from "@/components/admin/catalogo/formulario-produto-basico";
import { BarraSalvar, Bloco, Grade, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Campo, Selecao } from "@/components/ui/form";

/* ============================================================================
   Novo produto

   O cadastro nasce com o mínimo para existir e já abre na ficha completa, com
   abas. Pedir dez abas antes de salvar a primeira vez é o caminho mais curto
   para perder trabalho quando a aba fecha.

   Seminovo, usado e recondicionado já nascem marcados como peça única no
   servidor — o saldo desses vem das unidades, não de um número digitado.
   ============================================================================ */

export function FormularioNovoProduto({
  categorias,
  marcas,
  sugestaoSku,
}: {
  categorias: OpcaoSimples[];
  marcas: OpcaoSimples[];
  sugestaoSku: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(criarProduto, {});
  const [preco, setPreco] = useState(0);

  return (
    <Bloco
      titulo="Novo produto"
      descricao="Só o essencial agora. Fotos, ficha técnica e adicionais entram na próxima tela."
    >
      <form action={enviar} className="space-y-8">
        <input type="hidden" name="priceCents" value={preco} />
        <RegiaoEstado estado={estado} />

        <CampoNomeESlug
          rotuloNome="Nome do produto"
          prefixoUrl="/loja/"
          autoFocus
          erroNome={estado.campo === "name" ? estado.erro : undefined}
          erroSlug={estado.campo === "slug" ? estado.erro : undefined}
        />

        <Grade>
          <Campo
            rotulo="SKU"
            name="sku"
            defaultValue={sugestaoSku}
            required
            maxLength={60}
            ajuda="Código interno único. Pode ser trocado depois."
            erro={estado.campo === "sku" ? estado.erro : undefined}
          />
          <CampoMoeda
            rotulo="Preço de venda"
            valorCents={preco}
            aoMudar={setPreco}
            erro={estado.campo === "priceCents" ? estado.erro : undefined}
            ajuda="Pode ficar zerado agora e ser definido na aba Preços."
          />
          <Selecao rotulo="Categoria" name="categoryId" defaultValue="">
            <option value="">Sem categoria</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {"— ".repeat(categoria.profundidade ?? 0)}
                {categoria.nome}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Marca" name="brandId" defaultValue="">
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
            defaultValue="novo"
            ajuda="Seminovo, usado e recondicionado nascem como peça única."
          >
            <option value="novo">Novo</option>
            <option value="seminovo">Seminovo</option>
            <option value="usado">Usado</option>
            <option value="recondicionado">Recondicionado</option>
          </Selecao>
          <Selecao
            rotulo="Situação"
            name="status"
            defaultValue="draft"
            ajuda="Rascunho não aparece na loja."
          >
            <option value="draft">Rascunho</option>
            <option value="active">Publicado</option>
          </Selecao>
        </Grade>

        <BarraSalvar>
          <LinkBotao href="/admin/produtos" variante="secundario">
            Cancelar
          </LinkBotao>
          <Botao type="submit" carregando={enviando}>
            Criar e continuar
          </Botao>
        </BarraSalvar>
      </form>
    </Bloco>
  );
}
