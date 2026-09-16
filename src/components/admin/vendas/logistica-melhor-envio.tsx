"use client";

import { useActionState } from "react";
import { ExternalLink, Package, RefreshCw, TestTube2, Truck } from "lucide-react";

import {
  atualizarRastreioPedido,
  gerarEtiquetaPedido,
  reprocessarEtiquetaPedido,
  salvarDimensoesProduto,
  testarCotacaoProduto,
  type EstadoLogistica,
} from "@/app/acoes/logistica";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { formatarPreco } from "@/lib/format";
import type { MetaMelhorEnvio } from "@/lib/logistica-meta";

const INICIAL: EstadoLogistica = {};

type Produto = {
  id: string;
  name: string;
  sku: string;
  status: string;
  priceCents: number;
  weightGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
};

type Pedido = {
  id: string;
  number: string;
  status: string;
  buyerName: string;
  shippingLabel: string;
  paidAt: string | null;
  shipCity: string;
  shipState: string;
  meta: MetaMelhorEnvio | null;
};

type StatusIntegracao = {
  enabled: boolean;
  environment: "sandbox" | "production";
  quoteReady: boolean;
  labelReady: boolean;
  nonCommercial: boolean;
  missingQuote: string[];
  missingLabel: string[];
};

const input =
  "mt-1 min-h-11 w-full rounded-lg border border-graf-300 bg-white px-3 text-sm text-graf-950 outline-none transition focus:border-jb-500 focus:ring-2 focus:ring-jb-500/15";
const label = "text-xs font-bold uppercase tracking-wider text-graf-500";

function Estado({ estado }: { estado: EstadoLogistica }) {
  if (estado.erro) {
    return <Aviso tom="erro" titulo="Não foi possível concluir">{estado.erro}</Aviso>;
  }
  if (estado.ok && estado.mensagem) {
    return <Aviso tom="sucesso" titulo="Pronto">{estado.mensagem}</Aviso>;
  }
  return null;
}

function LinhaProduto({ produto, podeEditar }: { produto: Produto; podeEditar: boolean }) {
  const [estado, acao, enviando] = useActionState(salvarDimensoesProduto, INICIAL);

  return (
    <form action={acao} className="rounded-xl border border-graf-200 bg-white p-4">
      <input type="hidden" name="productId" value={produto.id} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-graf-950">{produto.name}</p>
          <p className="mt-0.5 text-xs text-graf-500">{produto.sku} · {produto.status}</p>
        </div>
        <span className="text-sm font-semibold tabular text-graf-700">{formatarPreco(produto.priceCents)}</span>
      </div>

      <fieldset disabled={!podeEditar} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className={label}>
          Peso (g)
          <input className={input} name="weightGrams" type="number" min={1} max={1000000} required defaultValue={produto.weightGrams ?? ""} />
        </label>
        <label className={label}>
          Largura (mm)
          <input className={input} name="widthMm" type="number" min={1} max={5000} required defaultValue={produto.widthMm ?? ""} />
        </label>
        <label className={label}>
          Altura (mm)
          <input className={input} name="heightMm" type="number" min={1} max={5000} required defaultValue={produto.heightMm ?? ""} />
        </label>
        <label className={label}>
          Comprimento (mm)
          <input className={input} name="depthMm" type="number" min={1} max={5000} required defaultValue={produto.depthMm ?? ""} />
        </label>
      </fieldset>

      <div className="mt-4 space-y-3">
        <Estado estado={estado} />
        {podeEditar ? (
          <div className="flex justify-end">
            <Botao type="submit" carregando={enviando}>Salvar logística</Botao>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function TesteCotacao({ produtos }: { produtos: Produto[] }) {
  const [estado, acao, enviando] = useActionState(testarCotacaoProduto, INICIAL);

  return (
    <div className="rounded-2xl border border-graf-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <TestTube2 className="mt-0.5 size-5 shrink-0 text-jb-700" aria-hidden />
        <div>
          <h3 className="font-bold text-graf-950">Testar cotação agora</h3>
          <p className="mt-1 text-sm text-graf-600">Valida credencial, CEP, peso e dimensões sem criar pedido nem etiqueta.</p>
        </div>
      </div>
      <form action={acao} className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        <label className={label}>
          Produto
          <select name="productId" className={input} required defaultValue="">
            <option value="" disabled>Selecione</option>
            {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.name} · {produto.sku}</option>)}
          </select>
        </label>
        <label className={label}>
          CEP destino
          <input name="cep" className={input} inputMode="numeric" placeholder="00000-000" required />
        </label>
        <Botao type="submit" carregando={enviando}>Testar</Botao>
      </form>

      <div className="mt-4 space-y-3">
        <Estado estado={estado} />
        {estado.opcoes?.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {estado.opcoes.map((opcao) => (
              <div key={opcao.serviceId} className="rounded-xl bg-graf-50 p-3 text-sm">
                <p className="font-bold text-graf-900">{opcao.companyName} · {opcao.serviceName}</p>
                <p className="mt-1 text-graf-600">
                  {formatarPreco(opcao.priceCents)}
                  {opcao.deliveryDays ? ` · até ${opcao.deliveryDays} dias úteis` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PedidoLogistica({ pedido, nonCommercial }: { pedido: Pedido; nonCommercial: boolean }) {
  const [geracao, gerar, gerando] = useActionState(gerarEtiquetaPedido, INICIAL);
  const [reprocesso, reprocessar, reprocessando] = useActionState(reprocessarEtiquetaPedido, INICIAL);
  const [rastreio, atualizar, atualizando] = useActionState(atualizarRastreioPedido, INICIAL);
  const meta = pedido.meta;

  return (
    <div className="rounded-xl border border-graf-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-graf-950">{pedido.number} · {pedido.buyerName}</p>
          <p className="mt-0.5 text-xs text-graf-500">{pedido.shipCity}/{pedido.shipState} · {pedido.status}</p>
          <p className="mt-1 text-sm text-graf-700">{pedido.shippingLabel}</p>
        </div>
        <div className="text-right text-xs text-graf-500">
          <p>{meta?.status ? `ME: ${meta.status}` : "Ainda sem emissão"}</p>
          {meta?.trackingCode ? <p className="mt-1 font-bold text-graf-800">Rastreio {meta.trackingCode}</p> : null}
        </div>
      </div>

      {meta?.error ? <Aviso tom="atencao" titulo="Pendência da logística" className="mt-3">{meta.error}</Aviso> : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <form action={gerar} className="space-y-2 rounded-xl bg-graf-50 p-3">
          <input type="hidden" name="orderId" value={pedido.id} />
          {!nonCommercial ? (
            <label className={label}>
              Chave NF-e (44 dígitos)
              <input
                name="invoiceKey"
                className={input}
                inputMode="numeric"
                maxLength={44}
                defaultValue={meta?.invoiceKey ?? ""}
                placeholder="Obrigatória para venda comercial"
                required
              />
            </label>
          ) : null}
          <Botao type="submit" carregando={gerando} className="w-full">Gerar/comprar etiqueta</Botao>
          <Estado estado={geracao} />
        </form>

        <form action={reprocessar} className="space-y-2 rounded-xl bg-graf-50 p-3">
          <input type="hidden" name="orderId" value={pedido.id} />
          <p className="text-sm leading-relaxed text-graf-600">Retoma geração/impressão sem comprar o mesmo frete duas vezes.</p>
          <Botao type="submit" variante="secundario" carregando={reprocessando} className="w-full">
            <RefreshCw className="size-4" aria-hidden /> Reprocessar
          </Botao>
          <Estado estado={reprocesso} />
        </form>

        <form action={atualizar} className="space-y-2 rounded-xl bg-graf-50 p-3">
          <input type="hidden" name="orderId" value={pedido.id} />
          <p className="text-sm leading-relaxed text-graf-600">Consulta a transportadora e atualiza rastreio/status do pedido.</p>
          <Botao type="submit" variante="secundario" carregando={atualizando} className="w-full">
            <Truck className="size-4" aria-hidden /> Atualizar rastreio
          </Botao>
          <Estado estado={rastreio} />
        </form>
      </div>

      {meta?.labelUrl ? (
        <a href={meta.labelUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-jb-700 underline-offset-4 hover:underline">
          Abrir etiqueta <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

export function LogisticaMelhorEnvio({
  status,
  produtos,
  pedidos,
  podeEditar,
}: {
  status: StatusIntegracao;
  produtos: Produto[];
  pedidos: Pedido[];
  podeEditar: boolean;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-graf-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
              <Truck className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-bold text-graf-950">Melhor Envio</h2>
              <p className="mt-1 text-sm text-graf-600">Cotação → escolha do cliente → compra → geração da etiqueta → rastreio.</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold text-graf-900">{status.environment === "production" ? "Produção" : "Sandbox"}</p>
            <p className={status.quoteReady ? "text-ok-700" : "text-warn-700"}>{status.quoteReady ? "Cotação pronta" : "Cotação incompleta"}</p>
            <p className={status.labelReady ? "text-ok-700" : "text-warn-700"}>{status.labelReady ? "Etiquetas prontas" : "Etiquetas incompletas"}</p>
          </div>
        </div>

        {!status.enabled ? (
          <Aviso tom="info" titulo="Integração ainda desativada" className="mt-4">
            Preencha as variáveis do Melhor Envio. Até lá, o checkout continua usando a tabela própria da JB.
          </Aviso>
        ) : status.missingLabel.length ? (
          <Aviso tom="atencao" titulo="Faltam dados para automatizar etiquetas" className="mt-4">
            {status.missingLabel.join(", ")}
          </Aviso>
        ) : null}
      </div>

      <TesteCotacao produtos={produtos} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-graf-500" aria-hidden />
          <div>
            <h2 className="text-lg font-bold text-graf-950">Peso e dimensões por produto</h2>
            <p className="text-sm text-graf-600">Estes quatro campos alimentam diretamente a cotação da transportadora.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {produtos.map((produto) => <LinhaProduto key={produto.id} produto={produto} podeEditar={podeEditar} />)}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-graf-950">Pedidos no Melhor Envio</h2>
          <p className="mt-1 text-sm text-graf-600">NF-e, etiqueta, recuperação de falhas e rastreio ficam no mesmo lugar.</p>
        </div>
        {pedidos.length ? (
          <div className="grid gap-3">{pedidos.map((pedido) => <PedidoLogistica key={pedido.id} pedido={pedido} nonCommercial={status.nonCommercial} />)}</div>
        ) : (
          <div className="rounded-xl border border-dashed border-graf-300 p-6 text-center text-sm text-graf-500">Nenhum pedido do Melhor Envio ainda.</div>
        )}
      </div>
    </section>
  );
}
