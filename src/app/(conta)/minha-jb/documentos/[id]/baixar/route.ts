import fs from "node:fs/promises";
import path from "node:path";

import { exigirCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";

/**
 * Download de um documento do cliente.
 *
 * O arquivo nunca é servido pelo id sozinho: a consulta filtra por `id` **e**
 * `customerId` da sessão, então um id adivinhado devolve 404 igual a um id que
 * não existe — sem revelar que o documento existe para outra pessoa.
 *
 * `storageKey` pode ser uma URL absoluta (Vercel Blob) ou um caminho dentro de
 * `public/uploads` (servidor próprio e desenvolvimento). No primeiro caso a
 * resposta redireciona; no segundo, o arquivo é lido do disco com o caminho
 * resolvido e conferido — nenhuma sequência `..` sai da pasta de uploads.
 */

const RAIZ_LOCAL = path.resolve(process.cwd(), "public", "uploads");
const PREFIXO_LOCAL = "/uploads/";

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\- ]+/g, "_")
    .trim();
}

/** Nome do arquivo baixado: legível, com a extensão que o storage guardou. */
function nomeDoArquivo(titulo: string, chave: string, mime: string) {
  const extensaoDoCaminho = path.extname(chave.split("?")[0] ?? "");
  const extensao =
    extensaoDoCaminho || (mime === "application/pdf" ? ".pdf" : "");
  const base = semAcento(titulo).slice(0, 80) || "documento";
  return base.toLowerCase().endsWith(extensao.toLowerCase())
    ? base
    : `${base}${extensao}`;
}

function caminhoLocal(relativo: string) {
  const destino = path.resolve(RAIZ_LOCAL, relativo);
  if (destino !== RAIZ_LOCAL && !destino.startsWith(RAIZ_LOCAL + path.sep)) return null;
  return destino;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [cliente, { id }] = await Promise.all([
    exigirCliente("/minha-jb/documentos"),
    params,
  ]);

  const documento = await prisma.document.findFirst({
    where: { id, customerId: cliente.id },
    select: { title: true, storageKey: true, mime: true },
  });

  if (!documento || !documento.storageKey.trim()) {
    return new Response("Documento não encontrado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const chave = documento.storageKey.trim();
  const nome = nomeDoArquivo(documento.title, chave, documento.mime);

  if (/^https?:\/\//i.test(chave)) {
    return new Response(null, { status: 307, headers: { Location: chave } });
  }

  const relativo = chave.startsWith(PREFIXO_LOCAL)
    ? chave.slice(PREFIXO_LOCAL.length)
    : chave.replace(/^\/+/, "");

  const destino = caminhoLocal(decodeURIComponent(relativo));
  if (!destino) {
    return new Response("Documento não encontrado.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const bytes = await fs.readFile(destino);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": documento.mime || "application/octet-stream",
        "content-length": String(bytes.byteLength),
        "content-disposition": `attachment; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
        // arquivo privado: nada de cache compartilhado
        "cache-control": "private, no-store",
      },
    });
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code;
    if (codigo !== "ENOENT") console.error("Falha ao ler documento do cliente", erro);
    return new Response(
      "O arquivo não está mais disponível. Fale com a equipe da JB para receber uma nova via.",
      { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
}
