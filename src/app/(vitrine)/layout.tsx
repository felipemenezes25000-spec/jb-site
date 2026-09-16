import { CascaPublica } from "@/components/loja/casca-publica";

/** Casca da vitrine — abertura, catálogo, ficha de produto e carrinho. */
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return <CascaPublica>{children}</CascaPublica>;
}
