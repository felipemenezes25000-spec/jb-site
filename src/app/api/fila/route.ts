import crypto from "node:crypto";

import { LIMITE_PADRAO, processarFila } from "@/lib/mensageria";

/**
 * Gatilho do worker da fila de saída.
 *
 * Quem chama é máquina — o cron da Vercel definido em `vercel.json` — então
 * não há sessão nenhuma aqui. A autenticação é um segredo em cabeçalho:
 *
 *   Authorization: Bearer <CRON_SECRET>      (é o que a Vercel manda sozinha)
 *   x-cron-secret: <CRON_SECRET>             (aceito para chamada manual/curl)
 *
 * A Vercel injeta o cabeçalho `Authorization` nas invocações de cron quando a
 * variável `CRON_SECRET` existe no projeto. Sem a variável configurada, esta
 * rota NÃO processa nada e responde 503: uma fila de e-mails aberta na
 * internet é um canal de disparo para qualquer um, e "falha visível" é melhor
 * que "endpoint público por descuido". O botão "processar agora" em
 * `/admin/mensagens` continua funcionando, com sessão de verdade.
 *
 * GET e POST fazem o mesmo. O cron chama GET; POST existe para quem preferir
 * disparar de um script.
 */

// A rota lê o banco e o cabeçalho da requisição: nunca pode ser pré-renderizada.
export const dynamic = "force-dynamic";

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
    const resumo = await processarFila({ limite: limiteDaUrl(request) });
    return Response.json({ ok: true, ...resumo }, { headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    // O processador já trata mensagem a mensagem; chegar aqui é falha de banco.
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
