import Link from "next/link";

import { CadastroItem } from "@/components/admin/cadastro-item";
import { TituloPagina } from "@/components/admin/shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Cadastros" };

const FILTROS = [
  { valor: "", rotulo: "Todos" },
  { valor: "novo", rotulo: "Novos" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "concluido", rotulo: "Concluídos" },
  { valor: "arquivado", rotulo: "Arquivados" },
];

export default async function CadastrosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;
  const filtro = FILTROS.some((f) => f.valor === status) ? status : "";

  const cadastros = await prisma.lead.findMany({
    where: filtro ? { status: filtro } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <TituloPagina
        titulo="Cadastros"
        descricao="Tudo que chega pelo formulário da página de Contato."
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor || "todos"}
            href={f.valor ? `/admin/cadastros?status=${f.valor}` : "/admin/cadastros"}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              (filtro ?? "") === f.valor
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white hover:border-slate-400",
            )}
          >
            {f.rotulo}
          </Link>
        ))}
      </nav>

      {cadastros.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
          Nenhum cadastro nesta situação.
        </p>
      ) : (
        <div className="space-y-3">
          {cadastros.map((c) => (
            <CadastroItem
              key={c.id}
              podeExcluir={user.role === "admin"}
              cadastro={{
                id: c.id,
                nome: c.nome,
                email: c.email,
                telefone: c.telefone,
                endereco: c.endereco,
                bairro: c.bairro,
                cidade: c.cidade,
                estado: c.estado,
                cep: c.cep,
                obs: c.obs,
                news: c.news,
                status: c.status,
                notas: c.notas,
                recebidoEm: formatDateTime(c.createdAt),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
