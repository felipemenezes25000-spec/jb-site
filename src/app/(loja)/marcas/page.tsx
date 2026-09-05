import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Tag } from "lucide-react";

import { Trilha, Vazio } from "@/components/ui/data";
import { LinkBotao } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Marcas",
  description: "Marcas de equipamentos odontológicos vendidas e atendidas pela JB.",
  alternates: { canonical: "/marcas" },
};

export default async function MarcasPage() {
  const marcas = await prisma.brand.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      logo: { select: { url: true, alt: true } },
      _count: { select: { products: { where: { status: "active" } } } },
    },
  });

  return (
    <div className="container-jb py-8 lg:py-12">
      <Trilha itens={[{ rotulo: "Início", href: "/" }, { rotulo: "Marcas" }]} className="mb-5" />

      <header className="mb-8 max-w-2xl">
        <h1 className="text-display leading-tight">Marcas</h1>
        <p className="mt-3 text-base leading-relaxed text-graf-600">
          As marcas presentes no catálogo. A assistência técnica da JB atende equipamentos
          de outras marcas também — abra um chamado informando marca e modelo.
        </p>
      </header>

      {marcas.length === 0 ? (
        <Vazio
          icone={Tag}
          titulo="Nenhuma marca publicada"
          descricao="As marcas aparecem aqui conforme os produtos vão sendo cadastrados no painel."
          acao={<LinkBotao href="/loja">Ver catálogo</LinkBotao>}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {marcas.map((marca) => (
            <li key={marca.slug}>
              <Link
                href={`/marcas/${marca.slug}`}
                className="flex h-full flex-col items-start gap-4 rounded-xl border border-graf-200 bg-white p-5 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised"
              >
                {marca.logo ? (
                  <Image
                    src={marca.logo.url}
                    alt={marca.logo.alt || marca.name}
                    width={120}
                    height={40}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="flex h-10 items-center text-lg font-extrabold tracking-tight text-graf-800">
                    {marca.name}
                  </span>
                )}
                <span className="text-xs text-graf-500">
                  {marca._count.products === 0
                    ? "Sob consulta"
                    : `${marca._count.products} ${marca._count.products === 1 ? "item" : "itens"}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
