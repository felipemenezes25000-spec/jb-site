"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Boxes, TriangleAlert } from "lucide-react";

import { salvarEstoqueProduto, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import {
  BarraSalvar,
  Bloco,
  Grade,
  RegiaoEstado,
  Secao,
} from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { Campo, Marcador } from "@/components/ui/form";
import { plural } from "@/lib/format";

/* ============================================================================
   Aba Estoque do produto

   Mudar o número aqui não é digitar por cima do saldo: a diferença vira um
   movimento de ajuste com motivo e autor. Por isso o campo de motivo só
   aparece — e só é exigido — quando o número realmente muda.

   Entrada e saída do dia a dia moram na tela de Estoque, que tem o histórico
   ao lado. Esta aba é para acertar o cadastro.
   ============================================================================ */

export type ProdutoEstoque = {
  id: string;
  trackInventory: boolean;
  unique: boolean;
  stock: number;
  lowStockAlert: number;
  unidades: number;
};

export function FormularioProdutoEstoque({
  produto,
  somenteLeitura,
}: {
  produto: ProdutoEstoque;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(
    salvarEstoqueProduto,
    {},
  );

  const [controlar, setControlar] = useState(produto.trackInventory);
  const [saldo, setSaldo] = useState(String(produto.stock));

  const numero = Number(saldo);
  const mudou = Number.isFinite(numero) && numero !== produto.stock;
  const diferenca = mudou ? numero - produto.stock : 0;

  return (
    <Bloco titulo="Estoque" descricao="Saldo, alerta e o tipo de controle deste produto.">
      <form action={enviar} className="space-y-8">
        <input type="hidden" name="id" value={produto.id} />
        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <Secao titulo="Tipo de controle">
            <div className="space-y-3">
              <Marcador
                name="trackInventory"
                value="on"
                checked={controlar}
                onChange={(evento) => setControlar(evento.target.checked)}
                rotulo="Controlar estoque deste produto"
                ajuda="Desligado, o produto continua vendável mesmo com saldo zero — use para item feito sob encomenda."
              />
              <Marcador
                name="unique"
                value="on"
                defaultChecked={produto.unique}
                rotulo="Peça única"
                ajuda="Marque em seminovo, usado e recondicionado: cada unidade tem número de série e história própria."
              />
            </div>
          </Secao>

          <Secao titulo="Saldo">
            <Grade>
              <Campo
                rotulo="Quantidade em estoque"
                name="stock"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000000}
                value={saldo}
                onChange={(evento) => setSaldo(evento.target.value)}
                erro={estado.campo === "stock" ? estado.erro : undefined}
                ajuda={
                  controlar
                    ? `Saldo gravado hoje: ${produto.stock}.`
                    : "Sem controle de estoque, este número é apenas informativo."
                }
              />
              <Campo
                rotulo="Alerta de estoque baixo"
                name="lowStockAlert"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000000}
                defaultValue={produto.lowStockAlert}
                erro={estado.campo === "lowStockAlert" ? estado.erro : undefined}
                ajuda="A partir deste saldo o produto entra na lista de reposição."
              />
            </Grade>

            {mudou ? (
              <div className="space-y-3 rounded-lg border border-warn-500/30 bg-warn-50 p-4">
                <p className="flex items-start gap-2 text-sm font-medium text-warn-700">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    O saldo vai de {produto.stock} para {numero} ({diferenca > 0 ? "+" : ""}
                    {diferenca}). Isso gera um ajuste no histórico.
                  </span>
                </p>
                <Campo
                  rotulo="Motivo do ajuste"
                  name="motivo"
                  required
                  maxLength={160}
                  placeholder="Ex.: contagem de prateleira do dia 03/09"
                  erro={estado.campo === "motivo" ? estado.erro : undefined}
                />
              </div>
            ) : null}
          </Secao>

          <Secao
            titulo="Unidades identificadas"
            descricao="Peça única com número de série, estado e checklist de revisão."
          >
            <p className="flex flex-wrap items-center gap-3 rounded-lg border border-graf-200 bg-graf-50/60 px-4 py-3 text-sm text-graf-700">
              <Boxes className="size-4 shrink-0 text-graf-500" aria-hidden />
              <span>
                {produto.unidades === 0
                  ? "Nenhuma unidade cadastrada."
                  : `${produto.unidades} ${plural(produto.unidades, "unidade cadastrada", "unidades cadastradas")}.`}
              </span>
              <Link
                href={`/admin/estoque/unidades?produto=${produto.id}`}
                className="ml-auto font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
              >
                Ver unidades
              </Link>
            </p>
          </Secao>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar ajuda="Salva apenas esta aba.">
            <Botao type="submit" carregando={enviando}>
              Salvar estoque
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
