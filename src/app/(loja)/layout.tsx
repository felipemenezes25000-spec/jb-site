import { Cabecalho } from "@/components/loja/cabecalho";
import { Rodape } from "@/components/loja/rodape";
import { sessaoCliente } from "@/lib/auth-cliente";
import { contarItensDoCarrinho } from "@/lib/carrinho";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const [s, cliente, itensNoCarrinho, categorias] = await Promise.all([
    getSettings(),
    sessaoCliente(),
    contarItensDoCarrinho(),
    prisma.category.findMany({
      where: { published: true, parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { status: "active" } } } },
      },
    }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho
        categorias={categorias.map((c) => ({
          slug: c.slug,
          name: c.name,
          count: c._count.products,
        }))}
        itensNoCarrinho={itensNoCarrinho}
        clienteNome={cliente?.name ?? null}
        telefone={s.telefone}
        whatsapp={s.whatsapp}
        horario={s.horario}
      />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Rodape />
    </div>
  );
}
