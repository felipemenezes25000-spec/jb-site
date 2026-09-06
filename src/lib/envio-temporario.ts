import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

/* ============================================================================
   Envio de mídia por quem ainda não tem chamado — nem conta

   O escopo exige que o visitante anexe foto e vídeo ao abrir um chamado, sem
   login. Isso cria um problema que a mídia da equipe não tem: **o arquivo
   chega antes de existir dono**.

   A rota `/api/upload` não serve. Ela exige sessão, e afrouxá-la seria abrir
   um depósito público de arquivos para qualquer um na internet. Este módulo é
   o caminho paralelo, com dono provisório e prazo.

   O desenho, e o porquê de cada peça:

   • **Sessão de envio.** Um token opaco, gerado no servidor, guardado num
     cookie httpOnly. O banco guarda só o SHA-256 dele. Sem essa amarra, saber
     o id de um arquivo bastaria para anexá-lo ao próprio chamado — ou para
     ler a foto do defeito de outra pessoa.

   • **Prazo.** 24 horas para arquivo não vinculado. Um TTL escrito numa coluna
     não apaga arquivo sozinho: quem apaga é a limpeza, e a coluna é o critério
     dela.

   • **Corrida.** A limpeza só toca linha `pendente`. Vincular muda o estado na
     mesma transação que grava o chamado. Um arquivo reivindicado por um
     chamado válido não é apagado pelo job de órfãos, e um arquivo que o job
     acabou de apagar não é vinculado a chamado nenhum.

   • **Falha de mídia não apaga o relato.** Vincular é operação separada da
     criação do chamado, e um anexo que se perdeu não derruba o atendimento.
   ============================================================================ */

const COOKIE = "jb_envio";

/**
 * Duração da sessão de envio.
 *
 * Um pouco mais folgada que o TTL do arquivo: quem começou a anexar às 23h50
 * precisa continuar podendo enviar o segundo arquivo às 00h05.
 */
const DURACAO_SESSAO_S = 60 * 60 * 26;

/** Prazo do arquivo órfão. Centralizado aqui — a UI e os testes leem daqui. */
export const HORAS_ATE_EXPIRAR = 24;

/* ------------------------------------------------------------------ limites */

/**
 * Limites do envio de visitante.
 *
 * Os números vêm do escopo. Estão num objeto só porque servidor, formulário,
 * mensagem de erro e teste precisam concordar — quando um deles diverge, a
 * pessoa recebe "arquivo grande demais" de um arquivo que a tela deixou
 * escolher.
 */
export const LIMITES_DO_VISITANTE = {
  foto: {
    quantidade: 6,
    bytes: 10 * 1024 * 1024,
    tipos: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"],
  },
  video: {
    quantidade: 1,
    bytes: 40 * 1024 * 1024,
    segundos: 30,
    tipos: ["video/mp4", "video/quicktime", "video/webm"],
  },
} as const;

export type EspecieDeMidia = keyof typeof LIMITES_DO_VISITANTE;

/** Quantos bytes o corpo da requisição pode ter, no maior caso. */
export const LIMITE_ABSOLUTO_VISITANTE = Math.max(
  LIMITES_DO_VISITANTE.foto.bytes,
  LIMITES_DO_VISITANTE.video.bytes,
);

/* ------------------------------------------------------ sessão de envio */

function hashDoToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * O token desta sessão de envio, criando um se ainda não houver.
 *
 * `httpOnly`: o JavaScript da página não precisa lê-lo, e não poder lê-lo
 * significa que um XSS não leva embora o acesso aos arquivos que a pessoa
 * acabou de enviar.
 */
export async function sessaoDeEnvio(): Promise<{ token: string; hash: string }> {
  const jar = await cookies();
  const existente = jar.get(COOKIE)?.value;

  if (existente && existente.length >= 40) {
    return { token: existente, hash: hashDoToken(existente) };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_S,
  });

  return { token, hash: hashDoToken(token) };
}

/** Lê a sessão sem criar. Devolve `null` quando o navegador não tem nenhuma. */
export async function sessaoDeEnvioExistente(): Promise<{ hash: string } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token || token.length < 40) return null;
  return { hash: hashDoToken(token) };
}

/* ------------------------------------------------------------- contagem */

/**
 * Quantos arquivos de cada espécie esta sessão já tem em pé.
 *
 * Conta no banco, e não em memória: em serverless cada instância teria a
 * própria contagem, e o limite de 6 fotos viraria 6 vezes o número de
 * instâncias quentes. O escopo é explícito sobre isso.
 */
export async function contarDaSessao(sessionHash: string) {
  const linhas = await prisma.tempUpload.groupBy({
    by: ["kind"],
    where: { sessionHash, status: { in: ["pendente", "vinculado"] } },
    _count: { _all: true },
  });

  const contagem: Record<EspecieDeMidia, number> = { foto: 0, video: 0 };
  for (const linha of linhas) {
    if (linha.kind === "foto" || linha.kind === "video") {
      contagem[linha.kind] = linha._count._all;
    }
  }
  return contagem;
}

export function prazoDeExpiracao(): Date {
  return new Date(Date.now() + HORAS_ATE_EXPIRAR * 60 * 60 * 1000);
}

/* -------------------------------------------------------------- vínculo */

export type ResultadoDoVinculo = {
  vinculados: number;
  ignorados: number;
};

/**
 * Amarra os arquivos pendentes desta sessão a um chamado.
 *
 * **Idempotente.** Chamar duas vezes com o mesmo chamado não duplica nada: a
 * condição do `updateMany` exige `status: "pendente"`, e um arquivo já
 * vinculado não casa mais.
 *
 * **Escopado.** Só arquivos daquela sessão de envio. Um id de outra pessoa
 * não é alcançável nem sabendo o valor.
 *
 * **Sem prazo vencido.** Arquivo expirado não é vinculado mesmo que a limpeza
 * ainda não tenha rodado — o critério é a data, não o job ter passado.
 *
 * Roda FORA da transação que cria o chamado, de propósito: um anexo que falhou
 * não pode derrubar o relato. O escopo é explícito — "falha de mídia não deve
 * apagar o relato".
 */
export async function vincularAoChamado(
  sessionHash: string,
  requestId: string,
): Promise<ResultadoDoVinculo> {
  const agora = new Date();

  const alcancaveis = await prisma.tempUpload.findMany({
    where: { sessionHash, status: "pendente" },
    select: { id: true, expiresAt: true },
  });

  const validos = alcancaveis.filter((linha) => linha.expiresAt > agora).map((l) => l.id);
  const vencidos = alcancaveis.length - validos.length;

  if (validos.length === 0) return { vinculados: 0, ignorados: vencidos };

  /* `updateMany` com a condição de estado dentro do WHERE: é isso que torna a
     operação segura contra a limpeza rodando ao mesmo tempo. Quem chegar
     primeiro ganha a linha; o outro simplesmente não a encontra. */
  const resultado = await prisma.tempUpload.updateMany({
    where: { id: { in: validos }, status: "pendente" },
    data: { status: "vinculado", requestId, claimedAt: agora },
  });

  return { vinculados: resultado.count, ignorados: vencidos };
}

/* -------------------------------------------------------------- limpeza */

export type ResultadoDaLimpeza = {
  removidos: number;
  falhas: number;
};

/**
 * Apaga os órfãos vencidos.
 *
 * Em lotes, para não segurar uma transação longa e para poder ser chamada
 * repetidamente por um cron sem risco. Só toca `pendente` — a mesma condição
 * que protege o vínculo simultâneo.
 *
 * O arquivo sai do armazenamento ANTES de a linha mudar de estado. Se a
 * remoção do arquivo falhar, a linha continua `pendente` e a próxima passada
 * tenta de novo; o contrário deixaria arquivo no storage sem ninguém sabendo
 * que ele existe.
 */
export async function limparOrfaosVencidos(
  apagarArquivo: (storageKey: string) => Promise<void>,
  lote = 50,
): Promise<ResultadoDaLimpeza> {
  const vencidos = await prisma.tempUpload.findMany({
    where: { status: "pendente", expiresAt: { lt: new Date() } },
    select: { id: true, storageKey: true },
    take: lote,
  });

  let removidos = 0;
  let falhas = 0;

  for (const linha of vencidos) {
    try {
      if (linha.storageKey) await apagarArquivo(linha.storageKey);

      /* A condição de estado no WHERE de novo: entre a leitura acima e esta
         escrita, um chamado pode ter reivindicado o arquivo. Nesse caso o
         `updateMany` não encontra a linha e nada é marcado como expirado —
         mas o arquivo já foi apagado. É o único ponto em que a corrida custa
         algo, e o custo é um anexo perdido num chamado aberto no exato
         segundo do vencimento, não um chamado sem relato. */
      const marcado = await prisma.tempUpload.updateMany({
        where: { id: linha.id, status: "pendente" },
        data: { status: "expirado", storageKey: "", url: "" },
      });

      removidos += marcado.count;
    } catch (erro) {
      falhas += 1;
      /* Sem dado pessoal no log: o id da linha basta para investigar, e o
         nome do arquivo pode conter informação de quem enviou. */
      console.error("[envio-temporario] falha ao apagar órfão", linha.id, erro);
    }
  }

  return { removidos, falhas };
}
