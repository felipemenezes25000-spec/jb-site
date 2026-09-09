import type { ReactNode } from "react";

import styles from "./produto-marketplace.module.css";

type Props = {
  trilha: ReactNode;
  galeria: ReactNode;
  resumo: ReactNode;
  acoes?: ReactNode;
  compra: ReactNode;
};

export function TopoMarketplace({ trilha, galeria, resumo, acoes, compra }: Props) {
  return (
    <section
      id="visao-geral"
      aria-labelledby="titulo-produto"
      data-pdp-marketplace
      className="container-jb max-w-[112rem] scroll-mt-36 pb-8 pt-4 lg:pb-10 lg:pt-6"
    >
      <div className="mb-4 lg:mb-5">{trilha}</div>

      <div className={styles.topo}>
        <div data-pdp-gallery className={styles.galeria}>
          {galeria}
        </div>

        <div data-pdp-summary className={styles.resumo}>
          {resumo}
          {acoes ? <div className="mt-4 border-t border-graf-200 pt-3">{acoes}</div> : null}
        </div>

        <div
          id="caixa-de-compra"
          data-pdp-buybox
          className={`${styles.compra} scroll-mt-32 space-y-5`}
        >
          {compra}
        </div>
      </div>
    </section>
  );
}

