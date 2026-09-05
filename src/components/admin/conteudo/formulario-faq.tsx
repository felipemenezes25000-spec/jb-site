"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import {
  GRUPOS_FAQ,
  ROTULO_GRUPO_FAQ,
  type GrupoFaq,
} from "@/components/admin/conteudo/rotulos";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Formulário de uma pergunta frequente

   O grupo decide onde a pergunta aparece: `geral` vai para a home e para a
   página de dúvidas; `produto` fica na ficha de um produto específico — e por
   isso, nesse grupo, escolher o produto é obrigatório.
   ============================================================================ */

export type DadosDaFaq = {
  id: string;
  question: string;
  answer: string;
  group: string;
  productId: string;
  published: boolean;
};

export type ProdutoDaLista = { id: string; name: string; sku: string };

const VAZIO: EstadoAcao = {};

export function FormularioFaq({
  acao,
  faq,
  produtos,
  grupoSugerido,
}: {
  acao: AcaoDeFormulario;
  faq?: DadosDaFaq;
  produtos: ProdutoDaLista[];
  grupoSugerido?: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !faq;

  const inicial = (faq?.group ?? grupoSugerido ?? "geral") as GrupoFaq;
  const [grupo, setGrupo] = useState<GrupoFaq>(
    GRUPOS_FAQ.includes(inicial) ? inicial : "geral",
  );

  return (
    <form action={executar} className="space-y-5">
      <input type="hidden" name="id" value={faq?.id ?? ""} />

      <MensagemDoFormulario estado={estado} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Bloco titulo="Pergunta e resposta">
          <Campo
            rotulo="Pergunta"
            name="question"
            required
            maxLength={240}
            defaultValue={faq?.question ?? ""}
            erro={erroDoCampo(estado, "question")}
            ajuda="Escreva do jeito que o cliente perguntaria."
            autoComplete="off"
          />
          <Area
            rotulo="Resposta"
            name="answer"
            required
            rows={8}
            maxLength={4000}
            defaultValue={faq?.answer ?? ""}
            erro={erroDoCampo(estado, "answer")}
            ajuda="Texto simples. Seja direto: a resposta aparece dentro de um acordeão."
          />
        </Bloco>

        <div className="space-y-5">
          <Bloco titulo="Onde aparece">
            <Selecao
              rotulo="Grupo"
              name="group"
              required
              value={grupo}
              onChange={(evento) => setGrupo(evento.target.value as GrupoFaq)}
              erro={erroDoCampo(estado, "group")}
            >
              {GRUPOS_FAQ.map((chave) => (
                <option key={chave} value={chave}>
                  {ROTULO_GRUPO_FAQ[chave]}
                </option>
              ))}
            </Selecao>

            {grupo === "produto" ? (
              <Selecao
                rotulo="Produto"
                name="productId"
                required
                defaultValue={faq?.productId ?? ""}
                erro={erroDoCampo(estado, "productId")}
                ajuda="A pergunta aparece apenas na ficha deste produto."
              >
                <option value="">Escolha o produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.name} · {produto.sku}
                  </option>
                ))}
              </Selecao>
            ) : (
              <input type="hidden" name="productId" value="" />
            )}
          </Bloco>

          <Bloco titulo="Publicação">
            <Marcador
              rotulo="Pergunta publicada"
              name="published"
              defaultChecked={faq ? faq.published : true}
              ajuda="Despublicada, ela some do site mas continua salva aqui."
            />
          </Bloco>
        </div>
      </div>

      <BarraDeSalvar aviso="A ordem dentro do grupo é definida na listagem.">
        <Botao type="submit" carregando={pendente}>
          <Save className="size-4" aria-hidden />
          {criando ? "Criar pergunta" : "Salvar alterações"}
        </Botao>
      </BarraDeSalvar>
    </form>
  );
}
