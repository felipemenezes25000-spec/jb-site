"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  Sliders,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { adicionarAoCarrinho, type EstadoCarrinho } from "@/app/acoes/carrinho";
import { EntregaPorCep } from "@/components/loja/produto/entrega-por-cep";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { calcularParcelas, formatarPreco, plural } from "@/lib/format";
import { JB_CARE } from "@/lib/jb-care";
import { cn } from "@/lib/utils";

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
  hrefOrcamento: string;
  maxParcelas: number;
  minParcelaCents: number;
  /** Mantido na API do componente porque a PDP já passa esse dado; a garantia
   * fica na faixa de confiança para não aparecer duas vezes na primeira dobra. */
  garantia?: { meses: number; daUnidade: boolean } | null;
}) {
  const router = useRouter();
  const [quantidade, setQuantidade] = useState(1);
  const obrigatorios = addons.filter((a) => a.obrigatorio).map((a) => a.serviceId);
  const [escolhidos, setEscolhidos] = useState<string[]>(obrigatorios);
  const [detalhando, setDetalhando] = useState(false);
  const destinoRef = useRef<"carrinho" | "checkout">("carrinho");
  const [irParaPagamento, setIrParaPagamento] = useState(false);

  const [estado, acao, enviando] = useActionState<EstadoCarrinho, FormData>(
    async (anterior, formData) => {
      const direto = destinoRef.current === "checkout";
      const resultado = await adicionarAoCarrinho(anterior, formData);

      if (resultado.ok) {
        if (direto) {
          router.push("/checkout");
          return resultado;
        }

        setQuantidade(1);
        setEscolhidos(obrigatorios);
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

  const precoAnteriorCents =
    compareAtCents && compareAtCents > precoCents ? compareAtCents : null;
  const economiaCents = precoAnteriorCents ? precoAnteriorCents - precoCents : 0;
  const desconto = precoAnteriorCents
    ? Math.round((economiaCents / precoAnteriorCents) * 100)
    : 0;

  const selecionados = addons.filter((a) => escolhidos.includes(a.serviceId));
  const totalAddons =
    selecionados.reduce((soma, a) => soma + (a.precoCents ?? 0), 0) * quantidade;
  const total = precoCents * quantidade + totalAddons;
  const mostrarTotal = totalAddons > 0 || quantidade > 1;
  const servicosComPreco = selecionados.filter((a) => (a.precoCents ?? 0) > 0).length;
  const servicoSobOrcamento = selecionados.find((a) => (a.precoCents ?? 0) <= 0) ?? null;
  const baseCompravel = !soOrcamento && !semEstoque;
  const podeComprar = baseCompravel && !servicoSobOrcamento;

  const opcionais = addons.filter((a) => !a.obrigatorio);
  const pacoteAtivo =
    opcionais.length > 0 && opcionais.every((a) => escolhidos.includes(a.serviceId));
  const precoDoPacote = opcionais.reduce((soma, a) => soma + (a.precoCents ?? 0), 0);
  const semPrecoNoPacote = opcionais.filter((a) => (a.precoCents ?? 0) <= 0);

  function escolherPacote(ligar: boolean) {
    setEscolhidos(
      ligar ? [...obrigatorios, ...opcionais.map((a) => a.serviceId)] : obrigatorios,
    );
  }

  const temOpcoes = baseCompravel && (!unico || addons.length > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card">
      <div className="px-5 py-5 sm:px-6">
        <div className="mb-3">
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

        {soOrcamento ? (
          <div>
            <p className="text-xl font-extrabold tracking-[-0.02em] text-graf-950">
              Disponível sob orçamento
            </p>
            <p className="mt-2 max-w-[38ch] text-sm leading-5 text-graf-600">
              A JB confirma preço, disponibilidade e condições deste produto antes da proposta.
            </p>
          </div>
        ) : (
          <div>
            {precoAnteriorCents ? (
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-sm tabular text-graf-500 line-through">
                  {formatarPreco(precoAnteriorCents)}
                </span>
                {desconto >= 5 ? <Etiqueta tom="ok">−{desconto}%</Etiqueta> : null}
              </div>
            ) : null}

            <p className="numero text-[2.35rem] leading-none tracking-[-0.035em] text-graf-950 xl:text-[2.55rem]">
              {formatarPreco(precoCents)}
            </p>

            {parcelas ? (
              <p className="mt-2 text-sm leading-5 text-graf-600">
                até <span className="font-semibold text-graf-900">{parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}</span> sem juros
              </p>
            ) : null}

            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-graf-500">
              <CreditCard className="size-3.5 shrink-0" aria-hidden />
              Pix ou cartão de crédito
            </p>

            {economiaCents > 0 ? (
              <p className="mt-2 text-sm font-semibold text-ok-700">
                Economia de {formatarPreco(economiaCents)}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {baseCompravel ? (
        <form action={acao} className="border-t border-graf-150 px-5 py-4 sm:px-6">
          <input type="hidden" name="produtoId" value={produtoId} />
          <input type="hidden" name="quantidade" value={quantidade} />
          {escolhidos.map((id) => (
            <input key={id} type="hidden" name="addons" value={id} />
          ))}

          {mostrarTotal ? (
            <div className="mb-3 flex items-end justify-between gap-4 rounded-xl bg-graf-50 px-3.5 py-3">
              <span>
                <span className="block text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-graf-500">
                  Total
                </span>
                <span className="mt-0.5 block text-xs text-graf-500">
                  {plural(quantidade, "produto", "produtos")}
                  {servicosComPreco > 0
                    ? ` + ${plural(servicosComPreco * quantidade, "serviço", "serviços")}`
                    : ""}
                </span>
              </span>
              <strong className="shrink-0 text-xl font-extrabold tabular text-graf-950">
                {formatarPreco(total)}
              </strong>
            </div>
          ) : null}

          {servicoSobOrcamento ? (
            <div className="mb-3">
              <Aviso
                tom="atencao"
                titulo={
                  servicoSobOrcamento.obrigatorio
                    ? "Há um serviço obrigatório sob orçamento"
                    : "O serviço selecionado precisa de orçamento"
                }
              >
                {servicoSobOrcamento.obrigatorio
                  ? "A compra direta fica bloqueada até a JB definir o valor desse serviço."
                  : "Desmarque o serviço para comprar agora ou solicite uma proposta com ele incluído."}
              </Aviso>
            </div>
          ) : null}

          {estado.erro ? (
            <div className="mb-3">
              <Aviso tom="erro">{estado.erro}</Aviso>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Botao
              type="submit"
              tamanho="lg"
              larguraTotal
              disabled={enviando || !podeComprar}
              carregando={enviando && irParaPagamento && podeComprar}
              onClick={() => {
                destinoRef.current = "checkout";
                setIrParaPagamento(true);
              }}
            >
              <Zap className="size-[18px]" aria-hidden />
              Comprar agora
            </Botao>

            <Botao
              type="submit"
              variante="secundario"
              tamanho="lg"
              larguraTotal
              disabled={enviando || !podeComprar}
              carregando={enviando && !irParaPagamento && podeComprar}
              onClick={() => {
                destinoRef.current = "carrinho";
                setIrParaPagamento(false);
              }}
            >
              <ShoppingCart className="size-[18px]" aria-hidden />
              Adicionar ao carrinho
            </Botao>
          </div>

          {permiteOrcamento ? (
            <div className="mt-1.5 text-center">
              <LinkBotao
                href={hrefOrcamento}
                variante="texto"
                tamanho="sm"
                className="px-3 text-graf-600"
              >
                Prefiro solicitar orçamento
              </LinkBotao>
            </div>
          ) : null}
        </form>
      ) : permiteOrcamento ? (
        <div className="border-t border-graf-150 p-5 sm:p-6">
          <LinkBotao href={hrefOrcamento} tamanho="lg" larguraTotal>
            Solicitar orçamento
          </LinkBotao>
          <p className="mt-2 text-center text-xs leading-5 text-graf-500">
            Receba preço, prazo e condições em uma única proposta.
          </p>
        </div>
      ) : (
        <div className="border-t border-graf-150 p-5 sm:p-6">
          <LinkBotao href="/contato" variante="secundario" tamanho="lg" larguraTotal>
            Falar com a equipe
          </LinkBotao>
        </div>
      )}

      {baseCompravel ? <EntregaPorCep produtoId={produtoId} /> : null}

      {temOpcoes ? (
        <details className="group border-t border-graf-150">
          <summary className="foco-jb flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-semibold text-graf-700 hover:bg-graf-50/70 [&::-webkit-details-marker]:hidden sm:px-6">
            <span className="flex min-w-0 items-center gap-2">
              <Sliders className="size-4 shrink-0 text-jb-600" aria-hidden />
              Mais opções da compra
            </span>
            <ChevronDown className="size-4 shrink-0 text-graf-500 transition-transform group-open:rotate-180" aria-hidden />
          </summary>

          <div className="space-y-4 border-t border-graf-150 bg-graf-50/35 px-5 py-4 sm:px-6">
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
                    className="foco-jb flex size-10 items-center justify-center rounded-l-lg text-graf-700 hover:bg-graf-50 disabled:cursor-not-allowed disabled:text-graf-400"
                  >
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <output
                    aria-live="polite"
                    aria-labelledby="rotulo-quantidade"
                    className="w-11 text-center text-sm font-bold tabular text-graf-950"
                  >
                    {quantidade}
                  </output>
                  <button
                    type="button"
                    onClick={() => setQuantidade((q) => Math.min(maximo, q + 1))}
                    disabled={quantidade >= maximo}
                    aria-label="Aumentar quantidade"
                    className="foco-jb flex size-10 items-center justify-center rounded-r-lg text-graf-700 hover:bg-graf-50 disabled:cursor-not-allowed disabled:text-graf-400"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {addons.length > 0 ? (
              <div className={!unico ? "border-t border-graf-200 pt-4" : undefined}>
                <PacoteDeServicos
                  obrigatorios={addons.filter((a) => a.obrigatorio)}
                  opcionais={opcionais}
                  escolhidos={escolhidos}
                  pacoteAtivo={pacoteAtivo}
                  precoDoPacote={precoDoPacote}
                  semPreco={semPrecoNoPacote.map((a) => a.nome)}
                  detalhando={detalhando}
                  aoDetalhar={() => setDetalhando((v) => !v)}
                  aoEscolherPacote={escolherPacote}
                  aoAlternar={(serviceId) =>
                    setEscolhidos((atuais) =>
                      atuais.includes(serviceId)
                        ? atuais.filter((s) => s !== serviceId)
                        : [...atuais, serviceId],
                    )
                  }
                />
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function PacoteDeServicos({
  obrigatorios,
  opcionais,
  escolhidos,
  pacoteAtivo,
  precoDoPacote,
  semPreco,
  detalhando,
  aoDetalhar,
  aoEscolherPacote,
  aoAlternar,
}: {
  obrigatorios: AddonProduto[];
  opcionais: AddonProduto[];
  escolhidos: string[];
  pacoteAtivo: boolean;
  precoDoPacote: number;
  semPreco: string[];
  detalhando: boolean;
  aoDetalhar: () => void;
  aoEscolherPacote: (ligar: boolean) => void;
  aoAlternar: (serviceId: string) => void;
}) {
  const vaiDeAlternativas = opcionais.length >= 2;
  const mostrarLista = opcionais.length > 0 && (!vaiDeAlternativas || detalhando);

  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-[0.08em] text-graf-500">
        Serviços JB
      </legend>
      <p className="mb-3 mt-1 text-xs leading-5 text-graf-500">
        Adicione somente o que fizer sentido para esta compra.
      </p>

      {obrigatorios.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {obrigatorios.map((addon) => (
            <li
              key={addon.serviceId}
              className="flex items-start gap-2 text-xs leading-5 text-graf-600"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
              <span>
                <span className="font-semibold text-graf-800">{addon.nome}</span> — obrigatório neste produto
                {(addon.precoCents ?? 0) > 0
                  ? ` (+ ${formatarPreco(addon.precoCents ?? 0)})`
                  : " — sob orçamento"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {vaiDeAlternativas ? (
        <div className="space-y-2">
          <AlternativaDoPacote
            marcada={!pacoteAtivo}
            titulo={JB_CARE.rotuloSemPacote}
            descricao={JB_CARE.descricaoSemPacote}
            valor={null}
            aoEscolher={() => aoEscolherPacote(false)}
          />
          <AlternativaDoPacote
            marcada={pacoteAtivo}
            titulo={JB_CARE.rotuloComPacote}
            descricao={JB_CARE.resumo}
            valor={precoDoPacote > 0 ? precoDoPacote : null}
            aPartirDe={semPreco.length > 0}
            ressalva={
              semPreco.length > 0
                ? `${semPreco.join(" e ")} ${semPreco.length > 1 ? "são orçados" : "é orçado"} pela equipe antes da execução.`
                : undefined
            }
            itens={opcionais.map((a) => a.nome)}
            aoEscolher={() => aoEscolherPacote(true)}
          />

          <button
            type="button"
            onClick={aoDetalhar}
            aria-expanded={detalhando}
            className="foco-jb inline-flex min-h-10 items-center gap-1.5 rounded-md text-xs font-semibold text-graf-600 hover:text-jb-700"
          >
            <Sliders className="size-3.5" aria-hidden />
            {detalhando ? "Esconder serviços" : "Escolher serviço por serviço"}
          </button>
        </div>
      ) : null}

      {mostrarLista ? (
        <div
          className={cn(
            "divide-y divide-graf-200 overflow-hidden rounded-lg border border-graf-200 bg-white",
            vaiDeAlternativas && "mt-3",
          )}
        >
          {opcionais.map((addon) => {
            const marcado = escolhidos.includes(addon.serviceId);
            const precoAddon = addon.precoCents ?? 0;

            return (
              <label
                key={addon.serviceId}
                className={cn(
                  "flex min-h-11 cursor-pointer items-start gap-3 p-3.5 transition-colors",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-jb-500",
                  marcado ? "bg-jb-50/60" : "hover:bg-graf-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => aoAlternar(addon.serviceId)}
                  className="mt-0.5 size-[18px] shrink-0 rounded border-graf-450 text-jb-500 focus:outline-none"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-graf-900">{addon.nome}</span>
                    <span className="text-sm font-bold tabular text-graf-800">
                      {precoAddon > 0 ? `+ ${formatarPreco(precoAddon)}` : "sob orçamento"}
                    </span>
                  </span>
                  {addon.descricao ? (
                    <span className="mt-1 block text-xs leading-5 text-graf-500">
                      {addon.descricao}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

function AlternativaDoPacote({
  marcada,
  titulo,
  descricao,
  valor,
  aPartirDe,
  ressalva,
  itens,
  aoEscolher,
}: {
  marcada: boolean;
  titulo: string;
  descricao: string;
  valor: number | null;
  aPartirDe?: boolean;
  ressalva?: string;
  itens?: string[];
  aoEscolher: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-jb-500",
        marcada ? "border-jb-400 bg-jb-50/60" : "border-graf-200 bg-white hover:bg-graf-50",
      )}
    >
      <input
        type="radio"
        name="jb-care"
        checked={marcada}
        onChange={aoEscolher}
        className="mt-0.5 size-[18px] shrink-0 border-graf-450 text-jb-500 focus:outline-none"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-graf-900">{titulo}</span>
          {valor !== null ? (
            <span className="shrink-0 text-right text-sm font-bold tabular text-graf-800">
              {aPartirDe ? (
                <span className="block text-[0.6875rem] font-semibold uppercase tracking-wide text-graf-500">
                  a partir de
                </span>
              ) : null}
              + {formatarPreco(valor)}
            </span>
          ) : aPartirDe ? (
            <span className="shrink-0 text-xs font-semibold text-graf-500">sob orçamento</span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-graf-500">{descricao}</span>
        {ressalva ? (
          <span className="mt-1.5 block text-[0.75rem] leading-5 text-graf-500">{ressalva}</span>
        ) : null}
        {itens && itens.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {itens.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-graf-200 bg-white px-2.5 py-0.5 text-[0.75rem] font-semibold text-graf-700"
              >
                {item}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </label>
  );
}
