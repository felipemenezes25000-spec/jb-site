"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Save, Trash2 } from "lucide-react";

import {
  criarOrcamentoAdmin,
  salvarOrcamentoAdmin,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { LinhaDeTotal } from "@/components/admin/vendas/comuns";
import { Botao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao } from "@/components/ui/data";
import { Area, Campo, Selecao } from "@/components/ui/form";
import { formatarPreco, paraCentavos } from "@/lib/format";

/* ============================================================================
   Editor de orçamento

   As linhas de item vivem no estado do cliente só para dar edição confortável —
   somar, remover, ver o total mudando. O que vale é o que o servidor recalcula:
   os campos viajam como listas paralelas (`item_descricao`, `item_quantidade`,
   `item_valor`, `item_produto`) e `@/lib/orcamento` refaz subtotal e total a
   partir dos itens gravados. Nenhum total sai daqui para o banco.

   Escolher um produto do catálogo só preenche descrição e preço sugerido: o
   preço da proposta é negociado, então continua editável linha a linha.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type OpcaoCliente = { id: string; rotulo: string };
export type OpcaoProduto = { id: string; rotulo: string; precoCents: number };

export type LinhaItem = {
  chave: string;
  descricao: string;
  quantidade: string;
  valor: string;
  productId: string;
};

export type OrcamentoInicial = {
  kind: "comercial" | "assistencia";
  customerId: string;
  contatoNome: string;
  contatoEmail: string;
  contatoTelefone: string;
  mensagem: string;
  condicoes: string;
  notaInterna: string;
  validoAte: string;
  desconto: string;
  frete: string;
  itens: LinhaItem[];
};

let contador = 0;
function novaChave() {
  contador += 1;
  return `linha-${contador}-${Date.now()}`;
}

export function linhaVazia(): LinhaItem {
  return { chave: novaChave(), descricao: "", quantidade: "1", valor: "", productId: "" };
}

function Enviar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" carregando={pending}>
      <Save className="size-4" aria-hidden />
      {rotulo}
    </Botao>
  );
}

export function EditorOrcamento({
  modo,
  quoteId,
  inicial,
  clientes,
  produtos,
  somenteLeitura,
  motivoBloqueio,
}: {
  modo: "novo" | "editar";
  quoteId?: string;
  inicial: OrcamentoInicial;
  clientes: OpcaoCliente[];
  produtos: OpcaoProduto[];
  somenteLeitura?: boolean;
  motivoBloqueio?: string;
}) {
  const [estado, acao] = useActionState(
    modo === "novo" ? criarOrcamentoAdmin : salvarOrcamentoAdmin,
    INICIAL,
  );

  const base = useId();
  const [itens, setItens] = useState<LinhaItem[]>(
    inicial.itens.length > 0 ? inicial.itens : [linhaVazia()],
  );
  const [desconto, setDesconto] = useState(inicial.desconto);
  const [frete, setFrete] = useState(inicial.frete);

  const subtotal = useMemo(
    () =>
      itens.reduce((soma, item) => {
        const quantidade = Math.max(1, Number(item.quantidade.replace(/\D/g, "")) || 1);
        return soma + paraCentavos(item.valor) * quantidade;
      }, 0),
    [itens],
  );

  const descontoCents = Math.max(0, paraCentavos(desconto));
  const freteCents = Math.max(0, paraCentavos(frete));
  const total = Math.max(0, subtotal - descontoCents) + freteCents;

  function atualizar(chave: string, campo: keyof LinhaItem, valor: string) {
    setItens((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)),
    );
  }

  function remover(chave: string) {
    setItens((atual) => {
      const restante = atual.filter((item) => item.chave !== chave);
      return restante.length > 0 ? restante : [linhaVazia()];
    });
  }

  function adicionarDoCatalogo(produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;
    setItens((atual) => [
      ...atual.filter((item) => item.descricao.trim() !== ""),
      {
        chave: novaChave(),
        descricao: produto.rotulo,
        quantidade: "1",
        valor: (produto.precoCents / 100).toFixed(2).replace(".", ","),
        productId: produto.id,
      },
    ]);
  }

  if (somenteLeitura) {
    return (
      <Cartao>
        <CabecalhoCartao titulo="Itens da proposta" descricao={motivoBloqueio} />
        <ul className="divide-y divide-graf-200">
          {itens.map((item) => (
            <li key={item.chave} className="flex flex-wrap justify-between gap-3 px-5 py-3">
              <span className="min-w-0 text-sm text-graf-800">{item.descricao}</span>
              <span className="tabular text-sm text-graf-600">
                {item.quantidade} × {formatarPreco(paraCentavos(item.valor))}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-graf-200 bg-graf-50 px-5 py-4">
          <div className="ml-auto max-w-sm">
            <LinhaDeTotal rotulo="Subtotal" valor={formatarPreco(subtotal)} />
            {descontoCents > 0 ? (
              <LinhaDeTotal
                rotulo="Desconto"
                valor={formatarPreco(descontoCents)}
                negativo
              />
            ) : null}
            {freteCents > 0 ? (
              <LinhaDeTotal rotulo="Frete" valor={formatarPreco(freteCents)} />
            ) : null}
            <LinhaDeTotal rotulo="Total" valor={formatarPreco(total)} forte />
          </div>
        </div>
      </Cartao>
    );
  }

  return (
    <form action={acao} className="space-y-6">
      {quoteId ? <input type="hidden" name="quoteId" value={quoteId} /> : null}

      {/* ------------------------------------------------------ cabeçalho */}
      <Cartao>
        <CabecalhoCartao
          titulo="Para quem é a proposta"
          descricao="Escolha um cliente cadastrado ou preencha o contato à mão."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Selecao rotulo="Tipo de proposta" name="kind" defaultValue={inicial.kind}>
            <option value="comercial">Venda de equipamento</option>
            <option value="assistencia">Serviço técnico</option>
          </Selecao>

          <Selecao
            rotulo="Cliente cadastrado"
            name="customerId"
            defaultValue={inicial.customerId}
            ajuda="Sem cliente, a proposta vale pelos dados de contato abaixo."
          >
            <option value="">Sem cadastro — usar contato avulso</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.rotulo}
              </option>
            ))}
          </Selecao>

          <Campo
            rotulo="Nome do contato"
            name="contatoNome"
            defaultValue={inicial.contatoNome}
            maxLength={160}
            erro={estado.campo === "contatoNome" ? estado.erro : undefined}
          />
          <Campo
            rotulo="E-mail do contato"
            name="contatoEmail"
            type="email"
            defaultValue={inicial.contatoEmail}
            maxLength={160}
            ajuda="É para cá que o orçamento é enviado."
          />
          <Campo
            rotulo="Telefone do contato"
            name="contatoTelefone"
            defaultValue={inicial.contatoTelefone}
            maxLength={30}
          />
          <Campo
            rotulo="Válido até"
            name="validoAte"
            type="date"
            defaultValue={inicial.validoAte}
            ajuda="Sem data, a proposta recebe 7 dias ao ser enviada."
          />
        </div>
      </Cartao>

      {/* ---------------------------------------------------------- itens */}
      <Cartao>
        <CabecalhoCartao
          titulo="Itens"
          descricao="Descrição, quantidade e preço negociado de cada linha."
          acao={
            produtos.length > 0 ? (
              <div className="w-full sm:w-72">
                <label
                  htmlFor={`${base}-catalogo`}
                  className="mb-1 block text-xs font-semibold text-graf-600"
                >
                  Puxar do catálogo
                </label>
                <select
                  id={`${base}-catalogo`}
                  value=""
                  onChange={(evento) => adicionarDoCatalogo(evento.target.value)}
                  className="h-11 w-full rounded-lg border border-graf-300 bg-white px-3 pr-8 text-sm text-graf-900 hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
                >
                  <option value="">Escolha um produto…</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.rotulo} — {formatarPreco(produto.precoCents)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null
          }
        />

        <ul className="divide-y divide-graf-200">
          {itens.map((item, indice) => {
            const quantidade = Math.max(1, Number(item.quantidade.replace(/\D/g, "")) || 1);
            const totalLinha = paraCentavos(item.valor) * quantidade;

            return (
              <li key={item.chave} className="p-5">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_5rem_9rem_auto] sm:items-end">
                  <div>
                    <label
                      htmlFor={`${base}-descricao-${item.chave}`}
                      className="mb-1.5 block text-sm font-semibold text-graf-800 sm:sr-only"
                    >
                      Descrição do item {indice + 1}
                    </label>
                    <input
                      id={`${base}-descricao-${item.chave}`}
                      name="item_descricao"
                      value={item.descricao}
                      onChange={(evento) =>
                        atualizar(item.chave, "descricao", evento.target.value)
                      }
                      maxLength={300}
                      placeholder="Ex.: Cadeira odontológica Gnatus S300, revisada"
                      className="h-11 w-full rounded-lg border border-graf-300 bg-white px-3.5 text-graf-900 shadow-xs placeholder:text-graf-500 hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
                    />
                    <input type="hidden" name="item_produto" value={item.productId} />
                  </div>

                  <div>
                    <label
                      htmlFor={`${base}-qtd-${item.chave}`}
                      className="mb-1.5 block text-sm font-semibold text-graf-800 sm:sr-only"
                    >
                      Quantidade do item {indice + 1}
                    </label>
                    <input
                      id={`${base}-qtd-${item.chave}`}
                      name="item_quantidade"
                      inputMode="numeric"
                      value={item.quantidade}
                      onChange={(evento) =>
                        atualizar(item.chave, "quantidade", evento.target.value)
                      }
                      className="tabular h-11 w-full rounded-lg border border-graf-300 bg-white px-3 text-center text-graf-900 shadow-xs hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`${base}-valor-${item.chave}`}
                      className="mb-1.5 block text-sm font-semibold text-graf-800 sm:sr-only"
                    >
                      Valor unitário do item {indice + 1}
                    </label>
                    <div className="relative">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-graf-500"
                      >
                        R$
                      </span>
                      <input
                        id={`${base}-valor-${item.chave}`}
                        name="item_valor"
                        inputMode="decimal"
                        value={item.valor}
                        onChange={(evento) =>
                          atualizar(item.chave, "valor", evento.target.value)
                        }
                        placeholder="0,00"
                        className="tabular h-11 w-full rounded-lg border border-graf-300 bg-white pl-10 pr-3 text-right text-graf-900 shadow-xs hover:border-graf-400 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="tabular text-sm font-semibold text-graf-900 sm:w-28 sm:text-right">
                      {formatarPreco(totalLinha)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remover(item.chave)}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-500 transition-colors hover:bg-jb-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only">Remover o item {indice + 1}</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-graf-200 px-5 py-4">
          <Botao
            type="button"
            variante="secundario"
            tamanho="sm"
            onClick={() => setItens((atual) => [...atual, linhaVazia()])}
          >
            <Plus className="size-4" aria-hidden />
            Adicionar linha
          </Botao>
        </div>

        <div className="border-t border-graf-200 bg-graf-50 px-5 py-5">
          <div className="ml-auto max-w-sm space-y-3">
            <Campo
              rotulo="Desconto"
              name="descontoCents"
              inputMode="decimal"
              prefixo="R$"
              value={desconto}
              onChange={(evento) => setDesconto(evento.target.value)}
              placeholder="0,00"
            />
            <Campo
              rotulo="Frete"
              name="freteCents"
              inputMode="decimal"
              prefixo="R$"
              value={frete}
              onChange={(evento) => setFrete(evento.target.value)}
              placeholder="0,00"
            />

            <div className="pt-2">
              <LinhaDeTotal rotulo="Subtotal" valor={formatarPreco(subtotal)} />
              {descontoCents > 0 ? (
                <LinhaDeTotal
                  rotulo="Desconto"
                  valor={formatarPreco(descontoCents)}
                  negativo
                />
              ) : null}
              {freteCents > 0 ? (
                <LinhaDeTotal rotulo="Frete" valor={formatarPreco(freteCents)} />
              ) : null}
              <LinhaDeTotal rotulo="Total da proposta" valor={formatarPreco(total)} forte />
              <p className="mt-2 text-xs leading-relaxed text-graf-500">
                Os totais são refeitos no servidor a partir dos itens salvos. Este número é a
                prévia do que será gravado.
              </p>
            </div>
          </div>
        </div>
      </Cartao>

      {/* ------------------------------------------------------- textos */}
      <Cartao>
        <CabecalhoCartao
          titulo="Textos da proposta"
          descricao="Mensagem e condições saem impressas e aparecem para o cliente."
        />
        <div className="space-y-4 p-5">
          <Area
            rotulo="Mensagem ao cliente"
            name="mensagem"
            rows={3}
            maxLength={4000}
            defaultValue={inicial.mensagem}
            placeholder="Ex.: conforme conversamos, segue a proposta do equipamento com instalação inclusa."
          />
          <Area
            rotulo="Condições comerciais"
            name="condicoes"
            rows={4}
            maxLength={4000}
            defaultValue={inicial.condicoes}
            ajuda="Pagamento, prazo de entrega, garantia — o que vale para esta proposta."
          />
          <Area
            rotulo="Nota interna"
            name="notaInterna"
            rows={2}
            maxLength={4000}
            defaultValue={inicial.notaInterna}
            ajuda="Só a equipe vê. Nunca sai na impressão nem para o cliente."
          />
        </div>
      </Cartao>

      <div className="flex flex-wrap items-center gap-4">
        <Enviar rotulo={modo === "novo" ? "Criar orçamento" : "Salvar alterações"} />
        <p aria-live="polite" className="min-h-5 text-sm">
          {estado.erro ? <span className="font-medium text-jb-700">{estado.erro}</span> : null}
          {estado.ok ? <span className="font-medium text-ok-700">{estado.ok}</span> : null}
        </p>
      </div>
    </form>
  );
}
