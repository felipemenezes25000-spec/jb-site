import type { Metadata } from "next";

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
 * PPR está na loja pública, e é lá que a migração foi feita de verdade.
 *
 * Registrado em docs/evolucao-jb/cobertura.md como pendência consciente, não
 * como conclusão.
 */
export const instant = false;


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
