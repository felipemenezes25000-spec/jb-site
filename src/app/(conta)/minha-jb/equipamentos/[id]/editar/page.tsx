import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormularioEquipamento } from "@/components/conta/mj-formulario-equipamento";
import { Topo } from "@/components/conta/mj-topo";
import { exigirCliente } from "@/lib/auth-cliente";
import { paraInputDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Editar equipamento",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function EditarEquipamentoPage({ params }: { params: Params }) {
  const [cliente, { id }] = await Promise.all([
    exigirCliente("/minha-jb/equipamentos"),
    params,
  ]);

  const [equipamento, categorias, unidades] = await Promise.all([
    prisma.equipment.findFirst({
      where: { id, customerId: cliente.id },
      select: {
        id: true,
        name: true,
        categoryId: true,
        brandName: true,
        modelName: true,
        serialNumber: true,
        voltage: true,
        locationId: true,
        room: true,
        purchasedAt: true,
        installedAt: true,
        warrantyUntil: true,
        maintenanceIntervalDays: true,
        notes: true,
      },
    }),
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

  if (!equipamento) notFound();

  return (
    <div className="max-w-3xl">
      <Topo
        voltar={{
          href: `/minha-jb/equipamentos/${equipamento.id}`,
          rotulo: "Voltar ao prontuário",
        }}
        titulo={`Editar ${equipamento.name}`}
        descricao="A alteração fica registrada no histórico do equipamento. Fotos novas são somadas às que já existem."
      />

      <FormularioEquipamento
        modo="editar"
        id={equipamento.id}
        categorias={categorias.map((c) => ({ id: c.id, nome: c.name }))}
        unidades={unidades.map((u) => ({ id: u.id, nome: u.name }))}
        cancelarHref={`/minha-jb/equipamentos/${equipamento.id}`}
        valores={{
          nome: equipamento.name,
          categoriaId: equipamento.categoryId ?? "",
          marca: equipamento.brandName,
          modelo: equipamento.modelName,
          serie: equipamento.serialNumber,
          voltagem: equipamento.voltage ?? "",
          unidadeId: equipamento.locationId ?? "",
          sala: equipamento.room,
          compradoEm: paraInputDate(equipamento.purchasedAt),
          instaladoEm: paraInputDate(equipamento.installedAt),
          garantiaAte: paraInputDate(equipamento.warrantyUntil),
          intervaloDias: equipamento.maintenanceIntervalDays
            ? String(equipamento.maintenanceIntervalDays)
            : "",
          notas: equipamento.notes,
        }}
      />
    </div>
  );
}
