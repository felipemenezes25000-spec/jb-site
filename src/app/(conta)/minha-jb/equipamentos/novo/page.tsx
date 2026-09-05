import type { Metadata } from "next";

import { FormularioEquipamento } from "@/components/conta/mj-formulario-equipamento";
import { Topo } from "@/components/conta/mj-topo";
import { exigirCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Cadastrar equipamento",
  robots: { index: false, follow: false },
};

export default async function NovoEquipamentoPage() {
  const cliente = await exigirCliente("/minha-jb/equipamentos/novo");

  const [categorias, unidades] = await Promise.all([
    prisma.category.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.customerLocation.findMany({
      where: { customerId: cliente.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="max-w-3xl">
      <Topo
        voltar={{ href: "/minha-jb/equipamentos", rotulo: "Meus equipamentos" }}
        titulo="Cadastrar equipamento"
        descricao="Um equipamento no prontuário é histórico de manutenção, controle de garantia e chamado aberto em dois cliques. Vale para o que foi comprado na JB e para o que já estava na clínica."
      />

      <FormularioEquipamento
        modo="novo"
        categorias={categorias.map((c) => ({ id: c.id, nome: c.name }))}
        unidades={unidades.map((u) => ({ id: u.id, nome: u.name }))}
        cancelarHref="/minha-jb/equipamentos"
      />
    </div>
  );
}
