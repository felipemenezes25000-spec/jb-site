import type { ReactNode } from "react";

import styles from "./produto-marketplace.module.css";

type Props = {
  trilha: ReactNode;
  galeria: ReactNode;
  resumo: ReactNode;
  detalhes?: ReactNode;
  acoes?: ReactNode;
  compra: ReactNode;
};

export function TopoMarketplace({ trilha, galeria, resumo, detalhes, acoes, compra }: Props) {
  return (
    <section
      id="visao-geral"
      aria-labelledby="titulo-produto"
      data-pdp-marketplace
      className="container-jb max-w-[100rem] scroll-mt-[var(--jb-topo-secoes)] pb-7 pt-3 lg:pb-9 lg:pt-4"
    >
      <div className="mb-4 text-graf-500 lg:mb-5">{trilha}</div>

      <div className={styles.topo}>
        <div data-pdp-gallery className={styles.galeria}>
          {galeria}
        </div>

        <div data-pdp-summary className={styles.resumo}>
          {resumo}
          {acoes ? <div className="mt-4 border-t border-graf-150 pt-3">{acoes}</div> : null}
        </div>

        <aside
          id="caixa-de-compra"
          data-pdp-buybox
          aria-label="Opções de compra"
          className={`${styles.compra} scroll-mt-[var(--jb-topo-secoes)] space-y-4`}
        >
          {compra}
        </aside>

        {detalhes ? (
          <div data-pdp-details className={styles.detalhes}>
            {detalhes}
          </div>
        ) : null}
      </div>
    </section>
  );
}
