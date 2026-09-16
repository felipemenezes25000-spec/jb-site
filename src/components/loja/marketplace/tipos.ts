import type { ProdutoCard, Parcelamento } from "@/components/loja/card-produto";

/* ============================================================================
   O cartão do catálogo é o cartão da loja

   Este arquivo declarava `ProdutoMarketplaceCard` com os mesmos vinte campos
   de `ProdutoCard`, mais dois — e era essa segunda declaração que segurava o
   terceiro componente de cartão de pé. Os dois passam a ser o mesmo tipo:
   `destaques` e `categoryName` já são opcionais em `ProdutoCard`, porque só o
   catálogo os carrega.

   Os nomes continuam exportados: quem monta a consulta do catálogo fala em
   "marketplace", e renomear isso é outra tarefa, com o portão de arquitetura
   olhando (ver `IMPORTS_MARKETPLACE_LEGADOS`).
   ============================================================================ */

export type ProdutoMarketplaceCard = ProdutoCard;
export type ParcelamentoMarketplace = Parcelamento;
