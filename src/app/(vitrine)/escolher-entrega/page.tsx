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
    <div className="container-jb py-8 lg:py-12">
      <Trilha
        itens={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Carrinho", href: "/carrinho" },
          { rotulo: "Entrega" },
        ]}
        className="mb-5"
      />

      <header className="mb-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-jb-700">Antes do checkout</p>
        <h1 className="manchete mt-2 text-[clamp(2rem,1.5rem+2vw,3rem)] text-graf-950">
          Escolha a transportadora e veja o frete real
        </h1>
        <p className="texto-guia mt-3 text-graf-600">
          A cotação usa peso, dimensões e quantidade cadastrados nos produtos. Depois da escolha,
          o checkout confere o preço novamente no servidor antes de abrir a cobrança.
        </p>
      </header>

      <EscolherEntrega
        retiradaDisponivel={ligado(s.retirada_disponivel)}
        cepInicial={endereco?.zip ?? ""}
      />
    </div>
  );
}
