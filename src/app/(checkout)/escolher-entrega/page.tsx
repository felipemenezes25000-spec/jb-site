import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EscolherEntrega } from "@/components/loja/escolher-entrega";
import { Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { lerCarrinho } from "@/lib/carrinho";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";

export const instant = false;

export const metadata: Metadata = {
  title: "Escolher entrega",
  robots: { index: false, follow: false },
};

export default async function EscolherEntregaPage() {
  const carrinho = await lerCarrinho();
  if (!carrinho || carrinho.items.length === 0) redirect("/carrinho");

  const [s, sessao] = await Promise.all([getSettings(), sessaoCliente()]);
  const endereco = sessao
    ? await prisma.customerAddress.findFirst({
        where: { customerId: sessao.id },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        select: { zip: true },
      })
    : null;

  return (
    <div className="container-jb py-7 lg:py-10">
      <Trilha
        itens={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Carrinho", href: "/carrinho" },
          { rotulo: "Entrega" },
        ]}
        className="mb-4"
      />

      <header className="mb-7 max-w-2xl border-b border-graf-200 pb-5">
        <p className="sobretitulo">Entrega</p>
        <h1 className="manchete mt-1.5 text-[clamp(2rem,1.5rem+2vw,3rem)] text-graf-950">
          Escolha como receber
        </h1>
        <p className="mt-2.5 max-w-xl text-sm leading-6 text-graf-600 sm:text-corpo">
          Informe o CEP para comparar as opções disponíveis. A modalidade escolhida é conferida novamente antes do pagamento.
        </p>
      </header>

      <EscolherEntrega
        retiradaDisponivel={ligado(s.retirada_disponivel)}
        cepInicial={endereco?.zip ?? ""}
      />
    </div>
  );
}
