import "server-only";

import type { MensagemDeEmail, ProvedorDeEmail, ResultadoEnvio } from "@/lib/email/tipos";

/**
 * Adapter da Resend — HTTP puro, sem dependência nova.
 *
 * O SDK oficial (`resend`) não foi instalado de propósito: a API são dois
 * campos de cabeçalho e um JSON, e `fetch` já existe no runtime do Next. Menos
 * uma dependência para auditar, atualizar e carregar no bundle do servidor.
 *
 * Duas decisões que importam:
 *
 * 1. Tempo limite explícito. Sem `AbortSignal.timeout`, uma chamada presa
 *    seguraria o worker até o limite da função serverless e a fila inteira
 *    ficaria parada por causa de uma mensagem só.
 *
 * 2. Erro nunca vira exceção. Quem chama é o processador da fila, que precisa
 *    gravar o motivo na linha e seguir para a próxima mensagem. Um `throw` aqui
 *    derrubaria o lote inteiro.
 *
 * Documentação da API: POST https://api.resend.com/emails, com
 * `Authorization: Bearer <RESEND_API_KEY>` e corpo `{from, to, subject, text, html}`.
 */

const ENDPOINT = "https://api.resend.com/emails";
const TEMPO_LIMITE_MS = 15_000;

/** Resposta de erro da Resend vem em JSON; o texto cru é o plano B. */
function resumirFalha(status: number, corpo: string) {
  const cru = corpo.trim();
  if (!cru) return `Resend respondeu ${status} sem corpo.`;

  try {
    const dados: unknown = JSON.parse(cru);
    if (dados && typeof dados === "object") {
      const registro = dados as Record<string, unknown>;
      const mensagem = registro.message ?? registro.error ?? registro.name;
      if (typeof mensagem === "string" && mensagem.trim()) {
        return `Resend respondeu ${status}: ${mensagem.trim()}`;
      }
    }
  } catch {
    // corpo não era JSON — cai no texto cru
  }

  return `Resend respondeu ${status}: ${cru.slice(0, 200)}`;
}

function lerId(corpo: string) {
  try {
    const dados: unknown = JSON.parse(corpo);
    if (dados && typeof dados === "object") {
      const id = (dados as Record<string, unknown>).id;
      if (typeof id === "string" && id.trim()) return id.trim();
    }
  } catch {
    // sem id legível: o envio valeu, só não dá para rastrear pelo id
  }
  return "";
}

export class ProvedorResend implements ProvedorDeEmail {
  readonly nome = "resend";
  readonly entrega = true;

  constructor(
    private readonly chave: string,
    private readonly remetente: string,
  ) {}

  async enviar(mensagem: MensagemDeEmail): Promise<ResultadoEnvio> {
    try {
      const resposta = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.chave}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.remetente,
          to: [mensagem.para],
          subject: mensagem.assunto,
          text: mensagem.texto,
          ...(mensagem.html ? { html: mensagem.html } : {}),
        }),
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
        cache: "no-store",
      });

      const corpo = await resposta.text();

      if (!resposta.ok) {
        return { ok: false, erro: resumirFalha(resposta.status, corpo) };
      }

      return { ok: true, id: lerId(corpo) || "resend:sem-id", entregue: true };
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "TimeoutError") {
        return { ok: false, erro: `Resend não respondeu em ${TEMPO_LIMITE_MS / 1000}s.` };
      }
      const detalhe = erro instanceof Error ? erro.message : String(erro);
      return { ok: false, erro: `Falha de rede ao falar com a Resend: ${detalhe}` };
    }
  }
}
