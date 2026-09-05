/**
 * Contrato do provedor de e-mail.
 *
 * A plataforma nunca fala com a Resend, com um servidor SMTP ou com qualquer
 * outro serviço: fala com esta interface. Trocar de provedor é escrever outro
 * adapter em `src/lib/email/` e mudar uma variável de ambiente — nenhuma tela,
 * nenhum modelo de mensagem e nenhuma ação precisa saber quem entrega.
 *
 * Só tipos moram aqui, de propósito: este arquivo não importa `server-only`
 * nem toca no banco, então a tela do painel pode tipar o diagnóstico sem
 * arrastar o adapter junto.
 */

export type MensagemDeEmail = {
  /** Já normalizado e validado por quem chama. */
  para: string;
  assunto: string;
  /** Versão em texto puro. Obrigatória: é o que sobrevive em qualquer cliente. */
  texto: string;
  /** Versão em HTML. Opcional — provedor sem HTML manda só o texto. */
  html?: string;
};

export type ResultadoEnvio =
  | {
      ok: true;
      /** Identificador do provedor, ou um id local quando nada foi entregue. */
      id: string;
      /** `false` quando a mensagem só foi registrada, não entregue. */
      entregue: boolean;
      /** Explica o `entregue: false` para quem for ler a fila no painel. */
      aviso?: string;
    }
  | { ok: false; erro: string };

export interface ProvedorDeEmail {
  /** Nome curto, como aparece na tela da fila: "resend", "registro"… */
  readonly nome: string;
  /** `false` quando o provedor não coloca a mensagem na internet. */
  readonly entrega: boolean;
  enviar(mensagem: MensagemDeEmail): Promise<ResultadoEnvio>;
}

/** O que a tela do painel mostra sobre o envio, sem instanciar nada. */
export type DiagnosticoEmail = {
  provedor: string;
  entrega: boolean;
  /** Remetente configurado, ou vazio quando não há. */
  remetente: string;
  /** Por que este provedor foi escolhido. Texto para humano. */
  motivo: string;
};
