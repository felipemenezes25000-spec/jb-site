import type { Metadata } from "next";

import { FormularioServico } from "@/components/admin/catalogo/formulario-servico";
import { Trilha } from "@/components/ui/data";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Novo serviço",
};

export default async function PaginaNovoServico() {
  await exigirEdicao("produtos");
  const total = await prisma.service.count();

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Serviços", href: "/admin/servicos" },
          { rotulo: "Novo serviço" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-bold leading-tight text-graf-950">Novo serviço</h1>
        <p className="mt-1 text-sm text-graf-500">
          Instalação, treinamento, preventiva. Pode ser vendido sozinho ou junto de um produto.
        </p>
      </header>

      <FormularioServico ordemSugerida={total} />
    </div>
  );
}
