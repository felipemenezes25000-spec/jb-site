import type { Metadata } from "next";

import { MotionSystem } from "@/components/ui/motion-system";

import "../motion.css";
import "../motion-scenes.css";
import "../motion-feedback.css";
import "../motion-signature.css";
import "../motion-signature-safety.css";

/*
 * Migração para Cache Components, em etapas.
 *
 * `instant = false` diz ao Next para não validar que a navegação para esta
 * área produz UI instantânea — e é a saída documentada para migrar rota a
 * rota em vez de tudo de uma vez
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md).
 *
 * Esta área é autenticada e existe para operar dados que mudam a cada
 * segundo: pedido, chamado, estoque, agenda. Prerender parcial aqui não tem o
 * que economizar — a página inteira depende de quem está logado. O ganho de
 * PPR está no site público, e é lá que a migração foi feita de verdade.
 *
 * Registrado em docs/evolucao-jb/cobertura.md como pendência consciente, não
 * como conclusão.
 */
export const instant = false;

/**
 * Grupo de rotas do backoffice.
 *
 * O Motion System mora aqui, e não mais no layout raiz: o site público de
 * assistência tem coreografia própria e não precisa pagar pelo runtime,
 * observers e interação de ponteiro do painel. O script que marca a cena
 * antes da primeira pintura continua no layout raiz para o admin nascer no
 * estado visual correto.
 */
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel JB" },
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutGrupoAdmin({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MotionSystem />
    </>
  );
}
