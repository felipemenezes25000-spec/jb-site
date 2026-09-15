import { podeVerChamado } from "@/components/assistencia/acesso";
import { sessaoStaff } from "@/lib/auth";
import { sessaoCliente } from "@/lib/auth-cliente";
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
 * A mesma resposta 404 cobre arquivo inexistente e arquivo sem autorização —
 * o id não vira oráculo de existência. Staff autenticado pode ver o material
 * operacional; cliente só vê mídia ligada ao próprio equipamento/chamado/OS;
 * visitante sem conta só vê mídia de chamado para o qual já possui o cookie
 * assinado de acompanhamento.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const midia = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      url: true,
      mime: true,
      folder: true,
      equipmentMedia: {
        select: { equipment: { select: { customerId: true } } },
      },
      requestMedia: {
        select: {
          request: { select: { id: true, number: true, customerId: true } },
        },
      },
      workOrderMedia: {
        select: {
          workOrder: {
            select: {
              equipment: { select: { customerId: true } },
              request: { select: { id: true, number: true, customerId: true } },
            },
          },
        },
      },
    },
  });

  if (!midia || !midiaOperacionalEhPrivada(midia.folder) || !midia.url.trim()) {
    return naoEncontrado();
  }

  const staff = await sessaoStaff();
  let autorizado = Boolean(staff);

  if (!autorizado) {
    const cliente = await sessaoCliente();
    if (cliente) {
      autorizado =
        midia.equipmentMedia.some((vinculo) => vinculo.equipment.customerId === cliente.id) ||
        midia.requestMedia.some((vinculo) => vinculo.request.customerId === cliente.id) ||
        midia.workOrderMedia.some(
          (vinculo) =>
            vinculo.workOrder.equipment?.customerId === cliente.id ||
            vinculo.workOrder.request?.customerId === cliente.id,
        );
    }
  }

  if (!autorizado) {
    const chamados = [
      ...midia.requestMedia.map((vinculo) => vinculo.request),
      ...midia.workOrderMedia.flatMap((vinculo) =>
        vinculo.workOrder.request ? [vinculo.workOrder.request] : [],
      ),
    ];

    for (const chamado of chamados) {
      if (await podeVerChamado(chamado)) {
        autorizado = true;
        break;
      }
    }
  }

  if (!autorizado) return naoEncontrado();

  return respostaDeArquivo(midia.url, {
    nome: midia.filename,
    mime: midia.mime,
    disposicao: "inline",
  });
}
