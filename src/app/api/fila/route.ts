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
 *
 * Além da fila, esta rota faz a limpeza dos anexos temporários vencidos — os
 * arquivos que visitantes enviaram e que nunca viraram chamado. Ver o
 * comentário dentro de `tratar`.
 */

// A rota lê o banco e o cabeçalho da requisição: nunca pode ser pré-renderizada.
/*
 * O `export const dynamic = "force-dynamic"` saiu daqui: com
 * `cacheComponents`, a busca de dados já é dinâmica por padrão e o que se
 * marca é o que deve ser CACHEADO, não o contrário. Esta rota não tem nenhum
 * `use cache`, então continua dinâmica — agora por omissão, que é o padrão da
 * versão instalada.
 */

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

    /*
     * A limpeza dos anexos órfãos pega carona nesta rota.
     *
     * Ela precisa de exatamente o que a fila já tem: um gatilho de máquina,
     * autenticado por segredo, chamado periodicamente. Criar um segundo
     * endpoint com o mesmo cron e o mesmo segredo seria duplicar a superfície
     * protegida para executar duas tarefas do mesmo tipo — e a política de
     * recursos do escopo pede o contrário.
     *
     * Um TTL escrito numa coluna não apaga arquivo sozinho. É esta chamada que
     * apaga, em lote, e só o que está `pendente` e vencido — um anexo que um
     * chamado acabou de reivindicar não é alcançado.
     *
     * Falha aqui não derruba a fila: e-mail pendente é mais urgente que
     * arquivo vencido, e a próxima passada tenta de novo.
     */
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

    return Response.json(
      { ok: true, ...resumo, anexos },
      { headers: { "Cache-Control": "no-store" } },
    );
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
