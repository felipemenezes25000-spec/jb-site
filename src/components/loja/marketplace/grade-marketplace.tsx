import { CardProdutoMarketplace } from "@/components/loja/marketplace/card-produto-marketplace";
import type {
  ParcelamentoMarketplace,
  ProdutoMarketplaceCard,
} from "@/components/loja/marketplace/tipos";

import styles from "./marketplace.module.css";

type PropsGradeMarketplace = {
  produtos: ProdutoMarketplaceCard[];
  parcelamento: ParcelamentoMarketplace;
  /** Ids já guardados por quem está logado. Vazio para visitante. */
  favoritados?: Set<string>;
  /** Para onde voltar depois de guardar — o endereço desta listagem. */
  voltar?: string;
  className?: string;
};

export function GradeMarketplace({
  produtos,
  parcelamento,
  favoritados,
  voltar,
  className = "",
}: PropsGradeMarketplace) {
  return (
    <ul data-grade-marketplace className={`${styles.grid} ${className}`}>
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex min-w-0">
          <CardProdutoMarketplace
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
            favoritado={favoritados?.has(produto.id) ?? false}
            voltar={voltar}
          />
        </li>
      ))}
    </ul>
  );
}

export function EsqueletoGradeMarketplace() {
  return (
    <ul aria-hidden className={styles.grid}>
      {Array.from({ length: 8 }, (_, indice) => (
        <li
          key={indice}
          className={`${styles.card} min-h-[24rem] animate-pulse bg-graf-50`}
        />
      ))}
    </ul>
  );
}
