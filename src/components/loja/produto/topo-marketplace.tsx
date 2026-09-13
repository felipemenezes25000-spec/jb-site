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
      className="container-loja scroll-mt-[var(--jb-topo-secoes)] pb-8 pt-3 lg:pb-10 lg:pt-4"
    >
      <div className="mb-4 text-graf-500 lg:mb-5">{trilha}</div>

      <div className="rounded-[1.75rem] border border-graf-200/80 bg-white p-3 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.42)] sm:p-4 lg:p-5 xl:p-6">
        <div className={styles.topo}>
          <div data-pdp-gallery className={styles.galeria}>
            {galeria}
          </div>

          <div data-pdp-summary className={styles.resumo}>
            {resumo}
            {acoes ? <div className="mt-4 border-t border-hairline pt-3">{acoes}</div> : null}
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
      </div>
    </section>
  );
}
