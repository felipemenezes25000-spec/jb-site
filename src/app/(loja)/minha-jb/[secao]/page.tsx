import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  FileCheck2,
  FileText,
  Heart,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  Wrench,
} from "lucide-react";

import { exigirCliente } from "@/lib/auth-cliente";
import { distanciaEmDias, formatarData, formatarDataHora, formatarPreco } from "@/lib/format";
import { MENU_CLIENTE } from "@/lib/navegacao";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ secao: string }> };

const TITULOS: Record<string, { eyebrow: string; titulo: string; descricao: string }> = {
  pedidos: { eyebrow: "Compras", titulo: "Meus pedidos", descricao: "Acompanhe cada compra, da confirmação até a entrega ou instalação." },
  equipamentos: { eyebrow: "Patrimônio da clínica", titulo: "Meus equipamentos", descricao: "Cada equipamento com status, garantia, localização e histórico técnico." },
  assistencia: { eyebrow: "Pós-venda", titulo: "Assistência técnica", descricao: "Chamados, andamento, diagnóstico e ordens de serviço vinculados à clínica." },
  manutencoes: { eyebrow: "Preventiva", titulo: "Manutenções", descricao: "Veja o que está previsto, agendado e concluído para cada equipamento." },
  orcamentos: { eyebrow: "Propostas", titulo: "Orçamentos", descricao: "Orçamentos comerciais e de assistência disponíveis para decisão e consulta." },
  documentos: { eyebrow: "Arquivos", titulo: "Documentos", descricao: "Notas, ordens de serviço, laudos, garantias e outros documentos da clínica." },
  favoritos: { eyebrow: "Catálogo", titulo: "Favoritos", descricao: "Equipamentos salvos para comparar, revisar ou comprar depois." },
  enderecos: { eyebrow: "Cadastro", titulo: "Endereços", descricao: "Locais usados para entrega, retirada e atendimento técnico." },
  perfil: { eyebrow: "Minha conta", titulo: "Meus dados", descricao: "Informações de cadastro vinculadas à Área da Clínica." },
  notificacoes: { eyebrow: "Atualizações", titulo: "Notificações", descricao: "Mudanças importantes em pedidos, assistência, manutenção e documentos." },
};

export default async function SecaoClientePage({ params }: Props) {
  const { secao } = await params;
  if (!TITULOS[secao]) notFound();
  const cliente = await exigirCliente(`/minha-jb/${secao}`);
  const cab = TITULOS[secao];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-graf-200 bg-white p-6 shadow-card lg:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">{cab.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-graf-950 lg:text-3xl">{cab.titulo}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-graf-600">{cab.descricao}</p>
      </header>
      <Conteudo secao={secao} customerId={cliente.id} />
    </div>
  );
}

async function Conteudo({ secao, customerId }: { secao: string; customerId: string }) {
  if (secao === "pedidos") {
    const pedidos = await prisma.order.findMany({ where: { customerId }, orderBy: { placedAt: "desc" }, include: { items: { take: 3 }, events: { where: { visibleToCustomer: true }, orderBy: { createdAt: "desc" }, take: 1 } } });
    return pedidos.length ? <div className="space-y-4">{pedidos.map((p) => <article key={p.id} className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card lg:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><ShoppingBag className="size-5" aria-hidden /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-graf-950">{p.number}</h2><Status texto={p.status} /></div><p className="mt-1 text-xs text-graf-500">Pedido em {formatarData(p.placedAt)}</p></div></div><p className="text-lg font-extrabold text-graf-950">{formatarPreco(p.totalCents)}</p></div><div className="mt-5 grid gap-3 border-t border-graf-100 pt-5 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-extrabold uppercase tracking-[0.1em] text-graf-400">Itens</p><p className="mt-2 text-sm text-graf-700">{p.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ") || "Itens do pedido"}</p>{p.events[0] ? <p className="mt-2 text-xs text-graf-500">Última atualização: {p.events[0].note || p.events[0].status.replaceAll("_", " ")}</p> : null}</div><span className="inline-flex items-center gap-1 text-xs font-extrabold text-jb-700">Detalhes <ArrowRight className="size-3.5" aria-hidden /></span></div></article>)}</div> : <Vazio icone={ShoppingBag} titulo="Nenhum pedido ainda" texto="Quando uma compra for vinculada à sua conta, ela aparecerá aqui com todo o andamento." acao="/loja" rotulo="Ver equipamentos" />;
  }

  if (secao === "equipamentos") {
    const equipamentos = await prisma.equipment.findMany({ where: { customerId }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }], include: { location: true, _count: { select: { serviceRequests: true, workOrders: true, documents: true } } } });
    return equipamentos.length ? <div className="grid gap-4 xl:grid-cols-2">{equipamentos.map((e) => <article key={e.id} className="hover-lift rounded-2xl border border-graf-200 bg-white p-6"><div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-graf-100 text-graf-600"><PackageCheck className="size-5" aria-hidden /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-graf-950">{e.name}</h2><Status texto={e.status} /></div><p className="mt-1 text-xs text-graf-500">{[e.brandName, e.modelName].filter(Boolean).join(" · ") || "Equipamento cadastrado"}</p>{e.serialNumber ? <p className="mt-1 label-mono text-[11px] text-graf-400">S/N {e.serialNumber}</p> : null}</div></div><dl className="mt-6 grid grid-cols-2 gap-4 border-t border-graf-100 pt-5 text-xs"><div><dt className="text-graf-500">Garantia</dt><dd className="mt-1 font-bold text-graf-900">{e.warrantyUntil ? formatarData(e.warrantyUntil) : "Não informada"}</dd></div><div><dt className="text-graf-500">Próxima manutenção</dt><dd className="mt-1 font-bold text-graf-900">{e.nextMaintenanceAt ? `${formatarData(e.nextMaintenanceAt)} · ${distanciaEmDias(e.nextMaintenanceAt)}` : "Não programada"}</dd></div><div><dt className="text-graf-500">Local</dt><dd className="mt-1 font-bold text-graf-900">{e.location?.name || e.room || "Não informado"}</dd></div><div><dt className="text-graf-500">Histórico</dt><dd className="mt-1 font-bold text-graf-900">{e._count.serviceRequests} chamados · {e._count.workOrders} OS</dd></div></dl><div className="mt-5 flex justify-end"><Link href={`/assistencia-tecnica/solicitar`} className="inline-flex items-center gap-1 text-xs font-extrabold text-jb-700">Solicitar assistência <ArrowRight className="size-3.5" aria-hidden /></Link></div></article>)}</div> : <Vazio icone={PackageCheck} titulo="Nenhum equipamento cadastrado" texto="Equipamentos comprados ou vinculados à clínica aparecerão aqui com histórico e documentos." acao="/loja" rotulo="Explorar catálogo" />;
  }

  if (secao === "assistencia") {
    const chamados = await prisma.serviceRequest.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, include: { equipment: { select: { name: true } }, events: { where: { visibleToCustomer: true }, orderBy: { createdAt: "desc" }, take: 1 }, workOrders: { orderBy: { openedAt: "desc" }, take: 1 } } });
    return <div><div className="mb-4 flex justify-end"><Link href="/assistencia-tecnica/solicitar" className="inline-flex h-11 items-center gap-2 rounded-xl bg-jb-600 px-5 text-sm font-extrabold text-white hover:bg-jb-500"><Wrench className="size-4" aria-hidden /> Abrir novo chamado</Link></div>{chamados.length ? <div className="space-y-4">{chamados.map((c) => <article key={c.id} className="rounded-2xl border border-graf-200 bg-white p-6 shadow-card"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-graf-950">{c.number}</h2><Status texto={c.status} /></div><p className="mt-2 text-sm font-semibold text-graf-700">{c.equipment?.name || [c.brandName, c.modelName].filter(Boolean).join(" ") || "Equipamento informado no chamado"}</p><p className="mt-2 max-w-3xl text-sm leading-6 text-graf-600">{c.description}</p></div><p className="text-xs text-graf-500">{formatarData(c.createdAt)}</p></div>{c.events[0] ? <div className="mt-5 rounded-xl bg-graf-50 p-4"><p className="text-xs font-extrabold text-graf-900">{c.events[0].title}</p><p className="mt-1 text-xs leading-5 text-graf-600">{c.events[0].message || "Atualização registrada pela equipe."}</p><p className="mt-2 text-[10px] text-graf-400">{formatarDataHora(c.events[0].createdAt)}</p></div> : null}{c.workOrders[0] ? <p className="mt-4 text-xs font-bold text-graf-600">OS vinculada: <span className="text-graf-950">{c.workOrders[0].number}</span></p> : null}</article>)}</div> : <Vazio icone={Wrench} titulo="Nenhum chamado" texto="Quando você precisar da equipe técnica, abra um chamado e acompanhe todo o andamento por aqui." acao="/assistencia-tecnica/solicitar" rotulo="Solicitar assistência" />}</div>;
  }

  if (secao === "manutencoes") {
    const visitas = await prisma.maintenanceVisit.findMany({ where: { equipment: { customerId } }, orderBy: { dueAt: "desc" }, include: { equipment: { select: { name: true, brandName: true, modelName: true } }, technician: { include: { user: { select: { name: true } } } } } });
    return visitas.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visitas.map((v) => <article key={v.id} className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><CalendarClock className="size-5" aria-hidden /></span><Status texto={v.status} /></div><h2 className="mt-5 text-base font-extrabold text-graf-950">{v.equipment.name}</h2><p className="mt-1 text-xs text-graf-500">{[v.equipment.brandName, v.equipment.modelName].filter(Boolean).join(" · ")}</p><dl className="mt-5 space-y-3 border-t border-graf-100 pt-4 text-xs"><div className="flex justify-between gap-4"><dt className="text-graf-500">Prevista</dt><dd className="font-bold text-graf-900">{formatarData(v.dueAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-graf-500">Agendada</dt><dd className="font-bold text-graf-900">{formatarDataHora(v.scheduledAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-graf-500">Técnico</dt><dd className="text-right font-bold text-graf-900">{v.technician?.user.name || "A definir"}</dd></div></dl></article>)}</div> : <Vazio icone={CalendarClock} titulo="Nenhuma manutenção registrada" texto="Preventivas programadas e visitas concluídas aparecerão nesta área." acao="/manutencao-preventiva" rotulo="Conhecer manutenção preventiva" />;
  }

  if (secao === "orcamentos") {
    const orcamentos = await prisma.quote.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, include: { items: { orderBy: { order: "asc" } }, request: { select: { number: true } } } });
    return orcamentos.length ? <div className="space-y-4">{orcamentos.map((o) => <article key={o.id} className="rounded-2xl border border-graf-200 bg-white p-6 shadow-card"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-graf-950">{o.number}</h2><Status texto={o.status} /></div><p className="mt-1 text-xs text-graf-500">{o.kind === "assistencia" ? "Assistência técnica" : "Comercial"}{o.request ? ` · chamado ${o.request.number}` : ""}</p></div><p className="text-xl font-extrabold text-graf-950">{formatarPreco(o.totalCents)}</p></div>{o.items.length ? <ul className="mt-5 divide-y divide-graf-100 border-y border-graf-100">{o.items.map((i) => <li key={i.id} className="flex justify-between gap-4 py-3 text-sm"><span className="text-graf-700">{i.quantity}× {i.description}</span><span className="font-bold text-graf-900">{formatarPreco(i.totalCents)}</span></li>)}</ul> : null}<div className="mt-4 flex items-center justify-between text-xs text-graf-500"><span>Emitido em {formatarData(o.createdAt)}</span><span>{o.validUntil ? `Válido até ${formatarData(o.validUntil)}` : ""}</span></div></article>)}</div> : <Vazio icone={FileCheck2} titulo="Nenhum orçamento" texto="Propostas comerciais e de assistência vinculadas à sua conta aparecerão aqui." acao="/orcamento" rotulo="Pedir orçamento" />;
  }

  if (secao === "documentos") {
    const docs = await prisma.document.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, include: { equipment: { select: { name: true } }, order: { select: { number: true } }, workOrder: { select: { number: true } } } });
    return docs.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{docs.map((d) => <article key={d.id} className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card"><div className="flex items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-graf-100"><FileText className="size-4 text-graf-600" aria-hidden /></span><div className="min-w-0"><p className="text-sm font-extrabold text-graf-950">{d.title}</p><p className="mt-1 text-xs uppercase tracking-wide text-graf-400">{d.kind.replaceAll("_", " ")}</p></div></div><p className="mt-5 text-xs leading-5 text-graf-500">{d.equipment?.name || (d.order ? `Pedido ${d.order.number}` : "") || (d.workOrder ? `OS ${d.workOrder.number}` : "Documento da conta")}</p><p className="mt-2 text-[10px] text-graf-400">{formatarData(d.createdAt)}</p></article>)}</div> : <Vazio icone={FileText} titulo="Nenhum documento disponível" texto="Documentos vinculados a pedidos, equipamentos e ordens de serviço aparecerão aqui quando forem disponibilizados." />;
  }

  if (secao === "favoritos") {
    const favs = await prisma.favorite.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, include: { product: { include: { brand: true, media: { take: 1, include: { media: true } } } } } });
    return favs.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{favs.map((f) => <Link key={f.id} href={`/loja/${f.product.slug}`} className="hover-lift rounded-2xl border border-graf-200 bg-white p-5"><Heart className="size-5 fill-jb-100 text-jb-600" aria-hidden /><p className="mt-5 text-xs font-extrabold uppercase tracking-[0.12em] text-graf-400">{f.product.brand?.name || "JB"}</p><h2 className="mt-2 text-base font-extrabold text-graf-950">{f.product.name}</h2><p className="mt-4 text-lg font-extrabold text-graf-950">{f.product.priceCents ? formatarPreco(f.product.priceCents) : "Sob orçamento"}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-jb-700">Ver produto <ArrowRight className="size-3.5" aria-hidden /></span></Link>)}</div> : <Vazio icone={Heart} titulo="Nenhum favorito" texto="Salve equipamentos do catálogo para encontrá-los rapidamente depois." acao="/loja" rotulo="Explorar catálogo" />;
  }

  if (secao === "enderecos") {
    const enderecos = await prisma.customerAddress.findMany({ where: { customerId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
    return enderecos.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{enderecos.map((e) => <article key={e.id} className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card"><div className="flex items-center justify-between"><MapPin className="size-5 text-jb-600" aria-hidden />{e.isDefault ? <span className="rounded-full bg-jb-50 px-2.5 py-1 text-[10px] font-extrabold text-jb-700">Principal</span> : null}</div><h2 className="mt-5 text-base font-extrabold text-graf-950">{e.label}</h2><p className="mt-2 text-sm leading-6 text-graf-600">{e.street}, {e.number}{e.complement ? ` · ${e.complement}` : ""}<br />{e.district} · {e.city}/{e.state}<br />CEP {e.zip}</p></article>)}</div> : <Vazio icone={MapPin} titulo="Nenhum endereço salvo" texto="Endereços usados em pedidos e atendimentos poderão ser organizados nesta área." />;
  }

  if (secao === "perfil") {
    const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true, email: true, phone: true, personType: true, document: true, companyName: true, tradeName: true, createdAt: true } });
    if (!c) return null;
    return <section className="rounded-2xl border border-graf-200 bg-white p-6 shadow-card lg:p-8"><div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-xl bg-jb-50 text-jb-600"><UserRound className="size-5" aria-hidden /></span><div><p className="text-base font-extrabold text-graf-950">{c.name}</p><p className="text-xs text-graf-500">Conta criada em {formatarData(c.createdAt)}</p></div></div><dl className="mt-7 grid gap-5 border-t border-graf-100 pt-6 sm:grid-cols-2"><Dado label="E-mail" value={c.email} /><Dado label="Telefone" value={c.phone || "Não informado"} /><Dado label="Tipo" value={c.personType === "juridica" ? "Pessoa jurídica / clínica" : "Pessoa física"} /><Dado label="CPF/CNPJ" value={c.document || "Não informado"} /><Dado label="Razão social" value={c.companyName || "Não informada"} /><Dado label="Nome fantasia" value={c.tradeName || "Não informado"} /></dl></section>;
  }

  if (secao === "notificacoes") {
    const notificacoes = await prisma.notification.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 100 });
    return notificacoes.length ? <div className="overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-card"><div className="divide-y divide-graf-100">{notificacoes.map((n) => { const conteudo = <div className="flex gap-4 px-5 py-4 hover:bg-graf-50"><span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${n.readAt ? "bg-graf-100 text-graf-500" : "bg-jb-50 text-jb-600"}`}><Bell className="size-4" aria-hidden /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-graf-950">{n.title}</p>{!n.readAt ? <span className="size-2 rounded-full bg-jb-500" aria-label="Não lida" /> : null}</div><p className="mt-1 text-sm leading-6 text-graf-600">{n.body}</p><p className="mt-2 text-[10px] text-graf-400">{formatarDataHora(n.createdAt)}</p></div>{n.href ? <ArrowRight className="mt-2 size-4 text-graf-300" aria-hidden /> : null}</div>; return n.href ? <Link key={n.id} href={n.href}>{conteudo}</Link> : <div key={n.id}>{conteudo}</div>; })}</div></div> : <Vazio icone={Bell} titulo="Tudo em dia" texto="Nenhuma notificação registrada para sua conta." />;
  }

  return null;
}

function Status({ texto }: { texto: string }) {
  return <span className="rounded-full bg-graf-100 px-2.5 py-1 text-[10px] font-extrabold capitalize text-graf-600">{texto.replaceAll("_", " ")}</span>;
}

function Dado({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold text-graf-500">{label}</dt><dd className="mt-1 text-sm font-extrabold text-graf-900">{value}</dd></div>;
}

function Vazio({ icone: Icon, titulo, texto, acao, rotulo }: { icone: typeof PackageCheck; titulo: string; texto: string; acao?: string; rotulo?: string }) {
  return <div className="rounded-2xl border border-dashed border-graf-300 bg-white p-10 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-graf-100 text-graf-500"><Icon className="size-5" aria-hidden /></span><h2 className="mt-5 text-lg font-extrabold text-graf-950">{titulo}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-graf-600">{texto}</p>{acao && rotulo ? <Link href={acao} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-jb-600 px-5 text-sm font-extrabold text-white hover:bg-jb-500">{rotulo} <ArrowRight className="size-4" aria-hidden /></Link> : null}</div>;
}
