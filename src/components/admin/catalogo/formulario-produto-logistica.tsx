"use client";

import { useActionState } from "react";
import { PackageCheck, TestTube2 } from "lucide-react";

import {
  salvarDimensoesProduto,
  testarCotacaoProduto,
  type EstadoLogistica,
} from "@/app/acoes/logistica";
import { BarraSalvar, Bloco, Grade, RegiaoEstado, Secao } from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";
import { formatarPreco } from "@/lib/format";

const INICIAL: EstadoLogistica = {};

export function FormularioProdutoLogistica({
  produto,
  somenteLeitura,
}: {
  produto: {
    id: string;
    name: string;
    priceCents: number;
    weightGrams: number | null;
    widthMm: number | null;
    heightMm: number | null;
    depthMm: number | null;
  };
  somenteLeitura?: boolean;
}) {
  const [estado, salvar, salvando] = useActionState(salvarDimensoesProduto, INICIAL);
  const [teste, testar, testando] = useActionState(testarCotacaoProduto, INICIAL);

  return (
    <div className="space-y-6">
      <Bloco
        titulo="Logística do produto"
        descricao="Peso e dimensões usados na cotação real e na geração de frete. Preencha a embalagem pronta para despacho."
      >
        <form action={salvar} className="space-y-7">
          <input type="hidden" name="productId" value={produto.id} />
          <RegiaoEstado estado={estado} />

          <fieldset disabled={somenteLeitura}>
            <Secao
              titulo="Embalagem de transporte"
              descricao="Não estime pela descrição. Meça a caixa fechada com proteção interna e informe o peso total embalado."
            >
              <Grade>
                <Campo
                  rotulo="Peso embalado (g)"
                  name="weightGrams"
                  type="number"
                  min={1}
                  max={1000000}
                  inputMode="numeric"
                  required
                  defaultValue={produto.weightGrams ?? ""}
                  ajuda="Ex.: 18,5 kg = 18500 g."
                />
                <Campo
                  rotulo="Largura (mm)"
                  name="widthMm"
                  type="number"
                  min={1}
                  max={5000}
                  inputMode="numeric"
                  required
                  defaultValue={produto.widthMm ?? ""}
                />
                <Campo
                  rotulo="Altura (mm)"
                  name="heightMm"
                  type="number"
                  min={1}
                  max={5000}
                  inputMode="numeric"
                  required
                  defaultValue={produto.heightMm ?? ""}
                />
                <Campo
                  rotulo="Comprimento (mm)"
                  name="depthMm"
                  type="number"
                  min={1}
                  max={5000}
                  inputMode="numeric"
                  required
                  defaultValue={produto.depthMm ?? ""}
                />
              </Grade>
            </Secao>
          </fieldset>

          {!somenteLeitura ? (
            <BarraSalvar ajuda="O próximo cálculo de frete já usa os valores salvos.">
              <Botao type="submit" carregando={salvando}>Salvar logística</Botao>
            </BarraSalvar>
          ) : null}
        </form>
      </Bloco>

      <Bloco titulo="Teste de cotação" descricao="Confere este produto diretamente no Melhor Envio sem criar pedido.">
        <form action={testar} className="space-y-5">
          <input type="hidden" name="productId" value={produto.id} />
          <div className="flex items-end gap-3">
            <div className="max-w-56 flex-1">
              <Campo rotulo="CEP destino" name="cep" inputMode="numeric" placeholder="00000-000" required />
            </div>
            <Botao type="submit" variante="secundario" carregando={testando}>
              <TestTube2 className="size-4" aria-hidden /> Testar
            </Botao>
          </div>

          {teste.erro ? (
            <div className="rounded-xl bg-warn-50 p-4 text-sm text-warn-800">{teste.erro}</div>
          ) : null}
          {teste.opcoes?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teste.opcoes.map((opcao) => (
                <div key={opcao.serviceId} className="rounded-xl border border-graf-200 bg-white p-4">
                  <PackageCheck className="size-4 text-jb-700" aria-hidden />
                  <p className="mt-2 font-bold text-graf-950">{opcao.companyName}</p>
                  <p className="text-sm text-graf-600">{opcao.serviceName}</p>
                  <p className="mt-3 font-extrabold tabular text-graf-950">{formatarPreco(opcao.priceCents)}</p>
                  {opcao.deliveryDays ? <p className="text-xs text-graf-500">até {opcao.deliveryDays} dias úteis</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </form>
      </Bloco>
    </div>
  );
}
