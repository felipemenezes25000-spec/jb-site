import { registrarAuditoria } from "@/lib/auditoria";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { nomeParaDownload, respostaDeArquivo } from "@/lib/upload";

/**
 * Download de documento pelo painel.
 *
 * Existe pelo mesmo motivo da rota da Minha JB: nota fiscal, laudo e contrato
 * ficam em armazenamento privado e não têm endereço que abra no navegador. A
 * equipe precisa do arquivo, então precisa de uma rota que confira quem está
 * pedindo — `exigirArea("clientes")`, a mesma guarda da ficha do cliente, que é
 * de onde estes links saem.
 *
 * Diferente da rota do cliente, aqui não há filtro por dono: quem tem a área de
 * clientes vê a ficha inteira, documentos incluídos. Por isso cada download fica
 * na trilha de auditoria — um laudo traz nome e endereço de clínica, e saber
 * quem baixou o quê é parte de tratar isso como dado do cliente.
 */

// lê do disco em `.arquivos/` quando não há Vercel Blob configurado
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [usuario, { id }] = await Promise.all([exigirArea("clientes"), params]);

  const documento = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, storageKey: true, mime: true, customerId: true },
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

  const resposta = await respostaDeArquivo(documento.storageKey, {
    nome: nomeParaDownload(documento.title, documento.storageKey, documento.mime),
    mime: documento.mime,
  });

  // só registra o que virou download de verdade: 404 de arquivo sumido não é
  // acesso a dado do cliente e sujaria a trilha
  if (resposta.ok) {
    await registrarAuditoria({
      userId: usuario.id,
      acao: "exportar",
      entidade: "documento",
      entidadeId: documento.id,
      resumo: documento.customerId
        ? `Baixou o documento "${documento.title}" do cliente ${documento.customerId}`
        : `Baixou o documento "${documento.title}"`,
    });
  }

  return resposta;
}
