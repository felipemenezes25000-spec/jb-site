"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { adicionarAoCarrinho, type EstadoCarrinho } from "@/app/acoes/carrinho";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import { calcularParcelas, formatarPreco } from "@/lib/format";

export type AddonProduto = {
  serviceId: string;
  nome: string;
  descricao: string;
  precoCents: number | null;
  obrigatorio: boolean;
};

export function CaixaCompra({
  produtoId,
  nome,
  precoCents,
  compareAtCents,
  permiteCompra,
  permiteOrcamento,
  estoque,
  controlaEstoque,
  unico,
  addons,
}: {
  produtoId: string;
  nome: string;
  precoCents: number;
  compareAtCents: number | null;
  permiteCompra: boolean;
  permiteOrcamento: boolean;
  estoque: number;
  controlaEstoque: boolean;
  unico: boolean;
  addons: AddonProduto[];
}) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState(1);
  const [escolhidos, setEscolhidos] = useState<string[]>(
    addons.filter((a) => a.obrigatorio).map((a) => a.serviceId),
  );

  const [, acao, enviando] = useActionState<EstadoCarrinho, FormData>(
    async (anterior, formData) => {
      const resultado = await adicionarAoCarrinho(anterior, formData);
      if (resultado.ok) {
        toast.success(resultado.ok, {
          action: { label: "Ver carrinho", onClick: () => router.push("/carrinho") },
        });
      }
      if (resultado.erro) toast.error(resultado.erro);
      return resultado;
    },
    {},
  );

  const semEstoque = controlaEstoque && estoque <= 0;
  const maximo = unico ? 1 : controlaEstoque ? Math.max(1, estoque) : 99;
  const soOrcamento = !permiteCompra || precoCents <= 0;
  const parcelas = soOrcamento ? null : calcularParcelas(precoCents);

  const totalAddons = addons
    .filter((a) => escolhidos.includes(a.serviceId))
    .reduce((soma, a) => soma + (a.precoCents ?? 0), 0);
  const total = precoCents * quantidade + totalAddons;

  return (
    <div className="rounded-xl border border-graf-200 bg-white p-5 shadow-card lg:p-6">
      {soOrcamento ? (
        <div>
          <p className="text-lg font-bold text-graf-900">Disponível sob orçamento</p>
          <p className="mt-2 text-sm leading-relaxed text-graf-600">
            Este item é vendido mediante proposta. Envie sua solicitação e a equipe
            retorna com preço, prazo e condições.
          </p>
        </div>
      ) : (
        <>
          {compareAtCents && compareAtCents > precoCents ? (
            <p className="text-sm text-graf-400 line-through">
              {formatarPreco(compareAtCents)}
            </p>
          ) : null}
          <p className="text-3xl font-extrabold tracking-tight text-graf-950">
            {formatarPreco(precoCents)}
          </p>
          {parcelas ? (
            <p className="mt-1 text-sm text-graf-600">
              em até {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)} sem juros
            </p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-ok-700">
            {formatarPreco(precoCents)} no Pix
          </p>
        </>
      )}

      <div className="mt-4">
        {semEstoque ? (
          <Etiqueta tom="neutro">{unico ? "Vendido" : "Sem estoque no momento"}</Etiqueta>
        ) : unico ? (
          <Etiqueta tom="alerta" ponto>
            Unidade única disponível
          </Etiqueta>
        ) : controlaEstoque && estoque <= 3 ? (
          <Etiqueta tom="aguardando" ponto>
            Últimas {estoque} unidades
          </Etiqueta>
        ) : (
          <Etiqueta tom="ok" ponto>
            Disponível
          </Etiqueta>
        )}
      </div>

      {!soOrcamento && !semEstoque ? (
        <form action={acao} className="mt-5 space-y-5">
          <input type="hidden" name="produtoId" value={produtoId} />
          <input type="hidden" name="quantidade" value={quantidade} />
          {escolhidos.map((id) => (
            <input key={id} type="hidden" name="addons" value={id} />
          ))}

          {addons.length > 0 ? (
            <fieldset>
              <legend className="mb-2.5 text-sm font-bold text-graf-900">
                Adicione à compra
              </legend>
              <div className="space-y-2">
                {addons.map((addon) => {
                  const marcado = escolhidos.includes(addon.serviceId);
                  return (
                    <label
                      key={addon.serviceId}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        marcado ? "border-jb-300 bg-jb-50/50" : "border-graf-200 hover:border-graf-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={addon.obrigatorio}
                        onChange={() =>
                          setEscolhidos((atuais) =>
                            atuais.includes(addon.serviceId)
                              ? atuais.filter((s) => s !== addon.serviceId)
                              : [...atuais, addon.serviceId],
                          )
                        }
                        className="mt-0.5 size-4 shrink-0 rounded border-graf-300 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-sm font-semibold text-graf-900">
                            {addon.nome}
                          </span>
                          <span className="text-sm font-bold text-graf-800">
                            {addon.precoCents && addon.precoCents > 0
                              ? `+ ${formatarPreco(addon.precoCents)}`
                              : "sob orçamento"}
                          </span>
                        </span>
                        {addon.descricao ? (
                          <span className="mt-0.5 block text-xs leading-relaxed text-graf-500">
                            {addon.descricao}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {!unico ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-graf-800">Quantidade</span>
              <div className="flex items-center rounded-lg border border-graf-300">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  disabled={quantidade <= 1}
                  aria-label="Diminuir quantidade"
                  className="flex size-10 items-center justify-center text-graf-600 disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <span
                  aria-live="polite"
                  className="w-10 text-center text-sm font-bold tabular text-graf-900"
                >
                  {quantidade}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
                  disabled={quantidade >= maximo}
                  aria-label="Aumentar quantidade"
                  className="flex size-10 items-center justify-center text-graf-600 disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          ) : null}

          {totalAddons > 0 || quantidade > 1 ? (
            <div className="flex items-baseline justify-between border-t border-graf-200 pt-4">
              <span className="text-sm font-semibold text-graf-700">Total</span>
              <span className="text-xl font-extrabold text-graf-950">
                {formatarPreco(total)}
              </span>
            </div>
          ) : null}

          <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
            <ShoppingCart className="size-4.5" aria-hidden />
            Adicionar ao carrinho
          </Botao>
        </form>
      ) : null}

      {permiteOrcamento ? (
        <div className={soOrcamento || semEstoque ? "mt-5" : "mt-3"}>
          <LinkBotao
            href={`/orcamento?produto=${encodeURIComponent(nome)}`}
            variante={soOrcamento ? "primario" : "secundario"}
            tamanho="lg"
            larguraTotal
          >
            Solicitar orçamento
          </LinkBotao>
        </div>
      ) : null}
    </div>
  );
}
