import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { sessaoStaff } from "@/lib/auth";
import { chaveDeSessao, checarLimite, segundosDeEspera } from "@/lib/limite";
import { midiaOperacionalEhPrivada, urlExpostaDaMidia } from "@/lib/midia-operacional";
import { prisma } from "@/lib/prisma";
import {
  ErroDeUpload,
  LIMITE_ABSOLUTO,
  PASTAS,
  PASTAS_UPLOAD,
  enviarArquivo,
} from "@/lib/upload";
import { enviarArquivoOperacionalPrivado } from "@/lib/upload-operacional";

/**
 * Recebe um arquivo e devolve a mídia já registrada no banco.
 *
 * Só a equipe interna envia. O cliente final enviava pela área dele, que saiu
 * do site: foto de defeito agora chega pelo WhatsApp. Autorização é conferida
 * aqui no servidor; esconder o botão no formulário não vale como controle.
 *
 * Mídia operacional nunca devolve a URL real do storage para o navegador. O
 * retorno usa `/api/midia/:id`, e o arquivo só sai depois de nova autorização.
 */

const esquema = z.object({
  pasta: z.enum(PASTAS_UPLOAD),
  alt: z.string().trim().max(180).optional(),
});

const LIMITE_ENVIOS = { limite: 20, janelaMs: 10 * 60_000 } as const;

type Autor = { tipo: "staff"; id: string; nome: string };

async function autorizar(): Promise<
  { ok: true; autor: Autor } | { ok: false; status: number; erro: string }
> {
  const staff = await sessaoStaff();
  if (staff) return { ok: true, autor: { tipo: "staff", id: staff.id, nome: staff.name } };
  return { ok: false, status: 401, erro: "Entre no painel para enviar arquivos." };
}

export async function POST(request: Request) {
  const tipoDoCorpo = request.headers.get("content-type") ?? "";
  if (!tipoDoCorpo.toLowerCase().startsWith("multipart/form-data")) {
    return Response.json(
      { erro: "Envie o arquivo como multipart/form-data." },
      { status: 415 },
    );
  }

  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declarado) && declarado > LIMITE_ABSOLUTO + 1024 * 64) {
    return Response.json({ erro: "Arquivo grande demais." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ erro: "Não foi possível ler o envio." }, { status: 400 });
  }

  const dados = esquema.safeParse({
    pasta: form.get("pasta") ?? undefined,
    alt: form.get("alt") ?? undefined,
  });
  if (!dados.success) {
    return Response.json(
      { erro: "Informe uma pasta válida para o arquivo.", campo: "pasta" },
      { status: 400 },
    );
  }

  const { pasta } = dados.data;

  const permissao = await autorizar();
  if (!permissao.ok) {
    return Response.json({ erro: permissao.erro }, { status: permissao.status });
  }
  const { autor } = permissao;

  const limite = checarLimite(
    chaveDeSessao(`${autor.tipo}:${autor.id}`, "/api/upload"),
    LIMITE_ENVIOS,
  );
  if (!limite.ok) {
    return Response.json(
      {
        erro: `Muitos envios seguidos. Tente novamente em ${segundosDeEspera(limite.esperaMs)} segundos.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(segundosDeEspera(limite.esperaMs)) },
      },
    );
  }

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) {
    return Response.json(
      { erro: "Nenhum arquivo enviado.", campo: "arquivo" },
      { status: 400 },
    );
  }

  try {
    const enviado = midiaOperacionalEhPrivada(pasta)
      ? await enviarArquivoOperacionalPrivado(arquivo, pasta)
      : await enviarArquivo(arquivo, { pasta });

    const media = await prisma.media.create({
      data: {
        filename: enviado.pathname.split("/").pop() ?? enviado.pathname,
        url: enviado.url,
        mime: enviado.contentType,
        size: enviado.size,
        width: enviado.largura,
        height: enviado.altura,
        alt: dados.data.alt ?? "",
        folder: pasta,
      },
      select: {
        id: true,
        filename: true,
        url: true,
        mime: true,
        size: true,
        width: true,
        height: true,
        alt: true,
        folder: true,
      },
    });

    await registrarAuditoria({
      userId: autor.id,
      acao: "criar",
      entidade: "midia",
      entidadeId: media.id,
      resumo: `${PASTAS[pasta].rotulo}: ${media.filename}`,
    });

    return Response.json(
      {
        ok: true,
        media: {
          ...media,
          url: urlExpostaDaMidia(media),
        },
      },
      { status: 201 },
    );
  } catch (erro) {
    if (erro instanceof ErroDeUpload) {
      return Response.json({ erro: erro.message, campo: "arquivo" }, { status: erro.status });
    }
    console.error("Falha no upload", erro);
    return Response.json(
      { erro: "Não foi possível salvar o arquivo. Tente de novo." },
      { status: 500 },
    );
  }
}
