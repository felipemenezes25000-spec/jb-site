import type { Metadata } from "next";

/**
 * Grupo de rotas do backoffice.
 *
 * Não desenha nada: existe para separar o painel da loja e para fixar os
 * metadados de todo o /admin num lugar só. O `noindex` vale para o grupo
 * inteiro — nenhuma tela interna deve aparecer em busca.
 */
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel JB" },
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutGrupoAdmin({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
