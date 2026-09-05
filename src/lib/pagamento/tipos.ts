import type { PaymentMethod, PaymentStatus } from "@prisma/client";

/**
 * Contrato do provedor de pagamento.
 *
 * A aplicação nunca fala com um provedor específico: fala com esta interface.
 * Trocar de adquirente é escrever outro adapter, sem tocar em pedido, estoque
 * ou nas telas.
 *
 * Nada de número de cartão ou CVV passa por aqui — a tokenização acontece no
 * navegador, contra o provedor, e só o token chega ao servidor.
 */

export type DadosCobranca = {
  pedidoId: string;
  pedidoNumero: string;
  valorCents: number;
  metodo: PaymentMethod;
  parcelas: number;
  pagador: {
    nome: string;
    email: string;
    documento: string;
    telefone: string;
  };
  /** token gerado pelo SDK do provedor no navegador; nunca o cartão em si */
  tokenCartao?: string;
  bandeira?: string;
  /** chave de idempotência: repetir a mesma chave não cobra duas vezes */
  chaveIdempotencia: string;
};

export type ResultadoCobranca = {
  externalId: string;
  status: PaymentStatus;
  /** Pix */
  qrCode?: string;
  copiaECola?: string;
  expiraEm?: Date;
  /** cartão */
  bandeira?: string;
  ultimos4?: string;
  motivoFalha?: string;
};

export type EventoWebhook = {
  /** identificador único do evento no provedor, para garantir idempotência */
  chave: string;
  externalId: string;
  status: PaymentStatus;
  tipo: string;
  bruto: unknown;
};

export interface ProvedorPagamento {
  readonly nome: string;
  /** métodos que este provedor aceita no ambiente atual */
  readonly metodos: readonly PaymentMethod[];

  criarCobranca(dados: DadosCobranca): Promise<ResultadoCobranca>;

  /**
   * Lê e valida a notificação recebida. Devolve null quando a assinatura não
   * confere — nesse caso nada é processado.
   */
  lerWebhook(request: Request, corpo: string): Promise<EventoWebhook | null>;

  /** Consulta o provedor. É a fonte da verdade, nunca o navegador. */
  consultar(externalId: string): Promise<{ status: PaymentStatus } | null>;

  estornar?(externalId: string, valorCents?: number): Promise<boolean>;
}
