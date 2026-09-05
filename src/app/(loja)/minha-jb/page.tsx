import Link from "next/link";
import { ArrowRight, CalendarClock, ClipboardList, FileCheck2, PackageCheck, ShieldCheck, ShoppingBag, Wrench } from "lucide-react";

import { exigirCliente } from "@/lib/auth-cliente";
import { formatarData, formatarPreco } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function MinhaJbPage() {
  const cliente = await exigirCliente("/minha-jb");
  const [equipamentos, chamadosAbertos, pedidosAbertos, orcamentosPendentes, proximas, pedidos, chamados] = await Promise.all([
    prisma.equipment.count({ where: { customerId: cliente.id, status: { not: "desativado" } } }),
    prisma.serviceRequest.count({ where: { customerId: cliente.id, status: { notIn: ["concluido", "cancelado"] } } }),
    prisma.order.count({ where: { customerId: cliente.id, status: { notIn: ["concluido", "cancelado", "reembolsado"] } } }),
    prisma.quote.count({ where: { customerId: cliente.id, status: { in: ["enviado", "em_duvida"] } } }),
    prisma.maintenanceVisit.findMany({ where: { equipment: { customerId: cliente.id }, status: { in: ["prevista", "agendada"] } }, orderBy: { dueAt: "asc" }, take: 4, include: { equipment: { select: { name: true, brandName: true } } } }),
    prisma.order.findMany({ where: { customerId: cliente.id }, orderBy: { placedAt: "desc" }, take: 4, select: { id: true, number: true, status: true, totalCents: true, placedAt: true } }),
    prisma.serviceRequest.findMany({ where: { customerId: cliente.id }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, number: true, status: true, description: true, createdAt: true } }),
  ]);

  const cards = [
    [PackageCheck, "Equipamentos", equipamentos, "/minha-jb/equipamentos"],
    [Wrench, "Assistências abertas", chamadosAbertos, "/minha-jb/assistencia"],
    [ShoppingBag, "Pedidos em andamento", pedidosAbertos, "/minha-jb/pedidos"],
    [FileCheck2, "Orçamentos pendentes", orcamentosPendentes, "/minha-jb/orcamentos"],
  ] as const;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-graf-200 bg-white p-6 shadow-card lg:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Visão geral</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-graf-950 lg:text-3xl">Tudo que precisa da sua atenção, sem caçar informação.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-graf-600">Acompanhe equipamentos, pedidos, assistência e manutenções da clínica a partir de uma única visão.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([Icon, rotulo, valor, href]) => {
          const I = Icon;
          return <Link key={rotulo} href={href} className="hover-lift rounded-2xl border border-graf-200 bg-white p-5"><div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><I className="size-5" aria-hidden /></span><ArrowRight className="size-4 text-graf-300" aria-hidden /></div><p className="mt-5 text-3xl font-extrabold tracking-[-0.05em] text-graf-950">{valor}</p><p className="mt-1 text-xs font-bold text-graf-500">{rotulo}</p></Link>;
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-graf-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-graf-200 px-5 py-4"><div><p className="text-sm font-extrabold text-graf-950">Pedidos recentes</p><p className="mt-0.5 text-xs text-graf-500">Da compra até a conclusão.</p></div><Link href="/minha-jb/pedidos" className="text-xs font-extrabold text-jb-700">Ver todos</Link></div>
          {pedidos.length ? <div className="divide-y divide-graf-100">{pedidos.map((pedido) => <Link key={pedido.id} href={`/minha-jb/pedidos?pedido=${pedido.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-graf-50"><span className="flex size-10 items-center justify-center rounded-xl bg-graf-100"><ShoppingBag className="size-4 text-graf-500" aria-hidden /></span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-graf-950">{pedido.number}</p><p className="mt-1 text-xs text-graf-500">{formatarData(pedido.placedAt)} · {pedido.status.replaceAll("_", " ")}</p></div><p className="text-sm font-extrabold text-graf-900">{formatarPreco(pedido.totalCents)}</p></Link>)}</div> : <Vazio texto="Nenhum pedido registrado nesta conta ainda." />}
        </section>

        <section className="rounded-2xl border border-graf-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-graf-200 px-5 py-4"><div><p className="text-sm font-extrabold text-graf-950">Assistência técnica</p><p className="mt-0.5 text-xs text-graf-500">Chamados mais recentes.</p></div><Link href="/assistencia-tecnica/solicitar" className="text-xs font-extrabold text-jb-700">Abrir chamado</Link></div>
          {chamados.length ? <div className="divide-y divide-graf-100">{chamados.map((chamado) => <Link key={chamado.id} href={`/minha-jb/assistencia?chamado=${chamado.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-graf-50"><span className="flex size-10 items-center justify-center rounded-xl bg-jb-50"><Wrench className="size-4 text-jb-600" aria-hidden /></span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-graf-950">{chamado.number}</p><p className="mt-1 line-2 text-xs text-graf-500">{chamado.description}</p></div><span className="hidden rounded-full bg-graf-100 px-2.5 py-1 text-[10px] font-bold text-graf-600 sm:inline">{chamado.status.replaceAll("_", " ")}</span></Link>)}</div> : <Vazio texto="Nenhum chamado registrado nesta conta." />}
        </section>
      </div>

      <section className="rounded-2xl border border-graf-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-graf-200 px-5 py-4"><div><p className="text-sm font-extrabold text-graf-950">Próximas manutenções</p><p className="mt-0.5 text-xs text-graf-500">Preventivas previstas para os equipamentos da clínica.</p></div><CalendarClock className="size-5 text-jb-600" aria-hidden /></div>
        {proximas.length ? <div className="grid gap-px bg-graf-100 sm:grid-cols-2 lg:grid-cols-4">{proximas.map((visita) => <article key={visita.id} className="bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-jb-600">{visita.status}</p><p className="mt-3 text-sm font-extrabold text-graf-950">{visita.equipment.name}</p><p className="mt-1 text-xs text-graf-500">{visita.equipment.brandName}</p><p className="mt-4 text-sm font-bold text-graf-800">{formatarData(visita.dueAt)}</p></article>)}</div> : <Vazio texto="Nenhuma manutenção preventiva prevista no momento." />}
      </section>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <div className="px-5 py-10 text-center text-sm text-graf-500">{texto}</div>;
}
