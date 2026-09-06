import type { Metadata } from "next";

import { FormularioMarca } from "@/components/admin/catalogo/formulario-marca";
import { Trilha } from "@/components/ui/data";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Nova marca",
};

export default async function PaginaNovaMarca() {
  await exigirEdicao("produtos");
  const total = await prisma.brand.count();

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Marcas", href: "/admin/marcas" },
          { rotulo: "Nova marca" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-bold leading-tight text-graf-950">Nova marca</h1>
        <p className="mt-1 text-sm text-graf-500">
          Depois de criar, a marca já pode ser escolhida na aba Básico de qualquer produto.
        </p>
      </header>

      <FormularioMarca ordemSugerida={total} />
    </div>
  );
}
