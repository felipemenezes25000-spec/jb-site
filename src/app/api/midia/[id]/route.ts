import { sessaoStaff } from "@/lib/auth";
import { midiaOperacionalEhPrivada } from "@/lib/midia-operacional";
import { prisma } from "@/lib/prisma";
import { respostaDeArquivo } from "@/lib/upload";

function naoEncontrado() {
  return new Response("Arquivo não encontrado.", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Entrega de mídia operacional privada.
 *
 * `id` pode ser o id da própria `Media` (upload recém-criado) ou o id do
 * vínculo operacional já persistido (`EquipmentMedia`, `ServiceRequestMedia`
 * ou `WorkOrderMedia`). Aceitar os dois evita que páginas antigas precisem
 * expor/selecionar mais uma chave só para migrar para a rota protegida.
 *
 * A mesma resposta 404 cobre arquivo inexistente e arquivo sem autorização:
 * o id não vira oráculo de existência. Só a equipe autenticada vê o material
 * operacional. A área do cliente e o acompanhamento público de chamado saíram
 * do site; foto e laudo chegam ao cliente pelo WhatsApp, mandados pela equipe.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const midia = await prisma.media.findFirst({
    where: {
      OR: [
        { id },
        { equipmentMedia: { some: { id } } },
        { requestMedia: { some: { id } } },
        { workOrderMedia: { some: { id } } },
      ],
    },
    select: { id: true, filename: true, url: true, mime: true, folder: true },
  });

  if (!midia || !midiaOperacionalEhPrivada(midia.folder) || !midia.url.trim()) {
    return naoEncontrado();
  }

  const staff = await sessaoStaff();
  if (!staff) return naoEncontrado();

  return respostaDeArquivo(midia.url, {
    nome: midia.filename,
    mime: midia.mime,
    disposicao: "inline",
  });
}
