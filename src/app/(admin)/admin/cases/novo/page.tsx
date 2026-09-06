import type { Metadata } from "next";

import { criarCase } from "@/app/acoes/admin-cases";
import { FormularioCase } from "@/components/admin/cases/formulario-case";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { equipeQuePodeAssinar } from "@/lib/equipe-editorial";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Novo case · Cases técnicos" };

export default async function PaginaNovoCase() {
  await exigirEdicao("cases");

  const [equipe, ordens] = await Promise.all([
    equipeQuePodeAssinar(),
    prisma.workOrder.findMany({
      where: { status: "concluida" },
      orderBy: { closedAt: "desc" },
      take: 60,
      select: { id: true, number: true, equipment: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Cases técnicos", href: "/admin/cases" },
          { rotulo: "Novo case" },
        ]}
        titulo="Novo case"
        descricao="Nasce como rascunho. A autorização do cliente é registrada depois, na tela do case."
      />

      <Aviso tom="info" titulo="Antes de escrever">
        Um case é uma afirmação sobre um atendimento real, em nome de uma clínica que existe.
        Escreva o que foi confirmado na bancada — suspeita, estimativa e &ldquo;provavelmente&rdquo;
        não entram. A autorização vem depois, e sem ela nada é publicado.
      </Aviso>

      <FormularioCase
        acao={criarCase}
        equipe={equipe}
        ordens={ordens.map((ordem) => ({
          id: ordem.id,
          number: ordem.number,
          rotulo: `${ordem.number}${ordem.equipment ? ` — ${ordem.equipment.name}` : ""}`,
        }))}
      />
    </div>
  );
}
