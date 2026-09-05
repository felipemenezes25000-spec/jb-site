import type { Metadata } from "next";

import { Enderecos } from "@/components/conta/mj-enderecos";
import { Topo } from "@/components/conta/mj-topo";
import { exigirCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Meus endereços",
  description: "Endereços de entrega e de atendimento técnico.",
  robots: { index: false, follow: false },
};

export default async function EnderecosPage() {
  const cliente = await exigirCliente("/minha-jb/enderecos");

  const enderecos = await prisma.customerAddress.findMany({
    where: { customerId: cliente.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <Topo
        titulo="Meus endereços"
        descricao="Onde entregamos o equipamento e onde o técnico atende. O endereço padrão vem preenchido na compra e na abertura de chamado."
      />

      <Enderecos
        enderecos={enderecos.map((endereco) => ({
          id: endereco.id,
          rotulo: endereco.label,
          destinatario: endereco.recipient,
          cep: endereco.zip,
          logradouro: endereco.street,
          numero: endereco.number,
          complemento: endereco.complement,
          bairro: endereco.district,
          cidade: endereco.city,
          uf: endereco.state,
          referencia: endereco.reference,
          padrao: endereco.isDefault,
        }))}
      />
    </div>
  );
}
