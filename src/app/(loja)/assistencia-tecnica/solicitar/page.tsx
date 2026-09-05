import { BadgeCheck, Clock3, FileCheck2, ShieldCheck, Wrench } from "lucide-react";

import { FormAssistencia } from "@/components/cliente/form-assistencia";
import { sessaoCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";

export default async function SolicitarAssistenciaPage() {
  const sessao = await sessaoCliente();
  const [cliente, categorias] = await Promise.all([
    sessao
      ? prisma.customer.findUnique({
          where: { id: sessao.id },
          select: {
            name: true,
            email: true,
            phone: true,
            equipments: {
              where: { status: { not: "desativado" } },
              orderBy: { updatedAt: "desc" },
              take: 30,
              select: { id: true, name: true, brandName: true, modelName: true, serialNumber: true },
            },
          },
        })
      : Promise.resolve(null),
    prisma.category.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="bg-graf-50/70">
      <section className="border-b border-graf-200 bg-white">
        <div className="container-jb py-10 lg:py-14">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Assistência técnica</p>
          <h1 className="mt-4 max-w-4xl text-display leading-[1.04]">Abra um chamado sem transformar o problema em mais um problema.</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-graf-600 lg:text-lg">Informe o equipamento e o que está acontecendo. A equipe da JB recebe a solicitação, faz a triagem e mantém o atendimento registrado.</p>
        </div>
      </section>

      <div className="container-jb grid gap-10 py-10 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-12 lg:py-14">
        <FormAssistencia
          nome={cliente?.name}
          email={cliente?.email}
          telefone={cliente?.phone}
          equipamentos={(cliente?.equipments ?? []).map((e) => ({
            id: e.id,
            nome: e.name,
            detalhe: [e.brandName, e.modelName, e.serialNumber ? `S/N ${e.serialNumber}` : ""].filter(Boolean).join(" · ") || "Cadastrado na sua clínica",
          }))}
          categorias={categorias.map((c) => ({ id: c.id, nome: c.name }))}
        />

        <aside className="space-y-4 lg:sticky lg:top-36">
          <div className="rounded-2xl bg-graf-950 p-6 text-white">
            <Wrench className="size-6 text-jb-400" aria-hidden />
            <h2 className="mt-5 text-xl font-extrabold text-white">Como a JB trabalha</h2>
            <ul className="mt-5 space-y-4">
              {[
                [BadgeCheck, "Triagem técnica", "O chamado chega com os dados organizados."],
                [FileCheck2, "Orçamento antes da execução", "A aprovação fica registrada antes do serviço."],
                [Clock3, "Acompanhamento", "O histórico continua acessível depois do atendimento."],
                [ShieldCheck, "Sem surpresa", "Diagnóstico, peças e mão de obra ficam documentados."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof BadgeCheck;
                return <li key={String(t)} className="flex gap-3"><I className="mt-0.5 size-4 shrink-0 text-jb-400" aria-hidden /><div><p className="text-sm font-extrabold text-white">{String(t)}</p><p className="mt-1 text-xs leading-5 text-graf-400">{String(d)}</p></div></li>;
              })}
            </ul>
          </div>
          <div className="rounded-2xl border border-graf-200 bg-white p-5 text-sm leading-6 text-graf-600">
            <strong className="text-graf-950">Já tem Área da Clínica?</strong> Quando você está conectado, seus equipamentos cadastrados aparecem no formulário para acelerar a abertura do chamado.
          </div>
        </aside>
      </div>
    </div>
  );
}
