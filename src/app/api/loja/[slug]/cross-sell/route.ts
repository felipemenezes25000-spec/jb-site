import { NextResponse } from "next/server";

import { decodificarOrdemRelacao } from "@/lib/marketplace/relacionamentos-produto";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const produto = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      relatedFrom: {
        where: { order: { gte: 1_000 } },
        orderBy: { order: "asc" },
        take: 16,
        select: {
          order: true,
          target: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              priceCents: true,
              allowDirectPurchase: true,
              shortDescription: true,
              media: {
                orderBy: { order: "asc" },
                take: 1,
                select: {
                  alt: true,
                  media: { select: { url: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!produto || produto.status === "draft") {
    return NextResponse.json({ acessorios: [], complementos: [] }, { status: 404 });
  }

  const grupos = {
    acessorios: [] as Array<{
      id: string;
      slug: string;
      nome: string;
      descricao: string;
      precoCents: number | null;
      imagem: string | null;
      alt: string;
      ordem: number;
    }>,
    complementos: [] as Array<{
      id: string;
      slug: string;
      nome: string;
      descricao: string;
      precoCents: number | null;
      imagem: string | null;
      alt: string;
      ordem: number;
    }>,
  };

  for (const relacao of produto.relatedFrom) {
    if (relacao.target.status !== "active") continue;
    const { tipo, ordem } = decodificarOrdemRelacao(relacao.order);
    if (tipo === "alternativa") continue;

    const item = {
      id: relacao.target.id,
      slug: relacao.target.slug,
      nome: relacao.target.name,
      descricao: relacao.target.shortDescription,
      precoCents:
        relacao.target.allowDirectPurchase && relacao.target.priceCents > 0
          ? relacao.target.priceCents
          : null,
      imagem: relacao.target.media[0]?.media.url ?? null,
      alt: relacao.target.media[0]?.alt || relacao.target.name,
      ordem,
    };

    if (tipo === "acessorio") grupos.acessorios.push(item);
    if (tipo === "complemento") grupos.complementos.push(item);
  }

  grupos.acessorios.sort((a, b) => a.ordem - b.ordem);
  grupos.complementos.sort((a, b) => a.ordem - b.ordem);

  return NextResponse.json(
    {
      acessorios: grupos.acessorios.slice(0, 8),
      complementos: grupos.complementos.slice(0, 8),
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
