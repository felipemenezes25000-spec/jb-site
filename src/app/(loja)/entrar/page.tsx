import Link from "next/link";
import { BadgeCheck, ClipboardList, PackageCheck, Wrench } from "lucide-react";

import { FormEntrar } from "@/components/cliente/form-acesso";

type Props = { searchParams: Promise<{ voltar?: string }> };

export default async function EntrarPage({ searchParams }: Props) {
  const { voltar } = await searchParams;

  return (
    <div className="bg-graf-50/70">
      <div className="container-jb grid min-h-[720px] gap-8 py-10 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:gap-16 lg:py-16">
        <section className="hidden lg:block">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Área da Clínica</p>
          <h1 className="mt-4 max-w-2xl text-display leading-[1.04]">A compra é só o começo do histórico do equipamento.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-graf-600">Acesse pedidos, equipamentos, assistência, manutenções, orçamentos e documentos em um só ambiente.</p>
          <div className="mt-9 grid max-w-2xl grid-cols-2 gap-4">
            {[
              [PackageCheck, "Equipamentos", "Tudo que pertence à clínica."],
              [BadgeCheck, "Garantias", "Cobertura e documentos vinculados."],
              [Wrench, "Assistência", "Chamados e ordens de serviço."],
              [ClipboardList, "Histórico", "Acompanhe o que já aconteceu."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof PackageCheck;
              return <div key={String(t)} className="rounded-2xl border border-graf-200 bg-white p-5"><I className="size-5 text-jb-600" aria-hidden /><p className="mt-4 text-sm font-extrabold text-graf-950">{String(t)}</p><p className="mt-2 text-xs leading-5 text-graf-500">{String(d)}</p></div>;
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-lg rounded-[2rem] border border-graf-200 bg-white p-6 shadow-pop sm:p-9">
          <div className="mb-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Bem-vindo de volta</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-graf-950">Entrar na Área da Clínica</h2>
            <p className="mt-2 text-sm leading-6 text-graf-600">Use a conta vinculada aos seus pedidos e atendimentos.</p>
          </div>
          <FormEntrar voltar={voltar} />
          <div className="mt-7 border-t border-graf-200 pt-6 text-center">
            <p className="text-sm text-graf-600">Ainda não tem conta?</p>
            <Link href="/cadastro" className="mt-2 inline-flex text-sm font-extrabold text-jb-700 hover:text-jb-500">Criar minha Área da Clínica →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
