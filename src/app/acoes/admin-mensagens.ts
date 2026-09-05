"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { LIMITE_PADRAO, processarFila, reenviarMensagem } from "@/lib/mensageria";
import { exigirEdicao } from "@/lib/permissoes";

/**
 * Escritas da tela da fila de mensagens (`/admin/mensagens`).
 *
 * Duas ações só: rodar a fila agora e reenviar uma linha. As duas mexem em
 * envio para fora — por isso passam por `exigirEdicao` e ficam na trilha de
 * auditoria, com quem clicou e o que aconteceu.
 *
 * PERMISSÃO: área `mensagens` — a mesma da tela. Administrador e gestor, que
 * são quem responde por comunicação que já saiu do painel.
 */

export type EstadoMensagens = {
  erro?: string;
  campo?: string;
  ok?: boolean;
  mensagem?: string;
};

const AREA = "mensagens" as const;

const esquemaProcessar = z.object({
  limite: z.coerce.number().int().min(1).max(100).optional(),
});

const esquemaReenviar = z.object({
  id: z.string().trim().min(1, "Mensagem não informada."),
});

/** Roda um lote da fila na hora, sem esperar o cron. */
export async function processarFilaAgora(
  _anterior: EstadoMensagens,
  formData: FormData,
): Promise<EstadoMensagens> {
  const usuario = await exigirEdicao(AREA);

  const dados = esquemaProcessar.safeParse({
    limite: formData.get("limite") ?? undefined,
  });
  if (!dados.success) return { erro: "Limite inválido para o lote." };

  try {
    const resumo = await processarFila({ limite: dados.data.limite ?? LIMITE_PADRAO });

    await registrarAuditoria({
      userId: usuario.id,
      acao: "enviar",
      entidade: "fila_mensagens",
      resumo:
        `Processou a fila (${resumo.provedor}): ${resumo.enviadas} enviada(s), ` +
        `${resumo.simuladas} registrada(s), ${resumo.falhas} falha(s), ` +
        `${resumo.restantes} na fila`,
    });

    revalidatePath("/admin/mensagens");

    if (resumo.processadas === 0) {
      return { ok: true, mensagem: "Nada pendente na fila." };
    }

    const partes = [
      `${resumo.enviadas} enviada(s)`,
      resumo.simuladas > 0 ? `${resumo.simuladas} apenas registrada(s)` : null,
      resumo.falhas > 0 ? `${resumo.falhas} com falha` : null,
      resumo.restantes > 0 ? `${resumo.restantes} ainda na fila` : null,
    ].filter((parte): parte is string => parte !== null);

    return { ok: true, mensagem: partes.join(", ") + "." };
  } catch (erro) {
    console.error("Falha ao processar a fila", erro);
    return { erro: "Não foi possível processar a fila agora." };
  }
}

/** Recoloca uma mensagem na fila e tenta entregar na hora. */
export async function reenviarUma(
  _anterior: EstadoMensagens,
  formData: FormData,
): Promise<EstadoMensagens> {
  const usuario = await exigirEdicao(AREA);

  const dados = esquemaReenviar.safeParse({ id: String(formData.get("id") ?? "") });
  if (!dados.success) return { erro: "Mensagem não informada.", campo: "id" };

  try {
    const resultado = await reenviarMensagem(dados.data.id);

    await registrarAuditoria({
      userId: usuario.id,
      acao: "enviar",
      entidade: "mensagem",
      entidadeId: dados.data.id,
      resumo: resultado.ok ? `Reenviou a mensagem (${resultado.status})` : `Reenvio falhou: ${resultado.erro}`,
    });

    revalidatePath("/admin/mensagens");

    if (!resultado.ok) return { erro: resultado.erro };
    return { ok: true, mensagem: resultado.detalhe };
  } catch (erro) {
    console.error("Falha ao reenviar mensagem", erro);
    return { erro: "Não foi possível reenviar esta mensagem." };
  }
}
