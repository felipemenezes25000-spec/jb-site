import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { sessaoStaff } from "@/lib/auth";
import { sessaoCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";
import {
  ErroDeUpload,
  LIMITE_ABSOLUTO,
  PASTAS,
  PASTAS_DO_CLIENTE,
  PASTAS_UPLOAD,
  enviarArquivo,
  type PastaUpload,
} from "@/lib/upload";

/**
 * Recebe um arquivo e devolve a mídia já registrada no banco.
 *
 * Quem pode enviar depende da pasta: a equipe interna envia em qualquer uma; o
 * cliente final só em `chamados` e `equipamentos`, que são as pastas de coisas
 * que ele mesmo criou. Autorização é conferida aqui no servidor — esconder o
 * botão no formulário não vale como controle.
 */

const esquema = z.object({
  pasta: z.enum(PASTAS_UPLOAD),
  alt: z.string().trim().max(180).optional(),
});

/* --------------------------------------------------------- limite de taxa */

const LIMITE_ENVIOS = 20;
const JANELA_MS = 10 * 60_000;

/**
 * Contagem em memória do processo. Não é uma barreira distribuída — em serverless
 * cada instância tem a sua —, mas segura o caso real: um formulário aberto
 * mandando arquivo em sequência.
 */
const envios = new Map<string, number[]>();

function excedeuLimite(chave: string) {
  const agora = Date.now();

  if (envios.size > 500) {
    for (const [id, marcas] of envios) {
      if (marcas.every((t) => agora - t >= JANELA_MS)) envios.delete(id);
    }
  }

  const recentes = (envios.get(chave) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= LIMITE_ENVIOS) {
    envios.set(chave, recentes);
    return true;
  }

  recentes.push(agora);
  envios.set(chave, recentes);
  return false;
}

/* -------------------------------------------------------------------- POST */

type Autor =
  | { tipo: "staff"; id: string; nome: string }
  | { tipo: "cliente"; id: string; nome: string };

async function autorizar(pasta: PastaUpload): Promise<
  { ok: true; autor: Autor } | { ok: false; status: number; erro: string }
> {
  const staff = await sessaoStaff();
  if (staff) return { ok: true, autor: { tipo: "staff", id: staff.id, nome: staff.name } };

  const cliente = await sessaoCliente();
  if (!cliente) {
    return { ok: false, status: 401, erro: "Entre na sua conta para enviar arquivos." };
  }
  if (!PASTAS_DO_CLIENTE.includes(pasta)) {
    return { ok: false, status: 403, erro: "Você não pode enviar arquivos nesta pasta." };
  }
  return { ok: true, autor: { tipo: "cliente", id: cliente.id, nome: cliente.name } };
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

  const permissao = await autorizar(pasta);
  if (!permissao.ok) {
    return Response.json({ erro: permissao.erro }, { status: permissao.status });
  }
  const { autor } = permissao;

  if (excedeuLimite(`${autor.tipo}:${autor.id}`)) {
    return Response.json(
      { erro: "Muitos envios seguidos. Espere alguns minutos e tente de novo." },
      { status: 429, headers: { "Retry-After": "600" } },
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
    const enviado = await enviarArquivo(arquivo, { pasta });

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
      // AuditLog aponta para User; envio de cliente fica sem autor e é
      // identificado no resumo
      userId: autor.tipo === "staff" ? autor.id : null,
      acao: "criar",
      entidade: "midia",
      entidadeId: media.id,
      resumo:
        autor.tipo === "staff"
          ? `${PASTAS[pasta].rotulo}: ${media.filename}`
          : `${PASTAS[pasta].rotulo}: ${media.filename} (cliente ${autor.id})`,
    });

    return Response.json({ ok: true, media }, { status: 201 });
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
