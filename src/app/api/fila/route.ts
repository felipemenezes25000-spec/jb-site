import crypto from "node:crypto";

import { LIMITE_PADRAO, processarFila } from "@/lib/mensageria";

/** Comparação em tempo constante: sem isso o segredo vaza pelo relógio. */
function segredoConfere(recebido: string, esperado: string) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function autorizado(request: Request, esperado: string) {
  const cabecalho = request.headers.get("authorization") ?? "";
  const comBearer = cabecalho.toLowerCase().startsWith("bearer ")
    ? cabecalho.slice(7).trim()
    : "";
  const alternativo = request.headers.get("x-cron-secret")?.trim() ?? "";

  return (
    (comBearer !== "" && segredoConfere(comBearer, esperado)) ||
    (alternativo !== "" && segredoConfere(alternativo, esperado))
  );
}

function limiteDaUrl(request: Request) {
  const bruto = new URL(request.url).searchParams.get("limite");
  const numero = Number(bruto);
  return Number.isFinite(numero) && numero > 0 ? Math.trunc(numero) : LIMITE_PADRAO;
}

/**
 * Worker periódico compartilhado.
 *
 * Além de mensagens e anexos temporários, ele funciona como rede de segurança
 * da logística: pagamento normalmente dispara a etiqueta pelo webhook na hora,
 * mas uma falha temporária, saldo insuficiente ou NF-e cadastrada depois é
 * retomada aqui. Pedidos já emitidos têm o rastreio atualizado no mesmo ciclo.
 */
async function tratar(request: Request) {
  const esperado = (process.env.CRON_SECRET ?? "").trim();

  if (!esperado) {
    return Response.json(
      {
        ok: false,
        erro: "CRON_SECRET não configurado: a fila não é processada por esta rota.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!autorizado(request, esperado)) {
    return Response.json(
      { ok: false, erro: "Não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const limite = limiteDaUrl(request);
    const resumo = await processarFila({ limite });

    let anexos = { removidos: 0, falhas: 0 };
    try {
      const { limparOrfaosVencidos } = await import("@/lib/envio-temporario");
      const { removerArquivo } = await import("@/lib/upload");
      anexos = await limparOrfaosVencidos(async (chave) => {
        await removerArquivo(chave);
      });
    } catch (falha) {
      console.error("[fila] limpeza de anexos órfãos falhou", falha);
    }

    let logistica = { processados: 0, ok: 0, falhas: 0 };
    try {
      const { processarPendenciasMelhorEnvio } = await import("@/lib/melhor-envio");
      logistica = await processarPendenciasMelhorEnvio(Math.min(40, Math.max(5, limite)));
    } catch (falha) {
      console.error("[fila] processamento da logística falhou", falha);
    }

    return Response.json(
      { ok: true, ...resumo, anexos, logistica },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    console.error("[fila] execução interrompida", erro);
    return Response.json(
      { ok: false, erro: "Falha ao processar a fila." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: Request) {
  return tratar(request);
}

export async function POST(request: Request) {
  return tratar(request);
}
