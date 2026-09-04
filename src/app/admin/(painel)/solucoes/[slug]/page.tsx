import Link from "next/link";
import { notFound } from "next/navigation";

import { TituloPagina } from "@/components/admin/shell";
import { SolucaoForm } from "@/components/admin/solucao-form";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export default async function EditarSolucaoPage({ params }: Props) {
  const { slug } = await params;
  const nova = slug === "nova";

  const [solucao, biblioteca, quantidade] = await Promise.all([
    nova ? null : prisma.serviceCategory.findUnique({ where: { slug } }),
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
    prisma.serviceCategory.count(),
  ]);

  if (!nova && !solucao) notFound();

  return (
    <>
      <TituloPagina
        titulo={nova ? "Nova solução" : solucao!.name}
        acao={
          <Link href="/admin/solucoes" className="text-sm text-slate-500 hover:text-slate-800">
            ← todas as soluções
          </Link>
        }
      />
      <SolucaoForm
        solucao={
          solucao
            ? {
                slug: solucao.slug,
                name: solucao.name,
                description: solucao.description,
                imageId: solucao.imageId,
                order: solucao.order,
                published: solucao.published,
              }
            : {
                slug: "",
                name: "",
                description: "",
                imageId: null,
                order: quantidade + 1,
                published: true,
              }
        }
        biblioteca={biblioteca}
      />
    </>
  );
}
