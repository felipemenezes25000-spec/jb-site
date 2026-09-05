import type { Metadata } from "next";
import { Heart, HeartOff } from "lucide-react";

import { alternarFavorito } from "@/app/acoes/minha-jb";
import { Topo } from "@/components/conta/mj-topo";
import { CardProduto } from "@/components/loja/card-produto";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import { SELECAO_CARD, paraCard } from "@/lib/catalogo";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Produtos que você salvou para decidir depois.",
  robots: { index: false, follow: false },
};

/**
 * Botão de remover.
 *
 * É um `form` com server action, sem JavaScript no meio: funciona igual com a
 * página hidratada ou não. Fica fora do cartão de propósito — o cartão inteiro
 * é um link para o produto, e um botão dentro dele seria coberto pela área
 * clicável.
 */
function BotaoRemover({ produtoId, nome }: { produtoId: string; nome: string }) {
  return (
    <form action={alternarFavorito}>
      <input type="hidden" name="produtoId" value={produtoId} />
      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-700 transition-colors hover:border-jb-300 hover:bg-jb-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
      >
        <HeartOff className="size-4" aria-hidden />
        Remover
        <span className="sr-only"> {nome} dos favoritos</span>
      </button>
    </form>
  );
}

export default async function FavoritosPage() {
  const cliente = await exigirCliente("/minha-jb/favoritos");

  const favoritos = await prisma.favorite.findMany({
    where: { customerId: cliente.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      product: { select: { ...SELECAO_CARD, id: true, status: true } },
    },
  });

  const disponiveis = favoritos.filter((favorito) => favorito.product.status === "active");
  const foraDoCatalogo = favoritos.filter((favorito) => favorito.product.status !== "active");

  return (
    <div>
      <Topo
        titulo="Favoritos"
        descricao="O que você salvou para decidir com calma. O preço mostrado é sempre o de agora — favorito não congela valor."
        acoes={
          favoritos.length > 0 ? (
            <LinkBotao href="/loja" variante="secundario" tamanho="sm">
              Ver catálogo
            </LinkBotao>
          ) : null
        }
      />

      {favoritos.length === 0 ? (
        <Vazio
          icone={Heart}
          titulo="Nenhum favorito ainda"
          descricao="No catálogo, salve os equipamentos que estiver comparando. Eles ficam guardados aqui, com o preço atualizado, até você decidir."
          acao={<LinkBotao href="/loja">Ver equipamentos</LinkBotao>}
        />
      ) : (
        <div className="space-y-8">
          {disponiveis.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {disponiveis.map((favorito) => (
                <li key={favorito.id} className="flex flex-col gap-2.5">
                  <CardProduto produto={paraCard(favorito.product)} className="flex-1" />
                  <BotaoRemover
                    produtoId={favorito.product.id}
                    nome={favorito.product.name}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {foraDoCatalogo.length > 0 ? (
            <section aria-labelledby="fora-do-catalogo">
              <h2
                id="fora-do-catalogo"
                className="mb-1 text-base font-bold text-graf-950"
              >
                Fora do catálogo
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-graf-600">
                Estes produtos saíram do site. Se ainda tiver interesse, fale com a equipe —
                muita coisa volta como seminovo revisado.
              </p>
              <ul className="space-y-3">
                {foraDoCatalogo.map((favorito) => (
                  <li
                    key={favorito.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-graf-200 bg-white p-4 shadow-card"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-graf-950">
                        {favorito.product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-graf-500">
                        Salvo em {formatarData(favorito.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <LinkBotao href="/contato" variante="secundario" tamanho="sm">
                        Falar com a equipe
                      </LinkBotao>
                      <div className="w-32">
                        <BotaoRemover
                          produtoId={favorito.product.id}
                          nome={favorito.product.name}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
