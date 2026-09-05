import type { Metadata } from "next";

import { FormularioChamado } from "@/components/conta/mj-formulario-chamado";
import { primeiroValor } from "@/components/conta/mj-filtros";
import { Topo } from "@/components/conta/mj-topo";
import { exigirCliente } from "@/lib/auth-cliente";
import { formatarCep } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Abrir chamado",
  description: "Solicite assistência técnica para um equipamento da sua clínica.",
  robots: { index: false, follow: false },
};

type Busca = Promise<{ [chave: string]: string | string[] | undefined }>;

export default async function NovoChamadoPage({ searchParams }: { searchParams: Busca }) {
  const [cliente, params] = await Promise.all([
    exigirCliente("/minha-jb/assistencia/novo"),
    searchParams,
  ]);

  const equipamentoPedido = primeiroValor(params.equipamento);

  const [equipamentos, enderecos] = await Promise.all([
    prisma.equipment.findMany({
      where: { customerId: cliente.id, status: { not: "desativado" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        brandName: true,
        modelName: true,
        room: true,
        location: { select: { name: true } },
      },
    }),
    prisma.customerAddress.findMany({
      where: { customerId: cliente.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        street: true,
        number: true,
        district: true,
        city: true,
        state: true,
        zip: true,
        isDefault: true,
      },
    }),
  ]);

  // só aceita como pré-seleção um equipamento que é mesmo da conta
  const inicial = equipamentos.some((item) => item.id === equipamentoPedido)
    ? equipamentoPedido
    : "";

  return (
    <div className="max-w-3xl">
      <Topo
        voltar={{ href: "/minha-jb/assistencia", rotulo: "Assistência" }}
        titulo="Abrir chamado"
        descricao="A triagem responde em horário comercial com o próximo passo: visita, retirada ou orientação por telefone. Você acompanha tudo por aqui."
      />

      <FormularioChamado
        equipamentos={equipamentos.map((equipamento) => ({
          id: equipamento.id,
          nome: equipamento.name,
          detalhe:
            [equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
            [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · "),
        }))}
        enderecos={enderecos.map((endereco) => ({
          id: endereco.id,
          rotulo: endereco.label,
          resumo: [
            [endereco.street, endereco.number].filter(Boolean).join(", "),
            endereco.district,
            [endereco.city, endereco.state].filter(Boolean).join("/"),
            endereco.zip ? `CEP ${formatarCep(endereco.zip)}` : "",
          ]
            .filter(Boolean)
            .join(" — "),
          padrao: endereco.isDefault,
        }))}
        equipamentoInicial={inicial}
      />
    </div>
  );
}
