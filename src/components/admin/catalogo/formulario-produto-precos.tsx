"use client";

import { useActionState, useState } from "react";

import { salvarPrecos, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import {
  BarraSalvar,
  Bloco,
  Grade,
  RegiaoEstado,
  Secao,
} from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Marcador } from "@/components/ui/form";
import { calcularParcelas, formatarPreco } from "@/lib/format";

/* ============================================================================
   Aba Preços

   Todo valor é inteiro em centavos, do campo até o banco: o `CampoMoeda`
   entrega centavos e o servidor confere o intervalo de novo. Zero em "preço
   anterior" e em "custo" significa "não informado" — são os dois campos em que
   R$ 0,00 não seria um preço de verdade.

   A prévia do parcelamento usa o mesmo `calcularParcelas` da loja, então o que
   aparece aqui é exatamente o que o cliente vai ler na página do produto.
   ============================================================================ */

export type ProdutoPrecos = {
  id: string;
  priceCents: number;
  compareAtCents: number | null;
  costCents: number | null;
  allowDirectPurchase: boolean;
  allowQuoteRequest: boolean;
};

export function FormularioProdutoPrecos({
  produto,
  somenteLeitura,
}: {
  produto: ProdutoPrecos;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarPrecos, {});

  const [preco, setPreco] = useState(produto.priceCents);
  const [anterior, setAnterior] = useState(produto.compareAtCents ?? 0);
  const [custo, setCusto] = useState(produto.costCents ?? 0);

  const parcelas = calcularParcelas(preco);
  const desconto = anterior > preco && preco > 0 ? Math.round((1 - preco / anterior) * 100) : null;
  const margem = custo > 0 && preco > 0 ? Math.round(((preco - custo) / preco) * 100) : null;

  return (
    <Bloco titulo="Preços" descricao="Valores em reais; o sistema guarda tudo em centavos inteiros.">
      <form action={enviar} className="space-y-8">
        <input type="hidden" name="id" value={produto.id} />
        <input type="hidden" name="priceCents" value={preco} />
        <input type="hidden" name="compareAtCents" value={anterior > 0 ? anterior : ""} />
        <input type="hidden" name="costCents" value={custo > 0 ? custo : ""} />

        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <Secao titulo="Venda">
            <Grade colunas={3}>
              <CampoMoeda
                rotulo="Preço de venda"
                valorCents={preco}
                aoMudar={setPreco}
                erro={estado.campo === "priceCents" ? estado.erro : undefined}
                ajuda="É este que aparece na loja."
              />
              <CampoMoeda
                rotulo="Preço anterior"
                valorCents={anterior}
                aoMudar={setAnterior}
                erro={estado.campo === "compareAtCents" ? estado.erro : undefined}
                ajuda="Riscado ao lado do preço. Deixe zerado para não mostrar desconto."
              />
              <CampoMoeda
                rotulo="Custo interno"
                valorCents={custo}
                aoMudar={setCusto}
                erro={estado.campo === "costCents" ? estado.erro : undefined}
                ajuda="Nunca aparece para o cliente. Serve só para a margem."
              />
            </Grade>

            <dl className="grid gap-3 rounded-lg border border-graf-200 bg-graf-50/60 p-4 sm:grid-cols-3">
              <Resumo rotulo="Parcelamento exibido">
                {parcelas
                  ? `${parcelas.parcelas}x de ${formatarPreco(parcelas.valorCents)} sem juros`
                  : "Nenhum — o valor da parcela ficaria abaixo do mínimo."}
              </Resumo>
              <Resumo rotulo="Desconto mostrado">
                {desconto ? `${desconto}% abaixo do preço anterior` : "Sem desconto"}
              </Resumo>
              <Resumo rotulo="Margem sobre o custo">
                {margem === null ? "Informe o custo para calcular" : `${margem}% do preço de venda`}
              </Resumo>
            </dl>
          </Secao>

          <Secao
            titulo="Como o cliente compra"
            descricao="Pelo menos um dos dois caminhos precisa ficar aberto."
          >
            <div className="space-y-3">
              <Marcador
                name="allowDirectPurchase"
                value="on"
                defaultChecked={produto.allowDirectPurchase}
                rotulo="Permitir compra direta"
                ajuda="Mostra o botão de comprar e deixa o produto entrar no carrinho."
              />
              <Marcador
                name="allowQuoteRequest"
                value="on"
                defaultChecked={produto.allowQuoteRequest}
                rotulo="Permitir pedido de orçamento"
                ajuda="Mostra o botão de falar com a equipe em vez de fechar sozinho."
              />
            </div>
          </Secao>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar ajuda="Salva apenas esta aba.">
            <Botao type="submit" carregando={enviando}>
              Salvar preços
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}

function Resumo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-graf-500">{rotulo}</dt>
      <dd className="mt-1 text-sm font-medium text-graf-800">{children}</dd>
    </div>
  );
}
