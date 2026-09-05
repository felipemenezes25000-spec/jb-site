import "server-only";

import { ProvedorDeRegistro } from "@/lib/email/registro";
import { ProvedorResend } from "@/lib/email/resend";
import { MOTIVO_SMTP_INDISPONIVEL, criarProvedorSmtp, smtpConfigurado } from "@/lib/email/smtp";
import type { DiagnosticoEmail, ProvedorDeEmail } from "@/lib/email/tipos";

export * from "@/lib/email/tipos";

/**
 * Fábrica do provedor de e-mail.
 *
 * A regra é o contrário da do pagamento: aqui NADA pode quebrar por falta de
 * credencial. Um pedido marcado como pago sem cobrança é fraude; um e-mail que
 * não sai é um incômodo. Então, sem configuração, o provedor de registro
 * assume, a fila continua andando e cada linha fica marcada como `simulado` —
 * com o motivo à vista na tela `/admin/mensagens`. A JB vê exatamente o que
 * teria sido enviado, e liga o provedor quando quiser.
 *
 * COMO A ESCOLHA É FEITA
 *
 *   EMAIL_PROVIDER=resend    → exige RESEND_API_KEY e EMAIL_FROM
 *   EMAIL_PROVIDER=smtp      → indisponível nesta versão (ver smtp.ts)
 *   EMAIL_PROVIDER=registro  → força o modo registro, útil em preview
 *   ausente                  → resend se houver credencial, registro se não
 *
 * Configuração pela metade (chave sem remetente, por exemplo) NÃO derruba a
 * aplicação: cai no registro explicando o que falta. Derrubar aqui derrubaria
 * junto o cadastro, o checkout e o chamado, que só queriam enfileirar aviso.
 */

/** Remetente. A Resend exige domínio verificado — daí ser obrigatório. */
function remetente() {
  return (process.env.EMAIL_FROM ?? "").trim();
}

function escolher(): { provedor: ProvedorDeEmail; diagnostico: DiagnosticoEmail } {
  const pedido = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  const chave = (process.env.RESEND_API_KEY ?? "").trim();
  const de = remetente();

  const registro = (motivo: string): { provedor: ProvedorDeEmail; diagnostico: DiagnosticoEmail } => ({
    provedor: new ProvedorDeRegistro(motivo),
    diagnostico: { provedor: "registro", entrega: false, remetente: de, motivo },
  });

  if (pedido === "registro") {
    return registro("EMAIL_PROVIDER=registro: envio desligado de propósito neste ambiente.");
  }

  if (pedido === "smtp") {
    const smtp = criarProvedorSmtp();
    if (smtp) {
      return {
        provedor: smtp,
        diagnostico: {
          provedor: smtp.nome,
          entrega: smtp.entrega,
          remetente: de,
          motivo: "EMAIL_PROVIDER=smtp.",
        },
      };
    }
    return registro(
      `${MOTIVO_SMTP_INDISPONIVEL}${smtpConfigurado() ? " As variáveis SMTP_* estão preenchidas, mas o adapter não pode ser criado." : ""}`,
    );
  }

  if (pedido === "resend" || (!pedido && chave && de)) {
    if (!chave) return registro("EMAIL_PROVIDER=resend, mas RESEND_API_KEY não está no ambiente.");
    if (!de) return registro("EMAIL_PROVIDER=resend, mas EMAIL_FROM não está no ambiente.");
    return {
      provedor: new ProvedorResend(chave, de),
      diagnostico: {
        provedor: "resend",
        entrega: true,
        remetente: de,
        motivo: "Resend configurado: as mensagens saem de verdade.",
      },
    };
  }

  if (pedido && pedido !== "resend") {
    return registro(`EMAIL_PROVIDER="${pedido}" não corresponde a nenhum adapter conhecido.`);
  }

  if (chave && !de) {
    return registro("RESEND_API_KEY está no ambiente, mas falta EMAIL_FROM com o remetente.");
  }

  return registro(
    "Nenhum provedor de e-mail configurado. Defina RESEND_API_KEY e EMAIL_FROM para as mensagens saírem.",
  );
}

/**
 * A escolha é memorizada: variável de ambiente não muda durante a execução, e
 * o worker chama isto uma vez por mensagem do lote.
 */
let memoria: { provedor: ProvedorDeEmail; diagnostico: DiagnosticoEmail } | null = null;

function resolver() {
  memoria ??= escolher();
  return memoria;
}

export function provedorDeEmail(): ProvedorDeEmail {
  return resolver().provedor;
}

/** O que a tela da fila mostra sobre o envio — sem tocar em rede. */
export function diagnosticoDeEmail(): DiagnosticoEmail {
  return resolver().diagnostico;
}
