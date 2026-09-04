import { ConfigForm } from "@/components/admin/config-form";
import { TituloPagina } from "@/components/admin/shell";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const campos = await prisma.setting.findMany({ orderBy: { order: "asc" } });

  return (
    <>
      <TituloPagina
        titulo="Configurações"
        descricao="Telefone, endereço, mapa e redes — o que aparece no rodapé e na página de Contato."
      />
      <ConfigForm
        campos={campos.map((c) => ({
          key: c.key,
          label: c.label,
          value: c.value,
          type: c.type,
          hint: c.hint,
          group: c.group,
        }))}
      />
    </>
  );
}
