"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { adicionarAoCarrinho, type EstadoCarrinho } from "@/app/acoes/carrinho";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { calcularParcelas, formatarPreco, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Caixa de compra

   O bloco que decide a venda: preço, parcelamento, disponibilidade, serviços
   que entram junto, quantidade e o botão. Fica grudado ao rolar no desktop,
   porque a página de um equipamento de dezenas de milhares de reais é longa e
   ninguém deveria ter de subir de novo para comprar.

   Preço e total aqui são só exibição. Quem soma para valer é o servidor, em
   `calcularTotais` e em `criarPedido` — este componente reproduz a MESMA
   regra para que o número da tela bata com o do carrinho, nunca para
   substituí-la.
   ============================================================================ */

export type AddonProduto = {
  serviceId: string;
  nome: string;
  descricao: string;
  precoCents: number | null;
  obrigatorio: boolean;
};

export function CaixaCompra({
  produtoId,
  precoCents,
  compareAtCents,
  permiteCompra,
  permiteOrcamento,
  estoque,
  controlaEstoque,
  unico,
  addons,
  hrefOrcamento,
  maxParcelas,
  minParcelaCents,
}: {
  produtoId: string;
  precoCents: number;
  compareAtCents: number | null;
  permiteCompra: boolean;
  permiteOrcamento: boolean;
  estoque: number;
  controlaEstoque: boolean;
  unico: boolean;
  addons: AddonProduto[];
  /** Já montado no servidor, com o nome do equipamento na proposta. */
  hrefOrcamento: string;
  /** Teto de parcelas configurado pela JB — o mesmo que o checkout aplica. */
  maxParcelas: number;
  /** Valor mínimo da parcela, também vindo da configuração da loja. */
  minParcelaCents: number;
}) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState(1);
  const [escolhidos, setEscolhidos] = useState<string[]>(
    addons.filter((a) => a.obrigatorio).map((a) => a.serviceId),
  );

  const [estado, acao, enviando] = useActionState<EstadoCarrinho, FormData>(
    async (anterior, formData) => {
      const resultado = await adicionarAoCarrinho(anterior, formData);
      if (resultado.ok) {
        toast.success(resultado.ok, {
          action: { label: "Ver carrinho", onClick: () => router.push("/carrinho") },
        });
      }
      return resultado;
    },
    {},
  );

  const semEstoque = controlaEstoque && estoque <= 0;
  const maximo = unico ? 1 : controlaEstoque ? Math.max(1, estoque) : 99;
  const soOrcamento = !permiteCompra || precoCents <= 0;
  const parcelas = soOrcamento
    ? null
    : calcularParcelas(precoCents, maxParcelas, minParcelaCents);

  // Só é "preço anterior" quando de fato é maior — cadastro com valor igual ou
  // menor não vira desconto de mentira na tela.
  const precoAnteriorCents =
    compareAtCents && compareAtCents > precoCents ? compareAtCents : null;
  const economiaCents = precoAnteriorCents ? precoAnteriorCents - precoCents : 0;
  const desconto = precoAnteriorCents
    ? Math.round((economiaCents / precoAnteriorCents) * 100)
    : 0;

  // O adicional é cobrado por unidade — dois equipamentos são duas instalações.
  // É assim que calcularTotais e criarPedido somam; somar uma vez só aqui
  // mostraria um total menor do que o carrinho cobra na tela seguinte.
  const selecionados = addons.filter((a) => escolhidos.includes(a.serviceId));
  const totalAddons =
    selecionados.reduce((soma, a) => soma + (a.precoCents ?? 0), 0) * quantidade;
  const total = precoCents * quantidade + totalAddons;
  const mostrarTotal = totalAddons > 0 || quantidade > 1;
  const servicosComPreco = selecionados.filter((a) => (a.precoCents ?? 0) > 0).length;

  return (
    <div className="rounded-xl border border-graf-200 bg-white p-5 shadow-card sm:p-6">
      {soOrcamento ? (
        <div>
          <p className="text-title texto-forte">Disponível sob orçamento</p>
          <p className="mt-2.5 text-sm leading-relaxed text-graf-600">
            A equipe da JB confere disponibilidade e condições antes de fechar o preço deste
            equipamento. Peça a proposta e receba os valores separados por item.
          </p>
        </div>
      ) : (
        <div>
          {precoAnteriorCents ? (
            <p className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm text-graf-500 line-through">
                {formatarPreco(precoAnteriorCents)}
              </span>
              {/* mesmo piso do cartão da vitrine: abaixo de 5% o selo vira
                  ruído e a diferença já está no valor riscado */}
              {desconto >= 5 ? <Etiqueta tom="ok">−{desconto}%</Etiqueta> : null}
            </p>
          ) : null}

          <p className="mt-1 text-3xl font-extrabold tracking-tight tabular text-graf-950 sm:text-4xl">
            {formatarPreco(precoCents)}
          </p>

          {parcelas ? (
            <p className="mt-2 text-sm text-graf-600">
              em até{" "}
              <span className="font-semibold text-graf-800">
                {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
              </span>{" "}
              sem juros no cartão
            </p>
          ) : null}

          <p className="mt-1.5 flex items-center gap-2 text-sm text-graf-500">
            <CreditCard className="size-4 shrink-0 text-graf-400" aria-hidden />
            Pix ou cartão de crédito
          </p>

          {economiaCents > 0 ? (
            <p className="mt-1.5 text-sm font-semibold text-ok-700">
              Economia de {formatarPreco(economiaCents)}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-5 border-t border-graf-200 pt-5">
        {semEstoque ? (
          <Etiqueta tom="neutro">{unico ? "Vendido" : "Sem estoque no momento"}</Etiqueta>
        ) : unico ? (
          <Etiqueta tom="alerta" ponto>
            Unidade única disponível
          </Etiqueta>
        ) : controlaEstoque && estoque <= 3 ? (
          <Etiqueta tom="aguardando" ponto>
            {estoque === 1 ? "Última unidade" : `Últimas ${estoque} unidades`}
          </Etiqueta>
        ) : (
          <Etiqueta tom="ok" ponto>
            Disponível
          </Etiqueta>
        )}
      </div>

      {!soOrcamento && !semEstoque ? (
        <form action={acao} className="mt-5 space-y-6">
          <input type="hidden" name="produtoId" value={produtoId} />
          <input type="hidden" name="quantidade" value={quantidade} />
          {escolhidos.map((id) => (
            <input key={id} type="hidden" name="addons" value={id} />
          ))}

          {addons.length > 0 ? (
            <fieldset>
              <legend className="text-sm font-bold text-graf-900">
                Serviços da equipe JB
              </legend>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-graf-500">
                Entram no mesmo pedido e são executados pela equipe técnica.
              </p>
              <div className="space-y-2">
                {addons.map((addon) => {
                  const marcado = escolhidos.includes(addon.serviceId);
                  const precoAddon = addon.precoCents ?? 0;

                  return (
                    <label
                      key={addon.serviceId}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3.5",
                        "transition-[border-color,background-color] duration-150",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
                        "has-[:disabled]:cursor-default",
                        marcado
                          ? "border-jb-300 bg-jb-50/60"
                          : "border-graf-200 hover:border-graf-400",
                      )}
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
                        className="mt-0.5 size-[18px] shrink-0 rounded border-graf-450 text-jb-500 focus:outline-none disabled:opacity-60"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <span className="text-sm font-semibold text-graf-900">
                            {addon.nome}
                          </span>
                          <span className="text-sm font-bold text-graf-800">
                            {precoAddon > 0
                              ? `+ ${formatarPreco(precoAddon)}`
                              : "sob orçamento"}
                          </span>
                        </span>
                        {addon.descricao ? (
                          <span className="mt-1 block text-xs leading-relaxed text-graf-500">
                            {addon.descricao}
                          </span>
                        ) : null}
                        {addon.obrigatorio ? (
                          <span className="mt-1.5 block text-xs font-semibold text-jb-700">
                            Incluído obrigatoriamente neste equipamento
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-graf-800" id="rotulo-quantidade">
                Quantidade
              </span>
              <div className="flex items-center rounded-lg border border-graf-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  disabled={quantidade <= 1}
                  aria-label="Diminuir quantidade"
                  className="foco-jb flex size-11 items-center justify-center rounded-l-lg text-graf-700 transition-colors duration-150 hover:bg-graf-50 disabled:cursor-not-allowed disabled:text-graf-400 disabled:hover:bg-transparent"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <output
                  aria-live="polite"
                  aria-labelledby="rotulo-quantidade"
                  className="w-12 text-center text-base font-bold tabular text-graf-950"
                >
                  {quantidade}
                </output>
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
                  disabled={quantidade >= maximo}
                  aria-label="Aumentar quantidade"
                  className="foco-jb flex size-11 items-center justify-center rounded-r-lg text-graf-700 transition-colors duration-150 hover:bg-graf-50 disabled:cursor-not-allowed disabled:text-graf-400 disabled:hover:bg-transparent"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}

          {mostrarTotal ? (
            <div className="rounded-lg bg-graf-50 p-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-semibold text-graf-700">Total</span>
                <span className="text-xl font-extrabold tabular text-graf-950">
                  {formatarPreco(total)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-graf-500">
                {plural(quantidade, "equipamento", "equipamentos")}
                {servicosComPreco > 0
                  ? ` + ${plural(servicosComPreco * quantidade, "serviço", "serviços")}`
                  : ""}
              </p>
            </div>
          ) : null}

          {estado.erro ? <Aviso tom="erro">{estado.erro}</Aviso> : null}

          <Botao type="submit" tamanho="lg" larguraTotal carregando={enviando}>
            <ShoppingCart className="size-[18px]" aria-hidden />
            Adicionar ao carrinho
          </Botao>
        </form>
      ) : null}

      {permiteOrcamento ? (
        <div className={soOrcamento || semEstoque ? "mt-5" : "mt-3"}>
          <LinkBotao
            href={hrefOrcamento}
            variante={soOrcamento || semEstoque ? "primario" : "secundario"}
            tamanho="lg"
            larguraTotal
          >
            Solicitar orçamento
          </LinkBotao>
          <p className="mt-2.5 text-center text-xs leading-relaxed text-graf-500">
            A proposta chega com equipamento, serviço e deslocamento separados.
          </p>
        </div>
      ) : (soOrcamento || semEstoque) ? (
        /* Sem compra direta e sem orçamento, a caixa ficaria sem saída
           nenhuma. O contato é o próximo passo que sempre existe. */
        <div className="mt-5">
          <LinkBotao href="/contato" variante="secundario" tamanho="lg" larguraTotal>
            Falar com a equipe
          </LinkBotao>
        </div>
      ) : null}
    </div>
  );
}
