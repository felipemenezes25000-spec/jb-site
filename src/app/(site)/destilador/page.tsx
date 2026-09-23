import { PaginaEquipamento, metadataDoEquipamento } from "@/components/site/pagina-equipamento";

/* Página de pouso de anúncio: "Destilador". O conteúdo mora em
   `@/lib/paginas-equipamento`; o desenho, em `PaginaEquipamento`. */

const SLUG = "destilador";

export function generateMetadata() {
  return metadataDoEquipamento(SLUG);
}

export default function Page() {
  return <PaginaEquipamento slug={SLUG} />;
}
