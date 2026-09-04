import Link from "next/link";

import { TituloPagina } from "@/components/admin/shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function PainelPage() {
  const user = await requireUser();

  const [novos, total, solucoes, banners, chamadas, ultimos, log] = await Promise.all([
    prisma.lead.count({ where: { status: "novo" } }),
    prisma.lead.count(),
    prisma.serviceCategory.count({ where: { published: true } }),
    prisma.slide.count({ where: { published: true } }),
    prisma.highlight.count({ where: { published: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const numeros = [
    { rotulo: "Cadastros novos", valor: novos, href: "/admin/cadastros?status=novo" },
    { rotulo: "Cadastros no total", valor: total, href: "/admin/cadastros" },
    { rotulo: "Soluções publicadas", valor: solucoes, href: "/admin/solucoes" },
    { rotulo: "Banners no ar", valor: banners, href: "/admin/banners" },
    { rotulo: "Chamadas na home", valor: chamadas, href: "/admin/home" },
  ];

  return (
    <>
      <TituloPagina
        titulo={`Olá, ${user.name.split(" ")[0]}`}
        descricao="Tudo que aparece no site é editado por aqui."
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <Link
              href={n.href}
              className="block rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
            >
              <p className="text-3xl font-bold text-slate-900">{n.valor}</p>
              <p className="mt-1 text-sm text-slate-500">{n.rotulo}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">
            Últimos cadastros
          </h2>
          {ultimos.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">Nenhum cadastro recebido ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ultimos.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/admin/cadastros#${lead.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {lead.nome}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{lead.email}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">
            Atividade recente
          </h2>
          <ul className="divide-y divide-slate-100">
            {log.map((linha) => (
              <li key={linha.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-slate-700">
                  <span className="font-semibold">{linha.user?.name ?? "—"}</span>{" "}
                  {
                    {
                      create: "criou",
                      update: "alterou",
                      delete: "excluiu",
                      login: "entrou no painel",
                      logout: "saiu do painel",
                    }[linha.action as "create"]
                  }{" "}
                  {linha.action === "login" || linha.action === "logout" ? "" : linha.entity}
                  {linha.summary ? ` · ${linha.summary}` : ""}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDateTime(linha.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
