import { CascaPublica } from "@/components/loja/casca-publica";

/** Casca da loja pública — páginas institucionais, serviços e coleções. */
export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return <CascaPublica>{children}</CascaPublica>;
}
