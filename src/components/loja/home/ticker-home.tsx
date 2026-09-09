import { Activity, BadgeCheck, CreditCard, GitCompareArrows, ShieldCheck, Wrench } from "lucide-react";

import styles from "./ticker-home.module.css";

const ITENS = [
  { icone: BadgeCheck, texto: "Novos e seminovos revisados" },
  { icone: Wrench, texto: "Assistência técnica própria" },
  { icone: CreditCard, texto: "Até 12x sem juros" },
  { icone: ShieldCheck, texto: "Garantia e condição claras" },
  { icone: GitCompareArrows, texto: "Compare até 3 equipamentos" },
  { icone: Activity, texto: "Catálogo técnico atualizado" },
] as const;

function Trilha({ oculta = false }: { oculta?: boolean }) {
  return (
    <ul className={styles.trilha} aria-hidden={oculta || undefined}>
      {ITENS.map(({ icone: Icone, texto }) => (
        <li key={texto}>
          <Icone aria-hidden />
          <span>{texto}</span>
          <i aria-hidden>✦</i>
        </li>
      ))}
    </ul>
  );
}

export function TickerHome() {
  return (
    <section className={styles.ticker} aria-label="Diferenciais da JB">
      <div className={styles.janela}>
        <div className={styles.movimento}>
          <Trilha />
          <Trilha oculta />
        </div>
      </div>
    </section>
  );
}
