"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FlaskConical, QrCode, RefreshCw, SearchCheck } from "lucide-react";

import { tentarPagamentoNovamente, type EstadoCheckout } from "@/app/acoes/checkout";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";

/* ============================================================================
   Acompanhamento do pedido — as partes que precisam do navegador

   Três coisas moram aqui, e só três: o relógio que busca o novo estado do
   pagamento, a conferência de e-mail de quem comprou sem conta, e o painel de
   simulação que só existe fora de produção.

   Tudo que decide alguma coisa continua no servidor. Este arquivo não sabe se
   um pagamento foi aprovado — ele só pede à página que se recarregue.
   ============================================================================ */

export type EstadoConferencia = { erro?: string; ok?: boolean };

/* --------------------------------------------------- atualização automática */

const INTERVALO_MS = 12_000;
const TETO_SEM_VALIDADE_MS = 30 * 60_000;

export function AtualizarPagamento({
  ativo,
  expiraEm,
}: {
  ativo: boolean;
  expiraEm: string | null;
}) {
  const router = useRouter();
  const [atualizando, iniciar] = useTransition();

  useEffect(() => {
    if (!ativo) return;

    const limite = expiraEm
      ? new Date(expiraEm).getTime()
      : Date.now() + TETO_SEM_VALIDADE_MS;

    const relogio = setInterval(() => {
      // depois do vencimento não há mais o que esperar do provedor
      if (Date.now() > limite + 20_000) {
        clearInterval(relogio);
        return;
      }
      // aba escondida não precisa consultar: economiza banco e bateria
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, INTERVALO_MS);

    return () => clearInterval(relogio);
  }, [ativo, expiraEm, router]);

  if (!ativo) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-graf-200 pt-4">
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-graf-500" aria-live="polite">
        {atualizando
          ? "Consultando o pagamento…"
          : "Esta página verifica o pagamento a cada 12 segundos."}
      </p>
      <Botao
        type="button"
        variante="sutil"
        tamanho="sm"
        carregando={atualizando}
        onClick={() => iniciar(() => router.refresh())}
      >
        <RefreshCw className="size-4" aria-hidden />
        Atualizar agora
      </Botao>
    </div>
  );
}

/* ----------------------------------------------------- conferência de acesso */

export function ConfirmarEmailPedido({
  numero,
  acao,
}: {
  numero: string;
  acao: (estado: EstadoConferencia, formData: FormData) => Promise<EstadoConferencia>;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoConferencia, FormData>(acao, {});
  const router = useRouter();

  // A ação grava o cookie de acesso e o Next já re-renderiza a rota na mesma
  // resposta (02-guides/server-actions.md: mutar cookie dispara re-render).
  // Este refresh é cinto e suspensório: se por qualquer motivo a portaria
  // continuar na tela, uma nova requisição resolve em vez de travar a pessoa.
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  return (
    <form action={enviar} className="space-y-5" noValidate>
      <input type="hidden" name="numero" value={numero} />

      {estado.erro ? (
        <Aviso tom="erro" titulo="Não conseguimos abrir este pedido">
          {estado.erro}
        </Aviso>
      ) : null}

      <Campo
        rotulo="Número do pedido"
        name="numeroVisivel"
        value={numero}
        readOnly
        aria-readonly="true"
        className="max-w-xs"
        onChange={() => undefined}
      />

      <Campo
        rotulo="E-mail usado na compra"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        autoFocus
        ajuda="É a mesma conferência que a JB faz por telefone antes de falar de um pedido."
      />

      <Botao type="submit" carregando={enviando}>
        <SearchCheck className="size-4" aria-hidden />
        Ver meu pedido
      </Botao>
    </form>
  );
}

/* --------------------------------------------------- nova tentativa de pagar */

export function TentarNovamente({
  numero,
  metodos,
  rotulo = "Gerar novo pagamento",
}: {
  numero: string;
  /** O que dá para reabrir sem passar pelo checkout de novo. */
  metodos: { valor: string; rotulo: string }[];
  rotulo?: string;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoCheckout, FormData>(
    tentarPagamentoNovamente,
    {},
  );
  const [metodo, setMetodo] = useState(metodos[0]?.valor ?? "pix");

  if (metodos.length === 0) return null;

  return (
    <form action={enviar} className="mt-4 space-y-3">
      <input type="hidden" name="numero" value={numero} />
      <input type="hidden" name="metodo" value={metodo} />

      {estado.erro ? (
        <Aviso tom="erro" titulo="Não deu para gerar a cobrança">
          {estado.erro}
        </Aviso>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {metodos.length > 1 ? (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Forma de pagamento da nova tentativa</legend>
            {metodos.map((opcao) => {
              const ativo = opcao.valor === metodo;
              return (
                <label
                  key={opcao.valor}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500 ${
                    ativo
                      ? "border-jb-500 bg-jb-50 font-semibold text-jb-800"
                      : "border-graf-300 bg-white text-graf-700 hover:border-graf-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="metodoEscolhido"
                    value={opcao.valor}
                    checked={ativo}
                    onChange={() => setMetodo(opcao.valor)}
                    className="sr-only"
                  />
                  {opcao.valor === "pix" ? (
                    <QrCode className="size-4" aria-hidden />
                  ) : (
                    <CreditCard className="size-4" aria-hidden />
                  )}
                  {opcao.rotulo}
                </label>
              );
            })}
          </fieldset>
        ) : null}

        <Botao type="submit" carregando={enviando}>
          {rotulo}
        </Botao>
      </div>
    </form>
  );
}

/* --------------------------------------------------------- painel de teste */

const DESFECHOS = [
  { status: "aprovado", rotulo: "Aprovar pagamento", variante: "primario" as const },
  { status: "recusado", rotulo: "Recusar", variante: "secundario" as const },
  { status: "expirado", rotulo: "Expirar", variante: "secundario" as const },
];

/**
 * Só é montado quando o provedor de teste está ativo. Existe para que a
 * demonstração feche o ciclo — abrir o pedido, "pagar" e ver o status mudar —
 * sem depender de adquirente. A rota que ele chama devolve 404 em produção.
 */
export function PainelSimulacao({ externalId }: { externalId: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");

  async function simular(status: string) {
    setOcupado(status);
    setErro("");
    try {
      const resposta = await fetch("/api/pagamento/simular", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ externalId, status }),
      });
      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        setErro(corpo?.erro ?? "A simulação não foi aceita.");
        return;
      }
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-dashed border-warn-500/40 bg-warn-50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-warn-700">
        <FlaskConical className="size-4 shrink-0" aria-hidden />
        Simulação — não aparece em produção
      </p>
      <p className="mt-1 text-sm leading-relaxed text-graf-700">
        Esta loja está com o provedor de pagamento de teste. Os botões abaixo disparam a mesma
        rota de webhook que o provedor real chamaria.
      </p>

      {erro ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-jb-700">
          {erro}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {DESFECHOS.map((desfecho) => (
          <Botao
            key={desfecho.status}
            type="button"
            variante={desfecho.variante}
            tamanho="sm"
            carregando={ocupado === desfecho.status}
            disabled={ocupado !== ""}
            onClick={() => void simular(desfecho.status)}
          >
            {desfecho.rotulo}
          </Botao>
        ))}
      </div>
    </div>
  );
}
