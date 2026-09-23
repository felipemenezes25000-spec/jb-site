import { PaginaEquipamento, metadataDoEquipamento } from "@/components/site/pagina-equipamento";

/* Página de pouso de anúncio: "Bomba de vácuo". O conteúdo mora em
   `@/lib/paginas-equipamento`; o desenho, em `PaginaEquipamento`. */

const SLUG = "bomba-de-vacuo";

export function generateMetadata() {
  return metadataDoEquipamento(SLUG);
}

export default function Page() {
  return <PaginaEquipamento slug={SLUG} />;
}
