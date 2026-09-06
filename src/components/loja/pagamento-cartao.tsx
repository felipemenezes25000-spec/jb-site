"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

import { Botao } from "@/components/ui/button";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { Campo, Selecao } from "@/components/ui/form";
import { formatarPreco, somenteDigitos } from "@/lib/format";

/* ============================================================================
   Pagamento com cartão

   A fronteira que este arquivo protege, e que não pode ser cruzada:

   ┌─ PRODUÇÃO ────────────────────────────────────────────────────────────┐
   │ número do cartão, validade e CVV NUNCA existem em campo nosso.        │
   │ Eles são digitados dentro de iframes do provedor (Secure Fields), que │
   │ devolvem um token de uso único. Só o token chega ao nosso servidor.   │
   │ É o que mantém a JB fora do escopo pesado do PCI-DSS — e o que impede │
   │ que um vazamento nosso vire vazamento de cartão.                      │
   └───────────────────────────────────────────────────────────────────────┘

   ┌─ SIMULAÇÃO (provedor de teste) ───────────────────────────────────────┐
   │ nenhum dado de cartão é pedido, nem de mentira. O provedor de teste   │
   │ decide o resultado pelo total do pedido, então o formulário aqui só   │
   │ escolhe a bandeira exibida e diz, por escrito, o que vai acontecer.   │
   │ Um campo com cara de "número do cartão" ensinaria o hábito errado.    │
   └───────────────────────────────────────────────────────────────────────┘
   ============================================================================ */

export type DadosCartao = { token: string; bandeira: string };

/* ------------------------------------------------------- SDK do provedor */

type EventoBin = { bin?: string | null };

type CampoSeguro = {
  mount(idDoElemento: string): CampoSeguro;
  unmount(): void;
  on(evento: "binChange", callback: (dados: EventoBin) => void): CampoSeguro;
};

type CamposCartao = {
  create(
    tipo: "cardNumber" | "expirationDate" | "securityCode",
    opcoes?: { placeholder?: string },
  ): CampoSeguro;
  createCardToken(dados: {
    cardholderName: string;
    identificationType: string;
    identificationNumber: string;
  }): Promise<{ id: string }>;
};

type ClienteCartao = {
  fields: CamposCartao;
  getPaymentMethods(consulta: { bin: string }): Promise<{ results?: { id?: string }[] }>;
};

type ConstrutorCartao = new (chave: string, opcoes?: { locale?: string }) => ClienteCartao;

declare global {
  interface Window {
    MercadoPago?: ConstrutorCartao;
  }
}

const SDK_MERCADOPAGO = "https://sdk.mercadopago.com/js/v2";

function carregarSdk(): Promise<ConstrutorCartao> {
  return new Promise((resolver, rejeitar) => {
    if (window.MercadoPago) {
      resolver(window.MercadoPago);
      return;
    }

    const jaNaPagina = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_MERCADOPAGO}"]`,
    );
    const script = jaNaPagina ?? document.createElement("script");

    script.addEventListener("load", () => {
      if (window.MercadoPago) resolver(window.MercadoPago);
      else rejeitar(new Error("O SDK carregou sem o objeto esperado."));
    });
    script.addEventListener("error", () =>
      rejeitar(new Error("Não foi possível carregar o SDK do provedor.")),
    );

    if (!jaNaPagina) {
      script.src = SDK_MERCADOPAGO;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/* ------------------------------------------------------------- simulação */

const BANDEIRAS = [
  { valor: "visa", rotulo: "Visa" },
  { valor: "master", rotulo: "Mastercard" },
  { valor: "elo", rotulo: "Elo" },
  { valor: "amex", rotulo: "American Express" },
  { valor: "hipercard", rotulo: "Hipercard" },
];

/**
 * O código da bandeira ("master", "elo") é linguagem de sistema. Na tela vale
 * o nome que está impresso no cartão; o que não estiver na lista aparece com
 * a inicial maiúscula, que ainda se lê melhor do que o código cru.
 */
function rotuloBandeira(valor: string) {
  const conhecida = BANDEIRAS.find((b) => b.valor === valor.toLowerCase());
  if (conhecida) return conhecida.rotulo;
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function tokenDeSimulacao() {
  const aleatorio =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `simulado_${aleatorio}`;
}

/** O provedor de teste decide pelo final do valor — então a tela pode adiantar. */
function desfechoSimulado(valorCents: number) {
  const final = valorCents % 100;
  if (final === 1) return "Como este total termina em ,01, a demonstração vai recusar o cartão.";
  if (final === 2) return "Como este total termina em ,02, a demonstração vai deixar em análise.";
  return "Como este total não termina em ,01 nem ,02, a demonstração vai aprovar o cartão.";
}

function CartaoSimulado({
  valorCents,
  bandeira,
  aoMudar,
}: {
  valorCents: number;
  bandeira: string;
  aoMudar: (dados: DadosCartao) => void;
}) {
  const refAoMudar = useRef(aoMudar);
  useEffect(() => {
    refAoMudar.current = aoMudar;
  });

  // o token nasce no cliente para não gerar diferença entre servidor e navegador
  useEffect(() => {
    refAoMudar.current({ token: tokenDeSimulacao(), bandeira });
  }, [bandeira]);

  return (
    <div className="space-y-4">
      <Aviso tom="atencao" titulo="Pagamento em demonstração">
        Esta loja está em ambiente de demonstração: nenhuma cobrança acontece e{" "}
        <strong className="font-semibold">nenhum dado de cartão é pedido</strong>, nem de mentira.{" "}
        {desfechoSimulado(valorCents)}
      </Aviso>

      <Selecao
        rotulo="Bandeira exibida no pedido"
        name="bandeira"
        value={bandeira}
        onChange={(evento) =>
          refAoMudar.current({ token: tokenDeSimulacao(), bandeira: evento.currentTarget.value })
        }
        ajuda={`Só para a demonstração ficar completa. Valor exibido: ${formatarPreco(valorCents)}.`}
      >
        {BANDEIRAS.map((b) => (
          <option key={b.valor} value={b.valor}>
            {b.rotulo}
          </option>
        ))}
      </Selecao>
    </div>
  );
}

/* ------------------------------------------------------ cartão de verdade */

// graf-450 é o degrau de borda que cumpre 3:1 — o mesmo dos campos de
// <Campo>, para o cartão não parecer um formulário de outra loja
const CAIXA_SEGURA =
  "h-11 w-full rounded-lg border border-graf-450 bg-white px-3.5 shadow-xs " +
  "[&>iframe]:h-full [&>iframe]:w-full";

function CartaoTokenizado({
  chavePublica,
  documento,
  parcelas,
  valorCents,
  token,
  bandeira,
  aoMudar,
}: {
  chavePublica: string;
  documento: string;
  parcelas: number;
  valorCents: number;
  token: string;
  bandeira: string;
  aoMudar: (dados: DadosCartao) => void;
}) {
  const base = useId().replace(/[^a-zA-Z0-9]/g, "");
  const idNumero = `cartao-numero-${base}`;
  const idValidade = `cartao-validade-${base}`;
  const idCodigo = `cartao-codigo-${base}`;

  const [estado, setEstado] = useState<"carregando" | "pronto" | "validando" | "falhou">(
    "carregando",
  );
  const [erro, setErro] = useState("");
  const [titular, setTitular] = useState("");

  const refCliente = useRef<ClienteCartao | null>(null);
  const refBandeira = useRef("");
  const refAoMudar = useRef(aoMudar);
  useEffect(() => {
    refAoMudar.current = aoMudar;
  });

  useEffect(() => {
    let vivo = true;
    const campos: CampoSeguro[] = [];

    async function montar() {
      try {
        const Construtor = await carregarSdk();
        if (!vivo) return;

        const cliente = new Construtor(chavePublica, { locale: "pt-BR" });
        refCliente.current = cliente;

        const numero = cliente.fields
          .create("cardNumber", { placeholder: "0000 0000 0000 0000" })
          .mount(idNumero);
        campos.push(numero);
        campos.push(
          cliente.fields.create("expirationDate", { placeholder: "MM/AA" }).mount(idValidade),
        );
        campos.push(cliente.fields.create("securityCode", { placeholder: "CVV" }).mount(idCodigo));

        // a bandeira sai dos 6 primeiros dígitos, que ficam dentro do iframe:
        // o SDK só nos entrega o BIN, nunca o número
        numero.on("binChange", async (dados) => {
          refAoMudar.current({ token: "", bandeira: "" });
          const bin = dados.bin ?? "";
          if (bin.length < 6) {
            refBandeira.current = "";
            return;
          }
          try {
            const metodos = await cliente.getPaymentMethods({ bin });
            refBandeira.current = metodos.results?.[0]?.id ?? "";
          } catch {
            refBandeira.current = "";
          }
        });

        if (vivo) setEstado("pronto");
      } catch (falha) {
        if (!vivo) return;
        console.error("[cartao]", falha);
        setEstado("falhou");
        setErro(
          "Não conseguimos abrir o formulário do cartão. Atualize a página ou escolha o Pix para concluir o pedido.",
        );
      }
    }

    void montar();

    return () => {
      vivo = false;
      for (const campo of campos) {
        try {
          campo.unmount();
        } catch {
          // o iframe pode já ter saído junto com a árvore; nada a fazer
        }
      }
    };
  }, [chavePublica, idNumero, idValidade, idCodigo]);

  const validar = useCallback(async () => {
    const cliente = refCliente.current;
    if (!cliente) return;

    const digitos = somenteDigitos(documento);
    if (titular.trim().length < 3) {
      setErro("Informe o nome impresso no cartão.");
      return;
    }
    if (digitos.length !== 11 && digitos.length !== 14) {
      setErro("Confira o CPF ou CNPJ na etapa de dados antes de validar o cartão.");
      return;
    }

    setEstado("validando");
    setErro("");
    try {
      const resultado = await cliente.fields.createCardToken({
        cardholderName: titular.trim(),
        identificationType: digitos.length > 11 ? "CNPJ" : "CPF",
        identificationNumber: digitos,
      });
      refAoMudar.current({ token: resultado.id, bandeira: refBandeira.current });
      setEstado("pronto");
    } catch (falha) {
      console.error("[cartao]", falha);
      refAoMudar.current({ token: "", bandeira: "" });
      setEstado("pronto");
      setErro("Não conseguimos validar este cartão. Confira os dados e tente de novo.");
    }
  }, [documento, titular]);

  return (
    <div className="space-y-4">
      <Aviso tom="info" titulo="Pagamento seguro">
        Número, validade e código de segurança vão direto para o meio de pagamento. A JB não
        recebe e não guarda os dados do seu cartão.
      </Aviso>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-graf-800" id={`${base}-numero`}>
          Número do cartão
        </span>
        <div id={idNumero} className={CAIXA_SEGURA} aria-labelledby={`${base}-numero`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span
            className="mb-1.5 block text-sm font-semibold text-graf-800"
            id={`${base}-validade`}
          >
            Validade
          </span>
          <div id={idValidade} className={CAIXA_SEGURA} aria-labelledby={`${base}-validade`} />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-graf-800" id={`${base}-cvv`}>
            Código de segurança
          </span>
          <div id={idCodigo} className={CAIXA_SEGURA} aria-labelledby={`${base}-cvv`} />
        </div>
      </div>

      <Campo
        rotulo="Nome impresso no cartão"
        name="titularCartao"
        autoComplete="cc-name"
        value={titular}
        onChange={(evento) => {
          setTitular(evento.currentTarget.value);
          if (token) refAoMudar.current({ token: "", bandeira: "" });
        }}
        required
      />

      {estado === "carregando" ? (
        <p className="flex items-center gap-2 text-sm text-graf-600">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Preparando o formulário do cartão…
        </p>
      ) : null}

      {erro ? (
        <Aviso tom="erro" titulo="Cartão não validado">
          {erro}
        </Aviso>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Botao
          type="button"
          variante="secundario"
          onClick={() => void validar()}
          disabled={estado === "carregando" || estado === "falhou"}
          carregando={estado === "validando"}
        >
          <ShieldCheck className="size-4" aria-hidden />
          {token ? "Validar de novo" : "Validar cartão"}
        </Botao>

        {token ? (
          <Etiqueta tom="ok" ponto>
            Cartão validado{bandeira ? ` · ${rotuloBandeira(bandeira)}` : ""}
          </Etiqueta>
        ) : (
          <span className="text-sm text-graf-600">
            Valide o cartão para seguir para a revisão do pedido.
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-graf-600">
        {parcelas > 1
          ? `Cobrança em ${parcelas}× de ${formatarPreco(Math.floor(valorCents / parcelas))}, sem juros.`
          : `Cobrança de ${formatarPreco(valorCents)} à vista.`}{" "}
        Nada é debitado antes de você confirmar o pedido.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- componente */

export function PagamentoCartao({
  simulado,
  provedorNome,
  chavePublica,
  documento,
  valorCents,
  parcelas,
  token,
  bandeira,
  aoMudar,
}: {
  simulado: boolean;
  provedorNome: string;
  chavePublica: string;
  /** CPF ou CNPJ do comprador, exigido pelo provedor na tokenização. */
  documento: string;
  valorCents: number;
  parcelas: number;
  token: string;
  bandeira: string;
  aoMudar: (dados: DadosCartao) => void;
}) {
  const podeTokenizar = provedorNome === "mercadopago" && chavePublica !== "";

  return (
    <div>
      {simulado ? (
        <CartaoSimulado valorCents={valorCents} bandeira={bandeira} aoMudar={aoMudar} />
      ) : podeTokenizar ? (
        <CartaoTokenizado
          chavePublica={chavePublica}
          documento={documento}
          parcelas={parcelas}
          valorCents={valorCents}
          token={token}
          bandeira={bandeira}
          aoMudar={aoMudar}
        />
      ) : (
        <Aviso tom="atencao" titulo="Cartão indisponível no momento">
          <span className="flex flex-wrap items-start gap-2">
            <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden />
            Não é possível receber cartão agora. Escolha o Pix para concluir o pedido, ou fale
            com a JB se preferir combinar outra forma.
          </span>
        </Aviso>
      )}

      {/* o servidor recebe só isto do cartão: um token e a bandeira */}
      <input type="hidden" name="tokenCartao" value={token} />
      {simulado ? null : <input type="hidden" name="bandeira" value={bandeira} />}
    </div>
  );
}
