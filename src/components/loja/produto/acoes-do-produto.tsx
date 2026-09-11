import { Heart } from "lucide-react";

import { alternarFavorito } from "@/app/acoes/minha-jb";
import { BotaoComparar } from "@/components/loja/comparador-cliente";
import { sessaoCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

/* ============================================================================
   Ações da página do equipamento

   Duas coisas que a pessoa faz antes de decidir, e que a página não oferecia:
   guardar o equipamento e colocá-lo lado a lado com outro.

   Favorito é dado da clínica: mora no banco, exige conta, e o botão precisa
   saber se já está marcado — por isso este arquivo é componente de servidor,
   lê sessão e some da casca prerenderizada dentro de um `<Suspense>` (a mesma
   estratégia de `cabecalho-pessoal`).

   Comparação é decisão de sessão de navegação: mora no navegador, e o botão
   vem de `comparador-cliente`. Os dois moram na mesma linha porque, para quem
   está decidindo, "guardar" e "comparar" são o mesmo gesto.

   Sem sessão o botão de favorito continua aparecendo. Ele leva ao login com a
   volta apontando para este equipamento — esconder a função de quem não entrou
   é como esconder o preço: economiza um clique e perde a pessoa.
   ============================================================================ */

export async function AcoesDoProduto({
  produtoId,
  nome,
  slug,
}: {
  produtoId: string;
  nome: string;
  slug: string;
}) {
  const cliente = await sessaoCliente();

  const favoritado = cliente
    ? Boolean(
        await prisma.favorite.findUnique({
          where: { customerId_productId: { customerId: cliente.id, productId: produtoId } },
          select: { id: true },
        }),
      )
    : false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={alternarFavorito}>
        <input type="hidden" name="produtoId" value={produtoId} />
        <input type="hidden" name="voltar" value={`/loja/${slug}`} />
        <button
          type="submit"
          aria-pressed={favoritado}
          className={cn(
            "foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors duration-150",
            favoritado
              ? "border-jb-300 bg-jb-50 text-jb-700"
              : "border-graf-300 text-graf-800 hover:border-graf-450 hover:bg-graf-50",
          )}
        >
          <Heart
            className={cn("size-4 shrink-0", favoritado && "fill-current")}
            aria-hidden
          />
          {favoritado ? "Salvo" : "Salvar"}
        </button>
      </form>

      <BotaoComparar slug={slug} nome={nome} forma="linha" />
    </div>
  );
}

/** Mesma caixa do conteúdo final, para o `<Suspense>` não empurrar a coluna. */
export function AcoesDoProdutoEsqueleto() {
  return (
    <div className="flex gap-2" aria-hidden>
      <span className="h-11 w-28 rounded-lg border border-graf-200 bg-graf-50" />
      <span className="h-11 w-32 rounded-lg border border-graf-200 bg-graf-50" />
    </div>
  );
}
