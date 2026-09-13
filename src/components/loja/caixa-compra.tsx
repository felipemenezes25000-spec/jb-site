"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  Sliders,
  Truck,
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
    <div className="overflow-hidden rounded-[1.75rem] border border-graf-200 bg-white shadow-[0_28px_80px_-48px_rgba(15,23,42,0.5)] ring-1 ring-black/[0.015]">
      <div className="h-1 bg-[linear-gradient(90deg,var(--color-jb-700),var(--color-jb-500),var(--color-jb-700))]" />

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
          {!soOrcamento ? <span className="micro text-graf-400">Compra direta</span> : null}
        </div>

        {soOrcamento ? (
          <div>
            <p className="fonte-display text-2xl leading-tight tracking-[-0.025em] text-graf-950">
              Disponível sob orçamento
            </p>
            <p className="mt-2 max-w-[38ch] text-sm leading-5 text-graf-600">
              A JB confirma preço, disponibilidade e condições deste produto antes da proposta.
            </p>
          </div>
        ) : (
          <div>
            <p className="micro mb-2 text-graf-500">Preço deste equipamento</p>
            {precoAnteriorCents ? (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm tabular text-graf-500 line-through">
                  {formatarPreco(precoAnteriorCents)}
                </span>
                {desconto >= 5 ? <Etiqueta tom="ok">−{desconto}%</Etiqueta> : null}
              </div>
            ) : null}

            <p className="numero text-[clamp(2rem,1.85rem+0.5vw,2.35rem)] leading-none tracking-[-0.03em] text-graf-950">
              {formatarPreco(precoCents)}
            </p>

            {parcelas ? (
              <p className="mt-2.5 text-sm leading-5 text-graf-600">
                até{" "}
                <span className="font-extrabold text-graf-900">
                  {parcelas.parcelas}× de {formatarPreco(parcelas.valorCents)}
                </span>{" "}
                sem juros
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-graf-500">
                <CreditCard className="size-3.5 shrink-0" aria-hidden />
                Pix ou cartão de crédito
              </span>
              {economiaCents > 0 ? (
                <span className="inline-flex rounded-full bg-ok-50 px-2.5 py-1 text-xs font-extrabold text-ok-700 ring-1 ring-ok-500/15">
                  Você economiza {formatarPreco(economiaCents)}
                </span>
              ) : null}
            </div>

            {baseCompravel ? (
              <a
                href="#entrega-cep"
                className="foco-jb group mt-4 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-graf-200 bg-graf-50/70 px-3.5 text-sm font-bold text-graf-700 transition-all hover:border-graf-300 hover:bg-white hover:text-graf-950"
              >
                <span className="inline-flex items-center gap-2">
                  <Truck className="size-4 text-jb-700" aria-hidden />
                  Calcular frete e prazo
                </span>
                <ArrowRight className="size-4 text-graf-400 transition-transform group-hover:translate-x-0.5 group-hover:text-jb-700" aria-hidden />
              </a>
            ) : null}
          </div>
        )}
      </div>

      {baseCompravel ? (
        <form action={acao} className="border-t border-hairline bg-white px-5 py-4 sm:px-6 sm:py-5">
          <input type="hidden" name="produtoId" value={produtoId} />
          <input type="hidden" name="quantidade" value={quantidade} />
          {escolhidos.map((id) => (
            <input key={id} type="hidden" name="addons" value={id} />
          ))}

          {mostrarTotal ? (
            <div className="mb-3 flex items-end justify-between gap-4 rounded-2xl border border-graf-200 bg-graf-50/75 px-4 py-3.5">
              <span>
                <span className="block micro text-graf-500">Total configurado</span>
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

          <div className="grid gap-2.5">
            <Botao
              type="submit"
              tamanho="lg"
              larguraTotal
              className="min-h-14 rounded-xl shadow-[0_14px_30px_-18px_rgba(190,24,24,0.7)]"
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
              variante="sutil"
              tamanho="md"
              larguraTotal
              className="min-h-11 rounded-xl"
              disabled={enviando || !podeComprar}
              carregando={enviando && !irParaPagamento && podeComprar}
              onClick={() => {
                destinoRef.current = "carrinho";
                setIrParaPagamento(false);
              }}
            >
              <ShoppingCart className="size-4" aria-hidden />
              Adicionar ao carrinho
            </Botao>
          </div>

          <p className="mt-2.5 text-center text-[11px] leading-4 text-graf-400">
            Serviços e total podem ser revisados antes do pagamento.
          </p>

          {permiteOrcamento ? (
            <div className="mt-1 text-center">
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
        <div className="border-t border-hairline p-5 sm:p-6">
          <LinkBotao href={hrefOrcamento} tamanho="lg" larguraTotal className="min-h-13 rounded-xl">
            Solicitar orçamento
          </LinkBotao>
          <p className="mt-2 text-center text-xs leading-5 text-graf-500">
            Receba preço, prazo e condições em uma única proposta.
          </p>
        </div>
      ) : (
        <div className="border-t border-hairline p-5 sm:p-6">
          <LinkBotao href="/contato" variante="secundario" tamanho="lg" larguraTotal>
            Falar com a equipe
          </LinkBotao>
        </div>
      )}

      {baseCompravel ? <EntregaPorCep produtoId={produtoId} /> : null}

      {temOpcoes ? (
        <details className="group border-t border-hairline">
          <summary className="foco-jb flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-50/70 [&::-webkit-details-marker]:hidden sm:px-6">
            <span className="flex min-w-0 items-center gap-2">
              <Sliders className="size-4 shrink-0 text-jb-600" aria-hidden />
              Mais opções da compra
            </span>
            <ChevronDown className="size-4 shrink-0 text-graf-500 transition-transform group-open:rotate-180" aria-hidden />
          </summary>

          <div className="space-y-4 border-t border-hairline bg-graf-50/35 px-5 py-4 sm:px-6">
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
              {aPartirDe ? <span className="block micro text-graf-500">a partir de</span> : null}
              + {formatarPreco(valor)}
            </span>
          ) : aPartirDe ? (
            <span className="shrink-0 text-xs font-semibold text-graf-500">sob orçamento</span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-graf-500">{descricao}</span>
        {ressalva ? <span className="mt-1.5 block texto-apoio text-graf-500">{ressalva}</span> : null}
        {itens && itens.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {itens.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-graf-200 bg-white px-2.5 py-0.5 texto-apoio font-semibold text-graf-700"
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
