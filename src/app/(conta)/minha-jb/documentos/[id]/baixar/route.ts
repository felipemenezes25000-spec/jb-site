import { exigirCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";
import { nomeParaDownload, respostaDeArquivo } from "@/lib/upload";

/**
 * Download de um documento do cliente.
 *
 * Duas garantias, nesta ordem:
 *
 * 1. O arquivo nunca é servido pelo id sozinho: a consulta filtra por `id` **e**
 *    `customerId` da sessão, então um id adivinhado devolve 404 igual a um id
 *    que não existe — sem revelar que o documento existe para outra pessoa.
 *
 * 2. A resposta carrega os BYTES. A versão anterior redirecionava para o
 *    `storageKey` quando ele era uma URL absoluta, e aí a autorização protegia
 *    a rota, não o arquivo: quem tivesse o endereço do storage baixava o laudo
 *    sem sessão. Agora `respostaDeArquivo()` lê no servidor (em stream, com teto
 *    de tamanho) e devolve aqui — o endereço do storage nunca sai daqui.
 */

// lê do disco em `.arquivos/` quando não há Vercel Blob configurado
export const runtime = "nodejs";

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
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "private, no-store",
      },
    });
  }

  return respostaDeArquivo(documento.storageKey, {
    nome: nomeParaDownload(documento.title, documento.storageKey, documento.mime),
    mime: documento.mime,
  });
}
