import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { FormCadastro } from "@/components/cliente/form-acesso";

export default function CadastroPage() {
  return (
    <div className="bg-graf-50/70">
      <div className="container-jb grid gap-10 py-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-16 lg:py-16">
        <section className="lg:sticky lg:top-36">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Área da Clínica</p>
          <h1 className="mt-4 text-display leading-[1.04]">Sua clínica e seus equipamentos organizados desde o primeiro pedido.</h1>
          <p className="mt-5 text-base leading-7 text-graf-600 lg:text-lg">Crie a conta que será usada para acompanhar compras, assistência técnica, manutenções, documentos e orçamentos.</p>
          <ul className="mt-7 space-y-3 text-sm text-graf-700">
            {["Pedidos e andamento da entrega", "Equipamentos e garantias", "Chamados e ordens de serviço", "Preventivas e histórico técnico", "Documentos vinculados à clínica"].map((item) => (
              <li key={item} className="flex items-center gap-3"><CheckCircle2 className="size-4 shrink-0 text-jb-600" aria-hidden />{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-[2rem] border border-graf-200 bg-white p-6 shadow-pop sm:p-9 lg:p-10">
          <div className="mb-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-jb-600">Criar conta</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.035em] text-graf-950">Comece sua Área da Clínica</h2>
            <p className="mt-2 text-sm leading-6 text-graf-600">Você poderá complementar dados e endereços depois.</p>
          </div>
          <FormCadastro />
          <p className="mt-7 border-t border-graf-200 pt-6 text-center text-sm text-graf-600">
            Já tem conta? <Link href="/entrar" className="font-extrabold text-jb-700 hover:text-jb-500">Entrar</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
